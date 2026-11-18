import { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Heading, HStack, Input, NativeSelect, SimpleGrid, Table, Text, VStack } from "@chakra-ui/react";
import { FiCreditCard, FiDollarSign, FiPieChart, FiRotateCcw, FiUsers } from "react-icons/fi";
import financialServices from "../../../services/financialServices";
import FinancialReceiptsCharts from "./FinancialReceiptsCharts";
import { COLORS, money, formatDate, formatMonth, periodRange } from "./financialPeriod";

/* EN: Match the Overview screen's card borders, typography, icon circles and spacing.
   PT: Replica bordas, tipografia, círculos dos ícones e espaçamentos da Visão Geral. */
const RECEIPT_COLORS = {
  institutional: "#075749", success: "#168559", danger: "#ed4a55",
  muted: "#607873", border: "#e1e9e7", surface: "#ffffff",
  chart: ["#075749", "#24ad72", "#f2bf38", "#9bdc9c", "#d9e1e1"]
};
const cents = value => Math.round((Number(value) || 0) * 100);
const toMoney = value => money(value / 100);
const countLabel = (count, singular, plural) => `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`;

/* EN: Group method names case-insensitively and keep a legible maximum of five segments.
   PT: Agrupa formas de pagamento ignorando maiúsculas e limita o gráfico a cinco faixas. */
function groupPaymentMethods(payments) {
  const groups = new Map();
  for (const payment of payments) {
    const label = String(payment.method || "Não informada").trim() || "Não informada";
    const key = label.toLocaleLowerCase("pt-BR");
    const current = groups.get(key) || { label, amount: 0, count: 0 };
    current.amount += cents(payment.amount);
    current.count += 1;
    groups.set(key, current);
  }
  const ordered = [...groups.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, "pt-BR"));
  const visible = ordered.length > 5 ? [
    ...ordered.slice(0, 4),
    { label: "Outros", amount: ordered.slice(4).reduce((sum, item) => sum + item.amount, 0),
      count: ordered.slice(4).reduce((sum, item) => sum + item.count, 0) }
  ] : ordered;
  return visible.map((item, index) => ({ ...item, color: RECEIPT_COLORS.chart[index] }));
}

function ReceiptStatCard({ icon: Icon, title, value, caption, intent = "institutional" }) {
  const accent = RECEIPT_COLORS[intent] || RECEIPT_COLORS.institutional;
  const pale = intent === "danger" ? "#fff0f0" : intent === "success" ? "#eaf8f0" : "#eff6f3";
  return <Box minW={0} bg={`linear-gradient(145deg, #ffffff 65%, ${pale} 125%)`}
    border={`1px solid ${RECEIPT_COLORS.border}`} borderRadius="12px" p={{ base: 3, md: 4 }}
    boxShadow="0 3px 12px rgba(7,63,51,0.04)">
    <HStack align="center" gap={2} mb={3}>
      <Flex flexShrink={0} w="30px" h="30px" align="center" justify="center" borderRadius="full" bg={pale} color={accent}>
        <Icon size={17}/>
      </Flex>
      <Text color="#213b33" fontSize={{ base: "11px", md: "12px" }} fontWeight="600" lineHeight="1.35">{title}</Text>
    </HStack>
    <Heading as="p" fontSize={{ base: "18px", md: "21px" }} color={accent} fontWeight="800" lineHeight="1.2" fontVariantNumeric="tabular-nums">{value}</Heading>
    <Text mt={2} fontSize="10px" color={RECEIPT_COLORS.muted} lineHeight="1.5">{caption}</Text>
  </Box>;
}

