import mongoose from "mongoose";

const durationSchema = new mongoose.Schema({
  active: { type: Boolean, default: false },
  monthlyValue: { type: Number, default: 0, min: 0 }
}, { _id: false });

/* Plano da escola. Contratos guardam os preços próprios; alterações aqui não os reajustam. */
const planSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 70 },
  nameKey: { type: String, required: true, unique: true, index: true },
  description: { type: String, default: "", maxlength: 500 },
  colorId: { type: String, required: true },
  active: { type: Boolean, default: true },
  modalities: {
    Mensal: { type: durationSchema, default: () => ({}) },
    Semestral: { type: durationSchema, default: () => ({}) },
    Anual: { type: durationSchema, default: () => ({}) }
  }
}, { collection: "plans", timestamps: true });

export default mongoose.model("Plan", planSchema);
