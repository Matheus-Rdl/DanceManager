import { Box, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiArrowRight, FiCheckCircle, FiClock, FiFileText } from "react-icons/fi";

const money = amount => new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(Number(amount)||0);
export default function DashboardAlerts({ alerts }) {
  const items = [
    { label: "Mensalidades atrasadas", count: alerts?.overdueFeesCount || 0, detail: `${money(alerts?.overdueFeesValue)} a receber`, icon: FiAlertCircle, to: "/MonthlyFeesOverdue", tone: "#bc3c40" },
    { label: "Despesas vencidas ou até 7 dias", count: alerts?.pendingExpensesCount || 0, detail: `${money(alerts?.pendingExpensesValue)} pendentes`, icon: FiClock, to: "/financeiro", tone: "#a56d1e" },
    { label: "Contratos encerrando em 30 dias", count: alerts?.expiringContractsCount || 0, detail: "Conferir possíveis renovações", icon: FiFileText, to: "/PeopleManagement", tone: "#23679a" }
  ];
  return <Box bg="white" border="1px solid #dae6e2" borderRadius="10px" p={{base:3,md:4}} minW={0}>
    <Heading fontSize="15px" color="#062f2b" mb={3}>Precisa de atenção</Heading>
    {items.every(item=>item.count===0) ? <Flex direction="column" align="center" textAlign="center" gap={2} py={5} color="#138248"><FiCheckCircle size={24}/><Text fontSize="12px">Nenhuma pendência nesses indicadores.</Text></Flex> :
      <VStack align="stretch" gap={0}>{items.filter(item=>item.count>0).map(({label,count,detail,icon:Icon,to,tone},index)=><Box as={Link} key={label} to={to} display="block" py={3} borderTop={index?"1px solid #eef2f1":"none"} _hover={{ bg: "#f6faf9" }}>
        <Flex align="center" gap={3}><Box bg="#f5f7f6" color={tone} borderRadius="8px" p={2}><Icon size={17}/></Box>
          <Box flex="1" minW={0}><Text fontSize="12px" fontWeight="700" color="#164c43">{count} · {label}</Text><Text mt={1} fontSize="10px" color="#738883">{detail}</Text></Box>
          <FiArrowRight size={14} color="#8ba59f"/>
        </Flex>
      </Box>)}</VStack>}
  </Box>;
}
