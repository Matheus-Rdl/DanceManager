import { useEffect, useState } from "react";
import { Box, Button, Checkbox, Dialog, Flex, Input, NativeSelect, Portal, Text, Textarea, VStack } from "@chakra-ui/react";
import { FiAlertTriangle, FiClock, FiEdit2, FiRotateCcw, FiX } from "react-icons/fi";
import paymentsServices from "../../services/paymentsServices";

const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
const dateBR = value => {
  if (!value) return "—";
  const parts = String(value).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
};
const actorLabel = audit => audit?.actor?.name || "Não informado";
const actions = { edited: "Pagamento editado", reversed: "Pagamento estornado" };

/* Shared payment correction dialog, available in installments and student history.
   Formulário compartilhado de edição, estorno e auditoria nas duas telas. */
export default function PaymentManagementDialog({ payment, mode, onClose, onSaved }) {
  const { editPayment, reversePayment, paymentSaving } = paymentsServices();
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [method, setMethod] = useState("Pix");
  const [receipt, setReceipt] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const open = Boolean(payment && mode);
  const reversed = payment?.status === "reversed";

  useEffect(() => {
    if (!payment || !mode) return;
    setAmount(String(payment.amount ?? ""));
    setPaidAt(String(payment.paidAt || "").slice(0, 10));
    setMethod(payment.method || "Pix");
    setReceipt(payment.receipt === true);
    setReason("");
    setError("");
  }, [payment?.id, mode, open]);

  const submit = async () => {
    if (paymentSaving || !payment || reversed) return;
    if (reason.trim().length < 10) { setError("Explique o motivo em pelo menos 10 caracteres."); return; }
    const body = { reason: reason.trim() };
    if (mode === "edit") {
      const n = Number(String(amount).trim().replace(",", "."));
      if (!Number.isFinite(n) || n <= 0 || Math.round(n * 100) / 100 !== n) { setError("Informe um valor positivo com até duas casas decimais."); return; }
      if (!paidAt || !method.trim()) { setError("Informe data e forma de pagamento."); return; }
      Object.assign(body, { amount: n, paidAt, method, receipt });
    }
    setError("");
    const result = mode === "reverse" ? await reversePayment(payment.id, body) : await editPayment(payment.id, body);
    if (!result.success) { setError(result.message || "Não foi possível atualizar o pagamento."); return; }
    await onSaved?.();
    onClose?.();
  };

  const history = [...(payment?.auditHistory || [])].reverse();
  return (
    <Dialog.Root open={open} onOpenChange={event => { if (!event.open && !paymentSaving) onClose?.(); }} size="md">
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content mx={3} maxW="480px" borderRadius="10px">
        <Dialog.Header>
          <Dialog.Title color="#063f39" display="flex" alignItems="center" gap={2}>
            {mode === "edit" ? <><FiEdit2 /> Editar pagamento</> : mode === "reverse" ? <><FiRotateCcw /> Estornar pagamento</> : <><FiClock /> Histórico do pagamento</>}
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body><VStack align="stretch" gap={3}>
          <Box bg="#f5f8f7" borderRadius="8px" p={3}>
            <Text fontSize="12px" fontWeight="700">Pagamento original: {money(payment?.amount)} • {dateBR(payment?.paidAt)}</Text>
            <Text fontSize="11px" color="#60777c">{payment?.method || "—"} • {reversed ? "Estornado" : "Confirmado"}</Text>
          </Box>
          {mode === "history" ? <>
            <Text fontSize="12px" fontWeight="600">Registro criado em {dateBR(payment?.createdAt)}</Text>
            {history.length === 0 && <Text fontSize="12px" color="#60777c">Nenhuma edição ou estorno registrado.</Text>}
            {history.map((item, i) => (
              <Box key={`${item.at}-${i}`} p={3} border="1px solid #dce7e4" borderRadius="8px">
                <Text fontWeight="700" fontSize="12px">{actions[item.action] || item.action}</Text>
                <Text fontSize="11px" color="#60777c">{dateBR(item.at)} • {actorLabel(item)}</Text>
                <Text mt={2} fontSize="11px">Motivo: {item.reason}</Text>
                {item.action === "edited" && <VStack mt={2} gap={1} align="stretch">
                  <Text fontSize="11px">Valor: {money(item.before?.amount)} → {money(item.after?.amount)}</Text>
                  <Text fontSize="11px">Data: {dateBR(item.before?.paidAt)} → {dateBR(item.after?.paidAt)}</Text>
                  <Text fontSize="11px">Forma: {item.before?.method || "—"} → {item.after?.method || "—"}</Text>
                </VStack>}
              </Box>
            ))}
          </> : <>
            {mode === "edit" && <>
              <Box><Text fontSize="11px" mb={1}>Valor recebido (R$)</Text><Input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Box>
              <Box><Text fontSize="11px" mb={1}>Data do pagamento</Text><Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} /></Box>
              <Box><Text fontSize="11px" mb={1}>Forma de pagamento</Text>
                <NativeSelect.Root><NativeSelect.Field value={method} onChange={e => setMethod(e.target.value)}>
                  {["Pix", "Dinheiro", "Cartão", "Transferência"].filter(x => x !== method).concat(method).sort().map(x => <option key={x} value={x}>{x}</option>)}
                </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
              </Box>
              <Checkbox.Root checked={receipt} onCheckedChange={e => setReceipt(e.checked === true)}><Checkbox.HiddenInput /><Checkbox.Control /><Checkbox.Label fontSize="12px">Comprovante informado</Checkbox.Label></Checkbox.Root>
            </>}
            {mode === "reverse" && <Flex align="start" gap={2} p={3} bg="#fff3ef" borderRadius="8px" color="#9b3029">
              <FiAlertTriangle /><Text fontSize="12px">Estorno administrativo: o valor deixará de contar como recebido. Esta ação não representa devolução de dinheiro ao aluno.</Text>
            </Flex>}
            <Box><Text fontSize="11px" mb={1}>Justificativa obrigatória</Text>
              <Textarea rows={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explique o motivo da alteração ou do estorno (mínimo de 10 caracteres)." />
            </Box>
            {error && <Text fontSize="12px" color="red.600">{error}</Text>}
          </>}
        </VStack></Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" disabled={paymentSaving} onClick={onClose}>Fechar</Button>
          {mode !== "history" && <Button loading={paymentSaving} disabled={reversed || reason.trim().length < 10} bg={mode === "reverse" ? "#ab352e" : "#003f36"} color="white" onClick={submit}>
            {mode === "reverse" ? <><FiRotateCcw /> Confirmar estorno</> : <><FiEdit2 /> Salvar edição</>}
          </Button>}
        </Dialog.Footer>
        <Dialog.CloseTrigger asChild><Button position="absolute" top="10px" right="10px" variant="ghost" size="sm" aria-label="Fechar"><FiX /></Button></Dialog.CloseTrigger>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  );
}
