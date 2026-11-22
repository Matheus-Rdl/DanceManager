/* EN: Shared HTTP helper for financial account and transfer endpoints; preserves the
       { success, statusCode, body } response envelope used by the DanceManager API.
   PT: Cliente HTTP compartilhado entre contas e transferências; preserva o formato
       { success, statusCode, body } utilizado pela API do DanceManager. */
export async function financialAccountsRequest(path, { method = "GET", query = {}, data, signal } = {}) {
  const base = (import.meta.env?.VITE_API_URL ?? "").replace(/\/+$/, "");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const suffix = params.toString();
  const url = `${base}${path}${suffix ? `?${suffix}` : ""}`;
  const response = await fetch(url, {
    method,
    ...(data !== undefined ? {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    } : {}),
    ...(signal ? { signal } : {})
  });

  /* EN: Surface server-side validation messages; never turn a failed response into an empty list.
     PT: Exibe erros de validação do servidor; não interpreta falhas como listas vazias. */
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Resposta inválida do servidor financeiro.");
  }
  if (!response.ok || result?.success === false) {
    const message = typeof result?.body === "string" ? result.body :
      typeof result?.message === "string" ? result.message :
      `Erro ao consultar o financeiro (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return result?.body ?? result;
}
