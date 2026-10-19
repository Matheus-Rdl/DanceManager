/* Professores vinculados pelo ID MongoDB; nomes são resolvidos no backend. */
export function getActivityTeacherNames(activity, users = []) {
  const names = (Array.isArray(activity?.activity_teacher_names) ? activity.activity_teacher_names : [])
    .filter(name => name && name !== "Professor não encontrado");
  if (names.length) return names;
  const ids = Array.isArray(activity?.activity_teachers) ? activity.activity_teachers.map(String) : [];
  if (ids.length) {
    const byId = new Map(users.map(user => [String(user._id), user.user_name || user.name || ""]));
    return ids.map(id => byId.get(id) || "Professor não encontrado");
  }
  const legacy = activity?.activity_teacher_name ?? activity?.activity_teacher ??
    activity?.activity_professor ?? activity?.teacher_name ?? activity?.teacher ?? activity?.professor;
  const name = legacy && typeof legacy === "object" ? (legacy.user_name || legacy.name || legacy.teacher_name) : legacy;
  return name ? [String(name)] : [];
}

export function getActivityTeacherLabel(activity, users = []) {
  return getActivityTeacherNames(activity, users).join(", ") || "Não informado";
}
