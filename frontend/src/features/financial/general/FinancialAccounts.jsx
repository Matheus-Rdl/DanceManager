import { useEffect, useState } from "react";
import { Box, Button, Flex, Heading, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiRefreshCw } from "react-icons/fi";
import { IoWalletOutline } from "react-icons/io5";
import financialAccountsServices from "../../../services/financialAccountsServices";
import FinancialAccountCard from "./FinancialAccountCard";
import FinancialAccountsSummary from "./FinancialAccountsSummary";
import { buildFinancialAccountsView } from "./financialAccountsView";
import { COLORS, formatDate } from "./financialPeriod";

/* EN: The accounts tab loads account metadata and calculated balances together.
       Balance dates are independent from the financial competence selector.
   PT: A aba consulta os cadastros e os saldos calculados em conjunto.
       A data do saldo é independente do filtro de competência do Financeiro. */
export default function FinancialAccounts({ refreshKey = 0 }) {
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setView(null);
    Promise.all([
      financialAccountsServices.list({}, { signal: controller.signal }),
      financialAccountsServices.getBalances({}, { signal: controller.signal })
    ]).then(([accounts, balances]) => {
      if (!controller.signal.aborted) setView(buildFinancialAccountsView(accounts, balances));
    }).catch(err => {
      if (controller.signal.aborted) return;
      setError(err?.message || "Não foi possível consultar as contas financeiras.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    /* EN: Ignore stale responses after tab changes or a newer refresh.
       PT: Ignora respostas antigas após mudança de aba ou nova atualização. */
    return () => controller.abort();
  }, [refreshKey, retryKey]);

  return <VStack gap={3} align="stretch" minW={0}>
    <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
      <Flex align="center" gap={3}>
        <Flex w="38px" h="38px" borderRadius="12px" bg="#e9f6f1" color={COLORS.green}
          align="center" justify="center"><IoWalletOutline size={20}/></Flex>
        <Box>
          <Heading as="h2" fontSize={{ base: "19px", md: "23px" }} fontWeight="800" color={COLORS.green}>
            Contas Financeiras
          </Heading>
          <Text fontSize="11px" color={COLORS.gray}>Saldos calculados da Noh, InfinitePay e demais contas cadastradas.</Text>
        </Box>
      </Flex>
      <Button size="sm" variant="outline" onClick={() => setRetryKey(value => value + 1)}>
        <FiRefreshCw/> Atualizar contas
      </Button>
    </Flex>

    {loading && <Flex bg="white" borderRadius="12px" p={4} align="center" gap={2}>
      <Spinner size="sm" color={COLORS.green}/><Text fontSize="12px" color={COLORS.gray}>Carregando saldos das contas...</Text>
    </Flex>}

    {!loading && error && <VStack bg="white" p={4} borderRadius="12px" align="start" gap={2}>
      <Text fontSize="12px" color="#c4363c">{error}</Text>
      <Button size="xs" variant="outline" onClick={() => setRetryKey(value => value + 1)}>Tentar novamente</Button>
    </VStack>}

    {!loading && !error && view && view.accounts.length === 0 &&
      <Box bg="white" borderRadius="12px" p={4}>
        <Text color={COLORS.gray} fontSize="12px">Nenhuma conta financeira cadastrada para esta escola.</Text>
      </Box>}

    {!loading && !error && view && view.accounts.length > 0 && <>
      <SimpleGrid columns={{ base: 2 }} gap={3}>
        {view.accounts.map(account => <FinancialAccountCard key={account.id} account={account}/>)}
      </SimpleGrid>
      <FinancialAccountsSummary totalBalance={view.totalBalance} complete={view.complete} asOf={view.asOf}/>
      <Text fontSize="11px" color={COLORS.gray}>
        Valores calculados até {formatDate(view.asOf)} com base no saldo inicial, recebimentos, despesas e transferências
        registrados no sistema. Não há sincronização automática com os bancos; confira os saldos iniciais provisórios.
      </Text>
    </>}
  </VStack>;
}
