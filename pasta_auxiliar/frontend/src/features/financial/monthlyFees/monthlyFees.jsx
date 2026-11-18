
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Badge, Box, Button, Flex, Heading, HStack, Input, NativeSelect, SimpleGrid, Text, VStack, Table } from "@chakra-ui/react";
import monthlyFeesServices from "../../../services/monthlyFeesServices";
import { listPlans } from "../../../services/plansServices.js";
import { getContractColor } from "../../../utils/planColors.js";
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCalendar, FiCheck, FiCheckCircle, FiChevronLeft, FiChevronRight, FiArrowUp, FiArrowDown, FiClock, FiDollarSign, FiSearch, FiTrendingUp, FiUsers, FiX } from "react-icons/fi";

const pad = (value) => String(value).padStart(2, "0");
const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatReference = (reference) => {
  const [year, month] = reference.split("-").map(Number);
  const text = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const changeReference = (reference, amount) => {
  const [year, month] = reference.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};

const statusConfig = {
  paid: { label: "Pago", fg: "#14833b", bg: "#dff5e6", icon: FiCheck },
  pending: { label: "Pendente", fg: "#d98900", bg: "#fff2d8", icon: FiClock },
  overdue: { label: "Em atraso", fg: "#d9343a", bg: "#ffe2e3", icon: FiAlertCircle },
  upcoming: { label: "A vencer", fg: "#64748b", bg: "#edf1f2", icon: FiClock },
  partial: { label: "Parcial", fg: "#8a5a00", bg: "#fff3cf", icon: FiClock },
  cancelled: { label: "Cancelada", fg: "#718096", bg: "#edf1f2", icon: FiX },

};

/* A ordem alfabética ignora diferenças de maiúsculas e acentos; numeric ordena MAT 2 antes de MAT 10. */
const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

/* Quanto menor o número, mais atenção o status exige. */
const statusPriority = { overdue: 0, partial: 1, pending: 2, upcoming: 3, paid: 4, cancelled: 5 };

/* Aceita datas do Mongo/API em YYYY-MM-DD, ISO ou DD/MM/YYYY. */
const dateOrder = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Number(`${iso[1]}${iso[2]}${iso[3]}`);
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return Number(`${br[3]}${br[2]}${br[1]}`);
  const time = Date.parse(text);
  if (Number.isNaN(time)) return null;
  const date = new Date(time);
  return Number(`${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`);
};

const compareNullable = (a, b, comparator) => {
  if (a == null || a === "") return b == null || b === "" ? 0 : 1;
  if (b == null || b === "") return -1;
  return comparator(a, b);
};

function SortHeader({ label, column, sort, onSort }) {
    const active = sort.key === column || (column === "aluno" && sort.key === "matricula");
    const direction = active ? sort.direction : null;
    const description = column === "aluno" && sort.key === "matricula" ? "Matrícula" : label;
    return (
      <Table.ColumnHeader h="37px" color="#174f4a" fontSize="11px" fontWeight="600" borderColor="#e2e8e7"
        aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
        <Button variant="ghost" size="xs" h="31px" px="5px" minW="0" fontWeight="600"
          color="#174f4a" borderRadius="5px" _hover={{ bg: "#e8f2ef" }}
          aria-label={`Ordenar ${label.toLowerCase()}${active ? ` (${description}: ${direction === "asc" ? "crescente" : "decrescente"})` : ""}`}
          onClick={() => onSort(column)}>
          <Flex align="center" gap="5px">
            <Text fontSize="11px">{label}</Text>
            <Flex ml={1} direction="column" justify="center" align="center" gap="0" lineHeight="1">
              <Box color={direction === "asc" ? "#08715c" : "#a8b7b4"} mb="-6px"><FiArrowUp size={12} strokeWidth={direction === "asc" ? 3 : 2} /></Box>
              <Box ml={4} color={direction === "desc" ? "#08715c" : "#a8b7b4"}><FiArrowDown size={12} strokeWidth={direction === "desc" ? 3 : 2} /></Box>
            </Flex>
          </Flex>
        </Button>
      </Table.ColumnHeader>
    );
}

