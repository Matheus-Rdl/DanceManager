import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema(
  {
    // Campo para garantir a ordem em que os itens de menu aparecem na tela
    order: { type: Number, default: 0 }
  },
  { 
    strict: false, // Permite que a estrutura do menu seja totalmente dinâmica
    timestamps: true 
  }
);

export default mongoose.model('Menu', menuSchema, 'menus');