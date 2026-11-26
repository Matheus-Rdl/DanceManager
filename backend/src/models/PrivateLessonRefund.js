import mongoose from "mongoose";
import { paymentCents, paymentId, validStoredPaymentDate, validStoredPaymentTimestamp } from "./privateLessonPaymentRules.js";

/* EN: Immutable journal entry linked to a receipt and an actual expense.
   PT: Registro de histórico vinculado a um recebimento e a uma saída efetiva. */
export default new mongoose.Schema({
  id: { type: String, required: true, validate: paymentId },
  requestId: { type: String, required: true, validate: paymentId },
  paymentId: { type: String, required: true, validate: paymentId },
  accountId: { type: String, required: true, validate: paymentId },
  amount: { type: Number, required: true, validate: v => { try { paymentCents(v); return true; } catch { return false; } } },
  refundedAt: { type: String, required: true, validate: validStoredPaymentDate },
  method: { type: String, required: true, trim: true, maxlength: 70 },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  createdAt: { type: String, required: true, validate: validStoredPaymentTimestamp }
}, { _id: false });
