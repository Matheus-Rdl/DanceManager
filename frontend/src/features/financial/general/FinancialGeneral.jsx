import { useState } from "react";
import { Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { FiActivity, FiRepeat, FiCreditCard, FiDollarSign, FiPieChart, FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import FinancialPeriodSelector from "./FinancialPeriodSelector";
import FinancialOverview from "./FinancialOverview";
import FinancialReceipts from "./FinancialReceipts";
import FinancialExpenses from "./FinancialExpenses";
import FinancialRevenues from "./FinancialRevenues";
import FinancialEvolution from "./FinancialEvolution";
import FinancialMovements from "./FinancialMovements";
import { COLORS, initialPeriod } from "./financialPeriod";

const tabs = [
  {id:"overview",label:"Visão Geral",icon:FiActivity},
  {id:"receipts",label:"Mensalidades",icon:FiCreditCard},
  {id:"revenues",label:"Proventos",icon:FiDollarSign},
  {id:"expenses",label:"Despesas",icon:FiDollarSign},
  {id:"movements",label:"Movimentações",icon:FiRepeat},
  {id:"evolution",label:"Evolução Financeira",icon:FiTrendingUp}
];

export default function FinancialGeneral() {
  const navigate = useNavigate();
  const [tab,setTab] = useState("overview");
  const [focus,setFocus] = useState(null);
  /* Um único filtro de período compartilhado entre todas as abas. */
  const [period, setPeriod] = useState(() => initialPeriod("month"));
  const [refreshKey,setRefreshKey] = useState(0);
  const updatePeriod = value => setPeriod(value);
  const refresh = () => setRefreshKey(key => key+1);
  /* Open the existing record rather than editing/duplicating it in the statement.
     Abre o registro original em vez de replicar operações financeiras no extrato. */
  const openOrigin = item => {
    if (item.origin === "monthlyFee") {
      navigate(item.userId ? "/MonthlyFeesDetailed" : "/MonthlyFees",
        item.userId ? { state: { studentId: item.userId, feeId: item.sourceId } } : undefined);
      return;
    }
    const destination = item.origin === "expense" ? "expenses" : item.origin === "revenue" ? "revenues" : "movements";
    if (destination === "movements") return;
    const reference = item.reference || item.date.slice(0, 7);
    setPeriod(current => ({ ...current, mode: "month", reference, year: reference.slice(0, 4) }));
    setFocus({ tab: destination, id: item.sourceId });
    setTab(destination);
  };
  return <VStack gap={3} align="stretch" width="100%" minW={0} bg="#f8faf9" pb={7}>
    <Flex justify="space-between" align={{base:"flex-start",md:"center"}} gap={3} wrap="wrap">
      <Flex align="center" gap={3}>
        <Flex w="39px" h="39px" bg={COLORS.green} borderRadius="full" align="center" justify="center" color="white"><FiPieChart size={20}/></Flex>
        <Box><Heading fontSize={{base:"18px",md:"22px"}} color="#062f2b">Financeiro Geral</Heading><Text fontSize="11px" color={COLORS.gray}>Mensalidades, proventos, despesas e resultado da escola</Text></Box>
      </Flex>
      <Button size="sm" variant="outline" onClick={refresh}><FiRefreshCw/> Atualizar</Button>
    </Flex>
    <Flex bg="white" border="1px solid #d7e2df" borderRadius="9px" p={1} gap={1} wrap="wrap" role="tablist" aria-label="Áreas do financeiro">
      {tabs.map(item => {const Icon=item.icon;return <Button key={item.id} role="tab" aria-selected={tab===item.id} size="sm" h="36px" flex={{base:"1 1 calc(50% - 6px)",md:"unset"}} bg={tab===item.id?COLORS.green:"transparent"} color={tab===item.id?"white":COLORS.green} onClick={()=>{ setFocus(null); setTab(item.id); }} borderRadius="6px" fontSize="11px"><Icon/>{item.label}</Button>;})}
    </Flex>
    <FinancialPeriodSelector period={period} onChange={updatePeriod} cashOnly={tab === "movements"}/>
    <Box role="tabpanel" minW={0}>
      {tab==="overview" && <FinancialOverview period={period} refreshKey={refreshKey}/>}
      {tab==="receipts" && <FinancialReceipts period={period} refreshKey={refreshKey}/>}
      {tab==="revenues" && <FinancialRevenues period={period} refreshKey={refreshKey} onDataChanged={refresh} focusId={focus?.tab === "revenues" ? focus.id : null}/>}
      {tab==="expenses" && <FinancialExpenses period={period} refreshKey={refreshKey} onDataChanged={refresh} focusId={focus?.tab === "expenses" ? focus.id : null}/>}
      {tab==="movements" && <FinancialMovements period={period} refreshKey={refreshKey} onOpenOrigin={openOrigin}/>}
      {tab==="evolution" && <FinancialEvolution period={period} refreshKey={refreshKey}/>}
    </Box>
  </VStack>;
}
