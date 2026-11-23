import { useEffect, useState } from "react";
import { Box, Button, Flex, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiRefreshCw, FiWallet } from "react-icons/fi";
import financialAccountsServices from "../../../services/financialAccountsServices";
import FinancialAccountCard from "./FinancialAccountCard";
import FinancialAccountsSummary from "./FinancialAccountsSummary";
import { buildFinancialAccountsView } from "./financialAccountsView";
import { COLORS, formatDate } from "./financialPeriod";

/* EN: Account balances have their own reference date and are not filtered by
       the selected competence or cash-flow period of the financial overview.
   PT: Os saldos têm data de referência própria e não usam o filtro de
       competência ou período de caixa selecionado na Visão Geral. */
export default function FinancialOverviewAccounts({ refreshKey = 0 }) {
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setView(null);

    /* EN: Fetch account registrations and server-calculated balances together;
           never calculate a second balance from the overview's revenue totals.
       PT: Consulta os cadastros e saldos calculados no servidor em conjunto;
           não recalcula saldo a partir das receitas exibidas na Visão Geral. */
    Promise.all([
      financialAccountsServices.list({}, { signal: controller.signal }),
      financialAccountsServices.getBalances({}, { signal: controller.signal })
    ]).then(([accounts, balances]) => {
      if (!controller.signal.aborted) {
        setView(buildFinancialAccountsView(accounts, balances));
      }
    }).catch(err => {
      if (!controller.signal.aborted) {
        setError(err?.message || "Não foi possível consultar os saldos das contas.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    /* EN: Ignore obsolete requests after refreshing or leaving the overview.
       PT: Ignora requisições antigas após atualizar ou sair da Visão Geral. */
    return () => controller.abort();
  }, [refreshKey, retryKey]);

  return <VStack align="stretch" gap={3} mt={{ base: 4, md: 6 }}>
    <Flex gap={3} align="start" px={1}>
      <Flex w="38px" h="38px" align="center" justify="center" flexShrink={0}
        bg="#e9f6f1" borderRadius="12px" color="#075749"><FiWallet size={20}/></Flex>
      <Box minW={0}>
        <Text as="h2" fontSize={{ base: "19px", md: "23px" }} lineHeight="1.2"
          color="#075749" fontWeight="800">Saldos das contas</Text>
        <Text mt={1} fontSize={{ base: "11px", md: "12px" }} lineHeight="1.5" color={COLORS.gray}>
          Saldo da Noh, InfinitePay e demais contas, independente do período selecionado.
        </Text>
      </Box>
    </Flex>

    {loading && <Flex bg="white" borderRadius="12px" p={4} gap={2} align="center" role="status">
      <Spinner size="sm" color={COLORS.green}/>
      <Text fontSize="12px" color={COLORS.gray}>Carregando saldos das contas...</Text>
    </Flex>}

    {!loading && error && <VStack bg="white" p={4} borderRadius="12px" align="start" gap={2}>
      <Text role="alert" fontSize="12px" color="#c4363c">{error}</Text>
      <Button size="xs" variant="outline" onClick={() => setRetryKey(current => current + 1)}>
        <FiRefreshCw/> Tentar novamente
      </Button>
    </VStack>}

    {!loading && !error && view?.accounts?.length === 0 && <Box bg="white" borderRadius="12px" p={4}>
      <Text fontSize="12px" color={COLORS.gray}>Nenhuma conta financeira cadastrada para esta escola.</Text>
    </Box>}

    {!loading && !error && view?.accounts?.length > 0 && <>
      {/* EN: Two cards per row on all devices, with the consolidated total below.
          PT: Dois cards por linha em qualquer tela, com o total consolidado abaixo. */}
      <SimpleGrid columns={{ base: 2 }} gap={3}>
        {view.accounts.map(account => <FinancialAccountCard key={account.id} account={account}/>)}
      </SimpleGrid>
      <FinancialAccountsSummary totalBalance={view.totalBalance} complete={view.complete} asOf={view.asOf}/>
      <Text fontSize="11px" color={COLORS.gray}>
        Saldos calculados até {formatDate(view.asOf)}. O saldo total considera todas as contas, inclusive
        as inativas; não representa o resultado do período. Confira os saldos iniciais provisórios.
      </Text>
    </>}
  </VStack>;
}
