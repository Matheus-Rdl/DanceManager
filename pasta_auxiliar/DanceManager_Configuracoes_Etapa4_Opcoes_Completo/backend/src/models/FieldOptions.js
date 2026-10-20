import mongoose from "mongoose";

/* Catálogo estático. Códigos são permanentes, mesmo com opção desativada. */
const optionSchema = new mongoose.Schema({
  value: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  order: { type: Number, required: true, min: 0 },
  active: { type: Boolean, default: true }
}, { _id: false });

const fieldOptionsSchema = new mongoose.Schema({
  optionsKey: { type: String, required: true, unique: true, index: true },
  revision: { type: Number, default: 0, min: 0 },
  options: { type: [optionSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("FieldOptions", fieldOptionsSchema, "fieldOptions");
