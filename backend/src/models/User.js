import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  user_mat: { type: String, required: true, unique: true, minlength: 6, maxlength: 6 },
  user_name: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 80 },
  
  // Dados Pessoais
  user_gender: { type: Number, required: true }, 
  // user_civil_status: { type: Number, required: true },
  user_date_nasc: { type: String }, 
  
  // Documentos
  user_cpf: { type: String, minlength: 11, maxlength: 11 },
  user_rg: { type: String, maxlength: 10 },
  
  // Endereço
  user_cep: { type: String, minlength: 8, maxlength: 8 },
  user_street: { type: String, uppercase: true},
  user_number: { type: Number},
  user_complement: { type: String, uppercase: true, maxlength: 80 },
  user_district: { type: String, uppercase: true, maxlength: 80 },
  user_country: { type: String, uppercase: true},
  user_state: { type: String, uppercase: true, minlength: 2, maxlength: 2 },
  
  // Contato
  user_email: { type: String, lowercase: true, maxlength: 80 }, 
  user_phone: { type: String, required: true, minlength: 10, maxlength: 13 },
  
  // Informações de sistema
  user_registration_date: { type: String, required: true },
  user_type: [{ type: Number, required: true }], 
  // user_type: [{ type: Number, required: true }], 
  
}, { 
  timestamps: true,
  strict: false // Evita erros 500 caso o frontend envie campos extras
});

export default mongoose.model('User', userSchema, 'users');