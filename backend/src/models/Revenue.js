import mongoose from "mongoose";
import financialInitiatorSchema from "./FinancialInitiator.js";

const historySchema = new mongoose.Schema({
  action: { type: String, required: true },
  at: { type: String, required: true },
  details: { type: String, default: "" },
  reason: { type: String, default: "" },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

/* Revenue is separate from monthly-fee Payment: the same amount must not be counted twice.
   Provento separado dos pagamentos de mensalidade para evitar dupla contabilização. */
const revenueSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  schoolId: { type: String, required: true, index: true },
  sourceType: { type: String, enum: ["manual", "event", "sale", "service"], required: true, default: "manual" },
  sourceId: { type: String, default: null },
  description: { type: String, required: true },
  category: { type: String, required: true },
  initiator: { type: financialInitiatorSchema, default: null },
  amount: { type: Number, required: true, min: 0 },
  reference: { type: String, required: true, index: true },
  dueDate: { type: String, required: true },
  status: { type: String, enum: ["pending", "received", "cancelled"], default: "pending" },
  receivedAt: { type: String, default: null },
  receivedAmount: { type: Number, default: null },
  method: { type: String, default: null },
  notes: { type: String, default: "" },
  history: { type: [historySchema], default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { collection: "revenues" });

revenueSchema.index({ schoolId: 1, reference: 1, dueDate: 1 });
revenueSchema.index({ schoolId: 1, status: 1, receivedAt: 1 });
/* Reserved for future integrations: one revenue per source transaction.
   Reservado para integrações futuras: uma receita por transação de origem. */
revenueSchema.index({ schoolId: 1, sourceType: 1, sourceId: 1 }, {
  unique: true, partialFilterExpression: { sourceId: { $type: "string" } }
});

export default mongoose.model("Revenue", revenueSchema);
