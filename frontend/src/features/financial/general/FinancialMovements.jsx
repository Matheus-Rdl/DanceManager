import { Fragment, useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Flex, Heading, Input, NativeSelect, Table, Text, VStack } from "@chakra-ui/react";
import { FiArrowDownLeft, FiArrowUpRight, FiChevronDown, FiChevronUp, FiExternalLink, FiRefreshCw, FiSearch } from "react-icons/fi";
import financialServices from "../../../services/financialServices";
import { COLORS, formatDate, formatMonth, money, periodRange } from "./financialPeriod";

const ENTRY = { monthlyFee: "Mensalidade", revenue: "Provento", expense: "Despesa" };
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const originName = item => ENTRY[item.origin] || "Movimentação";
const signed = item => `${item.direction === "in" ? "+" : "−"} ${money(item.amount)}`;
const colorFor = item => item.direction === "in" ? "#137843" : "#c0393b";
const initiatorName = item => item.responsible?.name || "Não informado";
const lastDay = month => {
  const [year, num] = month.split("-").map(Number);
  return `${month}-${String(new Date(year, num, 0).getDate()).padStart(2, "0")}`;
};

function TotalsCard({ title, value, tone, icon: Icon }) {
  return <Box bg="white" border="1px solid #d7e2df" borderRadius="9px" p={{ base: 3, md: 4 }} minW={0}>
    <Flex align="center" gap={2} mb={2}><Box color={tone}><Icon size={16}/></Box><Text fontSize="11px" color={COLORS.gray}>{title}</Text></Flex>
    <Heading fontSize={{ base: "15px", md: "21px" }} color={tone} fontWeight="800">{money(value)}</Heading>
  </Box>;
}

