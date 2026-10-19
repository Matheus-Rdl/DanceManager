/*
  Type: Page
  Name: ActivityManagement
  Description: Gestão de atividades, filtros rápidos e visualizações.
  Author: Matheus Rodrigues
*/
import { Table, Box, Button, Heading, HStack, VStack, Flex, Dialog, Portal, Input, NativeSelect, Text, Badge } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useTableFilter from "../../../hooks/useTableFilter";
import fieldsServices from "../../../services/fieldsServices";
import activitiesServices from "../../../services/activitiesServices";
import usersServices from "../../../services/usersServices";
import { isActiveStudent } from "../../../utils/userSituation";
import { getActivityTeacherLabel, getActivityTeacherNames } from "../../../utils/activityTeachers";
import Loading from "../../../components/loading";
import { FaThList } from "react-icons/fa";
import { MdViewWeek } from "react-icons/md";
import { LiaGraduationCapSolid } from "react-icons/lia";
import { PiCardsFill, PiUsersThree } from "react-icons/pi";
import { FiCheck } from "react-icons/fi";
import { LuPlus, LuPencil, LuUsers, LuEllipsis, LuTrash2, LuSearch, LuX, LuArrowRight, LuUserX } from "react-icons/lu";

const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("pt-BR");
const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
const activityKeys = (activity) => [activity.activity_mat, activity.activityMat, activity._id, activity.id].filter(Boolean).map(String);
const studentKeys = (user) => (Array.isArray(user.user_activities) ? user.user_activities : []).map((item) => String(typeof item === "object" && item !== null ? firstValue(item.activity_mat, item.activityMat, item._id, item.id) ?? "" : item));
const getTitle = (activity) => String(firstValue(activity.activity_title, activity.activity_name, activity.activityName, activity.name, activity.title) ?? "Sem nome");
const getProfessor = (activity) => getActivityTeacherLabel(activity);
/* Dias da semana: 1 = segunda-feira, 7 = domingo. */
const DAY_NAMES = { 1: "Segunda-feira", 2: "Terça-feira", 3: "Quarta-feira", 4: "Quinta-feira", 5: "Sexta-feira", 6: "Sábado", 7: "Domingo" };
const getDayName = (code) => DAY_NAMES[Number(code)] || "Não informado";
const getDayCode = (activity) => {
  const value = firstValue(activity.activity_days, activity.activity_day);
  return value === undefined ? "" : String(value);
};
const getSchedule = (activity) => {
  const day = getDayCode(activity);
  const start = firstValue(activity.activity_time_start);
  const end = firstValue(activity.activity_time_end);
  const hours = start && end ? `${start} às ${end}` : String(start ?? end ?? "");
  return [day ? getDayName(day) : "", hours].filter(Boolean).join(" · ");
};
const getSituation = (activity) => {
  const raw = firstValue(activity.activity_active, activity.activity_status, activity.activity_situation, activity.status, activity.active);
  if (raw === true || raw === 1 || ["1", "ativo", "ativa", "active", "em andamento"].includes(normalize(raw))) return { key: "active", label: "Ativa", bg: "#dff5e6", color: "#14833b" };
  if (raw === false || raw === 0 || ["0", "inativo", "inativa", "inactive", "encerrada", "encerrado"].includes(normalize(raw))) return { key: "inactive", label: "Inativa", bg: "#ffe2e3", color: "#c53030" };
  return { key: "unknown", label: "Não informado", bg: "#edf1f2", color: "#64748b" };
};

