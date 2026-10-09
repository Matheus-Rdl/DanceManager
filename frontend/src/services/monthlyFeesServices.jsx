
import { useState } from "react";

export default function monthlyFeesServices() {
  const [monthlyFeesList, setMonthlyFeesList] = useState([]);
  const [monthlyFeesLoading, setMonthlyFeesLoading] = useState(false);
  const [refetchMonthlyFees, setRefetchMonthlyFees] = useState(true);
  const [paymentsList, setPaymentsList] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
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

  const getPaymentsByFee = (feeId) => {
    setPaymentsLoading(true);
    return fetch(`${url}/${feeId}/payments`, { method: "GET", headers: { "Content-Type": "application/json" } })
      .then(readResponse)
      .then((result) => { setPaymentsList(result.body); return result; })
      .catch((error) => { console.log(error); return { success: false, message: error.message }; })
      .finally(() => setPaymentsLoading(false));
  };

  const addPayment = async (feeId, paymentData) => {
    try {
      const response = await fetch(`${url}/${feeId}/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paymentData)
      });
      const result = await readResponse(response);
      setRefetchMonthlyFees(true);
      return result;
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  };

  return {
    getMonthlyFees, getMonthlyFeesByUser, getMonthlyFeesByContract, getPaymentsByFee, addPayment,
    monthlyFeesList, monthlyFeesLoading, refetchMonthlyFees, setRefetchMonthlyFees,
    paymentsList, paymentsLoading, monthlyFeesError
  };
}
