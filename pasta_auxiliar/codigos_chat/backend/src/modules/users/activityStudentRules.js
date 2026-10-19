/* Regras reutilizáveis para vínculos atuais com turmas.
   Não cria histórico de matrículas e não modifica cobranças/pagamentos. */
export const normalizeMat = value => String(value ?? "").trim();

export const activityMats = user => (Array.isArray(user?.user_activities) ? user.user_activities : [])
  .map(item => normalizeMat(typeof item === "object" && item !== null
    ? (item.activity_mat ?? item.activityMat ?? "") : item))
  .filter(Boolean);

export const isEnrolled = (user, mat) => activityMats(user).includes(normalizeMat(mat));
export const isStudent = user => (Array.isArray(user?.user_type) ? user.user_type : [user?.user_type])
  .some(type => ["1", "2"].includes(String(type)));
export const needsConfirmation = user => ["2", "4"].includes(String(user?.user_situation ?? ""));

export const filterEnrollmentItems = (items, mat) =>
  (Array.isArray(items) ? items : []).filter(item => normalizeMat(typeof item === "object" && item !== null
    ? (item.activity_mat ?? item.activityMat ?? "") : item) !== normalizeMat(mat));
