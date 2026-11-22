import mongoose from "mongoose";
import financialInitiatorSchema from "./FinancialInitiator.js";
import {
  isValidTransferAmount,
  isValidTransferAccountId,
  hasDistinctTransferAccounts,
  isValidTransferTimestamp
} from "./financialTransferRules.js";

/* EN: This collection records an internal movement between two accounts of the SAME school.
       A transfer is neither revenue nor an expense and never stores a running balance.
   PT: Esta coleção registra movimentação interna entre duas contas da MESMA escola.
       Transferência não é provento nem despesa e nunca armazena saldo corrente. */
const financialTransferSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, immutable: true },
  schoolId: { type: String, required: true, index: true, immutable: true },

  /* EN: The API must verify both UUIDs belong to active accounts of this school.
     PT: A API deve verificar que ambos UUIDs pertencem a contas ativas desta escola. */
  fromAccountId: {
    type: String, required: true, immutable: true,
    validate: { validator: isValidTransferAccountId, message: "Conta de origem inválida." }
  },
  toAccountId: {
    type: String, required: true, immutable: true,
    validate: {
      validator: function (value) { return hasDistinctTransferAccounts(this.fromAccountId, value); },
      message: "Origem e destino devem ser contas diferentes e válidas."
    }
  },
  amount: {
    type: Number, required: true, immutable: true,
    validate: { validator: isValidTransferAmount, message: "Informe um valor positivo com até duas casas decimais." }
  },
  transferredAt: {
    type: String, required: true, immutable: true,
    validate: { validator: isValidTransferTimestamp, message: "Data e hora UTC da transferência inválidas." }
  },
  note: { type: String, default: "", trim: true, maxlength: 500, immutable: true },

  /* EN: Reusing a request key cannot create a second transfer in the same school.
       The API will generate/check this key and handle index conflicts in Commit 11.
     PT: Repetir a chave da requisição não cria outra transferência na mesma escola.
       A API criará/conferirá a chave e tratará conflitos no Commit 11. */
  idempotencyKey: { type: String, required: true, trim: true, minlength: 8, maxlength: 128, immutable: true },

  /* EN: Preserve the original transfer when reversed; do not delete or rewrite its amount.
     PT: Preserva a transferência original ao estornar; não apaga nem altera seu valor. */
  status: { type: String, enum: ["completed", "reversed"], default: "completed", required: true },
  createdBy: { type: financialInitiatorSchema, default: null, immutable: true },
  reversedAt: {
    type: String, default: null,
    required: function () { return this.status === "reversed"; },
    validate: {
      validator: value => value == null || isValidTransferTimestamp(value),
      message: "Data e hora do estorno inválidas."
    }
  },
  reversalReason: {
    type: String, default: null, trim: true, maxlength: 500,
    required: function () { return this.status === "reversed"; }
  },
  reversedBy: { type: financialInitiatorSchema, default: null },
  createdAt: {
    type: String, required: true, immutable: true,
    validate: { validator: isValidTransferTimestamp, message: "Data de criação inválida." }
  },
  updatedAt: {
    type: String, required: true,
    validate: { validator: isValidTransferTimestamp, message: "Data de atualização inválida." }
  }
}, { collection: "financialTransfers" });

/* EN: Unique request keys protect against network retries; indexes support account-history queries.
   PT: Chaves únicas evitam duplicações por novas tentativas; índices atendem ao histórico das contas. */
financialTransferSchema.index({ schoolId: 1, idempotencyKey: 1 }, { unique: true });
financialTransferSchema.index({ schoolId: 1, fromAccountId: 1, transferredAt: -1 });
financialTransferSchema.index({ schoolId: 1, toAccountId: 1, transferredAt: -1 });
financialTransferSchema.index({ schoolId: 1, transferredAt: -1 });
/* EN: Lookup reversals by date without scanning every old transfer.
   PT: Consulta estornos por data sem percorrer todas as transferências antigas. */
financialTransferSchema.index({ schoolId: 1, reversedAt: -1 });

export default mongoose.model("FinancialTransfer", financialTransferSchema);
