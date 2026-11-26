import mongoose from "mongoose";
import { isValidLessonAmount, isValidLessonCount } from "./privateLessonRules.js";

/* EN: Editable package template; price changes never rewrite sold packages.
   PT: Modelo de pacote editável; reajustes nunca alteram pacotes já vendidos. */
const privateLessonPlanSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, immutable: true },
  schoolId: { type: String, required: true, immutable: true },
  name: { type: String, required: true, trim: true, maxlength: 70 },
  nameKey: { type: String, required: true, trim: true, lowercase: true, maxlength: 70 },
  lessonCount: {
    type: Number, required: true,
    validate: { validator: isValidLessonCount, message: "Quantidade de aulas deve ser um inteiro positivo." }
  },
  amount: {
    type: Number, required: true,
    validate: { validator: isValidLessonAmount, message: "Informe um valor positivo com até duas casas decimais." }
  },
  active: { type: Boolean, default: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { collection: "privateLessonPlans", optimisticConcurrency: true });

privateLessonPlanSchema.index({ schoolId: 1, nameKey: 1 }, { unique: true });
privateLessonPlanSchema.index({ schoolId: 1, active: 1, name: 1 });

export default mongoose.model("PrivateLessonPlan", privateLessonPlanSchema);
