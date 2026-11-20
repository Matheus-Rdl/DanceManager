import crypto from "node:crypto";
import FinancialTransfer from "../../models/FinancialTransfer.js";
import FinancialAccount from "../../models/FinancialAccount.js";
import { schoolId } from "../expenses/expenseRules.js";
import FinancialAccountsBalanceDataAccess from "../financialAccounts/financialAccountsBalanceDataAccess.js";
import { brazilBalanceDay } from "../financialAccounts/financialAccountsBalanceRules.js";
import { accountError } from "../financialAccounts/financialAccountsRules.js";
import { sameTransferRequest, transferCreateFields, validTransferClock } from "./financialTransfersRules.js";

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
