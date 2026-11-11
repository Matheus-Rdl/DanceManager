import { Box, Flex, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { FiActivity, FiPieChart } from "react-icons/fi";
import { COLORS, formatPeriod, money } from "./financialPeriod";

const GREEN = "#168559";
const RED = "#ed4a55";
const CATEGORY_COLORS = ["#075749", "#24ad72", "#f2bf38", "#9bdc9c", "#d9e1e1"];
const round = value => Math.round(Number(value || 0) * 100) / 100;
const percentage = (amount, total) => total > 0 ? amount / total * 100 : 0;
const formatPercent = value => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

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


/* EN: Renders the donut chart with customizable size, thickness and text.
   PT: Renderiza o gráfico donut com tamanho, espessura e textos personalizáveis. */
function Donut({ items, centerValue, centerLabel, ariaLabel }) {
  const validItems = items.filter(item => Number(item.amount) > 0);
  const total = validItems.reduce((sum, item) => sum + item.amount, 0);

  /* EN: Chart width on mobile devices, in pixels.
     PT: Largura do gráfico no celular, em pixels. */
  const mobileSize = 210;

  /* EN: Chart width on desktop devices, in pixels.
     PT: Largura do gráfico no desktop, em pixels. */
  const desktopSize = 250;

  /* EN: Ring radius. Higher values make the ring larger inside the SVG.
     PT: Raio do círculo. Valores maiores aumentam a rosca dentro do SVG. */
  const radius = 78;

  /* EN: Ring thickness. Higher values make the ring thicker.
     PT: Espessura da rosca. Valores maiores deixam a rosca mais grossa. */
  const ringThickness = 45;

  /* EN: Font size of percentages displayed inside the colored slices.
     PT: Tamanho das porcentagens exibidas dentro das fatias coloridas. */
  const percentageFontSize = 12;

  /* EN: Font size of the currency value in the center.
     PT: Tamanho do valor em reais no centro do donut. */
  const centerValueFontSize = 14;

  /* EN: Font size of the description below the center value.
     PT: Tamanho do texto "Movimentado" ou "Despesas" no centro. */
  const centerLabelFontSize = 12;

  /* EN: Vertical position of the central currency value.
     PT: Posição vertical do valor em reais. Menor = mais para cima. */
  const centerValueY = 114;

  /* EN: Vertical position of the central description.
     PT: Posição vertical do texto central. Maior = mais para baixo. */
  const centerLabelY = 134;

  /* EN: Minimum slice percentage required to display its label.
     PT: Porcentagem mínima para mostrar o número na fatia.
     Example / Exemplo: 0.09 = 9%. */
  const minimumLabelPercentage = 0.09;

  /* EN: Background color of the ring when no data is displayed.
     PT: Cor de fundo da rosca, especialmente visível sem dados. */
  const ringBackgroundColor = "#ebf0ed";

  /* EN: Fixed SVG coordinate system. Keep this at 240 to preserve positions.
     PT: Sistema de coordenadas do SVG. Mantenha 240 para preservar as posições. */
  const svgSize = 240;
  const svgCenter = svgSize / 2;

  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return <Box
    w={{ base: `${mobileSize}px`, md: `${desktopSize}px` }}
    maxW="100%"
    flexShrink={0}
    mx="auto"
  >
    <svg
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      width="100%"
      role="img"
      aria-label={ariaLabel}
    >
      {/* EN: Background ring.
          PT: Círculo de fundo do gráfico. */}
      <circle
        cx={svgCenter}
        cy={svgCenter}
        r={radius}
        fill="none"
        stroke={ringBackgroundColor}
        strokeWidth={ringThickness}
      />

      {validItems.map((item, index) => {
        const part = item.amount / total;
        const start = cumulative;
        cumulative += part;

        /* EN: Calculates the percentage label position on each slice.
           PT: Calcula a posição da porcentagem dentro de cada fatia. */
        const labelAngle = (start + part / 2) * 2 * Math.PI - Math.PI / 2;
        const labelX = svgCenter + radius * Math.cos(labelAngle);
        const labelY = svgCenter + radius * Math.sin(labelAngle);

        return <g key={`${item.label}-${index}`}>
          {/* EN: Colored slice of the donut.
              PT: Fatia colorida do gráfico donut. */}
          <circle
            cx={svgCenter}
            cy={svgCenter}
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth={ringThickness}
            strokeDasharray={`${part * circumference} ${circumference}`}
            strokeDashoffset={-start * circumference}
            transform={`rotate(-90 ${svgCenter} ${svgCenter})`}
          >
            <title>
              {`${item.label}: ${money(item.amount)} (${formatPercent(part * 100)})`}
            </title>
          </circle>

          {/* EN: Percentage shown inside slices large enough to fit a label.
              PT: Porcentagem exibida nas fatias que possuem espaço suficiente. */}
          {part >= minimumLabelPercentage && <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="central"
            /* EN: Inline style takes priority over normal CSS rules.
               PT: O estilo inline tem prioridade sobre regras CSS comuns. */
            style={{
              fontSize: `${percentageFontSize}px`,
              fontWeight: 600
            }}
            fill={
              ["#d9e1e1", "#9bdc9c", "#f2bf38"].includes(item.color)
                ? "#20433b"
                : "white"
            }
            pointerEvents="none"
          >
            {formatPercent(part * 100)}
          </text>}
        </g>;
      })}

      {/* EN: Currency value in the center of the donut.
          PT: Valor em reais exibido no centro do gráfico. */}
      <text
        x={svgCenter}
        y={centerValueY}
        textAnchor="middle"
        style={{
          fontSize: `${centerValueFontSize}px`,
          fontWeight: 800
        }}
        fill="#073f34"
      >
        {money(centerValue)}
      </text>

      {/* EN: Description displayed below the central value.
          PT: Descrição exibida abaixo do valor central. */}
      <text
        x={svgCenter}
        y={centerLabelY}
        textAnchor="middle"
        style={{
          fontSize: `${centerLabelFontSize}px`,
        }}
        fill="#526c63"
      >
        {centerLabel}
      </text>
    </svg>
  </Box>;
}


function Legend({ items, total, totalsLine }) {
  return <VStack flex="1" minW={0} align="stretch" gap={2} justify="center" w="100%">
    {items.map((item, index) => <HStack key={`${item.label}-${index}`} align="center" gap={2} py={1} borderBottom={index === items.length - 1 ? "none" : "1px solid #edf2ef"}>
      <Box w="11px" h="11px" flexShrink={0} borderRadius="3px" bg={item.color} />
      <Text flex="1" minW={0} fontSize="11px" fontWeight="600" color="#2d453e" overflowWrap="anywhere">{item.label}</Text>
      <Box textAlign="right" flexShrink={0}>
        <Text fontWeight="700" color="#174c3e" fontSize="11px" whiteSpace="nowrap">{money(item.amount)}</Text>
        <Text color={COLORS.gray} fontSize="10px">{formatPercent(percentage(item.amount, total))}</Text>
      </Box>
    </HStack>)}
    {totalsLine && <Box mt={2} p={2} borderRadius="8px" bg="#eef8f2">
      <HStack justify="space-between" gap={2} wrap="wrap">
        <Text fontSize="10px" color="#476d5b">Total movimentado</Text>
        <Text fontWeight="800" fontSize="13px" color="#075749">{money(total)}</Text>
      </HStack>
    </Box>}
  </VStack>;
}

function ChartCard({ icon: Icon, heading, caption, children }) {
  return <Box bg="white" border="1px solid #dfe8e4" borderRadius="13px" p={{ base: 3, md: 4 }} minW={0}
    boxShadow="0 3px 12px rgba(7,63,51,0.055)">
    <HStack gap={2} align="start">
      <Box mt="2px" color="#075749" flexShrink={0}><Icon size={19} /></Box>
      <Box minW={0}>
        <Heading as="h3" fontSize={{ base: "13px", md: "15px" }} color="#075749" lineHeight="1.35">{heading}</Heading>
        <Text color={COLORS.gray} fontSize="10px" mt={1} lineHeight="1.45">{caption}</Text>
      </Box>
    </HStack>
    <Flex mt={3} align="center" justify="center" direction={{ base: "column", sm: "row" }} gap={{ base: 2, md: 3 }}>
      {children}
    </Flex>
  </Box>;
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
    <ChartCard icon={FiActivity} heading="Composição das movimentações"
      caption={`Entradas recebidas versus despesas pagas · ${selectedPeriod}`}>
      {movementTotal > 0 ? <>
        <Donut items={movementItems} centerValue={movementTotal} centerLabel="Movimentado"
          ariaLabel={`Composição das movimentações: entradas ${money(income)} e despesas ${money(expenses)}`} />
        <Legend items={movementItems} total={movementTotal} totalsLine />
      </> : <Text py={8} color={COLORS.gray} fontSize="12px" textAlign="center">Nenhuma movimentação realizada no período.</Text>}
    </ChartCard>
    <ChartCard icon={FiPieChart} heading="Distribuição por categoria"
      caption={`Despesas efetivamente pagas por categoria · ${selectedPeriod}`}>
      {categoryTotal > 0 ? <>
        <Donut items={categoryItems} centerValue={categoryTotal} centerLabel="Despesas"
          ariaLabel={`Distribuição das despesas por categoria: ${categoryItems.map(item => `${item.label} ${money(item.amount)}`).join(", ")}`} />
        <Legend items={categoryItems} total={categoryTotal} />
      </> : <Text py={8} color={COLORS.gray} fontSize="12px" textAlign="center">Nenhuma despesa paga no período.</Text>}
    </ChartCard>
  </SimpleGrid>;
}
