import { useEffect, useState } from "react";
import { Box, Button, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { FiAlertCircle, FiArrowDownRight, FiArrowUpRight, FiBarChart2, FiCalendar, FiCheckCircle, FiClock, FiCreditCard, FiDatabase, FiDollarSign, FiMinus, FiPieChart } from "react-icons/fi";
import financialServices from "../../../services/financialServices";
import FinancialOverviewCharts from "./FinancialOverviewCharts";
import { COLORS, formatDate, money, periodRange, shiftMonth } from "./financialPeriod";
import FinancialOverviewMiniTimeline from "./FinancialOverviewMiniTimeline";
import FinancialOverviewAccounts from "./FinancialOverviewAccounts";

/* EN: Section headers make the overview groups easier to scan.
   PT: Os títulos destacam cada grupo de indicadores da Visão Geral. */
function SectionHeading({ icon: Icon, title, description }) {
  return <HStack align="start" gap={3} px={1}>
    <Box flexShrink={0} w="38px" h="38px" display="flex" alignItems="center" justifyContent="center"
      borderRadius="12px" bg="#e9f6f1" color="#075749"><Icon size={20} /></Box>
    <Box minW={0}>
      <Heading as="h2" fontSize={{ base: "19px", md: "23px" }} lineHeight="1.2" fontWeight="800" color="#075749">{title}</Heading>
      <Text mt={1} fontSize={{ base: "11px", md: "12px" }} lineHeight="1.5" color={COLORS.gray}>{description}</Text>
    </Box>
  </HStack>;
}

/* EN: Compact monthly fee indicator, using values already provided by the summary API.
   PT: Card compacto de mensalidades, usando apenas dados existentes na API. */
function MonthlyStatCard({ icon: Icon, title, value, caption, tone = "green" }) {
  const colors = {
    green: { accent: "#075749", background: "#eff9f3", icon: "#0a7650" },
    neutral: { accent: "#075749", background: "#f1f6f4", icon: "#075749" },
    warning: { accent: "#a86c00", background: "#fff7e7", icon: "#b47800" },
    danger: { accent: "#b82c32", background: "#fff0f0", icon: "#c4363c" }
  };
  const style = colors[tone] || colors.green;
  return <Box bg={`linear-gradient(145deg, #ffffff 65%, ${style.background} 125%)`}
    border="1px solid #e1e9e7" borderRadius="12px" p={{ base: 3, md: 4 }} minW={0}
    boxShadow="0 3px 12px rgba(7,63,51,0.04)">
    <HStack gap={2} mb={3} align="center">
      <Box flexShrink={0} w="29px" h="29px" display="flex" alignItems="center" justifyContent="center"
        borderRadius="full" color={style.icon} bg={style.background}><Icon size={17} /></Box>
      <Text fontSize={{ base: "11px", md: "12px" }} fontWeight="600" lineHeight="1.35" color="#213b33">{title}</Text>
    </HStack>
    <Heading fontSize={{ base: "18px", md: "21px" }} color={style.accent} fontWeight="800" lineHeight="1.15">{value}</Heading>
    {caption && <Text mt={2} fontSize="10px" color={COLORS.gray} lineHeight="1.45">{caption}</Text>}
  </Box>;
}

/* EN: Settlement rate considers fully paid monthly fees of the selected competencies, not payments received in the cash period.
   PT: A taxa considera mensalidades totalmente quitadas das competências selecionadas, não recebimentos do período de caixa. */
function MonthlySettlementCard({ paidCount, totalCount, rate }) {
  const count = Math.max(0, Number(totalCount) || 0);
  const paid = Math.min(count, Math.max(0, Number(paidCount) || 0));
  const hasMetrics = totalCount != null && paidCount != null && rate != null;
  const hasData = hasMetrics && count > 0 && Number.isFinite(Number(rate));
  const percentage = hasData ? Math.min(100, Math.max(0, Number(rate))) : 0;
  const label = hasData ? `${percentage.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "—";
  return <Box bg="white" border="1px solid #e1e9e7" borderRadius="12px" p={{ base: 3, md: 4 }}
    boxShadow="0 3px 12px rgba(7,63,51,0.04)" minW={0}>
    <HStack justify="space-between" align="start" gap={3} flexWrap="wrap">
      <HStack align="start" gap={2} minW={0}>
        <Box display="flex" alignItems="center" justifyContent="center" w="33px" h="33px"
          bg="#e9f6f1" color="#075749" borderRadius="10px" flexShrink={0}><FiCheckCircle size={18} /></Box>
        <Box minW={0}>
          <Text fontWeight="700" color="#075749" fontSize={{ base: "13px", md: "14px" }}>Taxa de quitação</Text>
          <Text fontSize="11px" color={COLORS.gray} mt={1}>
            Mensalidades totalmente pagas das competências selecionadas.
          </Text>
        </Box>
      </HStack>
      <Heading fontSize={{ base: "25px", md: "29px" }} fontWeight="800" color="#168559" lineHeight="1.2">{label}</Heading>
    </HStack>
    {/* EN: Visual indicator, with accessible values for screen readers.
        PT: Indicador visual, com valores acessíveis para leitores de tela. */}
    <Box mt={4} h="11px" bg="#e7efeb" borderRadius="full" overflow="hidden"
      role="progressbar" aria-label="Taxa de quitação das mensalidades"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={hasData ? percentage : undefined}
      aria-valuetext={hasData ? `${label}: ${paid} de ${count} mensalidades quitadas` : hasMetrics ? "Sem mensalidades no período" : "Indicador indisponível"}>
      <Box bg="#168559" h="100%" w={`${percentage}%`} borderRadius="full" />
    </Box>
    <HStack mt={3} justify="space-between" gap={2} flexWrap="wrap">
      <Text fontSize="11px" fontWeight="600" color="#25483d">
        {hasData ? `${paid} de ${count} ${count === 1 ? "mensalidade" : "mensalidades"} quitadas` : hasMetrics ? "Sem mensalidades no período" : "Indicador indisponível"}
      </Text>
      {hasData && <Text fontSize="11px" color={COLORS.gray}>
        {count - paid} {count - paid === 1 ? "mensalidade ainda não quitada" : "mensalidades ainda não quitadas"}
      </Text>}
    </HStack>
  </Box>;
}

/* EN: Alerts summarize open obligations; they never create or modify transactions.
   PT: Os alertas resumem pendências, sem criar nem alterar movimentações. */
function AttentionCard({ icon: Icon, title, count, amount, description, tone = "warning" }) {
  const styles = {
    danger: { accent: "#c4363c", iconBg: "#fff0f0", border: "#f1d6d9" },
    warning: { accent: "#a86c00", iconBg: "#fff6e5", border: "#eddfc3" },
    neutral: { accent: "#075749", iconBg: "#eaf6f0", border: "#dce9e2" }
  };
  const style = styles[tone] || styles.warning;
  const valueCount = Math.max(0, Number(count) || 0);
  return <Box bg="white" border="1px solid" borderColor={style.border} borderLeft={`3px solid ${style.accent}`}
    borderRadius="12px" p={{ base: 3, md: 4 }} minW={0} boxShadow="0 3px 12px rgba(7,63,51,0.04)">
    <HStack gap={2} mb={3} align="start">
      <Box flexShrink={0} w="33px" h="33px" display="flex" alignItems="center" justifyContent="center"
        borderRadius="10px" bg={style.iconBg} color={style.accent}><Icon size={17} /></Box>
      <Box minW={0}>
        <Text fontSize={{ base: "11px", md: "12px" }} color="#203b32" fontWeight="700" lineHeight="1.35">{title}</Text>
        <Text mt={1} fontSize="10px" color={COLORS.gray} lineHeight="1.45">{description}</Text>
      </Box>
    </HStack>
    <HStack align="baseline" gap={2} wrap="wrap">
      <Heading fontSize={{ base: "22px", md: "26px" }} fontWeight="800" color={valueCount ? style.accent : "#607873"}>{valueCount}</Heading>
      <Text fontSize="10px" color={COLORS.gray}>{valueCount === 1 ? "lançamento" : "lançamentos"}</Text>
    </HStack>
    <Text mt={1} fontSize={{ base: "13px", md: "15px" }} fontWeight="700" color={valueCount ? style.accent : "#607873"}>{money(amount)}</Text>
  </Box>;
}

/* EN: Ranks the five highest individual expenses paid within the selected cash period.
   PT: Classifica as cinco maiores despesas individuais pagas no período de caixa escolhido. */
function TopExpensesCard({ items }) {
  const expenses = (Array.isArray(items) ? items : [])
    .filter(item => Number.isFinite(Number(item.amount)) && Number(item.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount) || String(b.paidAt || "").localeCompare(String(a.paidAt || "")))
    .slice(0, 5);
  const largest = Number(expenses[0]?.amount || 0);

  return <Box bg="white" border="1px solid #dfe8e4" borderRadius="13px" p={{ base: 3, md: 4 }} minW={0}
    boxShadow="0 3px 12px rgba(7,63,51,0.055)">
    {!expenses.length ? <Text py={5} color={COLORS.gray} fontSize="12px" textAlign="center">
      Nenhuma despesa paga no período selecionado.
    </Text> : <VStack align="stretch" gap={3}>
      {expenses.map((item, index) => <Box key={item.id || `${item.description}-${item.paidAt}-${index}`} minW={0}>
        <HStack justify="space-between" align="center" gap={3} mb={2}>
          <HStack minW={0} flex="1" gap={3} align="center">
            <Box w="27px" h="27px" flexShrink={0} display="flex" justifyContent="center" alignItems="center"
              borderRadius="7px" bg="#f1f6f4" color="#075749" fontSize="11px" fontWeight="800">
              {index + 1}º
            </Box>
            <Box minW={0}>
              <Text color="#203b32" fontSize={{ base: "11px", md: "12px" }} fontWeight="700" overflowWrap="anywhere">
                {item.description || "Despesa sem descrição"}
              </Text>
              <Text fontSize="10px" color={COLORS.gray}>
                {item.category || "Outros"} · Pago em {formatDate(item.paidAt)}
              </Text>
            </Box>
          </HStack>
          <Text color="#c4363c" fontSize={{ base: "12px", md: "13px" }} fontWeight="800"
            whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{money(item.amount)}</Text>
        </HStack>
        {/* EN: Each bar is relative to the largest individual expense, not to total expenses.
            PT: Cada barra é proporcional à maior despesa individual, não ao total de gastos. */}
        <Box h="6px" bg="#f2e9e9" borderRadius="full" overflow="hidden"
          role="meter" aria-label={`Comparação da despesa ${index + 1}`} aria-valuemin={0}
          aria-valuemax={100} aria-valuenow={largest > 0 ? Math.round(Number(item.amount) / largest * 100) : 0}>
          <Box bg="#ed4a55" h="100%" w={`${largest > 0 ? Number(item.amount) / largest * 100 : 0}%`} borderRadius="full" />
        </Box>
      </Box>)}
    </VStack>}
  </Box>;
}

/* Período anterior com a mesma duração do intervalo escolhido (mês/6/12/ano). */
function previousRange(from, to) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const months = (toYear - fromYear) * 12 + toMonth - fromMonth + 1;
  return { from: shiftMonth(from, -months), to: shiftMonth(to, -months) };
}

const changeLabel = (current, previous, description) => {
  const now = Number(current || 0);
  const before = Number(previous);
  if (!Number.isFinite(before)) return { label: "Comparação indisponível", direction: 0 };
  if (before === 0 && now !== 0) return { label: "Sem base anterior", direction: 0 };
  const change = before === 0 ? 0 : (now - before) / Math.abs(before) * 100;
  if (Math.abs(change) < 0.05) return { label: `0,0% vs. ${description}`, direction: 0 };
  const formatted = Math.abs(change).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return { label: `${change > 0 ? "+" : "−"}${formatted}% vs. ${description}`, direction: Math.sign(change) };
};

/* Card de destaque: apenas os três números realizados, com comparação e margem reais. */
function MainStatCard({ icon: Icon, title, value, detail, direction = 0, intent = "positive", neutral = false, spanOnMobile = false }) {
  const red = intent === "negative";
  const accent = red ? "#ca282d" : "#086044";
  const pale = red ? "#fff1f1" : "#e9f8f1";
  const wave = red ? "#f7b9bc" : "#a4e5ca";
  const DetailIcon = direction > 0 ? FiArrowUpRight : direction < 0 ? FiArrowDownRight : FiMinus;
  const directionColor = neutral ? COLORS.gray : (red ? (direction > 0 ? "#c42c32" : "#128153") : (direction < 0 ? "#c42c32" : "#128153"));
  return <Box position="relative" isolation="isolate" overflow="hidden" minW={0} minH={{ base: "133px", md: "148px" }}
    gridColumn={spanOnMobile ? { base: "1 / -1", lg: "auto" } : undefined}
    border="1px solid #e1e8e5" borderRadius="13px" p={{ base: 3, md: 4 }}
    boxShadow="0 3px 12px rgba(7,63,51,0.055)" bg={`linear-gradient(115deg, white 42%, ${pale} 140%)`}>
    <svg aria-hidden="true" viewBox="0 0 240 90" preserveAspectRatio="none"
      style={{ position: "absolute", right: 0, bottom: 0, width: "57%", height: "46%", zIndex: -1, pointerEvents: "none" }}>
      <path d="M0 90 C37 78 48 44 76 54 C103 64 119 85 151 62 C180 39 196 14 220 25 C232 31 239 43 240 52 L240 90 Z" fill={wave} opacity="0.55" />
      <path d="M0 90 C50 87 67 60 98 71 C122 80 148 87 174 72 C207 53 220 48 240 60 L240 90 Z" fill={wave} opacity="0.23" />
    </svg>
    <VStack align="stretch" gap={{ base: 2, md: 3 }} position="relative" zIndex={1}>
      <HStack gap={2} align="center">
        <Box w="35px" h="35px" flexShrink={0} display="flex" alignItems="center" justifyContent="center" borderRadius="full" bg={pale} color={accent}>
          <Icon size={20} />
        </Box>
        <Text fontSize={{ base: "11px", md: "12px" }} color="#20352f" fontWeight="500" lineHeight="1.25">{title}</Text>
      </HStack>
      <Heading color={accent} fontSize={{ base: "18px", sm: "21px", md: "25px" }} fontWeight="800" lineHeight="1.18" letterSpacing="-0.5px" whiteSpace="nowrap">{value}</Heading>
      <HStack gap={1} align="center" color={directionColor}>
        {!neutral && <Box flexShrink={0}><DetailIcon size={14} /></Box>}
        <Text fontSize={{ base: "10px", md: "11px" }} fontWeight={neutral ? "500" : "600"} lineHeight="1.4">{detail}</Text>
      </HStack>
    </VStack>
  </Box>;
}

export default function FinancialOverview({ period, refreshKey = 0, accountId = "", onOpenEvolution }) {
  const { from, to } = periodRange(period);
  const [summary, setSummary] = useState(null);
  const [previousSummary, setPreviousSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true); setError(""); setSummary(null); setPreviousSummary(null);
    const oldRange = previousRange(from, to);
    /* Falha na comparação não impede visualizar os valores do período atual. */
    Promise.allSettled([
      financialServices.getPeriodSummary({ from, to, accountId }),
      financialServices.getPeriodSummary({ ...oldRange, accountId })
    ]).then(([current, previous]) => {
      if (!mounted) return;
      if (current.status === "fulfilled") setSummary(current.value);
      else setError(current.reason?.message || "Não foi possível carregar o resumo.");
      if (previous.status === "fulfilled") setPreviousSummary(previous.value);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [from, to, accountId, refreshKey, retry]);

  const description = period.mode === "month" ? "mês anterior" : period.mode === "year" ? "ano anterior" : "período anterior";
  const incomeChange = changeLabel(summary?.received, previousSummary?.received, description);
  const expenseChange = changeLabel(summary?.expensesPaid, previousSummary?.expensesPaid, description);
  const income = Number(summary?.received || 0);
  const result = Number(summary?.result || 0);
  const margin = income > 0 ? `${(result / income * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "—";

  return <VStack align="stretch" gap={3} bg="#E9EFEC" p={{ base: 3, md: 4 }} borderRadius="14px">
    {loading && <Text fontSize="12px" color={COLORS.gray}>Carregando indicadores...</Text>}
    {error && <Box bg="#fff1f1" p={3} borderRadius="8px"><Text fontSize="12px" color="#b32f32">{error}</Text><Button size="xs" mt={2} onClick={() => setRetry(v => v + 1)}>Tentar novamente</Button></Box>}
    {!loading && !error && <>
      <VStack align="stretch" gap={3}>
        <SectionHeading icon={FiDollarSign} title="Financeiro Geral"
          description="Resumo das entradas, despesas e resultado do período selecionado." />
        <SimpleGrid columns={{ base: 2, lg: 3 }} gap={3}>
          <MainStatCard icon={FiDatabase} title="Entradas recebidas" value={money(summary?.received)}
            detail={incomeChange.label} direction={incomeChange.direction} neutral={!previousSummary || (incomeChange.direction === 0 && !incomeChange.label.startsWith("0,0%"))} />
          <MainStatCard icon={FiDatabase} title="Despesas pagas" value={money(summary?.expensesPaid)} intent="negative"
            detail={expenseChange.label} direction={expenseChange.direction} neutral={!previousSummary || (expenseChange.direction === 0 && !expenseChange.label.startsWith("0,0%"))} />
          <MainStatCard icon={FiBarChart2} title="Resultado realizado" value={money(result)} intent={result < 0 ? "negative" : "positive"}
            detail={`Margem: ${margin}`} neutral spanOnMobile />
        </SimpleGrid>
      </VStack>

      {/* EN: Bank balances are independent of the selected monthly/annual reporting period.
          PT: Os saldos das contas são independentes do período mensal/anual selecionado. */}
      <FinancialOverviewAccounts refreshKey={refreshKey}/>

      <VStack align="stretch" gap={3} mt={{ base: 4, md: 6 }}>
        <SectionHeading icon={FiCalendar} title="Mensalidades"
          description="Recebimentos da conta selecionada; cobranças previstas, atrasadas e pendentes permanecem gerais." />
        <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3}>
          <MonthlyStatCard icon={FiCreditCard} title="Recebidas" value={money(summary?.monthlyFeesReceived)}
            caption="Pagamentos de mensalidades realizados no período." tone="green" />
          <MonthlyStatCard icon={FiCalendar} title="Previstas" value={money(summary?.expectedFees)}
            caption="Cobranças das competências selecionadas." tone="neutral" />
          <MonthlyStatCard icon={FiAlertCircle} title="Em atraso" value={summary?.overdueFeesCount ?? 0}
            caption={`${money(summary?.overdueFeesValue)} ainda não recebidos.`} tone="danger" />
          <MonthlyStatCard icon={FiClock} title="Em aberto" value={money(summary?.openFees)}
            caption="Saldo não pago, incluindo as mensalidades em atraso." tone="warning" />
        </SimpleGrid>
        <MonthlySettlementCard paidCount={summary?.paidFeesCount}
          totalCount={summary?.totalFeesCount} rate={summary?.feeSettlementRate} />
      </VStack>

      <VStack align="stretch" gap={3} mt={{ base: 4, md: 6 }}>
        <SectionHeading icon={FiPieChart} title="Análise Financeira"
          description="Composição das movimentações e distribuição das despesas no período selecionado." />
        <FinancialOverviewCharts summary={summary} period={period} />
        <FinancialOverviewMiniTimeline period={period} accountId={accountId} refreshKey={refreshKey} onOpenDetails={onOpenEvolution} />
      </VStack>

      <VStack align="stretch" gap={3} mt={{ base: 4, md: 6 }}>
        <SectionHeading icon={FiBarChart2} title="Maiores despesas"
          description="Os 5 maiores gastos individuais efetivamente pagos no período selecionado." />
        <TopExpensesCard items={summary?.topExpenses} />
      </VStack>
      
      <VStack align="stretch" gap={3} mt={{ base: 4, md: 6 }}>
        <SectionHeading icon={FiAlertCircle} title="Atenção financeira"
          description="Mensalidades vencidas e proventos pendentes do período; despesas a vencer nos próximos 7 dias a partir de hoje." />
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={3}>
          <AttentionCard icon={FiAlertCircle} title="Mensalidades atrasadas" tone="danger"
            count={summary?.overdueFeesCount} amount={summary?.overdueFeesValue}
            description="Cobranças vencidas com saldo pendente no período selecionado." />
          <AttentionCard icon={FiClock} title="Despesas próximas do vencimento" tone="warning"
            count={summary?.upcomingExpensesCount} amount={summary?.upcomingExpensesValue}
            description="Despesas não pagas que vencem nos próximos 7 dias, incluindo hoje." />
          <AttentionCard icon={FiCreditCard} title="Proventos a receber" tone="neutral"
            count={summary?.pendingRevenuesCount} amount={summary?.pendingRevenuesValue}
            description="Proventos pendentes no período selecionado." />
        </SimpleGrid>
      </VStack>
      <Text fontSize="11px" color={COLORS.gray}>Resultado realizado = mensalidades recebidas + proventos recebidos − despesas pagas no período. Valores pendentes não entram no resultado. Não é saldo bancário.</Text>
    </>}
  </VStack>;
}
