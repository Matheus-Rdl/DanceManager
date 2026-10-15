import { useCallback, useEffect, useRef, useState } from "react";

/* Normaliza a resposta e mantém o contrato já utilizado pela API. */
const readResponse = async (response) => {
  const result = await response.json();
  if (!response.ok || result?.success === false || result?.ok === false) {
    throw new Error(result?.serverError || result?.message || "Erro na requisição.");
  }
  return { success: true, body: result?.body ?? result };
};

export default function monthlyFeesServices() {
  const [monthlyFeesList, setMonthlyFeesList] = useState([]);
  const [monthlyFeesLoading, setMonthlyFeesLoading] = useState(false);
  const [monthlyFeesReference, setMonthlyFeesReference] = useState(null);
  const [refetchMonthlyFees, setRefetchMonthlyFees] = useState(true);
  const [monthlyFeesError, setMonthlyFeesError] = useState("");
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);
  const url = `${import.meta.env.VITE_API_URL}/monthly-fees`;

  const getMonthlyFees = useCallback(async (filters = {}) => {
    /* Invalida a busca antiga mesmo que o servidor ignore o cancelamento. */
    const requestId = ++requestIdRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    /* Some com os registros e indicadores da competência anterior imediatamente. */
    setMonthlyFeesList([]);
    setMonthlyFeesReference(null);
    setMonthlyFeesError("");
    setMonthlyFeesLoading(true);

    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.append(key, value);
    });
    const endpoint = query.toString() ? `${url}?${query}` : url;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal
      });
      const result = await readResponse(response);
      if (requestId !== requestIdRef.current || controller.signal.aborted) return { success: false, cancelled: true };
      if (!Array.isArray(result.body)) throw new Error("A API não retornou uma lista de mensalidades válida.");

      /* Publica lista e competência juntas, depois que a API entregou os status. */
      setMonthlyFeesList(result.body);
      setMonthlyFeesReference(filters.reference ?? null);
      return result;
    } catch (error) {
      if (requestId !== requestIdRef.current || error.name === "AbortError") {
        return { success: false, cancelled: true };
      }
      console.error("Erro ao carregar mensalidades:", error);
      setMonthlyFeesList([]);
      /* A consulta terminou com erro: permite mostrar a mensagem em vez de um loading infinito. */
      setMonthlyFeesReference(filters.reference ?? null);
      setMonthlyFeesError(error.message || "Erro ao carregar mensalidades.");
      return { success: false, message: error.message };
    } finally {
      /* Uma requisição velha nunca encerra o loading de uma nova. */
      if (requestId === requestIdRef.current) {
        abortControllerRef.current = null;
        setMonthlyFeesLoading(false);
        setRefetchMonthlyFees(false);
      }
    }
  }, [url]);

  /* Interrompe a requisição ao desmontar a página. */
  useEffect(() => () => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
  }, []);

  const getMonthlyFeesByUser = (userId) => getMonthlyFees({ userId });
  const getMonthlyFeesByContract = (contractId) => getMonthlyFees({ contractId });

  return {
    getMonthlyFees, getMonthlyFeesByUser, getMonthlyFeesByContract,
    monthlyFeesList, monthlyFeesLoading, monthlyFeesReference,
    refetchMonthlyFees, setRefetchMonthlyFees, monthlyFeesError
  };
}
