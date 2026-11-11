/* EN: Native SVG donut; no charting package is needed.
   PT: Gráfico de rosca em SVG, sem dependência adicional de biblioteca. */
function Donut({ items, centerValue, centerLabel, ariaLabel }) {
  const validItems = items.filter(item => Number(item.amount) > 0);
  const total = validItems.reduce((sum, item) => sum + item.amount, 0);
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  return <Box w={{ base: "210px", md: "250px" }} maxW="100%" flexShrink={0} mx="auto">
    <svg viewBox="0 0 240 240" width="100%" role="img" aria-label={ariaLabel}>
      <circle cx="120" cy="120" r={radius} fill="none" stroke="#ebf0ed" strokeWidth="32" />
      {validItems.map((item, index) => {
        const part = item.amount / total;
        const start = cumulative;
        cumulative += part;
        const labelAngle = (start + part / 2) * 2 * Math.PI - Math.PI / 2;
        const labelX = 120 + radius * Math.cos(labelAngle);
        const labelY = 120 + radius * Math.sin(labelAngle);
        return <g key={`${item.label}-${index}`}>
          <circle cx="120" cy="120" r={radius} fill="none" stroke={item.color} strokeWidth="32"
            strokeDasharray={`${part * circumference} ${circumference}`}
            strokeDashoffset={-start * circumference} transform="rotate(-90 120 120)">
            <title>{`${item.label}: ${money(item.amount)} (${formatPercent(part * 100)})`}</title>
          </circle>
          {part >= 0.09 && <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central"
            fontSize="14" fontWeight="700" fill={item.color === "#d9e1e1" || item.color === "#9bdc9c" || item.color === "#f2bf38" ? "#20433b" : "white"}
            pointerEvents="none">{formatPercent(part * 100)}</text>}
        </g>;
      })}
      <text x="120" y="114" textAnchor="middle" fontSize="17" fontWeight="800" fill="#073f34">{money(centerValue)}</text>
      <text x="120" y="134" textAnchor="middle" fontSize="12" fill="#526c63">{centerLabel}</text>
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
