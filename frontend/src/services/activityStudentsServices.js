/* Vínculos atuais de alunos com uma turma.
   Endpoints preservam histórico financeiro e chamadas já registradas. */
const base = `${import.meta.env.VITE_API_URL}/users/activity`;

async function read(response) {
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(`A API respondeu com um formato inválido (${response.status}).`); }
  if (!response.ok || payload?.success === false) {
    throw new Error(typeof payload?.body === "string" ? payload.body : payload?.message || "Erro ao consultar alunos da turma.");
  }
  return payload?.body;
}

export async function listActivityStudents(activityMat, signal) {
  return read(await fetch(`${base}/${encodeURIComponent(activityMat)}`, { signal }));
}

export async function listActivityCandidates(activityMat, search = "", signal) {
  const params = new URLSearchParams({ search });
  return read(await fetch(`${base}/${encodeURIComponent(activityMat)}/candidates?${params}`, { signal }));
}

export async function addActivityStudents(activityMat, userIds, confirmNonActive = false) {
  return read(await fetch(`${base}/${encodeURIComponent(activityMat)}/students`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds, confirmNonActive })
  }));
}

export async function removeActivityStudent(activityMat, userId) {
  return read(await fetch(`${base}/${encodeURIComponent(activityMat)}/students/${encodeURIComponent(userId)}`, {
    method: "DELETE"
  }));
}
