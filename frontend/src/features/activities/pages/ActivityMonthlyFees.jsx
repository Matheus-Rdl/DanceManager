import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Badge, Box, Button, Flex, Heading, HStack, Input,
  NativeSelect, SimpleGrid, Table, Text, VStack
} from "@chakra-ui/react";
import {
  FiArrowLeft, FiArrowRight, FiCalendar, FiChevronLeft, FiChevronRight,
  FiCreditCard, FiDollarSign, FiRefreshCw, FiSearch
} from "react-icons/fi";
import ActivityNavigation from "../../../components/ActivityNavigation";
import useActivityContext from "../../../hooks/useActivityContext";
import monthlyFeesServices from "../../../services/monthlyFeesServices";
import { getActivityTeacherLabel } from "../../../utils/activityTeachers";
import { getUserSituation } from "../../../utils/userSituation";

const green = "#0b6b5b";
const gray = "#607873";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = value => currency.format(Number(value) || 0);
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currentReference = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const moveMonth = (reference, direction) => {
  const [year, month] = reference.split("-").map(Number);
  const date = new Date(year, month - 1 + direction, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const humanMonth = reference => {
  const [year, month] = reference.split("-").map(Number);
  return `${monthNames[month - 1]} de ${year}`;
};
const humanDate = value => {
  if (!value) return "—";
  const date = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
  return value;
};
const statusLabels = {
  paid: { label: "Paga", fg: "#14833b", bg: "#dff5e6" },
  pending: { label: "Pendente", fg: "#996500", bg: "#fff2d8" },
  overdue: { label: "Em atraso", fg: "#bd3030", bg: "#ffe2e3" },
  upcoming: { label: "A vencer", fg: "#64748b", bg: "#edf1f2" },
  partial: { label: "Parcial", fg: "#996500", bg: "#fff2d8" },
  cancelled: { label: "Cancelada", fg: "#64748b", bg: "#edf1f2" },
  empty: { label: "Sem mensalidade", fg: "#64748b", bg: "#edf1f2" }
};

function StatusBadge({ status }) {
  const info = statusLabels[status] || statusLabels.empty;
  return <Badge bg={info.bg} color={info.fg} px="9px" py="4px" borderRadius="999px" fontSize="10px">{info.label}</Badge>;
}

function StatCard({ title, value, helper, color = green }) {
  return <Box minW={0} border="1px solid #d7e2df" bg="white" p={3} borderRadius="8px">
    <Text fontSize="11px" color={gray}>{title}</Text>
    <Heading mt="4px" fontSize={{ base: "17px", md: "20px" }} color={color} fontWeight="800">{value}</Heading>
    {helper && <Text mt="4px" fontSize="10px" color={gray}>{helper}</Text>}
  </Box>;
}

/* Financeiro por TURMA: mensalidades são do contrato do aluno.
   O endpoint filtra os userIds dos alunos vinculados à activity_mat. */
export default function ActivityMonthlyFees() {
  const navigate = useNavigate();
  const { activityData, activityMat, activityLoading, activityError } = useActivityContext();
  const [reference, setReference] = useState(currentReference);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [students, setStudents] = useState([]);
  const [studentsLoadedFor, setStudentsLoadedFor] = useState("");
  const [studentError, setStudentError] = useState("");
  const [feesLoadedFor, setFeesLoadedFor] = useState("");
  const [reload, setReload] = useState(0);
  const { getMonthlyFees, monthlyFeesList, monthlyFeesLoading, monthlyFeesReference, monthlyFeesError } = monthlyFeesServices();
  const requestKey = `${activityMat}:${reference}:${reload}`;

  useEffect(() => {
    if (!activityMat) return;
    let live = true;
    const controller = new AbortController();
    setStudentsLoadedFor("");
    setStudentError("");
    fetch(`${import.meta.env.VITE_API_URL}/users/activity/${encodeURIComponent(activityMat)}`, { signal: controller.signal })
      .then(async response => {
        const json = await response.json();
        if (!response.ok || json.success === false || !Array.isArray(json.body)) throw new Error("Não foi possível consultar os alunos da turma.");
        return json.body;
      })
      .then(users => {
        if (!live) return;
        /* Tipos atuais: 1=Aluno, 2=Bolsista. Mantém cadastros antigos sem user_type. */
        setStudents(users.filter(user => {
          const types = (Array.isArray(user.user_type) ? user.user_type : [user.user_type]).filter(v => v !== undefined && v !== null);
          return types.length === 0 || types.some(type => [1, 2].includes(Number(type)));
        }));
        setStudentsLoadedFor(String(activityMat));
      })
      .catch(error => { if (live && error.name !== "AbortError") setStudentError(error.message); });
    return () => { live = false; controller.abort(); };
  }, [activityMat, reload]);

  useEffect(() => {
    if (!activityMat) return;
    let live = true;
    setFeesLoadedFor("");
    getMonthlyFees({ reference, activityMat }).then(result => {
      if (live && result?.success) setFeesLoadedFor(requestKey);
    });
    return () => { live = false; };
  }, [activityMat, reference, reload, getMonthlyFees, requestKey]);

  const ready = studentsLoadedFor === String(activityMat) && feesLoadedFor === requestKey &&
    monthlyFeesReference === reference && !monthlyFeesLoading;
  /* Defesa adicional: nunca soma cobranças de pessoas fora da turma selecionada. */
  const classFees = useMemo(() => {
    if (!ready) return [];
    const members = new Set(students.map(user => String(user._id)));
    return monthlyFeesList.filter(fee => members.has(String(fee.userId)));
  }, [ready, students, monthlyFeesList]);

  const rows = useMemo(() => {
    if (!ready) return [];
    const byStudent = new Map();
    classFees.forEach(fee => {
      const id = String(fee.userId);
      if (!byStudent.has(id)) byStudent.set(id, []);
      byStudent.get(id).push(fee);
    });
    return students.flatMap(user => {
      const fees = byStudent.get(String(user._id)) || [];
      return (fees.length ? fees : [null]).map(fee => ({ user, fee }));
    }).sort((a, b) => String(a.user.user_name || "").localeCompare(String(b.user.user_name || ""), "pt-BR", { numeric: true }));
  }, [students, classFees, ready]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter(({ user, fee }) => {
      const matchesText = !q || String(user.user_name || "").toLocaleLowerCase("pt-BR").includes(q) || String(user.user_mat || "").includes(q);
      const matchesStatus = statusFilter === "all" || (fee?.status || "empty") === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const totals = useMemo(() => {
    const fees = classFees.filter(fee => fee.status !== "cancelled");
    const total = fees.reduce((value, fee) => value + Number(fee.amount || 0), 0);
    const received = fees.reduce((value, fee) => value + Number(fee.paidAmount || 0), 0);
    const pending = fees.reduce((value, fee) => value + Math.max(0, Number(fee.amount || 0) - Number(fee.paidAmount || 0)), 0);
    const overdue = fees.filter(fee => fee.status === "overdue").length;
    return { total, received, pending, overdue };
  }, [classFees]);

  const openDetails = ({ user, fee }) => {
    if (fee) {
      navigate("/MonthlyFeesDetailed", { state: { studentId: String(user._id), feeId: fee.id } });
      return;
    }
    navigate("/PeopleManagementDetailed", { state: { userId: String(user._id), userData: user, currentMode: "E" } });
  };

  if (!activityMat) return <VStack align="stretch" gap={3}>
    <Heading fontSize="20px" color={green}>Mensalidades da turma</Heading>
    <Box bg="white" p={5} border="1px solid #d7e2df" borderRadius="8px">
      <Text>Selecione uma turma na Gestão de Atividades para consultar as mensalidades dos alunos.</Text>
      <Button mt={3} variant="outline" onClick={() => navigate("/ActivityManagement")}>Voltar às atividades</Button>
    </Box>
  </VStack>;

  return <VStack w="100%" align="stretch" gap={3} minW={0} bg="#f8faf9" pb={6}>
    <Flex align="center" gap={3}>
      <Button variant="ghost" color={green} size="sm" onClick={() => navigate("/ActivityManagement")}><FiArrowLeft/> Voltar</Button>
      <Flex w="38px" h="38px" flexShrink={0} borderRadius="full" bg={green} color="white" align="center" justify="center"><FiCreditCard size={19}/></Flex>
      <Box><Heading fontSize={{ base: "18px", md: "22px" }} color="#062f2b">Mensalidades da turma</Heading>
        <Text fontSize="11px" color={gray}>Consulte as cobranças dos alunos vinculados à atividade.</Text></Box>
    </Flex>

    <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">
      <Box px={{ base: 3, md: 4 }} py={4}>
        <Heading fontSize="19px" color="#063f39">{activityData?.activity_title || (activityLoading ? "Carregando turma..." : "Turma selecionada")}</Heading>
        <Text fontSize="11px" color={gray} mt={1}>MAT: {activityMat}</Text>
        {activityData && <Text fontSize="11px" color={gray} mt={1}>Professores: {getActivityTeacherLabel(activityData)}</Text>}
        {activityError && <Text mt={1} fontSize="11px" color="red.600">{activityError}</Text>}
      </Box>
      <ActivityNavigation activeTab="Mensalidades" activityData={activityData} activityMat={activityMat}/>
    </Box>

    <Flex bg="white" border="1px solid #d7e2df" borderRadius="8px" p={2} align="center" justify="between" gap={2} wrap="wrap">
      <Button size="sm" variant="ghost" color={green} onClick={() => setReference(value => moveMonth(value, -1))} aria-label="Mês anterior"><FiChevronLeft/> <Text display={{ base: "none", md: "inline" }}>Anterior</Text></Button>
      <HStack gap={2} flex="1" justify="center" wrap="wrap">
        <FiCalendar color={green}/>
        <Text color="#063f39" fontSize="12px" fontWeight="700" whiteSpace="nowrap">{humanMonth(reference)}</Text>
        <Input type="month" aria-label="Selecionar competência" size="sm" h="31px" w={{ base: "135px", md: "155px" }} value={reference} onChange={event => { if (event.target.value) setReference(event.target.value); }}/>
      </HStack>
      <Button size="sm" variant="ghost" color={green} onClick={() => setReference(value => moveMonth(value, 1))} aria-label="Próximo mês"><Text display={{ base: "none", md: "inline" }}>Próximo</Text><FiChevronRight/></Button>
      <Button size="xs" variant="outline" color={green} onClick={() => setReference(currentReference())}>Mês atual</Button>
    </Flex>

    <SimpleGrid columns={{ base: 2, lg: 4 }} gap={2}>
      <StatCard title="Previsto" value={ready ? money(totals.total) : "—"} helper="Mensalidades da competência"/>
      <StatCard title="Recebido" value={ready ? money(totals.received) : "—"} helper="Quitações registradas" color="#14833b"/>
      <StatCard title="Em aberto" value={ready ? money(totals.pending) : "—"} helper="Saldo a receber" color="#a66b00"/>
      <StatCard title="Em atraso" value={ready ? String(totals.overdue) : "—"} helper="Mensalidades vencidas" color="#bd3030"/>
    </SimpleGrid>

    <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">
      <Flex p={3} align="center" justify="space-between" gap={2} wrap="wrap" borderBottom="1px solid #e7eceb">
        <Box><Heading fontSize="15px" color="#063f39">Alunos e mensalidades</Heading>
          <Text fontSize="11px" color={gray}>{ready ? `${students.length} aluno(s) vinculado(s) • ${classFees.length} mensalidade(s)` : "Carregando informações..."}</Text></Box>
        <Button size="sm" variant="outline" color={green} onClick={() => setReload(value => value + 1)}><FiRefreshCw/> Atualizar</Button>
      </Flex>
      <Flex p={3} gap={2} wrap="wrap" borderBottom="1px solid #e7eceb">
        <HStack flex="1" minW={{ base: "100%", md: "230px" }} position="relative"><Box position="absolute" left="11px" zIndex={1} color={gray}><FiSearch size={14}/></Box>
          <Input size="sm" pl="35px" placeholder="Buscar aluno ou matrícula..." value={search} onChange={e => setSearch(e.target.value)}/></HStack>
        <NativeSelect.Root w={{ base: "100%", md: "190px" }} size="sm"><NativeSelect.Field value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todas as situações</option>
          {Object.entries(statusLabels).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
        </NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
      </Flex>

      {(studentError || monthlyFeesError) && <Box p={3}><Text fontSize="12px" color="red.600">{studentError || monthlyFeesError}</Text></Box>}
      {(!ready && !studentError && !monthlyFeesError) && <Text p={4} color={gray} fontSize="12px">Carregando alunos e mensalidades...</Text>}
      {ready && filteredRows.length === 0 && <Box p={7} textAlign="center"><Text color="#063f39" fontWeight="600">Nenhum registro encontrado</Text><Text mt={1} fontSize="11px" color={gray}>Não há alunos ou mensalidades para os filtros selecionados.</Text></Box>}

      {ready && filteredRows.length > 0 && <>
        <Box overflowX="auto" display={{ base: "none", md: "block" }}>
          <Table.Root size="sm" minW="760px"><Table.Header bg="#f4f8f7"><Table.Row>
            {['Aluno', 'Situação cadastral', 'Vencimento', 'Previsto', 'Recebido', 'Mensalidade'].map(title => <Table.ColumnHeader key={title} fontSize="11px" color={green}>{title}</Table.ColumnHeader>)}
          </Table.Row></Table.Header><Table.Body>
            {filteredRows.map((row, index) => {
              const { user, fee } = row; const situation = getUserSituation(user);
              return <Table.Row key={`${user._id}-${fee?.id || index}`} cursor="pointer" _hover={{ bg: "#f5faf8" }} onClick={() => openDetails(row)}>
                <Table.Cell><HStack gap={2}><Avatar.Root size="xs"><Avatar.Image src={user.user_photo}/><Avatar.Fallback name={user.user_name}/></Avatar.Root><Box><Text color={green} fontWeight="700" fontSize="11px">{user.user_name}</Text><Text color={gray} fontSize="10px">MAT: {user.user_mat}</Text></Box></HStack></Table.Cell>
                <Table.Cell><Badge bg={situation.bg} color={situation.color} fontSize="9px">{situation.label}</Badge></Table.Cell>
                <Table.Cell fontSize="11px">{humanDate(fee?.dueDate)}</Table.Cell>
                <Table.Cell fontSize="11px" fontWeight="600">{fee ? money(fee.amount) : "—"}</Table.Cell>
                <Table.Cell fontSize="11px" color="#14833b" fontWeight="600">{fee ? money(fee.paidAmount) : "—"}</Table.Cell>
                <Table.Cell><HStack gap={1}><StatusBadge status={fee?.status || "empty"}/><FiArrowRight size={12} color={green}/></HStack></Table.Cell>
              </Table.Row>;
            })}
          </Table.Body></Table.Root>
        </Box>
        <VStack display={{ base: "flex", md: "none" }} gap={0} align="stretch">
          {filteredRows.map((row, index) => {
            const { user, fee } = row; const situation = getUserSituation(user);
            return <Box key={`${user._id}-${fee?.id || index}`} p={3} borderBottom="1px solid #e7eceb" cursor="pointer" onClick={() => openDetails(row)}>
              <Flex justify="space-between" gap={2}><Box minW={0}><Text fontSize="12px" color={green} fontWeight="700">{user.user_name}</Text><Text fontSize="10px" color={gray}>MAT: {user.user_mat}</Text></Box><Text fontSize="13px" color={green} fontWeight="700">{fee ? money(fee.amount) : "—"}</Text></Flex>
              <Flex mt={2} justify="space-between" align="center" gap={2} wrap="wrap"><Badge bg={situation.bg} color={situation.color} fontSize="9px">{situation.label}</Badge><StatusBadge status={fee?.status || "empty"}/></Flex>
              <Flex mt={2} justify="space-between" align="center" gap={2}><Text fontSize="10px" color={gray}>{fee ? `Venc. ${humanDate(fee.dueDate)} • Recebido ${money(fee.paidAmount)}` : "Sem cobrança nesta competência"}</Text><FiArrowRight size={13} color={green}/></Flex>
            </Box>;
          })}
        </VStack>
      </>}
      <Text px={3} py={2} fontSize="10px" color={gray} bg="#fbfcfc">As mensalidades são do contrato do aluno. Caso ele participe de várias turmas, a cobrança poderá aparecer em cada consulta, mas não será duplicada no banco.</Text>
    </Box>
  </VStack>;
}
