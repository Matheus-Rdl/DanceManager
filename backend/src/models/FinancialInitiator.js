import mongoose from "mongoose";

/* Keep the saved name while allowing a future user ID link without rewriting historical records.
   Preserva o nome histórico e permite vincular futuramente o ID do usuário. */
const financialInitiatorSchema = new mongoose.Schema({
  kind: { type: String, enum: ["fixed", "user"], required: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
  userId: { type: String, default: null }
}, { _id: false });

export default financialInitiatorSchema;