/* EN: Match the monthly-fee KPI cards to the Financial Overview design system.
   PT: Aplica aos indicadores de mensalidades o mesmo padrão visual da Visão Geral. */
function MonthlyMetricCard({ card }) {
  const Icon = card.icon;
  const tones = {
    green: { fg: "#075749", soft: "#eff9f3" },
    received: { fg: "#168559", soft: "#eff9f3" },
    warning: { fg: "#a86c00", soft: "#fff7e7" },
    danger: { fg: "#b82c32", soft: "#fff0f0" }
  };
  const tone = tones[card.tone] || tones.green;
  return <Box minW={0} p={{ base: 3, md: 4 }} border="1px solid #e1e9e7" borderRadius="12px"
    bg={`linear-gradient(145deg, #ffffff 65%, ${tone.soft} 125%)`}
    boxShadow="0 3px 12px rgba(7,63,51,0.04)">
    <HStack gap={2} mb={3} align="center">
      <Flex w="29px" h="29px" flexShrink={0} borderRadius="full" align="center" justify="center"
        bg={tone.soft} color={tone.fg}><Icon size={17} /></Flex>
      <Text color="#213b33" fontSize={{ base: "11px", md: "12px" }} fontWeight="600" lineHeight="1.35">{card.title}</Text>
    </HStack>
    <Heading color={tone.fg} fontSize={{ base: "18px", md: "21px" }} fontWeight="800" lineHeight="1.15" overflowWrap="anywhere">{card.value}</Heading>
    <Text mt={2} fontSize="10px" color="#607873" lineHeight="1.45">{card.detail}</Text>
  </Box>;
}

