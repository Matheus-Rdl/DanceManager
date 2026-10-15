import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { FiAlertCircle, FiBarChart2, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import financialServices from "../../../services/financialServices";

/* Gráfico financeiro: sempre por data do recebimento/pagamento, nunca por vencimento. */
const GREEN = "#16845a";
const RED = "#d9343a";
const DARK = "#064e43";
const MUTED = "#607873";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
/* Marcadores limpos: 100, 500, 1 mil, 2 mil, 5 mil, 1 mi... */
const axisNumber = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const formatAxisTick = value => {
  if (value === 0) return "0";
  if (value >= 1_000_000_000) return `${axisNumber.format(value / 1_000_000_000)} bi`;
  if (value >= 1_000_000) return `${axisNumber.format(value / 1_000_000)} mi`;
  if (value >= 1_000) return `${axisNumber.format(value / 1_000)} mil`;
  return axisNumber.format(value);
};

/* Escolhe de 3 a 5 intervalos arredondados, evitando valores quebrados no eixo Y.
   Exemplos: R$ 240 -> 0/100/200/300; R$ 4.590 -> 0/1 mil/.../5 mil. */
export function getFinancialAxisScale(maximum) {
  const value = Number(maximum);
  if (!Number.isFinite(value) || value <= 0) return { top: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] };
  const rawStep = value / (value > 200 && value <= 500 ? 3 : 5);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const niceStep = [1, 2, 5, 10].find(step => step >= normalizedStep - 1e-10) || 10;
  const step = niceStep * magnitude;
  const intervals = Math.ceil(value / step - 1e-10);
  const top = Number((intervals * step).toPrecision(12));
  const ticks = Array.from({ length: intervals + 1 }, (_, i) => Number((i * step).toPrecision(12)));
  return { top, step, ticks };
}
const money = value => currency.format(Number(value) || 0);
const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const monthName = reference => {
  const [year, month] = String(reference || "").split("-").map(Number);
  return month >= 1 && month <= 12 ? `${months[month - 1]} de ${year}` : "—";
};
const monthShort = reference => {
  const [year, month] = String(reference || "").split("-").map(Number);
  return month >= 1 && month <= 12 ? `${months[month - 1].slice(0, 3)} ${String(year).slice(-2)}` : "—";
};
const formatMonthNumber = value => String(value).padStart(2, "0");

function TotalIndicator({ label, amount, color, highlight = false }) {
  return <Box bg={highlight ? "#f0f7f4" : "#f7f9f8"} border="1px solid #e4ece9" borderRadius="8px" px={{ base: 2, md: 3 }} py={3} flex="1" minW={0}>
    <Text fontSize="10px" color={MUTED}>{label}</Text>
    <Text mt={1} fontSize={{ base: "12px", sm: "15px", md: "17px" }} fontWeight="800" color={color} overflowWrap="anywhere">{money(amount)}</Text>
  </Box>;
}

