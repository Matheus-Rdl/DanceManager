import { useEffect, useMemo, useState } from "react";
import { Box, NativeSelect, SimpleGrid, Text } from "@chakra-ui/react";
import { FiBarChart2, FiPieChart } from "react-icons/fi";
import { COLORS, formatPeriod, money, periodRange, shiftMonth } from "./financialPeriod";
import { FinancialChartCard, FinancialDonut, FinancialDonutLegend } from "./FinancialDonutChart";

const count = value => Math.round(Number(value) || 0).toLocaleString("pt-BR");
const STATUS_COLORS = { paid: "#168559", pending: "#f2bf38", overdue: "#ed4a55" };
const formatShortDate = date => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const parseUTCDate = value => new Date(`${value}T00:00:00.000Z`);
const iso = date => date.toISOString().slice(0, 10);
const firstOfNextMonth = month => `${shiftMonth(month, 1)}-01`;

/* EN: Derive fee status from the EXISTING overview summary so it matches the
   Overview's settlement rate. Counts follow the fee's reference, not paidAt.
   PT: Usa o resumo existente da Visão Geral para manter a mesma taxa de quitação.
   Quantidades seguem a competência da cobrança, não a data do pagamento. */
export function buildFeeStatusItems(summary) {
  const total = Math.max(0, Math.round(Number(summary?.totalFeesCount) || 0));
  const paid = Math.min(total, Math.max(0, Math.round(Number(summary?.paidFeesCount) || 0)));
  const overdue = Math.min(total - paid, Math.max(0, Math.round(Number(summary?.overdueFeesCount) || 0)));
  return [
    { label: "Quitadas", amount: paid, color: STATUS_COLORS.paid },
    { label: "Em aberto", amount: total - paid - overdue, color: STATUS_COLORS.pending },
    { label: "Atrasadas", amount: overdue, color: STATUS_COLORS.overdue }
  ];
}

/* EN: Receipts are grouped by their actual payment date; reverted payments are
   excluded upstream. Fill missing dates with zero for a stable timeline.
   PT: Agrupa por data real do recebimento, sem pagamentos estornados, e preenche
   intervalos sem movimento com zero para manter a escala estável. */
export function buildReceiptBars(payments, period, grouping) {
  const { from, to } = periodRange(period);
  const start = `${from}-01`;
  const endExclusive = firstOfNextMonth(to);
  const sums = new Map();
  const groupKey = date => {
    if (grouping === "month") return date.slice(0, 7);
    if (grouping === "week") {
      const monday = parseUTCDate(date);
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      return iso(monday);
    }
    return date;
  };
  for (const item of Array.isArray(payments) ? payments : []) {
    const paidAt = String(item.paidAt || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || paidAt < start || paidAt >= endExclusive) continue;
    const value = Math.round(Number(item.amount || 0) * 100);
    if (!Number.isFinite(value) || value <= 0) continue;
    const key = groupKey(paidAt);
    sums.set(key, (sums.get(key) || 0) + value);
  }
  const keys = [];
  if (grouping === "month") {
    for (let month = from; month <= to; month = shiftMonth(month, 1)) keys.push(month);
  } else {
    const cursor = parseUTCDate(start);
    if (grouping === "week") cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7));
    while (iso(cursor) < endExclusive) {
      keys.push(iso(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + (grouping === "week" ? 7 : 1));
    }
  }
  return keys.map(key => ({
    key,
    label: grouping === "month" ? `${key.slice(5, 7)}/${key.slice(2, 4)}` : formatShortDate(key),
    amount: (sums.get(key) || 0) / 100
  }));
}

function StatusChart({ summary, period, loading, error }) {
  const items = useMemo(() => buildFeeStatusItems(summary), [summary]);
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return <FinancialChartCard icon={FiPieChart} heading="Status das mensalidades"
    caption={`Distribuição das cobranças por competência · ${formatPeriod(period)}`}>
    {loading ? <Text py={8} color={COLORS.gray} fontSize="12px">Carregando status...</Text>
      : error ? <Text py={8} color="#ed4a55" fontSize="12px">Não foi possível consultar o status das mensalidades.</Text>
      : !total ? <Text py={8} color={COLORS.gray} fontSize="12px">Nenhuma mensalidade cadastrada na competência selecionada.</Text>
      : <>
        <FinancialDonut items={items} centerValue={total} centerLabel="Mensalidades"
          formatValue={count}
          ariaLabel={`Status de ${count(total)} mensalidades: ${items.map(item => `${item.label} ${count(item.amount)}`).join(", ")}`} />
        <FinancialDonutLegend items={items} total={total} formatValue={count} totalsLine totalLabel="Total de mensalidades" />
      </>}
  </FinancialChartCard>;
}