function ReceiptSectionTitle({ icon: Icon, title, description }) {
  return <HStack align="start" gap={3} px={1}>
    <Flex flexShrink={0} w="38px" h="38px" borderRadius="12px" align="center" justify="center" bg="#e9f6f1" color={RECEIPT_COLORS.institutional}>
      <Icon size={20}/>
    </Flex>
    <Box minW={0}>
      <Heading as="h2" fontSize={{ base: "19px", md: "23px" }} lineHeight="1.2" color={RECEIPT_COLORS.institutional} fontWeight="800">{title}</Heading>
      <Text mt={1} fontSize={{ base: "11px", md: "12px" }} color={RECEIPT_COLORS.muted} lineHeight="1.5">{description}</Text>
    </Box>
  </HStack>;
}

function PaymentMethodsChart({ methods, totalCents, loading, error }) {
  return <Box bg="white" border={`1px solid ${RECEIPT_COLORS.border}`} borderRadius="12px"
    p={{ base: 3, md: 4 }} boxShadow="0 3px 12px rgba(7,63,51,0.04)">
    <HStack gap={2} mb={1}>
      <Flex w="30px" h="30px" borderRadius="full" bg="#e9f6f1" color={RECEIPT_COLORS.institutional} align="center" justify="center"><FiPieChart size={17}/></Flex>
      <Heading as="h3" fontSize={{ base: "14px", md: "16px" }} color={RECEIPT_COLORS.institutional}>Recebimentos por forma de pagamento</Heading>
    </HStack>
    <Text fontSize="11px" color={RECEIPT_COLORS.muted} mb={4}>Distribuição dos valores efetivamente recebidos no período selecionado.</Text>
    {loading ? <Text fontSize="12px" color={RECEIPT_COLORS.muted}>Carregando distribuição...</Text>
      : error ? <Text fontSize="12px" color={RECEIPT_COLORS.danger}>Não foi possível carregar a distribuição.</Text>
      : !totalCents ? <Text fontSize="12px" color={RECEIPT_COLORS.muted}>Nenhum recebimento válido neste período.</Text>
      : <>
        <Flex role="img" aria-label={`Distribuição de ${toMoney(totalCents)} por forma de pagamento`}
          w="100%" h="15px" bg="#ebf0ed" borderRadius="full" overflow="hidden" mb={4}>
          {methods.map(method => <Box key={method.label} flexShrink={0}
            width={`${method.amount / totalCents * 100}%`} h="100%" bg={method.color}
            title={`${method.label}: ${toMoney(method.amount)} (${(method.amount / totalCents * 100).toFixed(1)}%)`}/>) }
        </Flex>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={3}>
          {methods.map(method => <HStack key={method.label} align="start" gap={2} minW={0}>
            <Box mt="4px" flexShrink={0} w="10px" h="10px" borderRadius="full" bg={method.color}/>
            <Box minW={0} flex="1">
              <Flex align="baseline" justify="space-between" wrap="wrap" gap={1}>
                <Text fontSize="12px" fontWeight="700" color="#213b33">{method.label}</Text>
                <Text fontSize="11px" fontWeight="700" color={RECEIPT_COLORS.institutional}>{(method.amount / totalCents * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</Text>
              </Flex>
              <Text fontSize="11px" color={RECEIPT_COLORS.muted}>{toMoney(method.amount)} · {countLabel(method.count, "pagamento", "pagamentos")}</Text>
            </Box>
          </HStack>)}
        </SimpleGrid>
      </>}
  </Box>;
}

export default function FinancialReceipts({ period, refreshKey=0 }) {
  const {from,to}=periodRange(period);
  const [receipts,setReceipts]=useState([]);
  const [statusSummary,setStatusSummary]=useState(null);
  const [statusLoading,setStatusLoading]=useState(true);
  const [statusError,setStatusError]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const [search,setSearch]=useState("");
  const [method,setMethod]=useState("");
  useEffect(()=>{
    let active=true;
    setLoading(true);setError("");setReceipts([]);
    setStatusLoading(true);setStatusError("");setStatusSummary(null);
    /* EN: Fee status follows the selected competency; receipts follow paidAt.
       PT: O status usa a competência; os recebimentos usam a data do pagamento. */
    financialServices.getPeriodSummary({from,to}).then(summary=>{if(active) setStatusSummary(summary);})
      .catch(err=>{if(active) setStatusError(err.message||"Falha ao consultar mensalidades.");})
      .finally(()=>{if(active) setStatusLoading(false);});
    financialServices.getReceipts({from,to,includeReversed:"true"}).then(rows=>{if(active) setReceipts(Array.isArray(rows)?rows:[]);})
      .catch(err=>{if(active) setError(err.message||"Falha ao carregar recebimentos.");})
      .finally(()=>{if(active) setLoading(false);});
    return ()=>{active=false;};
  },[from,to,refreshKey,retry]);
  /* EN: Reversed payments do not represent actual receipts. The existing history
     keeps showing confirmed payments only, even when reversals are fetched for cards.
     PT: Pagamentos estornados não são recebimentos reais. O histórico original
     continua listando apenas pagamentos válidos, mesmo com estornos consultados. */
  const confirmed = useMemo(() => receipts.filter(item => item.status !== "reversed"), [receipts]);
  const reversed = useMemo(() => receipts.filter(item => item.status === "reversed"), [receipts]);
  const filtered = useMemo(() => confirmed.filter(item => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    const haystack = `${item.student?.name || ""} ${item.student?.mat || ""} ${item.monthlyFee?.reference || ""}`.toLocaleLowerCase("pt-BR");
    return (!q || haystack.includes(q)) && (!method || item.method === method);
  }), [confirmed, search, method]);
  const total = filtered.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const methods = [...new Set(confirmed.map(item => item.method).filter(Boolean))].sort();

  /* EN: KPI cards and method chart follow the global financial period. The search
     and payment-method controls remain local to the payment history below.
     PT: Cards e gráfico seguem o período financeiro global; pesquisa e filtro
     por forma de pagamento continuam exclusivos da lista de histórico. */
  const dashboard = useMemo(() => {
    const receivedCents = confirmed.reduce((sum, item) => sum + cents(item.amount), 0);
    const reversedCents = reversed.reduce((sum, item) => sum + cents(item.amount), 0);
    const payingStudents = new Set(confirmed.map(item => String(item.userId || "")).filter(Boolean)).size;
    return { receivedCents, reversedCents, payingStudents,
      paymentsCount: confirmed.length, reversedCount: reversed.length,
      byMethod: groupPaymentMethods(confirmed) };
  }, [confirmed, reversed]);
  const pendingValue = value => loading || error ? "—" : value;

  return <VStack align="stretch" gap={3} minW={0}>
    <ReceiptSectionTitle icon={FiCreditCard} title="Recebimentos de Mensalidades"
      description="Entradas realizadas, conforme a data de cada pagamento, e não a competência da cobrança."/>
    <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3}>
      <ReceiptStatCard icon={FiDollarSign} title="Recebido líquido" intent="success"
        value={pendingValue(toMoney(dashboard.receivedCents))} caption="Soma dos pagamentos válidos, sem os estornados."/>
      <ReceiptStatCard icon={FiCreditCard} title="Pagamentos realizados"
        value={pendingValue(dashboard.paymentsCount.toLocaleString("pt-BR"))}
        caption="Quantidade de transações válidas no período."/>
      <ReceiptStatCard icon={FiRotateCcw} title="Valores estornados" intent="danger"
        value={pendingValue(toMoney(dashboard.reversedCents))}
        caption={`${countLabel(dashboard.reversedCount, "pagamento revertido", "pagamentos revertidos")} originalmente realizados neste período (estorno administrativo).`}/>
      <ReceiptStatCard icon={FiUsers} title="Alunos pagantes"
        value={pendingValue(dashboard.payingStudents.toLocaleString("pt-BR"))}
        caption="Alunos distintos com pelo menos um pagamento válido."/>
    </SimpleGrid>
    <FinancialReceiptsCharts period={period} payments={confirmed} summary={statusSummary}
      loading={loading} error={error} summaryLoading={statusLoading} summaryError={statusError}/>
    <PaymentMethodsChart methods={dashboard.byMethod} totalCents={dashboard.receivedCents} loading={loading} error={error}/>
    <Box bg="white" border="1px solid #e1e9e7" borderRadius="12px" overflow="hidden" boxShadow="0 3px 12px rgba(7,63,51,0.04)">
    <Flex align="center" justify="space-between" p={3} borderBottom="1px solid #e6ecea" gap={2} wrap="wrap">
      <Box><Heading fontSize="15px" color={COLORS.green}>Histórico de pagamentos de mensalidades</Heading><Text fontSize="11px" color={COLORS.gray}>{filtered.length} pagamento(s) • Total exibido: {money(total)}</Text></Box>
    </Flex>
    <Flex p={3} gap={2} wrap="wrap">
      <Input aria-label="Pesquisar recebimentos" size="sm" maxW={{base:"100%",md:"290px"}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar aluno, matrícula ou competência..."/>
      <NativeSelect.Root size="sm" width={{base:"100%",md:"185px"}}><NativeSelect.Field aria-label="Filtrar forma de pagamento" value={method} onChange={e=>setMethod(e.target.value)}><option value="">Todas as formas</option>{methods.map(m=><option key={m}>{m}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
    </Flex>
    {loading && <Text p={4} fontSize="12px" color={COLORS.gray}>Carregando recebimentos...</Text>}
    {error && <Box p={4}><Text fontSize="12px" color={COLORS.red}>{error}</Text><Button size="xs" mt={2} onClick={()=>setRetry(v=>v+1)}>Tentar novamente</Button></Box>}
    {!loading && !error && filtered.length===0 && <Box textAlign="center" p={9}><FiCreditCard color="#97aaa7" size={26} style={{margin:"0 auto 8px"}}/><Text fontSize="12px" color={COLORS.green} fontWeight="700">Nenhum pagamento de mensalidade encontrado</Text><Text fontSize="11px" color={COLORS.gray}>Confira os filtros ou selecione outro período.</Text></Box>}
    {!loading && !error && filtered.length>0 && <>
      <Box display={{base:"none",md:"block"}} overflowX="auto"><Table.Root size="sm" minW="720px"><Table.Header bg="#f4f8f7"><Table.Row>{["Pagamento", "Aluno", "Matrícula", "Mensalidade", "Forma", "Valor recebido"].map(label=><Table.ColumnHeader key={label} fontSize="11px" color={COLORS.green}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
      <Table.Body>{filtered.map(item=><Table.Row key={item.id}><Table.Cell fontSize="11px">{formatDate(item.paidAt)}</Table.Cell><Table.Cell fontWeight="600" fontSize="11px">{item.student?.name||"—"}</Table.Cell><Table.Cell fontSize="11px">{item.student?.mat||"—"}</Table.Cell><Table.Cell fontSize="11px">{formatMonth(item.monthlyFee?.reference)}</Table.Cell><Table.Cell fontSize="11px">{item.method}</Table.Cell><Table.Cell fontSize="11px" color="#147c3b" fontWeight="700">{money(item.amount)}</Table.Cell></Table.Row>)}</Table.Body></Table.Root></Box>
      <VStack p={3} gap={2} display={{base:"flex",md:"none"}} align="stretch">{filtered.map(item=><Box key={item.id} border="1px solid #d7e2df" borderRadius="8px" p={3}><Flex justify="space-between" gap={2}><Text fontSize="12px" fontWeight="700" color={COLORS.green}>{item.student?.name||"Aluno"}</Text><Text fontSize="12px" fontWeight="700" color="#147c3b">{money(item.amount)}</Text></Flex><Text mt={1} fontSize="11px" color={COLORS.gray}>{formatDate(item.paidAt)} • {item.method} • {formatMonth(item.monthlyFee?.reference)}</Text></Box>)}</VStack>
    </>}
  </Box>
  </VStack>;
}