export default function FinancialTimelineChart({ period, refreshKey = 0 }) {
  const mode = period.mode;
  const month = period.reference;
  const selectedYear = period.year;
  const selectedMonth = period.reference.slice(5, 7);
  const [data, setData] = useState(null);
  const [selectedReference, setSelectedReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const chartScroller = useRef(null);

  /* O mês da página controla 6/12 meses. Ano e Mês são filtros próprios do gráfico. */
  const queryMonth = mode === "month" ? `${selectedYear}-${selectedMonth}` : month;
  const options = useMemo(() => ({ mode, month: queryMonth, year: selectedYear }), [mode, queryMonth, selectedYear]);
  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(String(options.month))) return;
    let active = true;
    setLoading(true);
    setError("");
    financialServices.getTimeline(options).then(result => {
      if (!active) return;
      setData(result);
      const preferredReference = mode === "year" ? `${selectedYear}-${month.slice(5)}` : options.month;
      setSelectedReference(prev => result.timeline?.some(point => point.reference === prev)
        ? prev : result.timeline?.find(point => point.reference === preferredReference)?.reference
          || result.timeline?.[result.timeline.length - 1]?.reference || "");
    }).catch(err => {
      if (active) { setData(null); setError(err.message || "Não foi possível carregar a evolução financeira."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [options, refreshKey, retry]);

  /* No celular, começa nos meses mais recentes; o usuário pode deslizar para ver os anteriores. */
  useEffect(() => {
    if (!loading && chartScroller.current) chartScroller.current.scrollLeft = chartScroller.current.scrollWidth;
  }, [loading, data?.from, data?.to, mode]);

  const timeline = data?.timeline || [];
  const totals = data?.totals || { received: 0, expensesPaid: 0, result: 0 };
  const selected = timeline.find(point => point.reference === selectedReference) || timeline[timeline.length - 1];
  const maxValue = Math.max(0, ...timeline.flatMap(point => [Number(point.received) || 0, Number(point.expensesPaid) || 0]));
  const { top: chartTop, ticks: axisTicks } = useMemo(() => getFinancialAxisScale(maxValue), [maxValue]);
  const monthView = mode === "month";
  const minChartWidth = monthView ? "275px" : mode === "6" ? "525px" : "880px";
  const dateLabel = mode === "year"
    ? `Janeiro a dezembro de ${selectedYear}`
    : mode === "month" ? monthName(queryMonth)
      : `Até ${monthName(month)}`;

  return <Box bg="white" border="1px solid #e1e9e7" borderRadius="9px" p={{ base: 3, md: 4 }}>
    <Flex align="start" justify="space-between" gap={3} wrap="wrap">
      <Box>
        <HStack gap={2}><FiBarChart2 color={DARK}/><Heading fontSize="15px" color={DARK}>Evolução financeira</Heading></HStack>
        <Text fontSize="10px" color={MUTED} mt={1}>Entradas e saídas efetivamente pagas · {dateLabel}</Text>
      </Box>
      <HStack gap={3} flexShrink={0}>
        <HStack gap={1}><Box w="9px" h="9px" bg={GREEN} borderRadius="2px"/><Text fontSize="10px" color={MUTED}>Recebimentos</Text></HStack>
        <HStack gap={1}><Box w="9px" h="9px" bg={RED} borderRadius="2px"/><Text fontSize="10px" color={MUTED}>Despesas</Text></HStack>
      </HStack>
    </Flex>

    <Box mt={4} position="relative" aria-busy={loading}>
      {loading && <Flex align="center" gap={2} py={3} color={MUTED}><FiRefreshCw/><Text fontSize="12px">Carregando gráfico...</Text></Flex>}
      {!loading && error && <Flex p={3} borderRadius="7px" bg="#fff4f4" color="#b02f36" align="center" gap={2} wrap="wrap"><FiAlertCircle/><Text fontSize="12px" flex="1">{error}</Text><Button size="xs" onClick={() => setRetry(v => v + 1)} variant="outline">Tentar novamente</Button></Flex>}
      {!loading && !error && <>
        <Box ref={chartScroller} overflowX="auto" w="100%" pb={2} scrollbarWidth="thin" aria-label="Gráfico de recebimentos e despesas por mês">
          <Flex /*mt={4}*/ gap={2} minW={{ base: minChartWidth, md: mode === "12" || mode === "year" ? "800px" : "100%" }}>
            {/* Escala comum entre meses e séries: mantém as alturas comparáveis. */}
            <Box w="54px" flexShrink={0} h="232px" position="sticky" left={0} zIndex={2} bg="white" color={MUTED} fontSize="9px" aria-hidden="true">
              {axisTicks.map(tick => <Text key={tick} position="absolute" right="6px" bottom={`calc(27px + ${tick / chartTop * 205}px)`} transform="translateY(50%)" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{formatAxisTick(tick)}</Text>)}
            </Box>
            <Box flex="1" minW={0}>
              <Box h="205px" position="relative">
                {axisTicks.map(tick => <Box key={tick} position="absolute" bottom={`${tick / chartTop * 100}%`} w="100%" borderTop="1px dashed #e4ebe8" pointerEvents="none"/>)}
                <Flex h="100%" align="end" gap={1} position="relative" zIndex={1}>
                  {timeline.map(point => {
                    const isSelected = selected?.reference === point.reference;
                    return <Box key={point.reference} as="button" type="button" onClick={() => setSelectedReference(point.reference)} title={`${monthName(point.reference)} | Recebido ${money(point.received)} | Despesas ${money(point.expensesPaid)}`} aria-label={`Exibir detalhes de ${monthName(point.reference)}`} aria-pressed={isSelected} flex="1" minW={monthView ? "170px" : "44px"} h="100%" display="flex" alignItems="end" justifyContent="center" px={1} borderRadius="5px" _hover={{ bg: "#f2f8f5" }} _focusVisible={{ outline: "2px solid #16845a", outlineOffset: "2px" }}>
                      <Flex align="end" justify="center" gap={monthView ? "13px" : "5px"} h="100%" w="100%">
                        <Box w={monthView ? "48px" : "min(36%, 28px)"} minW={monthView ? "48px" : "9px"} h={`${Math.max(0, Number(point.received) / chartTop * 100)}%`} bg={GREEN} borderTopRadius="4px" opacity={isSelected ? 1 : 0.83} transition="height .2s ease"/>
                        <Box w={monthView ? "48px" : "min(36%, 28px)"} minW={monthView ? "48px" : "9px"} h={`${Math.max(0, Number(point.expensesPaid) / chartTop * 100)}%`} bg={RED} borderTopRadius="4px" opacity={isSelected ? 1 : 0.83} transition="height .2s ease"/>
                      </Flex>
                    </Box>;
                  })}
                </Flex>
              </Box>
              <Flex gap={1} borderTop="1px solid #d4dfdb" pt="6px">
                {timeline.map(point => <Box key={point.reference} minW={monthView ? "170px" : "44px"} flex="1" textAlign="center" px={1}>
                  <Text fontSize={{ base: "10px", md: "10px" }} fontWeight={selected?.reference === point.reference ? "800" : "500"} color={selected?.reference === point.reference ? DARK : MUTED}>{monthShort(point.reference)}</Text>
                </Box>)}
              </Flex>
            </Box>
          </Flex>
        </Box>
        {mode !== "month" && <Text fontSize="10px" color={MUTED} display={{ base: "block", md: "none" }} mt={1}>Deslize o gráfico para os lados para visualizar os demais meses. <FiChevronRight style={{ display: "inline" }}/></Text>}
        {!!selected && <Flex mt={3} align="center" justify="space-between" gap={3} bg="#f3f8f6" p={3} borderRadius="8px" wrap="wrap">
          <Box><Text fontSize="10px" color={MUTED}>Mês selecionado</Text><Text fontSize="12px" fontWeight="700" color={DARK}>{monthName(selected.reference)}</Text></Box>
          <Flex gap={{ base: 3, md: 5 }} wrap="wrap">
            <Box><Text fontSize="10px" color={MUTED}>Recebido</Text><Text fontSize="12px" fontWeight="700" color={GREEN}>{money(selected.received)}</Text></Box>
            <Box><Text fontSize="10px" color={MUTED}>Despesas</Text><Text fontSize="12px" fontWeight="700" color={RED}>{money(selected.expensesPaid)}</Text></Box>
            <Box><Text fontSize="10px" color={MUTED}>Resultado</Text><Text fontSize="12px" fontWeight="800" color={selected.result >= 0 ? DARK : RED}>{money(selected.result)}</Text></Box>
          </Flex>
        </Flex>}
        <Text mt={4} mb={2} color={MUTED} fontWeight="600" fontSize="11px">Resumo do período selecionado</Text>
        <Flex gap={2}>
          <TotalIndicator label="Recebido" amount={totals.received} color={GREEN}/>
          <TotalIndicator label="Despesas" amount={totals.expensesPaid} color={RED}/>
          <TotalIndicator label="Resultado" amount={totals.result} color={totals.result >= 0 ? DARK : RED} highlight/>
        </Flex>
      </>}
    </Box>
  </Box>;
}
