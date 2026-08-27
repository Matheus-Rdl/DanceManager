// Funções individuais de validação
const isRequired = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const hasMinLength = (value, min) => String(value).trim().length >= min;
const hasMaxLength = (value, max) => String(value).trim().length <= max;

const isAlpha = (value) => /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(value.trim());
//const isAlphaFree = (value) => /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s()\/\-,.]+$/.test(value.trim());
const isAlphaFree = (value) => /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,\-\/()]+$/.test(value.trim());
const isNumeric = (value) => /^\d+$/.test(value);
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value.trim()); // formato YYYY-MM-DD
const isCPF = (value) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value.trim()); // formato 000.000.000-00

// Função principal: recebe o field (com regras) e o valor do formData
export function validateField(field, value) {
  const errors = [];

  // 🔹 Campo obrigatório
  if (field.required && !isRequired(value)) {
    errors.push("Campo obrigatório");
    return errors; // nem continua se estiver vazio
  }

  console.log(field.type, field.title);
  // 🔹 Tipo
  switch (field.type) {
    case "text":
      if (value && !isAlpha(value)) errors.push("Deve conter apenas letras");
      break;

    case "textfree":
      if (value && !isAlphaFree(value))
        errors.push("Caracteres inválidos");
      break;


    case "number":
      if (value && !isNumeric(value)) errors.push("Deve conter apenas números");
      break;

    case "email":
      if (value && !isEmail(value)) errors.push("E-mail inválido");
      break;

    case "date":
      if (value && !isDate(value)) errors.push("Data inválida");
      break;

    case "cep":
      if (value && !isNumeric(value)) errors.push("Deve conter apenas números");
      break;

    case "cpf":
      if (value && !isNumeric(value)) errors.push("Deve conter apenas números");

      // Verifica se tem exatamente 11 dígitos
      /*
      if (!/^\d{11}$/.test(numericCPF)) {
        errors.push("CPF deve conter exatamente 11 números");
      }
      */

      break;

    default:
      break;
  }

  // 🔹 Tamanho mínimo e máximo (se definidos)
  if (
    field.minLength &&
    field.maxLength &&
    field.minLength === field.maxLength
  ) {
    if (String(value).length !== field.minLength) {
      errors.push(`Deve conter exatamente ${field.minLength} caracteres`);
    }
  } else {
    if (field.minLength && !hasMinLength(value, field.minLength)) {
      errors.push(`Mínimo de ${field.minLength} caracteres`);
    }
    if (field.maxLength && !hasMaxLength(value, field.maxLength)) {
      errors.push(`Máximo de ${field.maxLength} caracteres`);
    }
  }
  return errors;
}
