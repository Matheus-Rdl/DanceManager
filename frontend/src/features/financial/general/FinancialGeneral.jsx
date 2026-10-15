import { useState } from "react";
import { Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { FiActivity, FiCreditCard, FiDollarSign, FiPieChart, FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import FinancialPeriodSelector from "./FinancialPeriodSelector";
import FinancialOverview from "./FinancialOverview";
import FinancialReceipts from "./FinancialReceipts";
import FinancialExpenses from "./FinancialExpenses";
import FinancialEvolution from "./FinancialEvolution";
import { COLORS, initialPeriod } from "./financialPeriod";

const tabs = [
  {id:"overview",label:"Visão Geral",icon:FiActivity},
  {id:"receipts",label:"Recebimentos",icon:FiCreditCard},
  {id:"expenses",label:"Despesas",icon:FiDollarSign},
  {id:"evolution",label:"Evolução Financeira",icon:FiTrendingUp}
];

export default function FinancialGeneral() {
  const [tab,setTab] = useState("overview");
  /* Um único filtro de período compartilhado entre todas as quatro abas. */
  const [period, setPeriod] = useState(() => initialPeriod("month"));
  const [refreshKey,setRefreshKey] = useState(0);
  const updatePeriod = value => setPeriod(value);
  const refresh = () => setRefreshKey(key => key+1);
  return <VStack gap={3} align="stretch" width="100%" minW={0} bg="#f8faf9" pb={7}>
    <Flex justify="space-between" align={{base:"flex-start",md:"center"}} gap={3} wrap="wrap">
      <Flex align="center" gap={3}>
        <Flex w="39px" h="39px" bg={COLORS.green} borderRadius="full" align="center" justify="center" color="white"><FiPieChart size={20}/></Flex>
        <Box><Heading fontSize={{base:"18px",md:"22px"}} color="#062f2b">Financeiro Geral</Heading><Text fontSize="11px" color={COLORS.gray}>Recebimentos, despesas e resultado da escola</Text></Box>
      </Flex>
      <Button size="sm" variant="outline" onClick={refresh}><FiRefreshCw/> Atualizar</Button>
    </Flex>
    <Flex bg="white" border="1px solid #d7e2df" borderRadius="9px" p={1} gap={1} wrap="wrap" role="tablist" aria-label="Áreas do financeiro">
      {tabs.map(item => {const Icon=item.icon;return <Button key={item.id} role="tab" aria-selected={tab===item.id} size="sm" h="36px" flex={{base:"1 1 calc(50% - 6px)",md:"unset"}} bg={tab===item.id?COLORS.green:"transparent"} color={tab===item.id?"white":COLORS.green} onClick={()=>setTab(item.id)} borderRadius="6px" fontSize="11px"><Icon/>{item.label}</Button>;})}
    </Flex>
    <FinancialPeriodSelector period={period} onChange={updatePeriod}/>
    <Box role="tabpanel" minW={0}>
      {tab==="overview" && <FinancialOverview period={period} refreshKey={refreshKey}/>}
      {tab==="receipts" && <FinancialReceipts period={period} refreshKey={refreshKey}/>}
      {tab==="expenses" && <FinancialExpenses period={period} refreshKey={refreshKey} onDataChanged={refresh}/>}
      {tab==="evolution" && <FinancialEvolution period={period} refreshKey={refreshKey}/>}
    </Box>
  </VStack>;
}
