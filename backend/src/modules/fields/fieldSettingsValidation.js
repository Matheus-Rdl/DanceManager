/* Permissões configuradas no documento fields. Ausência de metadados = protegido.
   Não aceitar mudanças em códigos, tipos, opções, folders ou validações. */
export const SETTINGS_KEYS = Object.freeze(["title", "helpText", "order", "width"]);
export const allowedFieldSettings = field => field?.settingsEditable === true
  ? SETTINGS_KEYS.filter(key => Array.isArray(field.editableProperties) && field.editableProperties.includes(key))
  : [];

export function validateFieldSettings(field, payload) {
  const allow = allowedFieldSettings(field);
  if (!allow.length) return { status: 403, message: "Este campo não permite alterações nas Configurações." };
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { status: 400, message: "Dados inválidos." };
  const keys = Object.keys(payload);
  if (keys.length === 0) return { status: 400, message: "Nenhuma alteração enviada." };
  if (keys.some(key => !allow.includes(key))) return { status: 403, message: "Uma ou mais propriedades não têm permissão de edição." };
  const data = {};
  for (const key of keys) {
    const value = payload[key];
    if (key === "title") {
      if (typeof value !== "string" || !value.trim() || value.trim().length > 100)
        return { status: 400, message: "O título precisa ter entre 1 e 100 caracteres." };
      data.title = value.trim();
    }
    if (key === "helpText") {
      if (typeof value !== "string" || value.length > 1000)
        return { status: 400, message: "A explicação deve conter no máximo 1000 caracteres." };
      data.helpText = value.trim();
    }
    if (key === "width") {
      if (typeof value !== "string" || !/^\d{2,4}px$/.test(value) ||
          Number.parseInt(value, 10) < 80 || Number.parseInt(value, 10) > 1200)
        return { status: 400, message: "A largura deve estar entre 80px e 1200px." };
      data.width = value;
    }
    if (key === "order") {
      if (!Number.isInteger(value) || value < 1 || value > 999)
        return { status: 400, message: "A ordem deve ser um número inteiro entre 1 e 999." };
      data.order = value;
    }
  }
  return { data };
}
