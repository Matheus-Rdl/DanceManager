import { useEffect, useState } from "react";
import { Badge, Box, Button, Flex, Heading, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiArrowLeftRight, FiChevronLeft, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import financialTransfersServices from "../../../services/financialTransfersServices";
import { COLORS } from "./financialPeriod";
import { financialAccountMoney } from "./financialAccountsView";
import { financialTransferDateTime, financialTransferStatus, normalizeFinancialTransfersHistory } from "./financialTransfersHistoryView";

const HISTORY_PAGE_SIZE = 10;

/* EN: Read-only history, deliberately separate from the transfer dialog.
       Transfer reversals are visible, but never deleted or automatically replayed.
   PT: Histórico somente de consulta e separado do Dialog de transferência.
       Estornos permanecem visíveis, sem excluir nem repetir operações automaticamente. */
export default function FinancialTransfersList({ accounts = [], refreshKey = 0 }) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const nameById = new Map(accounts.map(account => [account.id, account.name]));

  useEffect(() => {
    const request = new AbortController();
    setLoading(true);
    setError("");
    /* EN: Abort previous requests on page changes or after a confirmed transfer.
       PT: Cancela respostas antigas ao mudar a página ou confirmar transferência. */
    financialTransfersServices.list({ page, limit: HISTORY_PAGE_SIZE }, { signal: request.signal })
      .then(data => {
        if (!request.signal.aborted) setHistory(normalizeFinancialTransfersHistory(data));
      })
      .catch(err => {
        if (!request.signal.aborted) { setHistory(null); setError(err?.message || "Não foi possível consultar as transferências."); }
      })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [page, refreshKey, retry]);

  return <Box bg="white" border="1px solid #dfe8e4" borderRadius="13px" p={{ base: 3, md: 4 }}>
    <VStack gap={3} align="stretch">
      <Flex align="center" justify="space-between" gap={2} wrap="wrap">
        <Flex align="center" gap={2}>
          <FiArrowLeftRight color={COLORS.green}/>
          <Box>
            <Heading as="h3" fontSize="15px" color={COLORS.green}>Histórico de transferências</Heading>
            <Text fontSize="11px" color={COLORS.gray}>Operações internas registradas, inclusive estornos.</Text>
          </Box>
        </Flex>
        <Button size="xs" variant="outline" onClick={() => setRetry(value => value + 1)}>
          <FiRefreshCw/> Atualizar histórico
        </Button>
      </Flex>
      {loading && <Flex align="center" gap={2}><Spinner size="sm" color={COLORS.green}/>
        <Text fontSize="12px" color={COLORS.gray}>Carregando transferências...</Text></Flex>}
      {!loading && error && <Box role="alert" bg="#fff4f4" p={3} borderRadius="9px">
        <Text fontSize="12px" color="#b62a32">{error}</Text>
        <Text fontSize="11px" color={COLORS.gray} mt={1}>Os saldos das contas não foram alterados por essa falha.</Text>
      </Box>}
      {!loading && !error && history?.items.length === 0 && <Text color={COLORS.gray} fontSize="12px">
        Nenhuma transferência registrada nesta página.
      </Text>}
      {!loading && !error && history && history.items.map(item => <Flex key={item.id}
        borderTop="1px solid #e9efec" pt={3} justify="space-between" gap={3} align="start" wrap="wrap">
        <Box flex="1" minW={0}>
          <Text fontWeight="700" fontSize="12px" overflowWrap="anywhere">
            {nameById.get(item.fromAccountId) || "Conta não localizada"} → {nameById.get(item.toAccountId) || "Conta não localizada"}
          </Text>
          <Text color={COLORS.gray} fontSize="11px">{financialTransferDateTime(item.transferredAt)}</Text>
          {item.note && <Text color={COLORS.gray} fontSize="11px" overflowWrap="anywhere">{item.note}</Text>}
          {item.status === "reversed" && <Text color={COLORS.gray} fontSize="11px">
            Estornada em {financialTransferDateTime(item.reversedAt)}
          </Text>}
        </Box>
        <VStack align="end" gap={1}>
          <Text fontWeight="800" color={COLORS.green} fontSize="14px" fontVariantNumeric="tabular-nums">
            {financialAccountMoney(item.amount)}
          </Text>
          <Badge bg={item.status === "reversed" ? "#f1f3f3" : "#e9f6f1"}
            color={item.status === "reversed" ? COLORS.gray : "#168559"} fontSize="10px">
            {financialTransferStatus(item.status)}
          </Badge>
        </VStack>
      </Flex>)}
      {!loading && !error && history && history.total > 0 && <Flex align="center" justify="space-between" gap={2} pt={2}>
        <Button size="xs" variant="outline" disabled={!history.hasPrevious} onClick={() => setPage(p => Math.max(1, p - 1))}>
          <FiChevronLeft/> Anterior
        </Button>
        <Text fontSize="11px" color={COLORS.gray}>Página {history.page} · {history.total} transferência(s)</Text>
        <Button size="xs" variant="outline" disabled={!history.hasNext} onClick={() => setPage(p => p + 1)}>
          Próxima <FiChevronRight/>
        </Button>
      </Flex>}
    </VStack>
  </Box>;
}
