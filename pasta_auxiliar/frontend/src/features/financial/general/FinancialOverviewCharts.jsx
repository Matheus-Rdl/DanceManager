import { SimpleGrid, Text } from "@chakra-ui/react";
import { FiActivity, FiPieChart } from "react-icons/fi";
import { COLORS, formatPeriod, money } from "./financialPeriod";
import { FinancialDonut, FinancialDonutLegend, FinancialChartCard } from "./FinancialDonutChart";

const GREEN = "#168559";
const RED = "#ed4a55";
const CATEGORY_COLORS = ["#075749", "#24ad72", "#f2bf38", "#9bdc9c", "#d9e1e1"];
const round = value => Math.round(Number(value || 0) * 100) / 100;

/* EN: Group small categories under Others so the ring and legend stay readable.
   PT: Agrupa categorias menores em Outros para manter o gráfico e a legenda legíveis. */
function visibleCategories(categories) {
  const totals = new Map();
  for (const item of Array.isArray(categories) ? categories : []) {
    const name = String(item.category || "Outros").trim() || "Outros";
    const amount = round(item.amount);
    if (amount <= 0 || !Number.isFinite(amount)) continue;
    totals.set(name, round((totals.get(name) || 0) + amount));
  }
  const sorted = [...totals].map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, "pt-BR"));
  if (sorted.length <= 5) return sorted.map((item, index) => ({ ...item, color: CATEGORY_COLORS[index] }));

  const major = sorted.filter(item => item.label !== "Outros").slice(0, 4);
  const majorNames = new Set(major.map(item => item.label));
  const other = round(sorted.filter(item => !majorNames.has(item.label)).reduce((sum, item) => sum + item.amount, 0));
  return [...major.map((item, index) => ({ ...item, color: CATEGORY_COLORS[index] })),
  { label: "Outros", amount: other, color: CATEGORY_COLORS[4] }];
}


/* EN: Both charts use paid/received totals from the SAME period summary.
   PT: Ambos os gráficos utilizam os valores realizados do MESMO resumo por período. */
export default function FinancialOverviewCharts({ summary, period }) {
  const income = Math.max(0, round(summary?.received));
  const expenses = Math.max(0, round(summary?.expensesPaid));
  const movementTotal = round(income + expenses);
  const movementItems = [
    { label: "Entradas", amount: income, color: GREEN },
    { label: "Despesas", amount: expenses, color: RED }
  ];
  const categoryItems = visibleCategories(summary?.expenseCategories);
  const categoryTotal = round(categoryItems.reduce((total, item) => total + item.amount, 0));
  const selectedPeriod = formatPeriod(period);
  return <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>
    <FinancialChartCard icon={FiActivity} heading="Composição das movimentações"
      caption={`Entradas recebidas versus despesas pagas · ${selectedPeriod}`}>
      {movementTotal > 0 ? <>
        <FinancialDonut items={movementItems} centerValue={movementTotal} centerLabel="Movimentado"
          ariaLabel={`Composição das movimentações: entradas ${money(income)} e despesas ${money(expenses)}`} />
        <FinancialDonutLegend items={movementItems} total={movementTotal} totalsLine />
      </> : <Text py={8} color={COLORS.gray} fontSize="12px" textAlign="center">Nenhuma movimentação realizada no período.</Text>}
    </FinancialChartCard>
    <FinancialChartCard icon={FiPieChart} heading="Distribuição por categoria"
      caption={`Despesas efetivamente pagas por categoria · ${selectedPeriod}`}>
      {categoryTotal > 0 ? <>
        <FinancialDonut items={categoryItems} centerValue={categoryTotal} centerLabel="Despesas"
          ariaLabel={`Distribuição das despesas por categoria: ${categoryItems.map(item => `${item.label} ${money(item.amount)}`).join(", ")}`} />
        <FinancialDonutLegend items={categoryItems} total={categoryTotal} />
      </> : <Text py={8} color={COLORS.gray} fontSize="12px" textAlign="center">Nenhuma despesa paga no período.</Text>}
    </FinancialChartCard>
  </SimpleGrid>;
}
