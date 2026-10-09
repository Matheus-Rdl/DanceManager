import mongoose from "mongoose";

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
}, { collection: "payments" });

export default mongoose.model("Payment", paymentSchema);
