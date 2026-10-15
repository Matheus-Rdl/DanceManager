import { useEffect, useState } from "react";
import { Box, Button, Flex, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { FiAlertCircle, FiCalendar, FiClock, FiCreditCard, FiDollarSign, FiRepeat, FiTrendingUp } from "react-icons/fi";
import financialServices from "../../../services/financialServices";
import { COLORS, money, periodRange } from "./financialPeriod";

function StatCard({icon:Icon, title, value, caption, tone=COLORS.green}) {
  return <Box bg="white" border="1px solid #e1e9e7" borderRadius="9px" p={4} minW={0}>
    <HStack gap={2} mb={2}><Box color={tone}><Icon size={18}/></Box><Text fontSize="11px" color={COLORS.gray}>{title}</Text></HStack>
    <Heading fontSize={{base:"16px",md:"21px"}} color={tone} fontWeight="800">{value}</Heading>
    {caption && <Text mt={1} fontSize="10px" color={COLORS.gray}>{caption}</Text>}
  </Box>;
}
export default function FinancialOverview({ period, refreshKey=0 }) {
  const {from,to} = periodRange(period);
  const [summary,setSummary] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(0);
  useEffect(()=>{
    let mounted=true;
    setLoading(true); setError(""); setSummary(null);
    financialServices.getPeriodSummary({from,to}).then(data=>{if(mounted) setSummary(data);})
      .catch(err=>{if(mounted) setError(err.message||"Não foi possível carregar o resumo.");})
      .finally(()=>{if(mounted) setLoading(false);});
    return ()=>{mounted=false;};
  },[from,to,refreshKey,retry]);
  return <VStack align="stretch" gap={3}>
    {loading && <Text fontSize="12px" color={COLORS.gray}>Carregando indicadores...</Text>}
    {error && <Box bg="#fff1f1" p={3} borderRadius="8px"><Text fontSize="12px" color="#b32f32">{error}</Text><Button size="xs" mt={2} onClick={()=>setRetry(v=>v+1)}>Tentar novamente</Button></Box>}
    {!loading && !error && <>
      <SimpleGrid columns={{base:2,lg:4}} gap={3}>
        <StatCard icon={FiCreditCard} title="Recebimentos realizados" value={money(summary?.received)} caption="Por data de pagamento" tone="#147c3b"/>
        <StatCard icon={FiDollarSign} title="Despesas pagas" value={money(summary?.expensesPaid)} caption="Por data de pagamento" tone={COLORS.red}/>
        <StatCard icon={FiTrendingUp} title="Resultado realizado" value={money(summary?.result)} caption="Recebido − despesas pagas" tone={(summary?.result||0)>=0?COLORS.green:COLORS.red}/>
        <StatCard icon={FiAlertCircle} title="Mensalidades em atraso" value={summary?.overdueFeesCount??0} caption={money(summary?.overdueFeesValue)} tone="#b83a3a"/>
      </SimpleGrid>
      <SimpleGrid columns={{base:2,lg:3}} gap={3}>
        <StatCard icon={FiCalendar} title="Mensalidades previstas" value={money(summary?.expectedFees)} caption="Cobranças das competências do período"/>
        <StatCard icon={FiClock} title="Mensalidades em aberto" value={money(summary?.openFees)} caption="Saldo ainda não pago" tone="#996500"/>
        <StatCard icon={FiRepeat} title="Despesas pendentes" value={summary?.pendingExpensesCount??0} caption={money(summary?.pendingExpensesValue)} tone="#996500"/>
      </SimpleGrid>
      <Text fontSize="11px" color={COLORS.gray}>Resultado realizado = pagamentos recebidos − despesas efetivamente pagas no período. Não é saldo bancário.</Text>
    </>}
  </VStack>;
}