export default function FinancialMovements({ period, refreshKey = 0, onOpenOrigin }) {
  const { from, to } = periodRange(period);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [responsible, setResponsible] = useState("");
  const [method, setMethod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { setStartDate(""); setEndDate(""); setExpandedId(null); }, [from, to]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    /* The date filter is sent to the API; other filters work on the loaded result.
       O período é aplicado no servidor; os demais filtros atuam na lista retornada. */
    financialServices.getMovements({ from, to, startDate, endDate })
      .then(result => { if (active) setData(Array.isArray(result?.rows) ? result.rows : []); })
      .catch(err => { if (active) { setData([]); setError(err.message || "Não foi possível consultar o extrato."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, startDate, endDate, refreshKey, retry]);

  const availableMethods = useMemo(() => [...new Set(data.flatMap(item => (item.details || []).map(p => p.method).filter(Boolean)))].sort(), [data]);
  const filtered = useMemo(() => data.filter(item => {
    const text = normalize(`${item.description} ${item.category} ${item.reference} ${item.studentMat || ""} ${initiatorName(item)} ${item.method}`);
    return (!search.trim() || text.includes(normalize(search.trim()))) &&
      (!origin || item.origin === origin) &&
      (!responsible || (responsible === "unknown" ? !item.responsible?.key : item.responsible?.key === responsible)) &&
      (!method || item.details?.some(p => p.method === method));
  }), [data, search, origin, responsible, method]);
  const totalReceived = filtered.reduce((n, item) => n + (item.direction === "in" ? Number(item.amount) : 0), 0);
  const totalPaid = filtered.reduce((n, item) => n + (item.direction === "out" ? Number(item.amount) : 0), 0);
  const showDetails = item => setExpandedId(current => current === item.id ? null : item.id);

  const detail = item => <Box p={3} bg="#f4f8f7" borderRadius="7px" border="1px solid #e0e9e6">
    <Flex gap={2} wrap="wrap" mb={3} fontSize="11px" color="#49645f">
      <Text><b>Origem:</b> {originName(item)}</Text>
      <Text><b>Categoria:</b> {item.category}</Text>
      <Text><b>Referência:</b> {formatMonth(item.reference)}</Text>
      <Text><b>Responsável:</b> {initiatorName(item)}</Text>
    </Flex>
    <Text fontSize="11px" fontWeight="700" color={COLORS.green} mb={2}>Pagamentos e recebimentos neste período</Text>
    <VStack gap={2} align="stretch">
      {(item.details || []).map((payment, index) => <Flex key={payment.id || index} justify="space-between" align="center" gap={3}>
        <Text fontSize="11px" color={COLORS.gray}>{formatDate(payment.date)} · {payment.method}</Text>
        <Text fontSize="11px" color={colorFor(item)} fontWeight="700">{item.direction === "in" ? "+" : "−"} {money(payment.amount)}</Text>
      </Flex>)}
    </VStack>
    <Flex justify="flex-end" mt={3}>
      <Button variant="outline" size="xs" color={COLORS.green} borderColor="#cbdcd7" onClick={() => onOpenOrigin?.(item)}>
        <FiExternalLink/> Abrir lançamento original
      </Button>
    </Flex>
  </Box>;

  return <VStack gap={3} align="stretch" minW={0}>
    <Flex justify="space-between" gap={2} align={{ base: "flex-start", md: "center" }} wrap="wrap">
      <Box><Heading color={COLORS.green} fontSize="16px">Extrato de movimentações</Heading>
        <Text fontSize="11px" color={COLORS.gray}>Somente valores efetivamente recebidos ou pagos, pela data da realização.</Text></Box>
      <Badge bg="#e7f3ef" color={COLORS.green} borderRadius="full" px={3}>{filtered.length} lançamento(s)</Badge>
    </Flex>
    <Flex gap={2} direction={{ base: "column", md: "row" }}>
      <Box flex="1"><TotalsCard icon={FiArrowDownLeft} title="Entradas recebidas" value={totalReceived} tone="#137843"/></Box>
      <Box flex="1"><TotalsCard icon={FiArrowUpRight} title="Despesas pagas" value={totalPaid} tone="#c0393b"/></Box>
      <Box flex="1"><TotalsCard icon={FiRefreshCw} title="Saldo do período" value={totalReceived - totalPaid} tone={totalReceived >= totalPaid ? COLORS.green : "#c0393b"}/></Box>
    </Flex>
    <Box bg="white" border="1px solid #d7e2df" borderRadius="9px" overflow="hidden">
      <Flex p={3} align="center" gap={2} wrap="wrap" borderBottom="1px solid #e6ecea">
        <Box position="relative" flex={{ base: "1 1 100%", md: "1 1 240px" }}>
          <Box position="absolute" top="10px" left="11px" color="#77918b"><FiSearch/></Box>
          <Input aria-label="Buscar movimentações" size="sm" pl="35px" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar descrição, aluno, categoria..."/>
        </Box>
        <NativeSelect.Root size="sm" width={{ base: "calc(50% - 4px)", md: "150px" }}>
          <NativeSelect.Field aria-label="Filtrar origem" value={origin} onChange={e => setOrigin(e.target.value)}>
            <option value="">Todas as origens</option><option value="monthlyFee">Mensalidades</option><option value="revenue">Proventos</option><option value="expense">Despesas</option>
          </NativeSelect.Field><NativeSelect.Indicator/>
        </NativeSelect.Root>
        <NativeSelect.Root size="sm" width={{ base: "calc(50% - 4px)", md: "145px" }}>
          <NativeSelect.Field aria-label="Filtrar responsável" value={responsible} onChange={e => setResponsible(e.target.value)}>
            <option value="">Responsável: todos</option><option value="pety">Pety</option><option value="vanessa">Vanessa</option><option value="unknown">Não informado</option>
          </NativeSelect.Field><NativeSelect.Indicator/>
        </NativeSelect.Root>
        <NativeSelect.Root size="sm" width={{ base: "100%", md: "155px" }}>
          <NativeSelect.Field aria-label="Filtrar forma de pagamento" value={method} onChange={e => setMethod(e.target.value)}>
            <option value="">Todas as formas</option>{availableMethods.map(value => <option key={value} value={value}>{value}</option>)}
          </NativeSelect.Field><NativeSelect.Indicator/>
        </NativeSelect.Root>
      </Flex>
      <Flex px={3} py={2} gap={3} align="center" wrap="wrap" borderBottom="1px solid #e6ecea">
        <Text color={COLORS.gray} fontSize="11px" fontWeight="600">Intervalo opcional:</Text>
        <Flex align="center" gap={2} wrap="wrap">
          <Input size="sm" type="date" aria-label="Data inicial do extrato" value={startDate} min={`${from}-01`} max={lastDay(to)} onChange={e => setStartDate(e.target.value)} w="150px"/>
          <Text color={COLORS.gray} fontSize="11px">até</Text>
          <Input size="sm" type="date" aria-label="Data final do extrato" value={endDate} min={`${from}-01`} max={lastDay(to)} onChange={e => setEndDate(e.target.value)} w="150px"/>
          {(startDate || endDate) && <Button variant="ghost" size="xs" onClick={() => { setStartDate(""); setEndDate(""); }}>Limpar datas</Button>}
        </Flex>
      </Flex>
      {loading && <Text p={4} fontSize="12px" color={COLORS.gray}>Carregando movimentações...</Text>}
      {error && <Box p={4}><Text fontSize="12px" color={COLORS.red}>{error}</Text><Button size="xs" mt={2} variant="outline" onClick={() => setRetry(v => v + 1)}>Tentar novamente</Button></Box>}
      {!loading && !error && !filtered.length && <Box textAlign="center" p={9}><Text fontWeight="700" color={COLORS.green} fontSize="13px">Nenhuma movimentação realizada encontrada</Text><Text fontSize="11px" color={COLORS.gray}>Altere os filtros ou consulte outro período. Lançamentos pendentes não entram no extrato.</Text></Box>}
      {!loading && !error && filtered.length > 0 && <>
        <Box display={{ base: "none", lg: "block" }} overflowX="auto">
          <Table.Root size="sm" minW="950px" tableLayout="fixed"><Table.Header bg="#f4f8f7"><Table.Row>
            <Table.ColumnHeader w="102px" fontSize="11px" color={COLORS.green}>Realizado em</Table.ColumnHeader>
            <Table.ColumnHeader w="260px" fontSize="11px" color={COLORS.green}>Descrição</Table.ColumnHeader>
            <Table.ColumnHeader w="100px" fontSize="11px" color={COLORS.green}>Origem</Table.ColumnHeader>
            <Table.ColumnHeader w="115px" fontSize="11px" color={COLORS.green}>Categoria</Table.ColumnHeader>
            <Table.ColumnHeader w="110px" fontSize="11px" color={COLORS.green}>Responsável</Table.ColumnHeader>
            <Table.ColumnHeader w="130px" fontSize="11px" color={COLORS.green} textAlign="end">Valor realizado</Table.ColumnHeader>
            <Table.ColumnHeader w="65px" fontSize="11px" color={COLORS.green}>Ações</Table.ColumnHeader>
          </Table.Row></Table.Header>
          <Table.Body>{filtered.map(item => <Fragment key={item.id}>
            <Table.Row key={item.id} _hover={{ bg: "#f7faf9" }}>
              <Table.Cell fontSize="11px">{formatDate(item.date)}</Table.Cell>
              <Table.Cell><Text fontSize="11px" fontWeight="700" color={COLORS.green} overflowWrap="anywhere">{item.description}</Text>{item.transactionCount > 1 && <Text color={COLORS.gray} fontSize="10px">{item.transactionCount} pagamentos agrupados</Text>}</Table.Cell>
              <Table.Cell fontSize="11px">{originName(item)}</Table.Cell>
              <Table.Cell fontSize="11px">{item.category}</Table.Cell>
              <Table.Cell fontSize="11px">{initiatorName(item)}</Table.Cell>
              <Table.Cell fontSize="11px" fontWeight="700" color={colorFor(item)} textAlign="end">{signed(item)}</Table.Cell>
              <Table.Cell><Button aria-label={`Detalhes: ${item.description}`} size="xs" variant="ghost" onClick={() => showDetails(item)}>{expandedId === item.id ? <FiChevronUp/> : <FiChevronDown/>}</Button></Table.Cell>
            </Table.Row>
            {expandedId === item.id && <Table.Row key={`${item.id}:detail`}><Table.Cell colSpan={7}>{detail(item)}</Table.Cell></Table.Row>}
          </Fragment>)}</Table.Body></Table.Root>
        </Box>
        <VStack p={3} gap={2} display={{ base: "flex", lg: "none" }} align="stretch">
          {filtered.map(item => <Box key={item.id} border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">
            <Button w="100%" h="auto" py={3} px={3} variant="ghost" borderRadius={0} onClick={() => showDetails(item)}>
              <Flex w="100%" justify="space-between" align="center" gap={3}>
                <Box minW={0} flex="1" textAlign="left">
                  <Text fontSize="12px" fontWeight="700" color={COLORS.green} whiteSpace="normal">{item.description}</Text>
                  <Text fontSize="10px" color={COLORS.gray}>{formatDate(item.date)} · {originName(item)} · {initiatorName(item)}</Text>
                </Box>
                <Flex align="center" gap={2}><Text fontSize="12px" fontWeight="700" color={colorFor(item)}>{signed(item)}</Text>{expandedId === item.id ? <FiChevronUp/> : <FiChevronDown/>}</Flex>
              </Flex>
            </Button>
            {expandedId === item.id && <Box p={2} pt={0}>{detail(item)}</Box>}
          </Box>)}
        </VStack>
      </>}
      <Text fontSize="10px" color={COLORS.gray} borderTop="1px solid #e6ecea" p={3}>Extrato de caixa: pagamentos e recebimentos efetivos no período selecionado. Não representa o saldo bancário acumulado. Os detalhes agrupam parcelas da mesma mensalidade dentro desse período.</Text>
    </Box>
  </VStack>;
}
