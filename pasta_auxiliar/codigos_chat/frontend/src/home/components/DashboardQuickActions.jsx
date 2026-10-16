import { Box, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiArrowUpRight, FiCalendar, FiCreditCard, FiUserPlus, FiDollarSign } from "react-icons/fi";

const actions = [
  { label: "Cadastrar aluno", caption: "Novo cadastro", icon: FiUserPlus, to: "/PeopleManagement/add", state: { currentMode: "A" } },
  { label: "Turmas e aulas", caption: "Gerenciar atividades", icon: FiCalendar, to: "/ActivityManagement" },
  { label: "Mensalidades", caption: "Consultar cobranças", icon: FiCreditCard, to: "/MonthlyFees" },
  { label: "Financeiro", caption: "Ver lançamentos", icon: FiDollarSign, to: "/financeiro" }
];

export default function DashboardQuickActions() {
  return <Box>
    <Heading fontSize="15px" color="#062f2b" mb={3}>Acessos rápidos</Heading>
    <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3}>
      {actions.map(({ label, caption, icon: Icon, to, state }) =>
        <Box as={Link} to={to} state={state} key={label} display="block" bg="white" border="1px solid #dae6e2" borderRadius="10px" p={3}
          cursor="pointer" _hover={{ bg: "#eef8f4", borderColor: "#8bb9ad" }} transition="background .15s, border-color .15s">
          <Flex align="center" justify="space-between" gap={2} mb={3}>
            <Flex w="32px" h="32px" bg="#e6f5ef" color="#064e43" borderRadius="8px" align="center" justify="center"><Icon size={17}/></Flex>
            <FiArrowUpRight color="#8ba59f" size={14}/>
          </Flex>
          <Text color="#164c43" fontSize="12px" fontWeight="700">{label}</Text>
          <Text fontSize="10px" color="#738883" mt={1}>{caption}</Text>
        </Box>
      )}
    </SimpleGrid>
  </Box>;
}
