import { useState } from "react";

export default function paymentsServices() {
  const [paymentsList, setPaymentsList] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const url = `${import.meta.env.VITE_API_URL}/payments`;

  /* Consulta o histórico de pagamentos, preservando o padrão da API. */
  const getPayments = async (filters = {}) => {
    setPaymentsLoading(true);
    setPaymentsError("");
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.append(key, value);
    });
    try {
      const response = await fetch(`${url}?${query}`, {
        method: "GET", headers: { "Content-Type": "application/json" }
      });
      const result = await response.json();
      if (!response.ok || result?.success === false || result?.ok === false) {
        throw new Error(result?.serverError || result?.message || (typeof result?.body === "string" ? result.body : "Erro ao buscar pagamentos."));
      }
      const body = result?.body ?? result;
      if (!Array.isArray(body)) throw new Error("Resposta de pagamentos inválida.");
      setPaymentsList(body);
      return { success: true, body };
    } catch (error) {
      setPaymentsList([]);
      setPaymentsError(error.message);
      return { success: false, message: error.message };
    } finally {
      setPaymentsLoading(false);
    }
  };

  const getPaymentsByUser = (userId) => getPayments({ userId });
  const getPaymentsByContract = (contractId) => getPayments({ contractId });
  const getPaymentsByFee = (monthlyFeeId) => getPayments({ monthlyFeeId });

  /* Registra pagamento e devolve { payment, monthlyFee }. */
  const addPayment = async (feeId, paymentData) => {
    setPaymentSaving(true);
    setPaymentsError("");
    try {
      const response = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...paymentData, monthlyFeeId: feeId })
      });
      const result = await response.json();
      if (!response.ok || result?.success === false || result?.ok === false) {
        throw new Error(result?.message || result?.serverError || (typeof result?.body === "string" ? result.body : "Erro ao registrar pagamento."));
      }
      return { success: true, body: result?.body ?? result };
    } catch (error) {
      setPaymentsError(error.message);
      return { success: false, message: error.message };
    } finally { setPaymentSaving(false); }
  };

  return { getPayments, getPaymentsByUser, getPaymentsByContract, getPaymentsByFee, addPayment, paymentsList, paymentsLoading, paymentsError, paymentSaving };
}
