/* Cores de identificação dos planos: não representam situação de pagamento. */
export const PLAN_PALETTES = Object.freeze([
  { id: "purple", name: "Roxo", fg: "#5947c7", bg: "#e8e3ff" },
  { id: "green", name: "Verde", fg: "#08715c", bg: "#d8f2eb" },
  { id: "blue", name: "Azul", fg: "#0865c6", bg: "#dcecff" },
  { id: "brown", name: "Marrom", fg: "#7b461c", bg: "#eee2d6" },
  { id: "teal", name: "Petróleo", fg: "#14655b", bg: "#e6f3f0" },
  { id: "rose", name: "Rosa", fg: "#a12e68", bg: "#fbe1ec" },
  { id: "orange", name: "Laranja", fg: "#98540b", bg: "#ffedd3" },
  { id: "slate", name: "Cinza", fg: "#46566f", bg: "#e8edf4" },
  { id: "cyan", name: "Turquesa", fg: "#086a79", bg: "#def5f7" },
  { id: "indigo", name: "Índigo", fg: "#3d4b9b", bg: "#e2e7ff" },
  { id: "emerald", name: "Esmeralda", fg: "#146d42", bg: "#dff5e6" },
  { id: "red", name: "Vermelho", fg: "#a32f3b", bg: "#ffe2e6" }
]);
export const SYSTEM_PLAN_COLORS = Object.freeze({
  Mensal: { fg: "#0865C6", bg: "#DCEcff" },
  Personalizado: { fg: "#7543A7", bg: "#F0E3FF" },
  Bolsista: { fg: "#93600C", bg: "#FFF0D6" }
});
export const FALLBACK_PLAN_COLOR = { fg: "#46566f", bg: "#e8edf4" };
const LEGACY_COLORS = { Raiz: "purple", "Balanço": "green", "Imersão": "blue", Beco: "brown" };
export const getPalette = colorId => PLAN_PALETTES.find(item => item.id === colorId) || FALLBACK_PLAN_COLOR;
export function getContractColor(name, plans = []) {
  if (SYSTEM_PLAN_COLORS[name]) return SYSTEM_PLAN_COLORS[name];
  const plan = plans.find(item => item.name === name);
  return getPalette(plan?.colorId || LEGACY_COLORS[name]);
}
export const PLAN_DURATIONS = Object.freeze({ Mensal: 1, Semestral: 6, Anual: 12 });
