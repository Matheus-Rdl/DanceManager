import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  action: { type: String, required: true },
  at: { type: String, required: true },
  details: { type: String, default: "" }
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  schoolId: { type: String, required: true, index: true },
  recurrenceId: { type: String, default: null, index: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  reference: { type: String, required: true, index: true },
  dueDate: { type: String, required: true },
  status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
  paidAt: { type: String, default: null },
  paidAmount: { type: Number, default: null },
  method: { type: String, default: null },
  notes: { type: String, default: "" },
  history: { type: [historySchema], default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { collection: "expenses" });

/* Um lançamento por recorrência e competência; lançamentos avulsos não entram no índice. */
expenseSchema.index({ schoolId: 1, recurrenceId: 1, reference: 1 }, {
  unique: true, partialFilterExpression: { recurrenceId: { $type: "string" } }
});
expenseSchema.index({ schoolId: 1, reference: 1, dueDate: 1 });
expenseSchema.index({ schoolId: 1, paidAt: 1 });

export default mongoose.model("Expense", expenseSchema);
