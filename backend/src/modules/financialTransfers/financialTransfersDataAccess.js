import crypto from "node:crypto";
import FinancialTransfer from "../../models/FinancialTransfer.js";
import FinancialAccount from "../../models/FinancialAccount.js";
import { schoolId } from "../expenses/expenseRules.js";
import FinancialAccountsBalanceDataAccess from "../financialAccounts/financialAccountsBalanceDataAccess.js";
import { brazilBalanceDay } from "../financialAccounts/financialAccountsBalanceRules.js";
import { accountError } from "../financialAccounts/financialAccountsRules.js";
import { sameTransferRequest, transferCreateFields, transferHistoryFilters,
  transferReversalFields, validTransferClock } from "./financialTransfersRules.js";
import { isValidTransferAccountId } from "../../models/financialTransferRules.js";

/* EN: Transfers never create expense/revenue documents or directly overwrite an account balance.
   PT: Transferências nunca geram despesas/proventos nem sobrescrevem o saldo da conta. */
export default class FinancialTransfersDataAccess {
  constructor({ transferModel = FinancialTransfer, accountModel = FinancialAccount,
    resolveSchoolId = schoolId, makeId = () => crypto.randomUUID(),
    clock = () => new Date().toISOString(), balanceService = null } = {}) {
    this.transferModel = transferModel;
    this.accountModel = accountModel;
    this.resolveSchoolId = resolveSchoolId;
    this.makeId = makeId;
    this.clock = clock;
    this.balanceService = balanceService ?? new FinancialAccountsBalanceDataAccess({
      accountModel, transferModel, resolveSchoolId
    });
  }

  /* EN: Matching request keys return the original transfer; mismatches are rejected.
     PT: Uma chave repetida retorna a transferência original; diferenças geram conflito. */
  async findReplay(school, fields) {
    const original = await this.transferModel.findOne({
      schoolId: school, idempotencyKey: fields.idempotencyKey
    }).lean();
    if (!original) return null;
    if (!sameTransferRequest(original, fields)) {
      throw accountError("Esta chave de operação já foi usada em outra transferência.", 409);
    }
    return { transfer: original, reused: true };
  }

  /* EN: A school-scoped, paginated audit trail ordered by transfer instant and stable ID.
     PT: Histórico de auditoria paginado por escola, ordenado por data e ID estável. */
  async list(query = {}) {
    const { filter, page, limit } = transferHistoryFilters(query);
    const where = { schoolId: this.resolveSchoolId() };
    if (filter.status) where.status = filter.status;
    if (filter.accountId) where.$or = [
      { fromAccountId: filter.accountId }, { toAccountId: filter.accountId }
    ];
    const [total, items] = await Promise.all([
      this.transferModel.countDocuments(where),
      this.transferModel.find(where).sort({ transferredAt: -1, id: -1 })
        .skip((page - 1) * limit).limit(limit).lean()
    ]);
    return { items, total, page, limit };
  }

  /* EN: Never return a transfer belonging to another school.
     PT: Nunca retorna transferência pertencente a outra escola. */
  async getById(id) {
    if (!isValidTransferAccountId(id)) throw accountError("ID da transferência inválido.");
    const record = await this.transferModel.findOne({ schoolId: this.resolveSchoolId(), id }).lean();
    if (!record) throw accountError("Transferência não encontrada.", 404);
    return record;
  }

