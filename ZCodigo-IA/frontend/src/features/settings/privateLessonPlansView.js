export const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const emptyPlan = () => ({ name: "", lessonCount: "", amount: "", active: true });
export const planForm = plan => ({ name: plan.name, lessonCount: String(plan.lessonCount), amount: String(plan.amount), active: plan.active });

/* EN: Validate input before sending numeric values; the backend remains authoritative.
   PT: Valida os campos antes de enviar números; o backend continua sendo a autoridade. */
export function buildPlanPayload(form, original = null) {
  const name = form.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 70 || !/[\p{L}\p{N}]/u.test(name)) throw new Error("Informe um nome válido de até 70 caracteres.");
  const countText = String(form.lessonCount).trim();
  const lessonCount = Number(countText);
  if (!/^\d+$/.test(countText) || !Number.isSafeInteger(lessonCount) || lessonCount <= 0) throw new Error("Informe uma quantidade inteira positiva de aulas.");
  const amountText = String(form.amount).trim().replace(",", ".");
  const amount = Number(amountText);
  const cents = amount * 100;
  if (!/^\d+(\.\d{1,2})?$/.test(amountText) || amount <= 0 || !Number.isSafeInteger(Math.round(cents)) || Math.abs(cents - Math.round(cents)) >= 1e-7)
    throw new Error("Informe um valor positivo com até duas casas decimais.");
  const data = { name, lessonCount, amount };
  if (!original) return data;
  data.active = form.active;
  return Object.fromEntries(Object.entries(data).filter(([key, value]) => original[key] !== value));
}

/* EN: Filtering is local; never hide inactive models by deleting them.
   PT: Os filtros são locais; modelos inativos nunca são excluídos. */
const normalize = value => String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
export function filterPlans(plans, search, status) {
  const term = normalize(search.trim());
  return plans.filter(plan => (status === "all" || plan.active === (status === "active")) && normalize(plan.name).includes(term));
}
