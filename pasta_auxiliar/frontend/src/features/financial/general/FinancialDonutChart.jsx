import { Box, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { COLORS, money } from "./financialPeriod";

/* EN: One shared donut implementation and chart container for every financial module.
   PT: Uma única implementação de donut e cartão de gráfico para todo o financeiro. */
const percentage = (amount, total) => total > 0 ? amount / total * 100 : 0;
const formatPercent = value => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/* EN: Renders the donut chart with customizable size, thickness and text.
   PT: Renderiza o gráfico donut com tamanho, espessura e textos personalizáveis. */
export function FinancialDonut({ items, centerValue, centerLabel, ariaLabel, formatValue = money }) {
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
              {`${item.label}: ${formatValue(item.amount)} (${formatPercent(part * 100)})`}
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
        {formatValue(centerValue)}
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


export function FinancialDonutLegend({ items, total, totalsLine = false, formatValue = money, totalLabel = "Total movimentado" }) {
  return <VStack flex="1" minW={0} align="stretch" gap={2} justify="center" w="100%">
    {items.map((item, index) => <HStack key={`${item.label}-${index}`} align="center" gap={2} py={1} borderBottom={index === items.length - 1 ? "none" : "1px solid #edf2ef"}>
      <Box w="11px" h="11px" flexShrink={0} borderRadius="3px" bg={item.color} />
      <Text flex="1" minW={0} fontSize="11px" fontWeight="600" color="#2d453e" overflowWrap="anywhere">{item.label}</Text>
      <Box textAlign="right" flexShrink={0}>
        <Text fontWeight="700" color="#174c3e" fontSize="11px" whiteSpace="nowrap">{formatValue(item.amount)}</Text>
        <Text color={COLORS.gray} fontSize="10px">{formatPercent(percentage(item.amount, total))}</Text>
      </Box>
    </HStack>)}
    {totalsLine && <Box mt={2} p={2} borderRadius="8px" bg="#eef8f2">
      <HStack justify="space-between" gap={2} wrap="wrap">
        <Text fontSize="10px" color="#476d5b">{totalLabel}</Text>
        <Text fontWeight="800" fontSize="13px" color="#075749">{formatValue(total)}</Text>
      </HStack>
    </Box>}
  </VStack>;
}

export function FinancialChartCard({ icon: Icon, heading, caption, children, actions }) {
  return <Box bg="white" border="1px solid #dfe8e4" borderRadius="13px" p={{ base: 3, md: 4 }} minW={0}
    boxShadow="0 3px 12px rgba(7,63,51,0.055)">
    <HStack gap={2} align="start">
      <Box mt="2px" color="#075749" flexShrink={0}><Icon size={19} /></Box>
      <Box minW={0} flex="1">
        <Heading as="h3" fontSize={{ base: "13px", md: "15px" }} color="#075749" lineHeight="1.35">{heading}</Heading>
        <Text color={COLORS.gray} fontSize="10px" mt={1} lineHeight="1.45">{caption}</Text>
      </Box>
      {actions}
    </HStack>
    <Flex mt={3} align="center" justify="center" direction={{ base: "column", sm: "row" }} gap={{ base: 2, md: 3 }}>
      {children}
    </Flex>
  </Box>;
}

