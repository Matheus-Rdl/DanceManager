import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Badge, Box, Button, Checkbox, Dialog, Flex, Heading, HStack, Input,
  NativeSelect, Portal, SimpleGrid, Table, Text, VStack
} from "@chakra-ui/react";
import {
  FiAlertCircle, FiCheck, FiCreditCard, FiEdit2, FiPlus,
  FiRefreshCw, FiTrash2, FiUser, FiUsers
} from "react-icons/fi";
import ActivityNavigation from "../../../components/ActivityNavigation";
import useActivityContext from "../../../hooks/useActivityContext";
import { getActivityTeacherLabel } from "../../../utils/activityTeachers";
import { getUserSituation, getSituationCode } from "../../../utils/userSituation";
import {
  listActivityStudents, listActivityCandidates, addActivityStudents, removeActivityStudent
} from "../../../services/activityStudentsServices";

const GREEN = "#0b6b5b";
const GRAY = "#607873";
const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
const isStudent = user => {
  const types = Array.isArray(user?.user_type) ? user.user_type : [user?.user_type];
  return types.some(type => ["1", "2"].includes(String(type)));
};

function SituationBadge({ value }) {
  const info = getUserSituation(value);
  return <Badge bg={info.bg} color={info.color} px="9px" py="4px" borderRadius="full" fontSize="10px" whiteSpace="nowrap">{info.label}</Badge>;
}

function Summary({ title, value, color = GREEN }) {
  return <Box border="1px solid #d7e2df" bg="white" borderRadius="9px" p={3}>
    <Text fontSize="11px" color={GRAY}>{title}</Text>
    <Heading mt={1} fontSize="22px" fontWeight="800" color={color}>{value}</Heading>
  </Box>;
}

