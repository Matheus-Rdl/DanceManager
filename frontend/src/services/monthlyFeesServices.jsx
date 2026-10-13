
import { useState } from "react";

export default function monthlyFeesServices() {
  const [monthlyFeesList, setMonthlyFeesList] = useState([]);
  const [monthlyFeesLoading, setMonthlyFeesLoading] = useState(false);
  const [refetchMonthlyFees, setRefetchMonthlyFees] = useState(true);
  const [monthlyFeesError, setMonthlyFeesError] = useState("");
  const url = `${import.meta.env.VITE_API_URL}/monthly-fees`;

  /* Lê o padrão atual da API e também { success, body } */
  const readResponse = async (response) => {
    const result = await response.json();
    if (!response.ok || result?.success === false || result?.ok === false) {
      throw new Error(result?.serverError || result?.message || "Erro na requisição.");
    }
    return { success: true, body: result?.body ?? result };
  };

  const getMonthlyFees = (filters = {}) => {
    setMonthlyFeesLoading(true);
    setMonthlyFeesError("");
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.append(key, value);
    });
    const endpoint = query.toString() ? `${url}?${query}` : url;
    return fetch(endpoint, { method: "GET", headers: { "Content-Type": "application/json" } })
      .then(readResponse)
      .then((result) => { setMonthlyFeesList(result.body); return result; })
      .catch((error) => { console.log(error); setMonthlyFeesError(error.message); return { success: false, message: error.message }; })
      .finally(() => { setMonthlyFeesLoading(false); setRefetchMonthlyFees(false); });
  };

  const getMonthlyFeesByUser = (userId) => getMonthlyFees({ userId });
  const getMonthlyFeesByContract = (contractId) => getMonthlyFees({ contractId });

  return {
    getMonthlyFees, getMonthlyFeesByUser, getMonthlyFeesByContract,
    monthlyFeesList, monthlyFeesLoading, refetchMonthlyFees, setRefetchMonthlyFees,
    monthlyFeesError
  };
}
