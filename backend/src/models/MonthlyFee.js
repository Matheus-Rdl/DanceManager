import mongoose from "mongoose";

const monthlyFeeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  contractId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  reference: { type: String, required: true, index: true },
  number: { type: Number, required: true },
  periodStart: { type: String, required: true },
  periodEnd: { type: String, required: true },
  dueDate: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["paid", "pending", "overdue", "upcoming", "partial", "cancelled"], default: "upcoming" },
  createdAt: { type: String, required: true },
}, { collection: "monthlyFees" });

monthlyFeeSchema.index({ contractId: 1, reference: 1 }, { unique: true });

export default mongoose.model("MonthlyFee", monthlyFeeSchema);