export default function ActivityManagement() {
  const navigate = useNavigate();
  const [activityActive, setActivityActive] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [quickSearch, setQuickSearch] = useState("");
  const [quickTeacher, setQuickTeacher] = useState("all");
  const [quickDay, setQuickDay] = useState("all");
  const [quickSituation, setQuickSituation] = useState("all");
  const menuRef = useRef(null);

  const { getActivities, refetchActivities, activitiesList, activitiesLoading, deleteActivity } = activitiesServices();
  const { getUsers, refetchUsers, usersList, usersLoading } = usersServices();
  const { fieldsLoading, fieldsListByCollectionAndPage, getFieldsByCollectionAndPage } = fieldsServices();
  const activities = Array.isArray(activitiesList) ? activitiesList : [];
  const users = Array.isArray(usersList) ? usersList : [];
  const selectedActivity = activities.find((activity) => String(activity._id) === String(activityActive));

  useEffect(() => { getActivities(); }, [refetchActivities]);
  useEffect(() => { getUsers(); }, [refetchUsers]);
  useEffect(() => { getFieldsByCollectionAndPage("activities", "activitiesManagement"); }, []);
  useEffect(() => {
    const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortedDataFields = [...(fieldsListByCollectionAndPage || [])].sort((a, b) => {
    const folderA = Number(a.folder) === 0 ? 999 : Number(a.folder) || 0;
    const folderB = Number(b.folder) === 0 ? 999 : Number(b.folder) || 0;
    return folderA !== folderB ? folderA - folderB : (Number(a.order) || 0) - (Number(b.order) || 0);
  });
  const sortedFields = sortedDataFields.map((field) => ({
    text: field.title, type: field.filterType || field.type || "text", input: field.input,
    dataKey: field.field, optionsKey: field.field,
    minWidth: field.minWidth || "120px", maxWidth: field.maxWidth || "400px"
  }));
  const filteredActivities = useTableFilter(activities, filters, sortedFields);
  /* Quantidade de vínculos históricos, inclusive afastados e inativos. */
  const getStudentCount = (activity) => {
    const keys = activityKeys(activity);
    const linked = users.filter(user => studentKeys(user).some(key => keys.includes(key)));
    if (!usersLoading && Array.isArray(usersList)) return linked.length;
    return Array.isArray(activity.students) ? activity.students.length : null;
  };
  /* Quantidade efetivamente ativa; não exclui vínculos nem históricos. */
  const getActiveStudentCount = (activity) => {
    const keys = activityKeys(activity);
    return users.filter(user => isActiveStudent(user) && studentKeys(user).some(key => keys.includes(key))).length;
  };
  const teacherOptions = [...new Set(activities.flatMap(activity => getActivityTeacherNames(activity)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const dayCodes = [...new Set(activities.map(getDayCode).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const visibleActivities = (filteredActivities || []).filter((activity) => {
    const search = normalize(quickSearch);
    const title = normalize(getTitle(activity));
    const mat = normalize(firstValue(activity.activity_mat, activity.activityMat, activity.id));
    const dayCode = getDayCode(activity);
    return (!search || title.includes(search) || mat.includes(search) || normalize(getProfessor(activity)).includes(search)) &&
      (quickTeacher === "all" || (quickTeacher === "unknown" ? getActivityTeacherNames(activity).length === 0 : getActivityTeacherNames(activity).includes(quickTeacher))) &&
      (quickDay === "all" || (quickDay === "unknown" ? !dayCode : dayCode === quickDay)) &&
      (quickSituation === "all" || getSituation(activity).key === quickSituation);
  });
  const hasQuickFilters = Boolean(quickSearch || quickTeacher !== "all" || quickDay !== "all" || quickSituation !== "all");
  const clearQuickFilters = () => { setQuickSearch(""); setQuickTeacher("all"); setQuickDay("all"); setQuickSituation("all"); };
  const openActivityEdit = (activity) => navigate(`/ActivityManagementDetailed?activityMat=${encodeURIComponent(activity.activity_mat)}`, { state: { activityId: activity._id, activityData: activity, currentMode: "E" } });
  const handleDeleteActivity = async () => {
    try {
      const result = await deleteActivity(activityActive);
      if (result?.success) { setDeleteDialogOpen(false); setOpen(false); setActivityActive(null); getActivities(); }
      else console.error(result);
    } catch (error) { console.error(error); }
  };

  const totalActivities = activities.length;
  const activeActivities = activities.filter((activity) => getSituation(activity).key === "active").length;
  const totalStudents = activities.reduce((total, activity) => total + getActiveStudentCount(activity), 0);
  const emptyActivities = activities.filter((activity) => getActiveStudentCount(activity) === 0).length;
  const cards = [
    { title: "Total de turmas", value: totalActivities, description: "turmas cadastradas", icon: FaThList, bg: "#f2fbf8", border: "#c8e8df", color: "#007565" },
    { title: "Turmas ativas", value: activeActivities, description: "em andamento", icon: FiCheck, bg: "#f1fbf5", border: "#bde6cf", color: "#16865f" },
    { title: "Alunos ativos nas turmas", value: totalStudents, description: "vínculos ativos com turmas", icon: PiUsersThree, bg: "#f0f4fc", border: "#a1b9e4", color: "#4267a9" },
    { title: "Turmas sem alunos ativos", value: emptyActivities, description: "sem alunos ativos", icon: LuUserX, bg: "#fffaf0", border: "#eadfc3", color: "#b7791f" }
  ];
  if (activitiesLoading || fieldsLoading || usersLoading) return <Loading />;

  return (
    <VStack gap={3} align="stretch" width="100%" minWidth={0} bg="#f8faf9">
      {/* Cabeçalho */}
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
        <Flex align="center" gap={3}>
          <Flex w="48px" h="48px" borderRadius="full" bg="#0b6b5b" color="white" align="center" justify="center" flexShrink={0}><LiaGraduationCapSolid size={24} /></Flex>
          <Box><Heading as="h1" fontSize={{ base: "22px", md: "26px" }} fontWeight="700" lineHeight="1.1" color="#062f2b">Gerenciar Atividades</Heading><Text mt="4px" fontSize="12px" color="#5e7471">Gerencie atividades, turmas, alunos e horários.</Text></Box>
        </Flex>
        <Link to="/ActivityManagement/add" state={{ activityId: null, activityData: null, currentMode: "A" }}><Button h="36px" px={5} borderRadius="8px" bg="#064e43" color="white" fontSize="12px" fontWeight="700" _hover={{ bg: "#043f37" }}><LuPlus size={16} /> Inserir atividade</Button></Link>
      </Flex>

      <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="visible">
        {/* Ações e visualizações */}
        <Flex p={3} gap={2} align="center" justify="space-between" wrap="wrap" borderBottom="1px solid #e6ecea">
          <Flex gap={2} wrap="wrap">
            <Link to={selectedActivity ? `/ActivityManagementDetailed?activityMat=${encodeURIComponent(selectedActivity.activity_mat)}` : "/ActivityManagementDetailed"} state={{ activityId: activityActive, activityData: selectedActivity, currentMode: "E" }}><Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={!selectedActivity}><LuPencil /> Dados da Turma</Button></Link>
            <Link to={selectedActivity ? `/ActivityManagementUsers?activityMat=${encodeURIComponent(selectedActivity.activity_mat)}` : "/ActivityManagementUsers"} state={{ activityData: selectedActivity, activityId: activityActive }}><Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={!selectedActivity}><LuUsers /> Alunos</Button></Link>
            <Box ref={menuRef} position="relative">
              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={!selectedActivity} onClick={() => setOpen((prev) => !prev)}><LuEllipsis /> Outras opções</Button>
              {open && <Box as="ul" listStyleType="none" position="absolute" top="100%" left={0} mt={1} py={1} minW="170px" borderRadius="8px" border="1px solid #d7e2df" bg="white" boxShadow="0 8px 24px rgba(0,0,0,.08)" zIndex={100} fontSize="12px" color="#173f3a">
                <Box as="li" cursor="pointer" py={2} px={3} color="#c53030" display="flex" alignItems="center" gap={2} _hover={{ bg: "#fff5f5" }} onClick={() => { setOpen(false); setDeleteDialogOpen(true); }}><LuTrash2 /> Excluir turma</Box>
              </Box>}
            </Box>
          </Flex>
          <Flex gap={1} align="center" bg="#f5f8f7" border="1px solid #e0e8e6" borderRadius="8px" p="3px">
            {[{ id: "list", label: "Lista", icon: FaThList }, { id: "cards", label: "Cards", icon: PiCardsFill }, { id: "weekly", label: "Semanal", icon: MdViewWeek }].map((item) => { const Icon = item.icon; return <Button key={item.id} size="xs" variant="ghost" borderRadius="6px" fontSize="12px" fontWeight="600" color={viewMode === item.id ? "#075e50" : "#667a77"} bg={viewMode === item.id ? "#dff3ed" : "transparent"} onClick={() => setViewMode(item.id)}><Icon size={14} /> {item.label}</Button>; })}
          </Flex>
        </Flex>

        {/* Indicadores */}
        <Box width="95%" mx="auto" mt={3} mb={3}><Flex gap={2} wrap="wrap">{cards.map((card) => { const Icon = card.icon; return <Box key={card.title} flex="1" minW="180px" p={3} border="1px solid" borderColor={card.border} borderRadius="8px" bg={card.bg}><Flex align="center" gap={3}><Flex w="34px" h="34px" borderRadius="full" bg={card.color} color="white" align="center" justify="center" flexShrink={0}><Icon size={16} /></Flex><Box minW={0}><Text fontSize="12px" fontWeight="700" color={card.color}>{card.title}</Text><Heading mt="1px" fontSize="20px" color="#063f37" fontWeight="800">{card.value}</Heading><Text fontSize="11px" color="#60777c">{card.description}</Text></Box></Flex></Box>; })}</Flex></Box>

        {/* Filtros rápidos */}
        <Box borderTop="1px solid #e6ecea">
          <Flex p={3} gap={2} align="end" wrap="wrap" borderBottom="1px solid #e9efee">
            <Box flex="1" minW={{ base: "100%", md: "250px" }} position="relative"><Box position="absolute" left="13px" top="50%" transform="translateY(-50%)" color="#174f4a" zIndex={1}><LuSearch size={17} /></Box><Input value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} placeholder="Buscar turma ou matrícula..." h="36px" pl="40px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px" _focus={{ borderColor: "#8ab6ad", boxShadow: "0 0 0 1px #8ab6ad" }} /></Box>
            <Box w={{ base: "calc(50% - 4px)", md: "185px" }}><Text mb="4px" fontSize="11px" color="#617980">Professor</Text><NativeSelect.Root><NativeSelect.Field value={quickTeacher} onChange={(e) => setQuickTeacher(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px"><option value="all">Todos</option>{teacherOptions.map((teacher) => <option key={teacher} value={teacher}>{teacher}</option>)}<option value="unknown">Não informado</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
            <Box w={{ base: "calc(50% - 4px)", md: "165px" }}><Text mb="4px" fontSize="11px" color="#617980">Dia da semana</Text><NativeSelect.Root><NativeSelect.Field value={quickDay} onChange={(e) => setQuickDay(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px"><option value="all">Todos</option>{dayCodes.map((day) => <option key={day} value={day}>{getDayName(day)}</option>)}<option value="unknown">Não informado</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
            <Box w={{ base: "calc(50% - 4px)", md: "155px" }}><Text mb="4px" fontSize="11px" color="#617980">Situação</Text><NativeSelect.Root><NativeSelect.Field value={quickSituation} onChange={(e) => setQuickSituation(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px"><option value="all">Todas</option><option value="active">Ativas</option><option value="inactive">Inativas</option><option value="unknown">Não informado</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
            {hasQuickFilters && <Button onClick={clearQuickFilters} h="36px" px={3} variant="ghost" color="#607873" fontSize="11px"><LuX size={14} /> Limpar</Button>}
          </Flex>
          <Flex px={3} py="10px" align="center" justify="space-between" gap={2} bg="#fbfcfc" borderBottom="1px solid #e9efee"><Box><Heading fontSize="15px" color="#062f2b">Turmas cadastradas</Heading><Text mt="2px" fontSize="11px" color="#71858a">Clique para selecionar; dois cliques para editar</Text></Box><Text fontSize="11px" color="#607873" flexShrink={0}>{visibleActivities.length} {visibleActivities.length === 1 ? "resultado" : "resultados"}</Text></Flex>

          {viewMode === "list" && <>
            <Box display={{ base: "none", md: "block" }} overflowX="auto" maxH="calc(100vh - 330px)" overflowY="auto">
              <Table.Root size="sm" variant="line" minW="900px" tableLayout="fixed">
                <Table.Header bg="#f4f7f7"><Table.Row>{[{ label: "Turma / Atividade", width: "28%" }, { label: "Alunos", width: "12%" }, { label: "Professor", width: "22%" }, { label: "Horários", width: "23%" }, { label: "Situação", width: "15%" }].map((col) => <Table.ColumnHeader key={col.label} width={col.width} h="37px" color="#174f4a" fontSize="11px" fontWeight="600" borderColor="#e2e8e7">{col.label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
                <Table.Body>{visibleActivities.map((activity) => { const selected = String(activityActive) === String(activity._id); const situation = getSituation(activity); const students = getStudentCount(activity); return <Table.Row key={String(activity._id ?? activity.activity_mat)} h="62px" bg={selected ? "#eaf7f2" : "white"} cursor="pointer" _hover={{ bg: "#e0f2ed" }} onClick={() => setActivityActive(activity._id)} onDoubleClick={() => openActivityEdit(activity)} title="Dois cliques para editar a turma">
                  <Table.Cell borderColor="#e7eceb"><Box minW={0}><Text fontWeight="700" fontSize="12px" color="#164c47" truncate>{getTitle(activity)}</Text><Text mt="2px" fontSize="10px" color="#71858a">MAT: {firstValue(activity.activity_mat, activity.activityMat) ?? "—"}</Text></Box></Table.Cell>
                  <Table.Cell borderColor="#e7eceb" fontSize="11px" color="#174f4a">
                    <Text fontWeight="700">{getActiveStudentCount(activity)} ativos</Text>
                    <Text fontSize="10px" color="#71858a">{students === null ? "—" : students} vínculos</Text>
                  </Table.Cell>
                  <Table.Cell borderColor="#e7eceb" fontSize="11px" color="#174f4a"><Text truncate>{getProfessor(activity) || "Não informado"}</Text></Table.Cell>
                  <Table.Cell borderColor="#e7eceb" fontSize="11px" color="#174f4a"><Text truncate>{getSchedule(activity) || "Não informado"}</Text></Table.Cell>
                  <Table.Cell borderColor="#e7eceb"><Badge px="10px" py="4px" borderRadius="full" bg={situation.bg} color={situation.color} fontSize="10px">{situation.label}</Badge></Table.Cell>
                </Table.Row>; })}</Table.Body>
              </Table.Root>
            </Box>
            <VStack display={{ base: "flex", md: "none" }} gap={0} align="stretch">{visibleActivities.map((activity) => { const situation = getSituation(activity); const students = getStudentCount(activity); return <Box key={String(activity._id ?? activity.activity_mat)} px={3} py={3} borderBottom="1px solid #e7eceb" bg={String(activityActive) === String(activity._id) ? "#eaf7f2" : "white"} onClick={() => setActivityActive(activity._id)}><Flex justify="space-between" align="center" gap={2}><Box minW={0}><Text fontWeight="700" fontSize="12px" color="#164c47" truncate>{getTitle(activity)}</Text><Text fontSize="10px" color="#71858a">MAT: {firstValue(activity.activity_mat, activity.activityMat) ?? "—"}</Text></Box><Badge flexShrink={0} bg={situation.bg} color={situation.color} borderRadius="full" px={2} fontSize="9px">{situation.label}</Badge></Flex><Flex mt={2} gap={3} wrap="wrap"><Text fontSize="10px" color="#607873">Alunos ativos: {getActiveStudentCount(activity)} / {students === null ? "—" : students} vínculos</Text><Text fontSize="10px" color="#607873">Professor: {getProfessor(activity) || "Não informado"}</Text></Flex><Flex mt={2} justify="space-between" align="center" gap={2}><Text fontSize="10px" color="#607873" truncate>Horários: {getSchedule(activity) || "Não informado"}</Text><Button size="xs" variant="ghost" color="#0b6b5b" onClick={(e) => { e.stopPropagation(); openActivityEdit(activity); }}>Editar <LuArrowRight size={12} /></Button></Flex></Box>; })}</VStack>
          </>}
          {/* Cards com dados derivados dos vínculos de alunos */}
          {viewMode === "cards" && <Box p={3}>
            <Flex gap={3} wrap="wrap">
              {visibleActivities.map((activity) => {
                const situation = getSituation(activity);
                const students = getStudentCount(activity);
                const selected = String(activityActive) === String(activity._id);
                return <Box key={String(activity._id ?? activity.activity_mat)} flex="1 1 270px" maxW={{ base: "100%", lg: "calc(33.333% - 8px)" }} minW={{ base: "100%", sm: "260px" }} border="1px solid" borderColor={selected ? "#0b6b5b" : "#d7e2df"} bg={selected ? "#eaf7f2" : "white"} borderRadius="10px" p={4} cursor="pointer" _hover={{ borderColor: "#7ab6a8", bg: "#f6faf9" }} onClick={() => setActivityActive(activity._id)} onDoubleClick={() => openActivityEdit(activity)}>
                  <Flex align="start" justify="space-between" gap={2}><Box minW={0}><Text color="#164c47" fontSize="13px" fontWeight="700">{getTitle(activity)}</Text><Text fontSize="10px" color="#71858a">MAT: {activity.activity_mat ?? "—"}</Text></Box><Badge flexShrink={0} bg={situation.bg} color={situation.color} borderRadius="full" px={2}>{situation.label}</Badge></Flex>
                  <Box mt={3} borderTop="1px solid #e7eceb" pt={3}><Text fontSize="12px" color="#174f4a"><Text as="span" fontWeight="700">Professor: </Text>{getProfessor(activity) || "Não informado"}</Text><Text mt={1} fontSize="12px" color="#174f4a"><Text as="span" fontWeight="700">Alunos ativos: </Text>{getActiveStudentCount(activity)} / {students === null ? "—" : students} vínculos</Text><Text mt={1} fontSize="12px" color="#174f4a"><Text as="span" fontWeight="700">Dia e horário: </Text>{getSchedule(activity) || "Não informado"}</Text></Box>
                  <Flex justify="flex-end" mt={3}><Button size="xs" variant="ghost" color="#0b6b5b" onClick={(e) => { e.stopPropagation(); openActivityEdit(activity); }}>Editar <LuArrowRight size={12} /></Button></Flex>
                </Box>;
              })}
            </Flex>
          </Box>}
          {/* Agenda semanal agrupada pelo código do dia; 1 = segunda-feira */}
          {viewMode === "weekly" && <Box p={3}>
            <Flex gap={3} wrap="wrap" align="start">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const dayActivities = visibleActivities.filter((activity) => Number(getDayCode(activity)) === day).sort((a, b) => String(a.activity_time_start ?? "").localeCompare(String(b.activity_time_start ?? "")));
                return <Box key={day} flex="1 1 245px" minW={{ base: "100%", sm: "245px" }} border="1px solid #d7e2df" borderRadius="10px" overflow="hidden" bg="white">
                  <Flex bg="#eaf7f2" px={3} py={2} justify="space-between" align="center"><Text fontSize="12px" fontWeight="700" color="#075e50">{getDayName(day)}</Text><Badge bg="white" color="#075e50">{dayActivities.length} {dayActivities.length === 1 ? "turma" : "turmas"}</Badge></Flex>
                  <VStack align="stretch" gap={0}>{dayActivities.length === 0 ? <Text p={3} fontSize="11px" color="#71858a">Nenhuma turma</Text> : dayActivities.map((activity) => {
                    const students = getStudentCount(activity);
                    const selected = String(activityActive) === String(activity._id);
                    const situation = getSituation(activity);
                    return <Box key={String(activity._id ?? activity.activity_mat)} p={3} borderTop="1px solid #e7eceb" bg={selected ? "#eaf7f2" : "white"} cursor="pointer" _hover={{ bg: "#f6faf9" }} onClick={() => setActivityActive(activity._id)} onDoubleClick={() => openActivityEdit(activity)}>
                      <Flex align="start" justify="space-between" gap={2}><Text fontSize="12px" fontWeight="700" color="#164c47">{getTitle(activity)}</Text><Badge bg={situation.bg} color={situation.color} fontSize="9px">{situation.label}</Badge></Flex>
                      <Text mt={1} fontSize="11px" color="#607873">{activity.activity_time_start || "--:--"} às {activity.activity_time_end || "--:--"}</Text>
                      <Text mt={1} fontSize="11px" color="#174f4a">Professor: {getProfessor(activity) || "Não informado"}</Text>
                      <Text mt={1} fontSize="11px" color="#174f4a">Alunos: {students === null ? "Não informado" : students}</Text>
                    </Box>;
                  })}</VStack>
                </Box>;
              })}
            </Flex>
          </Box>}
          {visibleActivities.length === 0 && <Box py={10} px={4} textAlign="center"><Text fontWeight="700" color="#174f4a">Nenhuma turma encontrada</Text><Text mt={1} fontSize="11px" color="#71858a">Tente outros termos ou filtros.</Text>{hasQuickFilters && <Button mt={3} size="sm" variant="outline" onClick={clearQuickFilters}>Limpar filtros</Button>}</Box>}
        </Box>
      </Box>

      <Dialog.Root open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)} placement="center"><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content borderRadius="10px"><Dialog.Header><Dialog.Title color="#062f2b">Excluir turma</Dialog.Title></Dialog.Header><Dialog.Body><VStack align="start" gap={2}><Text>Tem certeza que deseja excluir esta turma?</Text>{selectedActivity && <Text fontWeight="bold">{getTitle(selectedActivity)}</Text>}<Text fontSize="sm" color="gray.500">Essa ação não poderá ser desfeita.</Text></VStack></Dialog.Body><Dialog.Footer><Flex gap={2} justify="flex-end" width="100%"><Dialog.ActionTrigger asChild><Button variant="outline">Cancelar</Button></Dialog.ActionTrigger><Button colorPalette="red" onClick={handleDeleteActivity}>Sim, excluir</Button></Flex></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
    </VStack>
  );
}
