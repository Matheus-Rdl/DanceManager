import { useEffect, useState } from "react";
import { Badge, Box, Button, Flex, Heading, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiRefreshCw } from "react-icons/fi";
import { IoWalletOutline } from "react-icons/io5";
import financialAccountsServices from "../../../services/financialAccountsServices";
import { COLORS } from "./financialPeriod";

/* EN: Initial accounts tab: confirms the accounts API and lists registrations only.
       Balance cards, transfer history and dialog will be added in later commits.
   PT: Primeira versão da aba: valida a consulta à API e lista somente as contas.
       Cards de saldo, histórico e Dialog serão adicionados nos próximos commits. */
export default function FinancialAccounts({ refreshKey = 0 }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    financialAccountsServices.list({}, { signal: controller.signal })
      .then(items => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(items)) throw new Error("Resposta inesperada ao consultar contas financeiras.");
        setAccounts(items);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setAccounts([]);
        setError(err?.message || "Não foi possível carregar as contas financeiras.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey, retryKey]);

  return <VStack gap={3} align="stretch" minW={0}>
    <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
      <Flex align="center" gap={3}>
        <Flex w="38px" h="38px" borderRadius="12px" bg="#e9f6f1" color={COLORS.green} align="center" justify="center"><IoWalletOutline size={20}/></Flex>
        <Box>
          <Heading as="h2" fontSize={{ base: "19px", md: "23px" }} fontWeight="800" color={COLORS.green}>Contas Financeiras</Heading>
          <Text fontSize="11px" color={COLORS.gray}>Cadastros da Noh e InfinitePay, com espaço para novas contas no futuro.</Text>
        </Box>
      </Flex>
      <Button size="sm" variant="outline" onClick={() => setRetryKey(value => value + 1)}><FiRefreshCw/> Atualizar contas</Button>
    </Flex>
    <Box bg="white" border="1px solid #d7e2df" borderRadius="12px" p={4}>
      {loading && <Flex align="center" gap={2}><Spinner size="sm" color={COLORS.green}/><Text fontSize="12px" color={COLORS.gray}>Carregando contas...</Text></Flex>}
      {!loading && error && <VStack align="start" gap={2}><Text fontSize="12px" color="#c4363c">{error}</Text><Button size="xs" variant="outline" onClick={() => setRetryKey(value => value + 1)}>Tentar novamente</Button></VStack>}
      {!loading && !error && accounts.length === 0 && <Text fontSize="12px" color={COLORS.gray}>Nenhuma conta financeira cadastrada para esta escola.</Text>}
      {!loading && !error && accounts.map(item => <Flex key={item.id} align="center" justify="space-between" gap={3} py={3} borderBottom="1px solid #edf1ef" _last={{ borderBottom: "none" }}>
        <Box><Text fontSize="13px" fontWeight="700" color={COLORS.green}>{item.name}</Text><Text fontSize="11px" color={COLORS.gray}>Tipo: {item.type}{item.isDefault ? " · Conta padrão" : ""}</Text></Box>
        <Badge bg={item.active ? "#e9f6f1" : "#f1f3f3"} color={item.active ? "#168559" : COLORS.gray}>{item.active ? "Ativa" : "Inativa"}</Badge>
      </Flex>)}
    </Box>
    <Text fontSize="11px" color={COLORS.gray}>Os saldos, o histórico de transferências e a opção de transferir serão adicionados nas próximas etapas.</Text>
  </VStack>;
}
