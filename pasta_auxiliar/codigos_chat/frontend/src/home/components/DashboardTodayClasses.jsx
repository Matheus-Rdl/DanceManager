import { Box, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCalendar, FiClock, FiUsers } from "react-icons/fi";

export default function DashboardTodayClasses({ classes = [] }) {
  return <Box bg="white" border="1px solid #dae6e2" borderRadius="10px" p={{base:3,md:4}} minW={0}>
    <Flex justify="space-between" align="center" gap={2} mb={3}>
      <Heading fontSize="15px" color="#062f2b">Aulas de hoje</Heading>
      <Flex as={Link} to="/ActivityManagement" align="center" gap={1} color="#0b6b5b" fontSize="11px" fontWeight="700">Ver turmas <FiArrowRight size={13}/></Flex>
    </Flex>
    {!classes.length ? <Flex direction="column" align="center" textAlign="center" gap={2} py={5} color="#8aa29b"><FiCalendar size={24}/><Text fontSize="12px">Nenhuma turma ativa agendada para hoje.</Text></Flex> :
      <VStack align="stretch" gap={0}>
        {classes.slice(0, 5).map((item,index)=><Flex key={item.id} justify="space-between" align="center" gap={3} py={3} borderTop={index ? "1px solid #eef2f1" : "none"}>
          <Box minW={0}><Text fontSize="12px" fontWeight="700" color="#164c43" truncate>{item.title}</Text><Text fontSize="10px" color="#738883" mt={1}>{item.teacher || "Professor não informado"}</Text>
            <Flex gap={2} color="#738883" mt={1} align="center"><FiUsers size={11}/><Text fontSize="10px">{item.studentsCount} alunos ativos{item.linkedCount > item.studentsCount ? ` · ${item.linkedCount} vínculos no total` : ""}</Text></Flex>
          </Box>
          <Flex flexShrink={0} align="center" gap={1} bg="#edf6f2" color="#0b6b5b" p={2} borderRadius="6px"><FiClock size={12}/><Text fontSize="11px" fontWeight="700">{item.start || "--:--"}</Text></Flex>
        </Flex>)}
        {classes.length > 5 && <Text fontSize="10px" color="#738883" mt={2}>+ {classes.length - 5} turma(s) hoje. Consulte a tela de Atividades.</Text>}
      </VStack>}
  </Box>;
}
