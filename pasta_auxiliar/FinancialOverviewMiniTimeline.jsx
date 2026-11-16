import { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { FiArrowDownLeft, FiArrowRight, FiArrowUpRight, FiBarChart2, FiRefreshCw } from "react-icons/fi";
import financialServices from "../../../services/financialServices";
import { COLORS, formatDate, formatMonth, formatPeriod, money } from "./financialPeriod";

const GREEN = "#168559";
const RED = "#ed4a55";
const DARK = "#075749";
const PLOT_HEIGHT = 146;
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/* EN: Compact Y-axis labels for the overview chart.
   PT: Rótulos compactos para o eixo vertical do gráfico resumido. */
const axisLabel = value => {
  if (value >= 1_000_000) return `${number.format(value / 1_000_000)} mi`;
  if (value >= 1_000) return `${number.format(value / 1_000)} mil`;
  return number.format(value);
};

const axisMaximum = maximum => {
  if (maximum <= 0) return 100;
  const base = maximum / 4;
  const magnitude = 10 ** Math.floor(Math.log10(base));
  const normalized = base / magnitude;
  const step = ([1, 2, 2.5, 5, 10].find(value => value >= normalized - 1e-10) || 10) * magnitude;
  return step * 4;
};

const shortMonth = reference => {
  const [year, month] = String(reference || "").split("-").map(Number);
  return month >= 1 && month <= 12
    ? `${["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][month - 1]}/${String(year).slice(-2)}`
    : "—";
};

/* EN: The selection is a cash-flow detail, not a new financial record.
   PT: A seleção consulta o caixa do mês; não cria nem modifica lançamentos. */
function MovementPreview({ title, value, entries, color, icon: Icon, emptyText }) {
  return <Box minW={0} border="1px solid #deebe5" borderRadius="10px" bg="white" p={3}>
    <HStack gap={2} mb={1} color={color}><Icon size={16} /><Text fontWeight="700" fontSize="12px">{title}</Text></HStack>
    <Text color={color} fontWeight="800" fontSize={{ base: "17px", md: "20px" }}>{money(value)}</Text>
    <Text fontSize="10px" color={COLORS.gray} mt={1} mb={3}>Valores efetivamente realizados no mês.</Text>
    {entries.length ? <VStack align="stretch" gap={2}>
      {entries.slice(0, 5).map(item => <Flex key={item.id} align="start" justify="space-between" gap={2}
        borderTop="1px solid #eaf0ed" pt={2}>
        <Box minW={0} flex="1">
          <Text fontWeight="600" fontSize="11px" color="#25483d" overflowWrap="anywhere">{item.description}</Text>
          <Text fontSize="10px" color={COLORS.gray}>{formatDate(item.date)} · {item.category || "Outros"}</Text>
        </Box>
        <Text fontWeight="700" fontSize="11px" color={color} whiteSpace="nowrap">{money(item.amount)}</Text>
      </Flex>)}
      {entries.length > 5 && <Text fontSize="10px" color={COLORS.gray}>+ {entries.length - 5} lançamento(s) adicional(is) no extrato</Text>}
    </VStack> : <Text fontSize="11px" color={COLORS.gray}>{emptyText}</Text>}
  </Box>;
}

/* EN: The selected filter controls the exact number of chart bars.
   PT: O filtro superior determina exatamente quantos meses aparecem no gráfico. */
export default function FinancialOverviewMiniTimeline({ period, refreshKey = 0, onOpenDetails }) {
  const queryMode = period.mode;
  const queryMonth = period.mode === "year" ? `${period.year}-12` : period.reference;
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [movements, setMovements] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsRetry, setDetailsRetry] = useState(0);

  /* EN: Default to the top filter month, but allow choosing another visible month.
     PT: Inicia no mês do filtro superior, mas permite escolher outro mês exibido. */
  const selectionScope = `${queryMode}:${queryMonth}:${period.year}`;
  const [manualSelection, setManualSelection] = useState({ scope: null, reference: null });
  const defaultMonth = timeline.find(item => item.reference === period.reference)?.reference
    ?? timeline[timeline.length - 1]?.reference
    ?? null;
  const selectedMonth = manualSelection.scope === selectionScope
    && timeline.some(item => item.reference === manualSelection.reference)
    ? manualSelection.reference
    : defaultMonth;

  /* EN: Clicking the selected month keeps the detail panel open.
     PT: Clicar no mês já selecionado mantém os detalhes abertos. */
  const selectMonth = reference => setManualSelection({ scope: selectionScope, reference });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setTimeline([]);
    financialServices.getTimeline({ mode: queryMode, month: queryMonth, year: period.year })
      .then(data => { if (active) setTimeline(Array.isArray(data?.timeline) ? data.timeline : []); })
      .catch(err => { if (active) setError(err.message || "Não foi possível carregar a evolução financeira."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [queryMode, queryMonth, period.year, refreshKey, retry]);

  /* EN: Load the real transactions for the selected month, including a manually chosen one.
     PT: Carrega os lançamentos reais do mês selecionado, inclusive ao clicar em outro mês. */
  useEffect(() => {
    if (!selectedMonth) return;
    let active = true;
    setDetailsLoading(true);
    setDetailsError("");
    setMovements([]);
    financialServices.getMovements({ from: selectedMonth, to: selectedMonth })
      .then(data => { if (active) setMovements(Array.isArray(data?.rows) ? data.rows : []); })
      .catch(err => { if (active) setDetailsError(err.message || "Não foi possível carregar os lançamentos deste mês."); })
      .finally(() => { if (active) setDetailsLoading(false); });
    return () => { active = false; };
  }, [selectedMonth, refreshKey, detailsRetry]);

  const highest = useMemo(() => Math.max(0, ...timeline.flatMap(point => [Number(point.received) || 0, Number(point.expensesPaid) || 0])), [timeline]);
  const maximum = axisMaximum(highest);
  const subtitle = formatPeriod(period);
  const minBarWidth = timeline.length > 6 ? "43px" : "52px";
  const point = timeline.find(item => item.reference === selectedMonth);
  const expenses = movements.filter(item => item.origin === "expense");
  const revenues = movements.filter(item => item.origin === "revenue");

  return <Box bg="white" border="1px solid #dfe8e4" borderRadius="13px" p={{ base: 3, md: 4 }} minW={0}
    boxShadow="0 3px 12px rgba(7,63,51,0.055)">
    <Flex justify="space-between" align="start" gap={2} wrap="wrap">
      <Box minW={0}>
        <HStack gap={2} align="center"><Box color={DARK}><FiBarChart2 size={18} /></Box>
          <Text fontSize={{ base: "13px", md: "15px" }} fontWeight="700" color={DARK}>Evolução financeira</Text></HStack>
        <Text fontSize="10px" color={COLORS.gray} mt={1}>Recebimentos e despesas pagas · {subtitle}</Text>
      </Box>
      <HStack gap={{ base: 2, md: 3 }} wrap="wrap">
        <HStack gap={1}><Box w="9px" h="9px" bg={GREEN} borderRadius="2px" /><Text fontSize="10px" color={COLORS.gray}>Entradas</Text></HStack>
        <HStack gap={1}><Box w="9px" h="9px" bg={RED} borderRadius="2px" /><Text fontSize="10px" color={COLORS.gray}>Despesas</Text></HStack>
        {typeof onOpenDetails === "function" && <Button size="xs" variant="ghost" color={DARK} px={1} onClick={onOpenDetails}>
          Ver análise completa <FiArrowRight />
        </Button>}
      </HStack>
    </Flex>

    {loading ? <HStack py={7} justify="center" color={COLORS.gray}><FiRefreshCw /><Text fontSize="12px">Carregando evolução...</Text></HStack>
      : error ? <Flex align="center" gap={2} py={6} wrap="wrap"><Text color="#b82c32" fontSize="12px" flex="1">{error}</Text>
        <Button variant="outline" size="xs" onClick={() => setRetry(value => value + 1)}>Tentar novamente</Button></Flex>
        : highest <= 0 ? <VStack align="center" gap={2} py={7}>
          <Text color={COLORS.gray} fontSize="12px" textAlign="center">Nenhum pagamento ou recebimento realizado nesse intervalo.</Text>
        </VStack>
          : <Flex mt={4} gap={2} align="stretch">
            {/* EN: Y-axis remains visible when the months scroll on mobile.
            PT: O eixo Y continua visível quando os meses rolam no celular. */}
            <Box position="relative" w="42px" h={`${PLOT_HEIGHT}px`} flexShrink={0}>
              {[0, 1, 2, 3, 4].map(index => <Text key={index} position="absolute" bottom={`${index * 25}%`} right="1px"
                transform="translateY(50%)" fontSize="9px" color={COLORS.gray} whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                {axisLabel(maximum * index / 4)}
              </Text>)}
            </Box>
            <Box overflowX="auto" flex="1" minW={0} pb={1} scrollbarWidth="thin" aria-label="Resumo mensal de entradas e despesas">
              <Box minW={`${timeline.length * (timeline.length > 6 ? 48 : 58)}px`}>
                <Box h={`${PLOT_HEIGHT}px`} position="relative">
                  {[0, 1, 2, 3, 4].map(index => <Box key={index} position="absolute" bottom={`${index * 25}%`} left={0} right={0}
                    borderTop="1px dashed #e4ebe8" pointerEvents="none" />)}
                  <Flex position="relative" zIndex={1} h="100%" align="end" gap={2}>
                    {timeline.map(item => {
                      const received = Math.max(0, Number(item.received) || 0);
                      const paid = Math.max(0, Number(item.expensesPaid) || 0);
                      const isSelected = selectedMonth === item.reference;
                      const isCurrent = item.reference === period.reference;
                      return <Box as="button" type="button" key={item.reference} minW={minBarWidth} flex="1" h="100%" display="block"
                        cursor="pointer" borderRadius="5px" bg={isSelected ? "#e9f5ef" : "transparent"}
                        aria-label={`Ver movimentações de ${formatMonth(item.reference)}: entradas ${money(received)}, despesas ${money(paid)}`}
                        aria-pressed={isSelected} title={`Ver movimentações de ${formatMonth(item.reference)}`}
                        _hover={{ bg: "#f0f7f3" }} _focusVisible={{ outline: "2px solid #075749", outlineOffset: "-2px" }}
                        onClick={() => selectMonth(item.reference)}>
                        <Flex h="100%" w="100%" gap="4px" justify="center" align="end">
                          <Box w="35%" maxW="34px" h={`${received / maximum * 100}%`} bg={GREEN} opacity={isSelected || isCurrent ? 1 : 0.85} borderTopRadius="3px" />
                          <Box w="35%" maxW="34px" h={`${paid / maximum * 100}%`} bg={RED} opacity={isSelected || isCurrent ? 1 : 0.85} borderTopRadius="3px" />
                        </Flex>
                      </Box>;
                    })}
                  </Flex>
                </Box>
                <Flex borderTop="1px solid #d4dfdb" pt={2} gap={2}>
                  {timeline.map(item => <Box as="button" type="button" key={item.reference} minW={minBarWidth} flex="1" textAlign="center"
                    cursor="pointer" borderRadius="4px" bg={selectedMonth === item.reference ? "#e9f5ef" : "transparent"}
                    aria-label={`Ver movimentações de ${formatMonth(item.reference)}`} aria-pressed={selectedMonth === item.reference}
                    _focusVisible={{ outline: "2px solid #075749" }} _hover={{ bg: "#f0f7f3" }}
                    onClick={() => selectMonth(item.reference)}>
                    <Text fontSize="10px" fontWeight={selectedMonth === item.reference || item.reference === period.reference ? "800" : "500"}
                      color={selectedMonth === item.reference || item.reference === period.reference ? DARK : COLORS.gray}>{shortMonth(item.reference)}</Text>
                  </Box>)}
                </Flex>
              </Box>
            </Box>
          </Flex>}

    {/* EN: Details remain open and follow the month selected in the chart.
        PT: Os detalhes ficam sempre abertos e acompanham o mês selecionado no gráfico. */}
    {point && <Box mt={4} pt={3} borderTop="1px solid #e1eae6">
      <Flex justify="space-between" align="center" gap={2} mb={3}>
        <Box>
          <Text fontSize="12px" fontWeight="800" color={DARK}>Movimentações de {formatMonth(point.reference)}</Text>
          <Text fontSize="10px" color={COLORS.gray}>Somente pagamentos e recebimentos efetivamente realizados.</Text>
        </Box>
      </Flex>
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mb={3}>
        <Box bg="#f0f8f4" p={3} borderRadius="9px"><Text fontSize="10px" color={COLORS.gray}>Mensalidades recebidas</Text>
          <Text fontSize="17px" fontWeight="800" color={GREEN}>{money(point.monthlyFeesReceived)}</Text></Box>
        <Box bg="#f0f8f4" p={3} borderRadius="9px"><Text fontSize="10px" color={COLORS.gray}>Proventos recebidos</Text>
          <Text fontSize="17px" fontWeight="800" color={GREEN}>{money(point.otherRevenuesReceived)}</Text></Box>
        <Box bg={point.result >= 0 ? "#f0f8f4" : "#fff0f0"} p={3} borderRadius="9px"><Text fontSize="10px" color={COLORS.gray}>Resultado do mês</Text>
          <Text fontSize="17px" fontWeight="800" color={point.result >= 0 ? DARK : RED}>{money(point.result)}</Text></Box>
      </SimpleGrid>
      {detailsLoading ? <HStack py={4} color={COLORS.gray}><FiRefreshCw /><Text fontSize="11px">Carregando proventos e despesas...</Text></HStack>
        : detailsError ? <HStack gap={2} wrap="wrap"><Text fontSize="11px" color={RED}>{detailsError}</Text>
          <Button size="xs" variant="outline" onClick={() => setDetailsRetry(value => value + 1)}>Tentar novamente</Button></HStack>
          : <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
            <MovementPreview icon={FiArrowDownLeft} title="Proventos recebidos" value={point.otherRevenuesReceived}
              entries={revenues} color={GREEN} emptyText="Nenhum provento recebido neste mês." />
            <MovementPreview icon={FiArrowUpRight} title="Despesas pagas" value={point.expensesPaid}
              entries={expenses} color={RED} emptyText="Nenhuma despesa paga neste mês." />
          </SimpleGrid>}
    </Box>}
  </Box>;
}
