import { isValidInitialBalance, isValidBalanceDate } from "./financialAccountRules.js";

export const PRIVATE_PACKAGE_STATUSES = ["active", "completed", "cancelled"];
export const PRIVATE_LESSON_STATUSES = ["scheduled", "completed", "absent", "cancelled"];

/* EN: A package contains a positive, whole number of lessons and a positive BRL amount.
   PT: Um pacote contém uma quantidade inteira positiva de aulas e um valor positivo em reais. */
export const isValidLessonCount = value => Number.isSafeInteger(value) && value > 0;
export const isValidLessonAmount = value => isValidInitialBalance(value) && value > 0;

/* EN: Participants refer to existing User._id values, never enrollment numbers.
   PT: Participantes referenciam User._id existentes, nunca números de matrícula. */
export const hasValidParticipants = values => Array.isArray(values) && values.length > 0 &&
  values.every(value => typeof value === "string" && /^[a-f0-9]{24}$/.test(value)) &&
  new Set(values).size === values.length;

export const isValidLessonDate = isValidBalanceDate;

/* EN: Use canonical UTC instants so the future calendar can compare intervals safely.
   PT: Usa instantes UTC canônicos para o futuro calendário comparar intervalos com segurança. */
export const isValidLessonTimestamp = value => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
};

export const isValidLessonInterval = (start, end) =>
  isValidLessonTimestamp(start) && isValidLessonTimestamp(end) && start < end;
