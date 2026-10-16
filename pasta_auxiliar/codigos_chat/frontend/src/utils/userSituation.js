import { selectOptions } from "./userSelectOptions";

/* Mesmo código persistido no MongoDB, independentemente da tela. */
export const USER_SITUATION = Object.freeze({
  ACTIVE: "1",
  AWAY: "2",
  PENDING: "3",
  INACTIVE: "4"
});

const palette = {
  "1": { bg: "#dff5e6", color: "#14833b" },
  "2": { bg: "#fff2d8", color: "#a66b00" },
  "3": { bg: "#dcecff", color: "#0865c6" },
  "4": { bg: "#edf1f2", color: "#637673" }
};

/* Aceita código String/Number e textos legados, sem regravar dados antigos. */
export function getSituationCode(value) {
  const raw = typeof value === "object" && value !== null
    ? value.user_situation : value;
  const text = String(raw ?? "").trim();
  if (palette[text]) return text;
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (["ATIVO", "ATIVADO", "ACTIVE"].includes(normalized)) return "1";
  if (["AFASTADO", "PAUSADO", "AWAY"].includes(normalized)) return "2";
  if (["PRE-MATRICULA", "CADASTRO PENDENTE", "PENDENTE"].includes(normalized)) return "3";
  if (["INATIVO", "INACTIVE"].includes(normalized)) return "4";
  return "";
}

export function getUserSituation(value) {
  const code = getSituationCode(value);
  const fullLabel = selectOptions.user_situation[code];
  return {
    code,
    label: fullLabel ? fullLabel.replace(/^\d+\s*-\s*/, "") : "Não definida",
    ...(palette[code] || { bg: "#edf1f2", color: "#64748b" })
  };
}

/* Tipos na versão atual do banco: 1=Aluno; 2=Bolsista; 3=Professor(a). */
export function isStudentUser(user) {
  const types = Array.isArray(user?.user_type) ? user.user_type : [user?.user_type];
  return types.some(type => ["1", "2"].includes(String(type ?? "")));
}

export function isActiveStudent(user) {
  return isStudentUser(user) && getSituationCode(user) === USER_SITUATION.ACTIVE;
}