export default function MonthlyFees() {
  const navigate = useNavigate();
  const [planCatalog, setPlanCatalog] = useState([]);
  useEffect(() => { let active = true; listPlans().then(rows => { if (active) setPlanCatalog(rows); })
    .catch(() => {}); return () => { active = false; }; }, []);
  const { getMonthlyFees, monthlyFeesList, monthlyFeesLoading, monthlyFeesReference, refetchMonthlyFees, monthlyFeesError } = monthlyFeesServices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [reference, setReference] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [mobileSearchMode, setMobileSearchMode] = useState(false);
  const requestedReference = useRef(null);
  const isLoading = monthlyFeesLoading || monthlyFeesReference !== reference;
  const displayReady = !isLoading && !monthlyFeesError;

  /* Ordem inicial: matrícula crescente. Ao clicar em Aluno, ordena pelo nome. */
  const [sort, setSort] = useState({ key: "matricula", direction: "asc" });

  const changeSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  /* Busca cada competência uma vez, salvo atualização solicitada. */
  useEffect(() => {
    if (requestedReference.current === reference && !refetchMonthlyFees) return;
    requestedReference.current = reference;
    getMonthlyFees({ reference });
  }, [reference, refetchMonthlyFees, getMonthlyFees]);

  /* Nunca utiliza dados pertencentes à competência anterior. */
  const monthlyFees = displayReady ? monthlyFeesList : [];
  const activities = useMemo(() => [...new Set(monthlyFees.map((fee) => fee.student.activity))].sort(), [monthlyFees]);

  const filteredMonthlyFees = useMemo(() => {
    const q = search.toLowerCase().trim();
    return monthlyFees.filter((fee) => {
      const student = fee.student;
      const matchesSearch = !q || student.name.toLowerCase().includes(q) || student.id.includes(q) || student.contract.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || fee.status === statusFilter;
      const matchesActivity = activityFilter === "all" || student.activity === activityFilter;
      return matchesSearch && matchesStatus && matchesActivity;
    });
  }, [monthlyFees, search, statusFilter, activityFilter]);

  /* Filtra antes de ordenar; a mesma ordenação vale para tabela e cards mobile. */
  const sortedMonthlyFees = useMemo(() => {
    const result = [...filteredMonthlyFees];
    const getValue = (fee) => {
      const student = fee.student || {};
      switch (sort.key) {
        case "matricula": return String(student.id ?? student.user_mat ?? "");
        case "aluno": return String(student.name ?? "");
        case "contrato": return String(student.contract ?? "");
        case "vencimento": return dateOrder(fee.dueDate);
        case "valor": return Number(fee.amount);
        case "status": return statusPriority[fee.status] ?? 999;
        default: return "";
      }
    };
    result.sort((a, b) => {
      const first = getValue(a);
      const second = getValue(b);
      const numeric = ["vencimento", "valor", "status"].includes(sort.key);
      const cmp = compareNullable(first, second, numeric
        ? (x, y) => x - y
        : (x, y) => collator.compare(String(x), String(y)));
      if (cmp !== 0) return cmp * (sort.direction === "asc" ? 1 : -1);
      return collator.compare(String(a.student?.id ?? ""), String(b.student?.id ?? ""));
    });
    return result;
  }, [filteredMonthlyFees, sort]);

  const totals = useMemo(() => {
    const activeFees = monthlyFees.filter((fee) => fee.status !== "cancelled");
    const expected = activeFees.reduce((sum, fee) => sum + fee.amount, 0);
    const received = activeFees.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);
    const openFees = activeFees.filter((fee) => Math.max(fee.amount - (fee.paidAmount || 0), 0) > 0);
    /* EN: Overdue partial fees also have unpaid balances; count users once, not fees.
       PT: Parcelas parciais vencidas também têm saldo pendente; conta alunos distintos. */
    const overdueFees = activeFees.filter((fee) => fee.hasOverdueBalance === true);
    const overdueStudents = new Set(overdueFees.map(fee => String(fee.userId || fee.student?.userId || fee.student?.id || "")).filter(Boolean));
    const paidOnTimeCount = activeFees.filter(fee => fee.paidOnTime === true).length;
    const paidCount = activeFees.filter(fee => fee.status === "paid").length;
    return {
      expected,
      expectedCount: activeFees.length,
      received,
      receivedCount: paidCount,
      paidOnTimeCount,
      overdueStudentsCount: overdueStudents.size,
      paidCount,
      settlementRate: activeFees.length ? paidCount / activeFees.length * 100 : null,
      open: openFees.reduce((sum, fee) => sum + Math.max(fee.amount - (fee.paidAmount || 0), 0), 0),
      openCount: openFees.length,
      overdue: overdueFees.reduce((sum, fee) => sum + Math.max(fee.amount - (fee.paidAmount || 0), 0), 0),
      overdueCount: overdueFees.length,
      pendingCount: activeFees.filter((fee) => ["pending", "upcoming", "partial"].includes(fee.status)).length,
    };
  }, [monthlyFees]);

  const summaryCards = [
    { title: "Previsto no período", value: formatCurrency(totals.expected), detail: `${totals.expectedCount} mensalidades`, icon: FiDollarSign, tone: "green" },
    { title: "Recebido", value: formatCurrency(totals.received), detail: `${totals.receivedCount} mensalidades quitadas`, icon: FiCheck, tone: "received" },
    { title: "Em aberto", value: formatCurrency(totals.open), detail: `${totals.openCount} mensalidades`, icon: FiClock, tone: "warning" },
    { title: "Em atraso", value: formatCurrency(totals.overdue), detail: `${totals.overdueCount} mensalidades vencidas`, icon: FiAlertCircle, tone: "danger" },
  ];

  const hasFilters = search || statusFilter !== "all" || activityFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setActivityFilter("all"); };
  const changeMonth = (amount) => setReference((current) => changeReference(current, amount));
  const handleView = (fee) => navigate("/MonthlyFeesDetailed", { state: { studentId: fee.userId, feeId: fee.id } });
  const resetTestData = () => getMonthlyFees({ reference });

  return (
    <VStack gap={3} align="stretch" width="100%" minWidth={0} bg="var(--app-background)" paddingRight={4}>
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
        <Flex align="center" gap={3}>
          <Flex w="38px" h="38px" borderRadius="12px" bg="#e9f6f1" color="#075749"
            align="center" justify="center" flexShrink={0}><FiCalendar size={20} /></Flex>
          <Box><Heading as="h1" fontSize={{ base: "19px", md: "23px" }} fontWeight="800" lineHeight="1.2" color="#075749">Mensalidades</Heading><Text mt="4px" fontSize={{ base: "11px", md: "12px" }} color="#607873">Acompanhe as mensalidades e os recebimentos dos alunos.</Text></Box>
        </Flex>
        <HStack gap={2}>
          {displayReady && totals.overdueCount > 0 && <Badge display={{ base: "none", md: "inline-flex" }} alignItems="center" gap="6px" px="12px" py="7px" borderRadius="999px" bg="#fff0f0" color="#c72e34" fontSize="11px" fontWeight="600"><FiAlertCircle size={14} />{totals.overdueCount} {totals.overdueCount === 1 ? "mensalidade em atraso" : "mensalidades em atraso"}</Badge>}
          <Button size="sm" variant="outline" borderColor="#f1bec0" color="#b9252c" bg="#fff7f7"
            fontSize="11px" onClick={() => navigate("/MonthlyFeesOverdue")}>
            <FiAlertCircle /> Ver todos os atrasos
          </Button>
          <Button display={{ base: "none", md: "inline-flex" }} onClick={resetTestData} h="34px" variant="outline" borderColor="#d6e0df" color="#174f4a" bg="white" fontSize="10px">Atualizar</Button>
        </HStack>
      </Flex>

      <Flex bg="white" border="1px solid #d7e2df" borderRadius="8px" px={{ base: 2, md: 3 }} py="9px" align="center" justify="space-between" gap={2}>
        <Button onClick={() => changeMonth(-1)} variant="ghost" h="34px" px={{ base: 2, md: 3 }} color="#174f4a" fontSize="12px" borderRadius="8px" _hover={{ bg: "#f2f7f6" }}><FiChevronLeft size={17} /><Text display={{ base: "none", sm: "block" }}>Mês anterior</Text></Button>
        <Flex align="center" justify="center" gap={2} minW={0}><FiCalendar color="#0b6b5b" /><Box textAlign="center"><Text fontSize={{ base: "13px", md: "14px" }} fontWeight="700" color="#063f39">{formatReference(reference)}</Text><Text display={{ base: "none", md: "block" }} fontSize="10px" color="#71858a">Competência selecionada</Text></Box></Flex>
        <Button onClick={() => changeMonth(1)} variant="ghost" h="34px" px={{ base: 2, md: 3 }} color="#174f4a" fontSize="12px" borderRadius="8px" _hover={{ bg: "#f2f7f6" }}><Text display={{ base: "none", sm: "block" }}>Próximo mês</Text><FiChevronRight size={17} /></Button>
      </Flex>

      {displayReady && (
        <VStack align="stretch" gap={3} display={{ base: mobileSearchMode ? "none" : "flex", md: "flex" }}>
          <SimpleGrid columns={{ base: 2, xl: 4 }} gap={3}>
            {summaryCards.map(card => <MonthlyMetricCard key={card.title} card={card} />)}
          </SimpleGrid>

          {/* EN: Keep the student list below; these are supplemental management indicators.
              PT: Mantém a lista de mensalidades abaixo; estes cards são apenas indicadores adicionais. */}
          <Text fontSize="13px" fontWeight="700" color="#075749" pt={2}>Acompanhamento dos alunos</Text>
          <SimpleGrid columns={2} gap={3}>
            <MonthlyMetricCard card={{ title: "Alunos inadimplentes", value: String(totals.overdueStudentsCount),
              detail: "Alunos distintos com mensalidade vencida e saldo pendente.", icon: FiUsers, tone: "danger" }} />
            <MonthlyMetricCard card={{ title: "Quitadas no prazo", value: String(totals.paidOnTimeCount),
              detail: "Mensalidades integralmente pagas até o vencimento.", icon: FiCheckCircle, tone: "received" }} />
          </SimpleGrid>
          <Box bg="white" border="1px solid #e1e9e7" borderRadius="12px" p={{ base: 3, md: 4 }}
            boxShadow="0 3px 12px rgba(7,63,51,0.04)">
            <Flex align="center" justify="space-between" gap={3} wrap="wrap" mb={3}>
              <HStack gap={2} align="center">
                <Flex w="29px" h="29px" borderRadius="full" align="center" justify="center" bg="#eff9f3" color="#168559"><FiTrendingUp size={17} /></Flex>
                <Box>
                  <Text fontSize={{ base: "12px", md: "13px" }} fontWeight="700" color="#213b33">Taxa de quitação</Text>
                  <Text fontSize="10px" color="#607873">Mensalidades totalmente pagas da competência selecionada.</Text>
                </Box>
              </HStack>
              <Heading fontSize={{ base: "22px", md: "26px" }} fontWeight="800" color="#168559">
                {totals.settlementRate == null ? "—" : `${totals.settlementRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              </Heading>
            </Flex>
            <Box h="11px" bg="#e7efeb" borderRadius="full" overflow="hidden" role="progressbar"
              aria-label="Taxa de quitação das mensalidades" aria-valuemin={0} aria-valuemax={100}
              aria-valuenow={totals.settlementRate == null ? 0 : Math.min(100, totals.settlementRate)}>
              <Box h="100%" w={`${Math.min(100, totals.settlementRate || 0)}%`} bg="#168559" borderRadius="full" />
            </Box>
            <Flex mt={3} align="center" justify="space-between" gap={2} wrap="wrap">
              <Text fontSize="11px" fontWeight="600" color="#213b33">{totals.paidCount} de {totals.expectedCount} mensalidades quitadas</Text>
              <Text fontSize="11px" color="#607873">{totals.expectedCount - totals.paidCount} não quitadas</Text>
            </Flex>
          </Box>
        </VStack>
      )}

      <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">
        <Flex p={3} gap={2} align="end" wrap="wrap" borderBottom="1px solid" borderColor="#e9efee">
          <Flex flex="1" minW={{ base: "100%", md: "280px" }} gap={2} align="center">
            <Button display={{ base: mobileSearchMode ? "flex" : "none", md: "none" }} onClick={() => { setMobileSearchMode(false); setSearch(""); }} minW="36px" w="36px" h="36px" p="0" variant="outline" borderColor="#d6e0df" borderRadius="8px" color="#174f4a" bg="white" aria-label="Voltar"><FiArrowLeft /></Button>
            <Box position="relative" flex="1"><Box position="absolute" left="14px" top="50%" transform="translateY(-50%)" color="#174f4a" zIndex="1"><FiSearch size={18} /></Box><Input value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => setMobileSearchMode(true)} placeholder="Buscar aluno ou matrícula..." h="36px" pl="42px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px" _focus={{ borderColor: "#8ab6ad", boxShadow: "0 0 0 1px #8ab6ad" }} /></Box>
          </Flex>
          <Box w={{ base: "calc(50% - 4px)", md: "180px" }}><Text mb="4px" fontSize="11px" color="#617980">Status</Text><NativeSelect.Root w="100%"><NativeSelect.Field value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px" color="#173f3a"><option value="all">Todos</option><option value="paid">Pago</option><option value="pending">Pendente</option><option value="overdue">Em atraso</option><option value="upcoming">A vencer</option><option value="partial">Parcial</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
          <Box w={{ base: "calc(50% - 4px)", md: "180px" }}><Text mb="4px" fontSize="11px" color="#617980">Atividade</Text><NativeSelect.Root w="100%"><NativeSelect.Field value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px" color="#173f3a"><option value="all">Todas</option>{activities.map((activity) => <option key={activity} value={activity}>{activity}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
          {hasFilters && <Button onClick={clearFilters} h="36px" px="12px" variant="ghost" color="#607873" fontSize="11px" borderRadius="8px" _hover={{ bg: "#f5f8f7" }}><FiX /> Limpar</Button>}
        </Flex>

        <Flex px={3} py="10px" justify="space-between" align={{ base: "flex-start", md: "center" }} gap={2} wrap="wrap" bg="#fbfcfc" borderBottom="1px solid" borderColor="#e9efee">
          <Box><Heading fontSize="15px" fontWeight="700" color="#062f2b">Mensalidades de {formatReference(reference)}</Heading><Text mt="2px" fontSize="11px" color="#71858a">{displayReady ? `${totals.expectedCount} mensalidades • ${totals.receivedCount} pagas • ${totals.pendingCount} pendentes / a vencer • ${totals.overdueCount} em atraso` : isLoading ? "Carregando dados e status..." : "Não foi possível carregar as mensalidades."}</Text></Box>
          <Text fontSize="11px" color="#607873">{displayReady ? `${filteredMonthlyFees.length} ${filteredMonthlyFees.length === 1 ? "resultado" : "resultados"}` : ""}</Text>
        </Flex>

        {isLoading && (
          <Flex minH="280px" py={10} align="center" justify="center" direction="column" gap={3} role="status" aria-live="polite">
            <Box w="32px" h="32px" border="3px solid #dcebe7" borderTopColor="#0b6b5b" borderRadius="full"
              animation="spin 0.8s linear infinite" css={{ "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />
            <Text fontSize="13px" fontWeight="600" color="#174f4a">Carregando mensalidades de {formatReference(reference)}...</Text>
            <Text fontSize="11px" color="#71858a">Atualizando dados financeiros e status.</Text>
          </Flex>
        )}
        {!isLoading && monthlyFeesError && (
          <Flex minH="180px" align="center" justify="center" direction="column" gap={3} p={4}>
            <Text fontSize="12px" color="red.600">{monthlyFeesError}</Text>
            <Button size="sm" variant="outline" color="#174f4a" onClick={resetTestData}>Tentar novamente</Button>
          </Flex>
        )}
        {displayReady && (
          <>
        <Box display={{ base: "none", md: "block" }} overflowX="auto">

          <Table.Root size="sm" variant="line" minW="760px">

            <Table.Header bg="#f4f7f7"><Table.Row>
              <SortHeader label="Aluno" column="aluno" sort={sort} onSort={changeSort} />
              <SortHeader label="Contrato" column="contrato" sort={sort} onSort={changeSort} />
              <SortHeader label="Vencimento" column="vencimento" sort={sort} onSort={changeSort} />
              <SortHeader label="Valor" column="valor" sort={sort} onSort={changeSort} />
              <SortHeader label="Status" column="status" sort={sort} onSort={changeSort} />
            </Table.Row></Table.Header>

            <Table.Body>

              {sortedMonthlyFees.map((fee) => {

                const student = fee.student;
                const status = statusConfig[fee.status] || statusConfig.pending;
                const contract = getContractColor(student.contract, planCatalog);
                const StatusIcon = status.icon;
                return <Table.Row key={fee.id} h="62px" cursor="pointer" transition="background .15s ease" _hover={{ bg: "#f8fbfa" }} onClick={() => handleView(fee)}>
                  {/* Dados do aluno */ }
                  <Table.Cell borderColor="#e7eceb">
                    <HStack gap="11px">
                      <Avatar.Root size="sm">
                        <Avatar.Image src={student.avatar} />
                        <Avatar.Fallback name={student.name} />
                      </Avatar.Root>
                      <Box>
                        <Text fontWeight="700" fontSize="12px" color="#164c47">{student.name}</Text>
                        <Text mt="2px" fontSize="10px" color="#71858a">MAT: {student.id}</Text>
                      </Box>
                    </HStack>
                  </Table.Cell>
                  {/* Dados do contrato */ }
                  <Table.Cell borderColor="#e7eceb">
                    <Badge px="11px" py="4px" borderRadius="999px" bg={contract.bg} color={contract.fg} fontWeight="500" fontSize="11px">{student.contract}</Badge>
                  </Table.Cell>
                  {/* Vencimento */ }
                  <Table.Cell borderColor="#e7eceb" fontSize="11px" color="#174f4a">{fee.dueDate}</Table.Cell>
                  {/* Valor */ }
                  <Table.Cell borderColor="#e7eceb" fontSize="12px" fontWeight="600" color="#174f4a">{formatCurrency(fee.amount)}</Table.Cell>
                  {/* Status */ }
                  <Table.Cell borderColor="#e7eceb">
                    <Badge display="inline-flex" alignItems="center" gap="6px" px="10px" py="5px" borderRadius="999px" bg={status.bg} color={status.fg} fontWeight="500" fontSize="10px">

                      <Flex w="15px" h="15px" borderRadius="full" bg={status.fg} color="white" align="center" justify="center">

                        <StatusIcon size={9} />
                      </Flex>{status.label}
                    </Badge>

                  </Table.Cell>
                </Table.Row>;
              })}
            </Table.Body>
          </Table.Root>
        </Box>

        <VStack display={{ base: "flex", md: "none" }} align="stretch" gap={0}>

          {sortedMonthlyFees.map((fee) => { const student = fee.student; const status = statusConfig[fee.status] || statusConfig.pending; const contract = getContractColor(student.contract, planCatalog); const StatusIcon = status.icon; return <Box key={fee.id} px={3} py={3} borderBottom="1px solid #e7eceb" cursor="pointer" onClick={() => handleView(fee)} _active={{ bg: "#f6faf9" }}><Flex justify="space-between" align="flex-start" gap={3}><HStack gap="10px" minW={0}><Avatar.Root size="sm" flexShrink={0}><Avatar.Image src={student.avatar} /><Avatar.Fallback name={student.name} /></Avatar.Root><Box minW={0}><Text fontWeight="700" fontSize="12px" color="#164c47" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{student.name}</Text><Text mt="2px" fontSize="10px" color="#71858a">MAT: {student.id}</Text></Box></HStack><Text fontSize="13px" fontWeight="800" color="#073f39" flexShrink={0}>{formatCurrency(fee.amount)}</Text></Flex><Flex mt={3} align="center" justify="space-between" gap={2} wrap="wrap"><HStack gap="6px" wrap="wrap"><Badge px="9px" py="3px" borderRadius="999px" bg={contract.bg} color={contract.fg} fontWeight="500" fontSize="9px">{student.contract}</Badge><Badge display="inline-flex" alignItems="center" gap="4px" px="8px" py="3px" borderRadius="999px" bg={status.bg} color={status.fg} fontWeight="500" fontSize="9px"><StatusIcon size={9} />{status.label}</Badge></HStack><Text fontSize="10px" color="#607873">Venc. {fee.dueDate}</Text></Flex><Flex mt="9px" justify="space-between" align="center"><Text fontSize="10px" color="#71858a">{student.activity}</Text><Flex align="center" gap="4px" fontSize="10px" fontWeight="600" color="#0b6b5b">Ver detalhes<FiArrowRight size={12} /></Flex></Flex></Box>; })}

        </VStack>

        {filteredMonthlyFees.length === 0 && <Box py="55px" px={4} textAlign="center"><Flex mx="auto" mb={3} w="42px" h="42px" borderRadius="full" bg="#eef5f3" color="#52756f" align="center" justify="center"><FiCalendar size={20} /></Flex><Text fontWeight="700" color="#174f4a">Nenhuma mensalidade encontrada</Text><Text mt="4px" color="#71858a" fontSize="11px">Não há mensalidades para os filtros selecionados.</Text>{hasFilters && <Button mt={3} onClick={clearFilters} size="sm" variant="outline" borderColor="#d6e0df" color="#174f4a" fontSize="11px">Limpar filtros</Button>}</Box>}
          </>
        )}
      </Box>
    </VStack>
  );
}
