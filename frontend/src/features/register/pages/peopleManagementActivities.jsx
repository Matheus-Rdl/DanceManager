import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack, HStack } from "@chakra-ui/react";
import { FiArrowLeft, FiCalendar, FiCheck, FiClock, FiPlus, FiUsers } from "react-icons/fi";
import { TbUserSquareRounded } from "react-icons/tb";
import activitiesServices from "../../../services/activitiesServices";
import DialogAddActivity from "./dialog/dialogAddActivity";
import StudentNavigation from "../../../components/StudentNavigation";
//Formatters
import {
  formatCPF,
  formatDate,
  formatName,
  formatRG,
  formatProperNoun,
} from "../../../utils/formatters";
/* Dias cadastrados no banco: 1 = segunda-feira. */
const DAYS = { 1: "Segunda-feira", 2: "Terça-feira", 3: "Quarta-feira", 4: "Quinta-feira", 5: "Sexta-feira", 6: "Sábado", 7: "Domingo" };
const dayLabel = (day) => DAYS[Number(day)] || "Dia não informado";
const getMat = (activity) => String(activity?.activity_mat || "");
const getTeacher = (activity) => activity?.teacher_name || activity?.activity_teacher_name || activity?.professor?.name || "Não informado";
const timeLabel = (activity) => `${activity.activity_time_start || "--:--"} às ${activity.activity_time_end || "--:--"}`;
/* Converte o horário em minutos para calcular a carga semanal. */
const duration = (activity) => {
  const start = String(activity.activity_time_start || "").split(":").map(Number);
  const end = String(activity.activity_time_end || "").split(":").map(Number);
  if (start.length !== 2 || end.length !== 2 || [...start, ...end].some(Number.isNaN)) return 0;
  return Math.max(0, end[0] * 60 + end[1] - start[0] * 60 - start[1]);
};
export default function PeopleManagementActivities() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, userId } = location.state || {};
  const { getActivitiesByMat, userActivitiesList = [], refetchActivities } = activitiesServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [enrolledMats, setEnrolledMats] = useState(() => userData?.user_activities || []);
  /* Mantém as matrículas sincronizadas após salvar no diálogo. */
  useEffect(() => { setEnrolledMats(userData?.user_activities || []); }, [userData]);
  useEffect(() => { if (refetchActivities && enrolledMats.length) getActivitiesByMat(enrolledMats); }, [refetchActivities, enrolledMats]);
  const activities = useMemo(() => userActivitiesList.filter((item) => enrolledMats.map(String).includes(getMat(item))).sort((a, b) => Number(a.activity_days) - Number(b.activity_days) || String(a.activity_time_start).localeCompare(String(b.activity_time_start))), [userActivitiesList, enrolledMats]);
  const uniqueDays = new Set(activities.map((a) => String(a.activity_days)).filter((d) => DAYS[Number(d)])).size;
  const totalMinutes = activities.reduce((sum, activity) => sum + duration(activity), 0);
  /* Atualiza a lista local e solicita as atividades vinculadas novamente. */
  const handleSavedActivities = (mats) => { setEnrolledMats([...mats]); if (mats.length) getActivitiesByMat(mats); };
  return (
    <VStack gap={3} align="stretch" width="100%" minW={0} bg="#f8faf9">
      {/* TITULO */}
      <Flex>
        <Button onClick={() => navigate(-1)} alignSelf="flex-start" variant="ghost" h="34px" px="4px" color="#174f4a" fontSize="12px" fontWeight="600" borderRadius="6px">
          <FiArrowLeft /> Voltar
        </Button>
        <Flex align="center" gap={3} marginLeft={12}>
          <Flex w="36px" h="36px" borderRadius="full" bg="#0b6b5b" color="white" align="center" justify="center" flexShrink={0}>
            <TbUserSquareRounded size={18} />
          </Flex>
          <Box>
            <Heading as="h1" fontSize={{ base: "16px", md: "20px" }} fontWeight="700" lineHeight="1.1" color="#062f2b">
              Turmas
            </Heading>
            <Text fontSize="11px" color="#60777c">
              Atividades do aluno
            </Text>
          </Box>
        </Flex>
      </Flex>
      <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">
        {/* DADOS DO ALUNO */}
        <Flex px={{ base: 3, md: 4 }} py={4} gap={4} justify="flex-start" align={{ base: "flex-start", lg: "center" }} direction={{ base: "column", lg: "row" }}>
          <HStack gap={4} minW={0}>
            <Avatar.Root w={{ base: "64px", md: "76px" }} h={{ base: "64px", md: "76px" }} flexShrink={0}>
              <Avatar.Fallback name={userData?.user_name || userData?.name || "Usuário"} />
              {(userData?.user_photo || userData?.photo) && (
                <Avatar.Image src={userData?.user_photo || userData?.photo} />
              )}
            </Avatar.Root>
            <Box minW={0}>
              <Heading fontSize="xl" lineHeight="1.2" color="#003b36" fontWeight="700">
                {formatName(userData?.user_name || userData?.name || "Usuário")}
              </Heading>
              <Text mt="5px" fontSize="12px" color="#60777c">
                Matrícula: {userData?.user_mat || "-"}
              </Text>
              <Badge mt="8px" px="9px" py="4px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="10px">
                <FiCheck /> Aluno ativo
              </Badge>
            </Box>
          </HStack>
        </Flex>
        <StudentNavigation activeTab="Turmas" userId={userId || userData?._id} userData={userData} />
      </Box>
      {/* Indicadores calculados com as turmas retornadas pelo serviço. */}
      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
        {[{ title: "Turmas matriculadas", value: activities.length, icon: FiUsers }, { title: "Dias na semana", value: uniqueDays, icon: FiCalendar }, { title: "Carga semanal", value: `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 ? ` ${totalMinutes % 60}min` : ""}`, icon: FiClock }].map(({ title, value, icon: Icon }) => (
          <Flex key={title} bg="white" border="1px solid #d7e2df" borderRadius="8px" p={3} align="center" gap={3}><Box color="#0b6b5b"><Icon size={20} /></Box><Box><Text fontSize="11px" color="#60777c">{title}</Text><Text fontSize="21px" fontWeight="700" color="#063f39">{value}</Text></Box></Flex>
        ))}
      </SimpleGrid>
      <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">
        <Flex align="center" justify="space-between" px={4} py={3} borderBottom="1px solid #e6ecea" gap={2} wrap="wrap"><Box><Heading fontSize="16px" color="#062f2b">Atividades matriculadas</Heading><Text fontSize="11px" color="#60777c">Consulte dias, horários e professores</Text></Box><Button size="sm" bg="#064e43" color="white" borderRadius="8px" fontSize="12px" disabled={!userData} onClick={() => setDialogOpen(true)}><FiPlus /> Gerenciar atividades</Button></Flex>
        {!userData ? <Box p={8}><Text color="gray.500">Nenhum aluno selecionado.</Text></Box> : activities.length === 0 ? <Box p={8} textAlign="center"><Text color="gray.500">Este aluno ainda não possui atividades.</Text><Button mt={3} size="sm" variant="outline" onClick={() => setDialogOpen(true)}>Adicionar primeira atividade</Button></Box> : (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} p={3}>
            {activities.map((activity, index) => <Box key={activity._id || getMat(activity) || index} border="1px solid #e2e8e7" borderRadius="8px" p={3}>
              <Flex justify="space-between" align="start" gap={2}><Box><Text fontWeight="700" fontSize="13px" color="#063f39">{activity.activity_title || "Atividade"}</Text><Text fontSize="10px" color="#60777c">Turma {getMat(activity) || "-"}</Text></Box><Badge bg="#dff5e6" color="#14833b" borderRadius="full" fontSize="10px">Matriculado</Badge></Flex>
              <Flex mt={3} gap={3} wrap="wrap"><Text fontSize="11px" color="#506a67"><FiCalendar style={{ display: "inline" }} /> {dayLabel(activity.activity_days)}</Text><Text fontSize="11px" color="#506a67"><FiClock style={{ display: "inline" }} /> {timeLabel(activity)}</Text></Flex>
              <Text mt={2} fontSize="11px" color="#506a67">Professor: {getTeacher(activity)}</Text>
            </Box>)}
          </SimpleGrid>
        )}
      </Box>
      {userData && <DialogAddActivity open={dialogOpen} onClose={() => setDialogOpen(false)} userData={{ ...userData, user_activities: enrolledMats }} onSaved={handleSavedActivities} />}
    </VStack>
  );
}
