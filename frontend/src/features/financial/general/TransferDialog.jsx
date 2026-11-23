import { useState } from "react";
import { Box, Button, Dialog, Flex, Input, NativeSelect, Portal, Text, Textarea, VStack } from "@chakra-ui/react";
import { FiArrowDown, FiCheckCircle, FiX } from "react-icons/fi";
import { RiArrowLeftRightLine } from "react-icons/ri";
import { financialInitiators } from "./financialInitiators";
import { financialAccountMoney } from "./financialAccountsView";
import { activeTransferAccounts, validateTransferDraft } from "./financialTransferDraft";
import { COLORS } from "./financialPeriod";

const emptyDraft = () => ({
  fromAccountId: "", toAccountId: "", amount: "", initiatorKey: "", note: ""
});

/* EN: This first-stage dialog performs only local validation and a read-only preview.
       It never calls the transfer API, creates an operation key or changes balances.
   PT: Nesta primeira etapa, o Dialog somente valida e apresenta uma prévia.
       Não acessa a API, não gera chave de operação nem modifica saldos. */
export default function TransferDialog({ open = false, onClose, accounts = [] }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [attempted, setAttempted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const availableAccounts = activeTransferAccounts(accounts);
  const result = validateTransferDraft(draft, accounts);
  const { errors } = result;

  const update = (field, value) => {
    setDraft(previous => ({
      ...previous,
      [field]: value,
      // EN: A new origin cannot remain selected as destination.
      // PT: A nova origem não pode permanecer selecionada como destino.
      ...(field === "fromAccountId" && previous.toAccountId === value ? { toAccountId: "" } : {})
    }));
    setReviewing(false);
  };

  const close = () => {
    setDraft(emptyDraft());
    setAttempted(false);
    setReviewing(false);
    onClose?.();
  };

  const review = () => {
    setAttempted(true);
    setReviewing(result.valid);
  };

  const errorText = field => attempted && errors[field] ?
    <Text fontSize="11px" color="#c4363c" role="alert">{errors[field]}</Text> : null;

  return <Dialog.Root open={open} onOpenChange={event => { if (!event.open) close(); }} size="md">
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
                <NativeSelect.Root>
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
                <NativeSelect.Root>
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
                  onChange={event => update("amount", event.target.value)} />
                {errorText("amount")}
              </Box>
              <Box>
                <Text as="label" htmlFor="transfer-initiator" fontSize="11px" mb={1} display="block" fontWeight="600">Responsável *</Text>
                <NativeSelect.Root>
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
                  onChange={event => update("note", event.target.value)}
                  placeholder="Ex.: Transferência para pagamento de despesas" />
                <Text fontSize="10px" color={COLORS.gray} textAlign="right">{draft.note.length}/500</Text>
                {errorText("note")}
              </Box>
              {reviewing && result.valid && <Box p={3} border="1px solid #badccf" bg="#eff8f3" borderRadius="9px">
                <Flex gap={2} align="center" color={COLORS.green} mb={2}>
                  <FiCheckCircle/><Text fontSize="12px" fontWeight="700">Dados validados</Text>
                </Flex>
                <Text fontSize="12px">{result.from.name} → {result.to.name}</Text>
                <Text fontWeight="800" fontSize="20px" color={COLORS.green}>{financialAccountMoney(result.amount)}</Text>
                <Text fontSize="11px" color={COLORS.gray} mt={2}>
                  Prévia apenas. O envio da transferência será implementado no próximo commit.
                </Text>
              </Box>}
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={close}>Fechar</Button>
            <Button bg={COLORS.green} color="white" onClick={review} disabled={availableAccounts.length < 2}>
              Conferir dados
            </Button>
          </Dialog.Footer>
          <Dialog.CloseTrigger asChild><Button position="absolute" top="10px" right="10px"
            variant="ghost" size="sm" aria-label="Fechar transferência"><FiX /></Button></Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>;
}
