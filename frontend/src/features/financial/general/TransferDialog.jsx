import { useRef, useState } from "react";
import { Box, Button, Dialog, Flex, Input, NativeSelect, Portal, Text, Textarea, VStack } from "@chakra-ui/react";
import { FiArrowDown, FiCheckCircle, FiX } from "react-icons/fi";
import { RiArrowLeftRightLine } from "react-icons/ri";
import financialTransfersServices from "../../../services/financialTransfersServices";
import { financialInitiators } from "./financialInitiators";
import { financialAccountMoney } from "./financialAccountsView";
import { activeTransferAccounts, validateTransferDraft } from "./financialTransferDraft";
import { createTransferSubmission } from "./financialTransferSubmission";
import { COLORS } from "./financialPeriod";

const emptyDraft = () => ({
  fromAccountId: "", toAccountId: "", amount: "", initiatorKey: "", note: ""
});

/* EN: Confirm an internal transfer through the existing API after reviewing the draft.
       Request state is held in a ref to block concurrent submissions immediately.
   PT: Confirma uma transferência interna pela API após a revisão do formulário.
       Um ref bloqueia envios simultâneos sem depender do próximo render do React. */
export default function TransferDialog({ open = false, onClose, onCompleted, accounts = [] }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [attempted, setAttempted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submissionRef = useRef(null);
  if (!submissionRef.current) {
    submissionRef.current = createTransferSubmission({ send: data => financialTransfersServices.create(data) });
  }
  const availableAccounts = activeTransferAccounts(accounts);
  const result = validateTransferDraft(draft, accounts);
  const { errors } = result;

  const update = (field, value) => {
    if (submissionRef.current.isPending()) return;
    submissionRef.current.invalidate();
    setSubmitError("");
    setDraft(previous => ({
      ...previous,
      [field]: value,
      /* EN: A new origin cannot remain selected as destination.
         PT: A nova origem não pode permanecer selecionada como destino. */
      ...(field === "fromAccountId" && previous.toAccountId === value ? { toAccountId: "" } : {})
    }));
    setReviewing(false);
  };

  const close = () => {
    /* EN: Never close/reset while a request may have been committed server-side.
       PT: Não fecha nem limpa o formulário enquanto a gravação pode estar ocorrendo. */
    if (submissionRef.current.isPending()) return;
    submissionRef.current.invalidate();
    setDraft(emptyDraft());
    setAttempted(false);
    setReviewing(false);
    setSubmitError("");
    onClose?.();
  };

  const review = () => {
    if (submissionRef.current.isPending()) return;
    setAttempted(true);
    setSubmitError("");
    setReviewing(result.valid);
  };

  const confirm = async () => {
    if (!reviewing || !result.valid || submissionRef.current.isPending() ||
        submissionRef.current.wasSubmitted()) return;
    setSubmitting(true);
    setSubmitError("");
    let confirmed = false;
    try {
      await submissionRef.current.submit(draft, accounts);
      confirmed = true;
    } catch (error) {
      setSubmitError(error?.message || "Não foi possível confirmar a transferência.");
    } finally {
      setSubmitting(false);
    }
    if (confirmed) {
      /* EN: Notify the parent only after the server confirms success; it reloads both balances.
         PT: Avisa a tela principal só após confirmação do servidor; ela consulta ambos os saldos. */
      close();
      onCompleted?.();
    }
  };

  const errorText = field => attempted && errors[field] ?
    <Text fontSize="11px" color="#c4363c" role="alert">{errors[field]}</Text> : null;

  return <Dialog.Root open={open} onOpenChange={event => { if (!event.open) close(); }}
    closeOnEscape={!submitting} closeOnInteractOutside={!submitting} size="md">
    <Portal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx={3} maxW="490px" borderRadius="12px">
          <Dialog.Header>
            <Dialog.Title color={COLORS.green} display="flex" alignItems="center" gap={2}>
              <RiArrowLeftRightLine /> Nova transferência
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack align="stretch" gap={3}>
              <Box bg="#edf6f2" p={3} borderRadius="9px">
                <Text fontSize="11px" color={COLORS.gray}>
                  Movimentação interna entre contas. Não é receita nem despesa e não transfere dinheiro no banco.
                </Text>
              </Box>
              {availableAccounts.length < 2 && <Text fontSize="12px" color="#a86c00" role="alert">
                São necessárias duas contas ativas para registrar uma transferência.
              </Text>}
              <Box>
                <Text as="label" htmlFor="transfer-origin" fontSize="11px" mb={1} display="block" fontWeight="600">Conta de origem *</Text>
                <NativeSelect.Root disabled={submitting || reviewing}>
                  <NativeSelect.Field id="transfer-origin" value={draft.fromAccountId}
                    onChange={event => update("fromAccountId", event.target.value)}>
                    <option value="">Selecione a conta de origem</option>
                    {availableAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                {result.from && <Text mt={1} fontSize="11px" color={COLORS.gray}>
                  Saldo disponível: {result.from.available ? financialAccountMoney(result.from.balance) : "Indisponível"}
                </Text>}
                {errorText("fromAccountId")}
              </Box>
              <Flex justify="center"><Flex bg="#e9f6f1" color={COLORS.green} borderRadius="full" p={2}><FiArrowDown /></Flex></Flex>
              <Box>
                <Text as="label" htmlFor="transfer-destination" fontSize="11px" mb={1} display="block" fontWeight="600">Conta de destino *</Text>
                <NativeSelect.Root disabled={submitting || reviewing}>
                  <NativeSelect.Field id="transfer-destination" value={draft.toAccountId}
                    onChange={event => update("toAccountId", event.target.value)}>
                    <option value="">Selecione a conta de destino</option>
                    {availableAccounts.filter(account => account.id !== draft.fromAccountId)
                      .map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                {errorText("toAccountId")}
              </Box>
              <Box>
                <Text as="label" htmlFor="transfer-amount" fontSize="11px" mb={1} display="block" fontWeight="600">Valor (R$) *</Text>
                <Input id="transfer-amount" inputMode="decimal" placeholder="0,00" value={draft.amount}
                  disabled={submitting || reviewing} onChange={event => update("amount", event.target.value)} />
                {errorText("amount")}
              </Box>
              <Box>
                <Text as="label" htmlFor="transfer-initiator" fontSize="11px" mb={1} display="block" fontWeight="600">Responsável *</Text>
                <NativeSelect.Root disabled={submitting || reviewing}>
                  <NativeSelect.Field id="transfer-initiator" value={draft.initiatorKey}
                    onChange={event => update("initiatorKey", event.target.value)}>
                    <option value="">Selecione o responsável</option>
                    {financialInitiators.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                {errorText("initiatorKey")}
              </Box>
              <Box>
                <Text as="label" htmlFor="transfer-note" fontSize="11px" mb={1} display="block" fontWeight="600">Observação (opcional)</Text>
                <Textarea id="transfer-note" rows={2} maxLength={500} value={draft.note}
                  disabled={submitting || reviewing} onChange={event => update("note", event.target.value)}
                  placeholder="Ex.: Transferência para pagamento de despesas" />
                <Text fontSize="10px" color={COLORS.gray} textAlign="right">{draft.note.length}/500</Text>
                {errorText("note")}
              </Box>
              {reviewing && result.valid && <Box p={3} border="1px solid #badccf" bg="#eff8f3" borderRadius="9px">
                <Flex gap={2} align="center" color={COLORS.green} mb={2}>
                  <FiCheckCircle/><Text fontSize="12px" fontWeight="700">Confirme a transferência</Text>
                </Flex>
                <Text fontSize="12px">{result.from.name} → {result.to.name}</Text>
                <Text fontWeight="800" fontSize="20px" color={COLORS.green}>{financialAccountMoney(result.amount)}</Text>
                <Text fontSize="11px" color={COLORS.gray} mt={2}>
                  Ao confirmar, a transferência será registrada no DanceManager. Não haverá movimentação bancária real.
                </Text>
              </Box>}
              {submitError && <Box role="alert" border="1px solid #f0c3c6" bg="#fff4f4" borderRadius="9px" p={3}>
                <Text fontSize="12px" color="#b62a32">{submitError}</Text>
                <Text fontSize="11px" color={COLORS.gray} mt={1}>
                  Se houve falha de conexão, confira o histórico antes de repetir. A nova tentativa usa a mesma chave de operação.
                </Text>
              </Box>}
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" disabled={submitting} onClick={reviewing ? () => {setReviewing(false);setSubmitError("");} : close}>
              {reviewing ? "Voltar" : "Fechar"}
            </Button>
            <Button bg={COLORS.green} color="white" loading={submitting}
              disabled={submitting || availableAccounts.length < 2 || (reviewing && !result.valid)}
              onClick={reviewing ? confirm : review}>
              {reviewing ? "Confirmar transferência" : "Conferir dados"}
            </Button>
          </Dialog.Footer>
          <Dialog.CloseTrigger asChild><Button position="absolute" top="10px" right="10px"
            disabled={submitting} variant="ghost" size="sm" aria-label="Fechar transferência"><FiX /></Button></Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>;
}
