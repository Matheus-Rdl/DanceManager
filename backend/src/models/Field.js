import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema(
  {
    // Campo opcional para garantir ordenação
    order: { type: Number, default: 0 }
  },
  { 
    strict: false, // Fundamental: permite que campos dinâmicos (label, type, dependsOn, etc.) existam
    timestamps: true 
  }
);

export default mongoose.model('Field', fieldSchema, 'fields');