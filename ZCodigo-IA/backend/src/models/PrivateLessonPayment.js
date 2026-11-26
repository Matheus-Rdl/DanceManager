import mongoose from "mongoose";
import { paymentCents, paymentId, validStoredPaymentDate, validStoredPaymentTimestamp } from "./privateLessonPaymentRules.js";

/* EN: Embedded receipt, not a separate financial movement. The finance integration will persist both in one transaction.
   PT: Recebimento incorporado, não uma movimentação financeira separada. A integração gravará ambos em uma transação. */
const schema = new mongoose.Schema({
  id: { type: String, required: true, validate: paymentId },
  requestId: { type: String, required: true, validate: paymentId },
  amount: { type: Number, required: true, validate: value => { try { paymentCents(value); return true; } catch { return false; } } },
  receivedAt: { type: String, required: true, validate: validStoredPaymentDate },
  method: { type: String, required: true, trim: true, maxlength: 70 },
  accountId: { type: String, required: true, validate: paymentId },
  notes: { type: String, default: "", trim: true, maxlength: 500 },
  createdAt: { type: String, required: true, validate: validStoredPaymentTimestamp }
}, { _id: false });
export default schema;
