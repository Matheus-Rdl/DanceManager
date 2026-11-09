import mongoose from "mongoose";

/* Historical changes are embedded in each payment and must never be overwritten.
   Alterações históricas ficam anexadas ao pagamento e não devem ser sobrescritas. */
const paymentAuditSchema = new mongoose.Schema({
  action: { type: String, enum: ["edited", "reversed"], required: true },
  at: { type: String, required: true },
  reason: { type: String, required: true },
  actor: { kind: String, key: String, name: String, userId: { type: String, default: null } },
  before: { type: mongoose.Schema.Types.Mixed, required: true },
  after: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  monthlyFeeId: { type: String, required: true, index: true },
  contractId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, required: true },
  paidAt: { type: String, required: true },
  receipt: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
  status: { type: String, enum: ["confirmed", "reversed"], default: "confirmed" },
  updatedAt: { type: String, default: null },
  reversedAt: { type: String, default: null },
  reversalReason: { type: String, default: null },
  reversedBy: { kind: String, key: String, name: String, userId: { type: String, default: null } },
  auditHistory: { type: [paymentAuditSchema], default: [] }
}, { collection: "payments" });

export default mongoose.model("Payment", paymentSchema);
