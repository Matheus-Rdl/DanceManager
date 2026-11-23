import { useEffect, useState } from "react";
import { Box, Button, Flex, NativeSelect, Text } from "@chakra-ui/react";
import { FiFilter, FiRefreshCw } from "react-icons/fi";
import financialAccountsServices from "../../../services/financialAccountsServices";
import { COLORS } from "./financialPeriod";

/* EN: Fetch account choices from the backend, including inactive ones for historical reporting.
   PT: Carrega contas do backend, incluindo inativas para permitir consultar períodos antigos. */
export default function FinancialAccountFilter({ value = "", onChange, refreshKey = 0 }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    financialAccountsServices.list({}, { signal: controller.signal })
      .then(rows => { if (!controller.signal.aborted) setAccounts(Array.isArray(rows) ? rows : []); })
      .catch(err => { if (!controller.signal.aborted) setError(err?.message || "Não foi possível consultar as contas."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey, retry]);

  return <Flex bg="white" border="1px solid #d7e2df" borderRadius="9px" p={3}
    align={{ base: "stretch", sm: "center" }} gap={3} wrap="wrap">
    <Flex align="center" gap={2} minW={0}>
      <FiFilter color={COLORS.green}/>
      <Text as="label" htmlFor="financial-account-filter" fontSize="12px" fontWeight="700" color={COLORS.green}>
        Filtrar por conta financeira
      </Text>
    </Flex>
    <Box width={{ base: "100%", sm: "240px" }}>
      <NativeSelect.Root size="sm" width="100%" disabled={loading}>
        <NativeSelect.Field id="financial-account-filter" aria-label="Filtrar conta financeira"
          value={value} onChange={event => onChange(event.target.value)}>
          <option value="">Todas as contas</option>
          {accounts.map(account => <option key={account.id} value={account.id}>
            {account.name}{account.active === false ? " (inativa)" : ""}
          </option>)}
          {value && !accounts.some(account => account.id === value) && <option value={value}>Conta selecionada</option>}
        </NativeSelect.Field>
        <NativeSelect.Indicator/>
      </NativeSelect.Root>
    </Box>
    {loading && <Text fontSize="11px" color={COLORS.gray}>Carregando contas...</Text>}
    {error && <Flex gap={2} align="center" wrap="wrap">
      <Text role="alert" fontSize="11px" color={COLORS.red}>{error}</Text>
      <Button size="xs" variant="outline" onClick={() => setRetry(current => current + 1)}>
        <FiRefreshCw/> Tentar novamente
      </Button>
    </Flex>}
    <Text fontSize="11px" color={COLORS.gray} flex="1" minW="150px">
      Filtra valores realizados. Saldos bancários e cobranças pendentes continuam consolidados.
    </Text>
  </Flex>;
}