/* EN: Choose a useful default per period and keep user grouping selection local
   to this chart; the four global date filters remain unchanged.
   PT: Define agrupamento inicial conforme o período, sem modificar os quatro
   filtros globais já existentes. */
function ReceiptsByDateChart({ payments, period, loading, error }) {
  const { from, to } = periodRange(period);
  const singleMonth = from === to;
  const defaultGrouping = singleMonth ? "day" : "month";
  const [grouping, setGrouping] = useState(defaultGrouping);
  useEffect(() => setGrouping(defaultGrouping), [defaultGrouping, from, to]);
  const actualGrouping = !singleMonth && grouping === "day" ? "month" : grouping;
  const bars = useMemo(() => buildReceiptBars(payments, period, actualGrouping), [payments, period, actualGrouping]);
  const total = bars.reduce((sum, item) => sum + item.amount, 0);
  const max = Math.max(0, ...bars.map(item => item.amount));
  const graphWidth = 760, left = 75, right = 14, top = 16, height = 180, bottom = 37;
  const drawWidth = graphWidth - left - right;
  const yBottom = top + height;
  const scaleMax = max ? Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max)))) * Math.pow(10, Math.floor(Math.log10(max))) : 1;
  const barSlot = drawWidth / Math.max(1, bars.length);
  const barWidth = Math.min(24, Math.max(1.3, barSlot * 0.72));
  const numericLabel = value => value >= 1000 ? `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : money(value);
  const chartTitle = actualGrouping === "day" ? "Recebimentos por dia" : actualGrouping === "week" ? "Recebimentos por semana" : "Recebimentos por mês";
  return <FinancialChartCard icon={FiBarChart2} heading={chartTitle}
    caption={`Dinheiro recebido por data de pagamento · ${formatPeriod(period)}`}
    actions={<NativeSelect.Root size="xs" width="110px" flexShrink={0}>
      <NativeSelect.Field aria-label="Agrupar recebimentos" value={actualGrouping} onChange={event => setGrouping(event.target.value)}
        fontSize="11px" color="#075749" bg="#f6faf8" borderRadius="8px">
        {singleMonth && <option value="day">Por dia</option>}
        <option value="week">Por semana</option>
        <option value="month">Por mês</option>
      </NativeSelect.Field><NativeSelect.Indicator />
    </NativeSelect.Root>}>
    {loading ? <Text py={8} color={COLORS.gray} fontSize="12px">Carregando recebimentos...</Text>
      : error ? <Text py={8} color="#ed4a55" fontSize="12px">Não foi possível consultar os recebimentos.</Text>
      : !total ? <Text py={8} color={COLORS.gray} fontSize="12px">Nenhum recebimento válido neste período.</Text>
      : <Box w="100%" minW={0}>
        <svg viewBox={`0 0 ${graphWidth} ${top + height + bottom}`} width="100%" role="img"
          aria-label={`${chartTitle}, total ${money(total)} no período. Cada barra indica o valor recebido.`}>
          {[0, 1, 2, 3, 4].map(index => {
            const value = scaleMax * index / 4;
            const y = yBottom - height * index / 4;
            return <g key={index}>
              <line x1={left} x2={graphWidth - right} y1={y} y2={y} stroke="#e1e9e7" strokeDasharray={index ? "4 3" : "none"}/>
              <text x={left - 9} y={y + 4} textAnchor="end" fontSize="11" fill="#607873">{numericLabel(value)}</text>
            </g>;
          })}
          {bars.map((item, index) => {
            const barHeight = item.amount / scaleMax * height;
            const x = left + index * barSlot + (barSlot - barWidth) / 2;
            const y = yBottom - barHeight;
            const labelsMax = actualGrouping === "day" ? 8 : 12;
            const labelEvery = Math.max(1, Math.ceil(bars.length / labelsMax));
            return <g key={item.key}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="2" fill="#168559">
                <title>{`${item.label}: ${money(item.amount)}`}</title>
              </rect>
              {(index % labelEvery === 0 || index === bars.length - 1) &&
                <text x={x + barWidth / 2} y={yBottom + 20} textAnchor="middle" fontSize="11" fill="#526c63">{item.label}</text>}
            </g>;
          })}
        </svg>
        <Text textAlign="right" fontSize="10px" color={COLORS.gray} mt={1}>Total recebido: {money(total)}</Text>
      </Box>}
  </FinancialChartCard>;
}

export default function FinancialReceiptsCharts({ period, payments, summary, loading, error, summaryLoading, summaryError }) {
  return <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>
    <StatusChart summary={summary} period={period} loading={summaryLoading} error={summaryError}/>
    <ReceiptsByDateChart period={period} payments={payments} loading={loading} error={error}/>
  </SimpleGrid>;
}
