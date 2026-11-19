import mongoose from "mongoose";
import { isValidInitialBalance, isValidBalanceDate } from "./financialAccountRules.js";

/* EN: One record per account (Noh, InfinitePay, or a future account) and school.
   PT: Um registro por conta (Noh, InfinitePay ou uma conta futura) e escola. */
const financialAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  schoolId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 70 },
  nameKey: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  type: { type: String, required: true, enum: ["bank", "payment", "cash"] },

  /* EN: Opening balance is a manually captured bank balance, not revenue or an editable running total.
     PT: Saldo inicial é informado manualmente, não é receita nem um saldo corrente editável. */
  initialBalance: {
    type: Number, required: true,
    validate: { validator: isValidInitialBalance, message: "Saldo inicial deve ter até duas casas decimais." }
  },
  /* EN: The reference is the END of the indicated day; later movements will be counted from the following day.
     PT: A referência é o FIM do dia informado; movimentações posteriores contarão a partir do dia seguinte. */
  balanceDate: {
    type: String, required: true,
    validate: { validator: isValidBalanceDate, message: "Data de referência do saldo inválida (AAAA-MM-DD)." }
  },
  isDefault: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { collection: "financialAccounts" });

/* EN: Prevent duplicate account names and more than one default account per school.
   PT: Impede nomes duplicados e mais de uma conta padrão por escola. */
financialAccountSchema.index({ schoolId: 1, nameKey: 1 }, { unique: true });
financialAccountSchema.index({ schoolId: 1, isDefault: 1 }, {
  unique: true, partialFilterExpression: { isDefault: true }
});
financialAccountSchema.index({ schoolId: 1, active: 1 });

export default mongoose.model("FinancialAccount", financialAccountSchema);
