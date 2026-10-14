import mongoose from "mongoose";

const recurrenceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  schoolId: { type: String, required: true, index: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  dueDay: { type: Number, required: true, min: 1, max: 31 },
  startMonth: { type: String, required: true },
  active: { type: Boolean, default: true },
  endedAt: { type: String, default: null },
  history: { type: [{ action: String, at: String, details: String }], default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { collection: "expenseRecurrences" });

export default mongoose.model("ExpenseRecurrence", recurrenceSchema);