export default function ActivityManagementUsers() {
  const navigate = useNavigate();
  const { activityData, activityMat, activityLoading, activityError } = useActivityContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [situation, setSituation] = useState("all");
  const [sort, setSort] = useState("name");
  const [dialog, setDialog] = useState("");
  const [editing, setEditing] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    if (!activityMat) { setStudents([]); return; }
    const controller = new AbortController();
    let live = true;
    setLoading(true); setError("");
    listActivityStudents(activityMat, controller.signal)
      .then(users => { if (live) setStudents((Array.isArray(users) ? users : []).filter(isStudent)); })
      .catch(err => { if (live && err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; controller.abort(); };
  }, [activityMat, refresh]);

  useEffect(() => {
    if (dialog !== "add" || !activityMat) return;
    const controller = new AbortController();
    let live = true;
    const timer = setTimeout(() => {
      setCandidateLoading(true); setDialogError("");
      listActivityCandidates(activityMat, candidateSearch, controller.signal)
        .then(users => { if (live) setCandidates(Array.isArray(users) ? users : []); })
        .catch(err => { if (live && err.name !== "AbortError") setDialogError(err.message); })
        .finally(() => { if (live) setCandidateLoading(false); });
    }, 250);
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, [dialog, activityMat, candidateSearch, refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return students.filter(user => {
      const matchesText = !q || `${user.user_name || ""} ${user.user_mat || ""}`.toLocaleLowerCase("pt-BR").includes(q);
      const matchesSituation = situation === "all" || getSituationCode(user) === situation;
      return matchesText && matchesSituation;
    }).sort((a, b) => sort === "mat"
      ? collator.compare(String(a.user_mat || ""), String(b.user_mat || ""))
      : collator.compare(String(a.user_name || ""), String(b.user_name || "")));
  }, [students, search, situation, sort]);

  const selectedPeople = useMemo(() => selected.map(id => selectedRecords[id]).filter(Boolean), [selected, selectedRecords]);
  const needsWarning = selectedPeople.some(user => ["2", "4"].includes(getSituationCode(user)));
  const activeCount = students.filter(user => getSituationCode(user) === "1").length;
  const awayCount = students.filter(user => ["2", "4"].includes(getSituationCode(user))).length;
  const canSubmit = !!selected.length && (!needsWarning || acknowledged) && !saving && !candidateLoading;
  const closeDialog = () => { if (!saving) { setDialog(""); setEditing(null); setDialogError(""); } };
  const openAdd = () => { setCandidates([]); setSelected([]); setSelectedRecords({}); setCandidateSearch(""); setAcknowledged(false); setDialogError(""); setDialog("add"); };
  const openRemove = user => { setEditing(user); setDialogError(""); setDialog("remove"); };
  const changeSelected = (user, checked) => {
    const userId = String(user._id);
    setSelected(previous => checked ? [...new Set([...previous, userId])] : previous.filter(id => id !== userId));
    setSelectedRecords(previous => checked ? { ...previous, [userId]: user } : Object.fromEntries(Object.entries(previous).filter(([id]) => id !== userId)));
    setAcknowledged(false);
  };
  const goUser = (user, mode = "V") => navigate(mode === "V" ? "/PeopleManagement/view" : "/PeopleManagementDetailed", {
    state: { userId: user._id, userData: user, currentMode: mode }
  });
  const goFees = user => navigate("/MonthlyFeesDetailed", { state: { studentId: String(user._id) } });

  const handleAdd = async () => {
    if (!canSubmit) return;
    setSaving(true); setDialogError(""); setSuccess("");
    try {
      const result = await addActivityStudents(activityMat, selected, acknowledged);
      setSuccess(`${result.added || 0} aluno(s) vinculado(s) à turma.`);
      setDialog(""); setRefresh(v => v + 1);
    } catch (err) { setDialogError(err.message || "Não foi possível adicionar os alunos."); }
    finally { setSaving(false); }
  };
  const handleRemove = async () => {
    if (!editing || saving) return;
    setSaving(true); setDialogError(""); setSuccess("");
    try {
      await removeActivityStudent(activityMat, editing._id);
      setSuccess(`${editing.user_name} foi retirado(a) desta turma. As chamadas e mensalidades antigas foram preservadas.`);
      setDialog(""); setEditing(null); setRefresh(v => v + 1);
    } catch (err) { setDialogError(err.message || "Não foi possível retirar o aluno."); }
    finally { setSaving(false); }
  };

  if (!activityMat) return <Box p={4} bg="white" border="1px solid #d7e2df" borderRadius="8px">
    <Text fontSize="13px">Selecione uma turma em Gestão de Atividades para consultar seus alunos.</Text>
    <Button mt={3} size="sm" onClick={() => navigate("/ActivityManagement")}>Voltar às turmas</Button>
  </Box>;

  const userActions = user => <Flex align="center" wrap="wrap" gap={1}>
    <Button size="xs" variant="outline" onClick={() => goUser(user)}><FiUser/> Ver cadastro</Button>
    <Button size="xs" variant="ghost" onClick={() => goUser(user, "E")} aria-label={`Editar ${user.user_name}`}><FiEdit2/></Button>
    <Button size="xs" variant="ghost" color={GREEN} onClick={() => goFees(user)}><FiCreditCard/> Mensalidades</Button>
    <Button size="xs" variant="ghost" color="#ba3b3b" onClick={() => openRemove(user)}><FiTrash2/> Retirar</Button>
  </Flex>;

  return <VStack gap={3} align="stretch" w="100%" minW={0} pb={6} bg="#f8faf9">
    <Flex align="center" justify="space-between" gap={3} wrap="wrap">
      <Box><Heading fontSize={{ base: "19px", md: "23px" }} color="#062f2b">Alunos da turma</Heading><Text fontSize="11px" color={GRAY}>Gerencie os participantes vinculados à atividade.</Text></Box>
      <HStack gap={2}>
        <Button size="sm" variant="outline" aria-label="Atualizar lista" onClick={() => setRefresh(v => v + 1)} disabled={loading}><FiRefreshCw/></Button>
        <Button size="sm" bg={GREEN} color="white" onClick={openAdd}><FiPlus/> Adicionar alunos</Button>
      </HStack>
    </Flex>

    <Box border="1px solid #d7e2df" bg="white" borderRadius="9px" overflow="hidden">
      <Box px={4} py={3}><Text fontWeight="700" fontSize="14px" color="#063f39">{activityData?.activity_title || "Turma selecionada"}</Text>
        <Text fontSize="11px" color={GRAY}>MAT: {activityMat} {activityData ? `• Professores: ${getActivityTeacherLabel(activityData)}` : ""}</Text>
      </Box>
      <ActivityNavigation activeTab="Lista de alunos" activityData={activityData} activityMat={activityMat}/>
    </Box>
    {activityLoading && <Text color={GRAY} fontSize="12px">Carregando turma...</Text>}
    {activityError && <Text color="red.600" fontSize="12px">{activityError}</Text>}
    {error && <Box bg="#fff0f0" border="1px solid #f2cccc" p={3} borderRadius="8px"><Text fontSize="12px" color="#aa2929">{error}</Text></Box>}
    {success && <Box bg="#eaf8ef" border="1px solid #c4e5d1" p={3} borderRadius="8px"><Text fontSize="12px" color="#14833b">{success}</Text></Box>}

    <SimpleGrid columns={{ base: 3 }} gap={2}>
      <Summary title="Vinculados" value={students.length}/>
      <Summary title="Ativos" value={activeCount} color="#14833b"/>
      <Summary title="Afastados / inativos" value={awayCount} color="#a66b00"/>
    </SimpleGrid>

    <Box bg="white" border="1px solid #d7e2df" borderRadius="9px" overflow="hidden">
      <Flex p={3} gap={2} wrap="wrap" align="end">
        <Box flex="1" minW={{ base: "100%", md: "230px" }}><Text mb={1} color={GRAY} fontSize="11px">Buscar aluno</Text><Input h="36px" fontSize="12px" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou matrícula"/></Box>
        <Box flex="1" minW="125px"><Text mb={1} color={GRAY} fontSize="11px">Situação</Text><NativeSelect.Root size="sm"><NativeSelect.Field value={situation} onChange={e => setSituation(e.target.value)}><option value="all">Todas</option><option value="1">Ativo</option><option value="2">Afastado</option><option value="3">Cadastro pendente</option><option value="4">Inativo</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Box>
        <Box flex="1" minW="130px"><Text mb={1} color={GRAY} fontSize="11px">Ordenar</Text><NativeSelect.Root size="sm"><NativeSelect.Field value={sort} onChange={e => setSort(e.target.value)}><option value="name">Nome (A–Z)</option><option value="mat">Matrícula</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Box>
      </Flex>
      <Flex px={3} py={2} bg="#f5f8f7" align="center" justify="space-between" borderY="1px solid #e7eceb"><Text fontSize="11px" color={GRAY}>{filtered.length} aluno(s) na lista</Text>{loading && <Text fontSize="11px" color={GRAY}>Atualizando...</Text>}</Flex>
      <Box display={{ base: "none", md: "block" }} overflowX="auto">
        <Table.Root size="sm" minW="720px">
          <Table.Header bg="#f9fbfa"><Table.Row><Table.ColumnHeader>Aluno</Table.ColumnHeader><Table.ColumnHeader>Situação</Table.ColumnHeader><Table.ColumnHeader>Tipo</Table.ColumnHeader><Table.ColumnHeader>Ações</Table.ColumnHeader></Table.Row></Table.Header>
          <Table.Body>{filtered.map(user => <Table.Row key={user._id} _hover={{ bg: "#f7faf9" }}>
            <Table.Cell><HStack gap={3}><Avatar.Root size="sm"><Avatar.Image src={user.user_photo}/><Avatar.Fallback name={user.user_name}/></Avatar.Root><Box><Text fontWeight="700" fontSize="12px" color="#164c47">{user.user_name}</Text><Text fontSize="10px" color={GRAY}>MAT: {user.user_mat || "—"}</Text></Box></HStack></Table.Cell>
            <Table.Cell><SituationBadge value={user.user_situation}/></Table.Cell>
            <Table.Cell fontSize="11px" color={GRAY}>{(Array.isArray(user.user_type) ? user.user_type : [user.user_type]).some(v=>String(v)==="2") ? "Bolsista" : "Aluno"}</Table.Cell>
            <Table.Cell>{userActions(user)}</Table.Cell>
          </Table.Row>)}</Table.Body>
        </Table.Root>
      </Box>
      <VStack display={{ base: "flex", md: "none" }} align="stretch" gap={0}>
        {filtered.map(user => <Box key={user._id} p={3} borderBottom="1px solid #e7eceb">
          <Flex justify="space-between" gap={2}><HStack gap={2} minW={0}><Avatar.Root size="sm"><Avatar.Image src={user.user_photo}/><Avatar.Fallback name={user.user_name}/></Avatar.Root><Box minW={0}><Text fontWeight="700" color="#164c47" fontSize="12px">{user.user_name}</Text><Text color={GRAY} fontSize="10px">MAT: {user.user_mat}</Text></Box></HStack><SituationBadge value={user.user_situation}/></Flex>
          <Box mt={3}>{userActions(user)}</Box>
        </Box>)}
      </VStack>
      {!loading && !filtered.length && <Box p={8} textAlign="center"><FiUsers size={24} color="#99aaa7" style={{ margin: "0 auto 8px" }}/><Text color={GRAY} fontSize="12px">Nenhum aluno encontrado para os filtros selecionados.</Text></Box>}
    </Box>

    <Dialog.Root open={dialog === "add"} onOpenChange={details => { if (!details.open) closeDialog(); }} size="lg">
      <Portal><Dialog.Backdrop/><Dialog.Positioner><Dialog.Content w={{ base: "96vw", md: "85vw" }} maxW="680px" maxH="90vh" borderRadius="10px">
        <Dialog.Header><Dialog.Title color="#063f39" fontSize="17px">Adicionar alunos à turma</Dialog.Title></Dialog.Header>
        <Dialog.Body overflowY="auto"><VStack gap={3} align="stretch">
          <Text fontSize="12px" color={GRAY}>Selecione alunos já cadastrados. Contratos e mensalidades não serão criados automaticamente.</Text>
          <Flex align="center" justify="between" gap={2} wrap="wrap">
            <Text fontSize="11px" color={GRAY}>Não encontrou alguém?</Text>
            <Button size="xs" variant="outline" onClick={() => navigate("/PeopleManagement/add", { state: { currentMode: "A" } })}><FiPlus/> Cadastrar novo aluno</Button>
          </Flex>
          <Input value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} placeholder="Buscar nome ou matrícula..." size="sm"/>
          <Flex align="center" justify="space-between"><Text fontSize="11px" color={GRAY}>{candidateLoading ? "Buscando..." : `${candidates.length} candidato(s) disponíveis`}</Text><Text fontSize="11px" color={GREEN}>{selected.length} selecionado(s)</Text></Flex>
          <Box border="1px solid #e1e9e7" borderRadius="8px" maxH="310px" overflowY="auto">
            {candidates.map(user => { const id = String(user._id); return <Flex key={id} px={3} py={3} gap={3} align="center" borderBottom="1px solid #edf1f0">
              <Checkbox.Root checked={selected.includes(id)} onCheckedChange={details => changeSelected(user, details.checked === true)}>
                <Checkbox.HiddenInput/><Checkbox.Control/>
              </Checkbox.Root>
              <Box minW={0} flex="1"><Text fontSize="12px" fontWeight="600" color="#164c47">{user.user_name}</Text><Text fontSize="10px" color={GRAY}>MAT: {user.user_mat}</Text></Box>
              <SituationBadge value={user.user_situation}/>
            </Flex>; })}
            {!candidateLoading && candidates.length===0 && <Box p={6} textAlign="center"><Text fontSize="12px" color={GRAY}>Nenhum aluno disponível. Pesquise outro nome ou matrícula.</Text></Box>}
          </Box>
          {needsWarning && <Box p={3} bg="#fffaf0" border="1px solid #f3dfb2" borderRadius="8px">
            <HStack align="start" gap={2}><FiAlertCircle color="#996500"/><Text fontSize="12px" fontWeight="700" color="#754700">Atenção: há alunos afastados ou inativos entre os selecionados.</Text></HStack>
            <Checkbox.Root mt={3} checked={acknowledged} onCheckedChange={details => setAcknowledged(details.checked === true)}>
              <Checkbox.HiddenInput/><Checkbox.Control/><Checkbox.Label fontSize="11px">Confirmo que desejo vinculá-los sem alterar sua situação cadastral.</Checkbox.Label>
            </Checkbox.Root>
          </Box>}
          {dialogError && <Text fontSize="12px" color="#ba3b3b">{dialogError}</Text>}
        </VStack></Dialog.Body>
        <Dialog.Footer><Button variant="outline" disabled={saving} onClick={closeDialog}>Cancelar</Button><Button bg={GREEN} color="white" disabled={!canSubmit} loading={saving} onClick={handleAdd}><FiCheck/> Adicionar {selected.length || ""} aluno(s)</Button></Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>

    <Dialog.Root open={dialog === "remove"} onOpenChange={details => { if (!details.open) closeDialog(); }} size="sm">
      <Portal><Dialog.Backdrop/><Dialog.Positioner><Dialog.Content mx={3} borderRadius="10px">
        <Dialog.Header><Dialog.Title color="#9c2626" fontSize="17px">Retirar aluno da turma</Dialog.Title></Dialog.Header>
        <Dialog.Body><VStack align="stretch" gap={3}>
          <Text fontSize="12px">Deseja retirar <b>{editing?.user_name}</b> da turma <b>{activityData?.activity_title || activityMat}</b>?</Text>
          <Box bg="#f4f8f7" p={3} borderRadius="8px"><Text color="#425b57" fontSize="11px">O cadastro da pessoa, seus contratos, mensalidades e pagamentos serão mantidos. As presenças antigas continuam salvas e poderão ser consultadas na chamada da data correspondente.</Text></Box>
          <Text color="#995d00" fontSize="11px">O histórico completo de entrada e saída da turma será desenvolvido em outra etapa.</Text>
          {dialogError && <Text color="#ba3b3b" fontSize="12px">{dialogError}</Text>}
        </VStack></Dialog.Body>
        <Dialog.Footer><Button variant="outline" disabled={saving} onClick={closeDialog}>Voltar</Button><Button bg="#bb3434" color="white" loading={saving} onClick={handleRemove}><FiTrash2/> Confirmar retirada</Button></Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  </VStack>;
}
