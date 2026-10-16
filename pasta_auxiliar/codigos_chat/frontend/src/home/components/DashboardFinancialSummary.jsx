import { Box, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCreditCard, FiTrendingUp, FiDollarSign } from "react-icons/fi";

const money = amount => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount) || 0);

export default function DashboardFinancialSummary({ data }) {
  const result = Number(data?.result ?? 0);
  const entries = [
    { title: "Recebimentos", value: data?.received, icon: FiCreditCard, tone: "#148443" },
    { title: "Despesas pagas", value: data?.expensesPaid, icon: FiDollarSign, tone: "#be343b" },
    { title: "Resultado realizado", value: result, icon: FiTrendingUp, tone: result >= 0 ? "#0b6b5b" : "#be343b" }
  ];
  return <Box bg="white" border="1px solid #dae6e2" borderRadius="10px" p={{base:3,md:4}}>
    <Flex align="center" justify="space-between" gap={2} mb={4}>
      <Box><Heading fontSize="15px" color="#062f2b">Resumo financeiro</Heading><Text mt={1} fontSize="10px" color="#738883">Movimentações realizadas no mês atual</Text></Box>
      <Flex as={Link} to="/financeiro" align="center" gap={1} color="#0b6b5b" fontSize="11px" fontWeight="700">Ver detalhes <FiArrowRight size={13}/></Flex>
    </Flex>
    <SimpleGrid columns={{base:1,sm:3}} gap={2}>
      {entries.map(({title,value,icon:Icon,tone})=><Flex key={title} gap={2} p={3} bg="#f6faf9" borderRadius="8px" align="flex-start">
        <Box color={tone} mt="2px"><Icon size={17}/></Box>
        <Box minW={0}><Text fontSize="10px" color="#627874">{title}</Text><Text fontSize={{base:"17px",md:"19px"}} color={tone} fontWeight="800" overflowWrap="anywhere">{money(value)}</Text></Box>
      </Flex>)}
    </SimpleGrid>
    <Text mt={3} fontSize="10px" color="#738883">Resultado realizado = recebimentos − despesas efetivamente pagas. Não representa o saldo bancário.</Text>
  </Box>;
}