  /* EN: Reverse inside a MongoDB transaction with both accounts locked in a stable order.
         Do not delete the original transfer, create business revenue/expense, or
         silently allow the receiving account to go negative.
     PT: Estorna numa transação MongoDB, bloqueando ambas as contas na mesma ordem.
         Não exclui a transferência, não cria receitas/despesas e não permite
         saldo insuficiente na conta que devolverá o valor. */
  async reverse(id, body) {
    if (!isValidTransferAccountId(id)) throw accountError("ID da transferência inválido.");
    const fields = transferReversalFields(body);
    const school = this.resolveSchoolId();
    const session = await this.transferModel.db.startSession();
    try {
      let reversed = null;
      await session.withTransaction(async () => {
        const original = await this.transferModel.findOne({ schoolId: school, id }).session(session).lean();
        if (!original) throw accountError("Transferência não encontrada.", 404);
        if (original.status !== "completed") throw accountError("Esta transferência já foi estornada.", 409);
        const stamp = validTransferClock(this.clock());
        if (stamp < original.transferredAt) {
          throw accountError("Estorno não pode ser anterior à transferência.", 409);
        }
        const asOf = brazilBalanceDay(new Date(stamp));
        for (const accountId of [original.fromAccountId, original.toAccountId].sort()) {
          const account = await this.accountModel.findOneAndUpdate(
            { schoolId: school, id: accountId }, { $inc: { __v: 1 } },
            { session, new: true }
          ).lean();
          if (!account) throw accountError("Conta original não encontrada nesta escola.", 404);
          if (account.balanceDate > asOf) {
            throw accountError("Data-base da conta posterior à data do estorno.", 409);
          }
        }
        const balances = await this.balanceService.getBalances({ asOf }, { session });
        const receiver = balances.accounts.find(account => account.id === original.toAccountId);
        if (!receiver?.available || !Number.isFinite(receiver.balance)) {
          throw accountError("Saldo da conta de destino indisponível para o estorno.", 409);
        }
        if (Math.round(receiver.balance * 100) < Math.round(original.amount * 100)) {
          throw accountError("Saldo insuficiente na conta de destino para estornar.", 409);
        }
        const updated = await this.transferModel.findOneAndUpdate(
          { schoolId: school, id, status: "completed" },
          { $set: { status: "reversed", reversedAt: stamp, reversalReason: fields.reversalReason,
            reversedBy: fields.reversedBy, updatedAt: stamp } },
          { session, new: true, runValidators: true }
        ).lean();
        if (!updated) throw accountError("Transferência já estornada ou modificada por outra operação.", 409);
        reversed = updated;
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
      return reversed;
    } finally {
      await session.endSession();
    }
  }

  async create(body) {
    const fields = transferCreateFields(body);
    const school = this.resolveSchoolId();
    const replay = await this.findReplay(school, fields);
    if (replay) return replay;

    /* EN: Only a MongoDB transaction can safely commit both-account checks and the transfer.
           Never silently fall back to an unsafe non-transactional write.
       PT: Somente uma transação MongoDB garante checagem das contas e gravação consistente.
           Nunca grava fora de uma transação como alternativa silenciosa. */
    const session = await this.transferModel.db.startSession();
    try {
      let saved = null;
      await session.withTransaction(async () => {
        const existing = await this.transferModel.findOne({
          schoolId: school, idempotencyKey: fields.idempotencyKey
        }).session(session).lean();
        if (existing) {
          if (!sameTransferRequest(existing, fields)) {
            throw accountError("Esta chave de operação já foi usada em outra transferência.", 409);
          }
          saved = { transfer: existing, reused: true };
          return;
        }

        const stamp = validTransferClock(this.clock());
        const asOf = brazilBalanceDay(new Date(stamp));

        /* EN: Write-lock BOTH account records in stable order to prevent concurrent
               withdrawals from spending the same balance or racing with another transfer.
           PT: Bloqueia para escrita AMBAS as contas em ordem estável, evitando saídas
               simultâneas sobre o mesmo saldo e conflitos com outras transferências. */
        for (const id of [fields.fromAccountId, fields.toAccountId].sort()) {
          const account = await this.accountModel.findOneAndUpdate(
            { schoolId: school, id, active: true }, { $inc: { __v: 1 } },
            { session, new: true }
          ).lean();
          if (!account) throw accountError("Conta de origem ou destino inexistente, inativa ou de outra escola.", 404);
          if (account.balanceDate > asOf) {
            throw accountError("O saldo inicial de uma das contas ainda não está disponível.", 409);
          }
        }

        const result = await this.balanceService.getBalances({ asOf }, { session });
        const source = result.accounts.find(a => a.id === fields.fromAccountId);
        if (!source || !source.available || typeof source.balance !== "number") {
          throw accountError("Saldo de origem indisponível para a transferência.", 409);
        }
        if (Math.round(source.balance * 100) < Math.round(fields.amount * 100)) {
          throw accountError("Saldo insuficiente na conta de origem.", 409);
        }

        const payload = { ...fields, id: this.makeId(), schoolId: school,
          transferredAt: stamp, createdAt: stamp, updatedAt: stamp, status: "completed" };
        const [created] = await this.transferModel.create([payload], { session });
        saved = { transfer: created.toObject(), reused: false };
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
      return saved;
    } catch (error) {
      /* EN: Unique-index collisions can be legitimate concurrent retries of the same request.
         PT: Conflitos do índice único podem ser repetições simultâneas da mesma solicitação. */
      if (error?.code === 11000) {
        const repeated = await this.findReplay(school, fields);
        if (repeated) return repeated;
        throw accountError("Conflito ao registrar a transferência. Consulte o histórico.", 409);
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

