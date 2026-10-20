import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchOverdueMonthlyFees } from "../../../services/monthlyFeesServices";
import { Avatar, Badge, Box, Button, Flex, Heading, HStack, Input, NativeSelect, SimpleGrid, Table, Text, VStack } from "@chakra-ui/react";
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCalendar, FiClock, FiDollarSign, FiRefreshCw, FiSearch, FiUsers, FiX } from "react-icons/fi";

const GREEN = "#0b6b5b";
const RED = "#c52f36";
const formatMoney = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

const formatDate = (value) => {
  if (!value) return "—";
  const date = String(value).slice(0, 10);
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
};
const formatReference = (reference) => {
  if (!/^\d{4}-\d{2}$/.test(String(reference || ""))) return "—";
  const [year, month] = reference.split("-").map(Number);
  const value = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return value.charAt(0).toUpperCase() + value.slice(1);
};
const remaining = (fee) => Math.max(0, Number(fee.remainingAmount ?? (Number(fee.amount || 0) - Number(fee.paidAmount || 0))));
const isPartial = (fee) => Number(fee.paidAmount || 0) > 0;

function OverdueStat({ icon: Icon, title, value, detail, color = RED, bg = "white" }) {
  return <Box border="1px solid #dbe5e2" borderRadius="9px" p={3} bg={bg} minW={0}>
    <HStack gap={2} color={color} mb={2}><Icon size={17} /><Text fontSize="11px" fontWeight="600">{title}</Text></HStack>
    <Heading color={color} fontSize={{ base: "17px", md: "22px" }} fontWeight="800" overflowWrap="anywhere">{value}</Heading>
    <Text color="#68817b" mt={1} fontSize="10px">{detail}</Text>
  </Box>;
}

export default function MonthlyFeesOverdue() {
  const navigate = useNavigate();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("all");
  const [activity, setActivity] = useState("all");
  const [payment, setPayment] = useState("all");
  const [order, setOrder] = useState("newest");

  /* Endpoint independente da competência: retorna somente saldos vencidos de todos os anos. */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setFees([]);
    (async () => {
      try {
        const result = await fetchOverdueMonthlyFees({ signal: controller.signal });
        if (!controller.signal.aborted) setFees(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || "Não foi possível carregar os atrasos.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [refresh]);

  const years = useMemo(() => [...new Set(fees.map(fee => String(fee.reference || fee.dueDate || "").slice(0, 4)).filter(value => /^\d{4}$/.test(value)))].sort((a, b) => b.localeCompare(a)), [fees]);
  const activities = useMemo(() => [...new Set(fees.map(fee => fee.student?.activity).filter(value => value && value !== "-"))].sort(collator.compare), [fees]);
  const summary = useMemo(() => {
    const students = new Set(fees.map(fee => String(fee.userId || fee.student?.userId || "")).filter(Boolean));
    return {
      count: fees.length,
      total: fees.reduce((sum, fee) => sum + remaining(fee), 0),
      students: students.size,
      partials: fees.filter(isPartial).length
    };
  }, [fees]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const result = fees.filter(fee => {
      const student = fee.student || {};
      const searchable = `${student.name || ""} ${student.id || ""} ${student.contract || ""}`.toLocaleLowerCase("pt-BR");
      const feeYear = String(fee.reference || fee.dueDate || "").slice(0, 4);
      return (!term || searchable.includes(term)) &&
        (year === "all" || feeYear === year) &&
        (activity === "all" || student.activity === activity) &&
        (payment === "all" || (payment === "partial" ? isPartial(fee) : !isPartial(fee)));
    });
    result.sort((a, b) => {
      if (order === "balance") return remaining(b) - remaining(a) || String(a.dueDate).localeCompare(String(b.dueDate));
      if (order === "student") return collator.compare(a.student?.name || "", b.student?.name || "");
      const cmp = String(a.dueDate).localeCompare(String(b.dueDate));
      return order === "oldest" ? cmp : -cmp;
    });
    return result;
  }, [fees, search, year, activity, payment, order]);

  const openFee = (fee) => navigate("/MonthlyFeesDetailed", { state: { studentId: fee.userId || fee.student?.userId, feeId: fee.id } });
  const clearFilters = () => { setSearch(""); setYear("all"); setActivity("all"); setPayment("all"); setOrder("newest"); };
  const hasFilters = Boolean(search || year !== "all" || activity !== "all" || payment !== "all" || order !== "newest");

  return <VStack gap={3} align="stretch" width="100%" minW={0} bg="#f8faf9" pb={6}>
    <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" gap={3} wrap="wrap">
      <Flex align="center" gap={3}>
        <Button size="sm" variant="ghost" px={2} color={GREEN} onClick={() => navigate("/MonthlyFees")} aria-label="Voltar para Mensalidades"><FiArrowLeft /></Button>
        <Flex w="45px" h="45px" bg="#c9343a" borderRadius="full" color="white" align="center" justify="center" flexShrink={0}><FiAlertCircle size={23} /></Flex>
        <Box>
          <Heading fontSize={{ base: "21px", md: "26px" }} fontWeight="800" color="#062f2b">Mensalidades atrasadas</Heading>
          <Text fontSize="11px" color="#607873" mt={1}>Cobranças vencidas com saldo pendente, de todos os períodos.</Text>
        </Box>
      </Flex>
      <HStack gap={2}>
        <Button size="sm" variant="outline" borderColor="#d6e0df" color={GREEN} onClick={() => navigate("/MonthlyFees")}>Mensalidades</Button>
        <Button size="sm" variant="outline" borderColor="#d6e0df" color={GREEN} disabled={loading} onClick={() => setRefresh(n => n + 1)}><FiRefreshCw /> Atualizar</Button>
      </HStack>
    </Flex>

    <Flex border="1px solid #e9d5d5" bg="#fff8f8" px={3} py={2} borderRadius="8px" gap={2} align="center" wrap="wrap">
      <FiCalendar color={RED}/>
      <Text fontSize="11px" color="#8b3f43" fontWeight="600">Exibindo mensalidades de qualquer competência com vencimento anterior a hoje.</Text>
      <Text fontSize="10px" color="#936c6f">Mensalidades parcialmente pagas aparecem pelo saldo restante.</Text>
    </Flex>

    <SimpleGrid columns={{ base: 2, xl: 4 }} gap={3}>
      <OverdueStat icon={FiAlertCircle} title="Saldo total em atraso" value={loading || error ? "—" : formatMoney(summary.total)} detail="De todas as competências" color={RED} bg="#fff8f8"/>
      <OverdueStat icon={FiCalendar} title="Mensalidades vencidas" value={loading || error ? "—" : summary.count} detail="Com valor ainda em aberto" color="#9c5412"/>
      <OverdueStat icon={FiUsers} title="Alunos com pendência" value={loading || error ? "—" : summary.students} detail="Alunos distintos" color={GREEN}/>
      <OverdueStat icon={FiDollarSign} title="Pagamentos parciais" value={loading || error ? "—" : summary.partials} detail="Mensalidades com saldo restante" color="#866009"/>
    </SimpleGrid>

    <Box bg="white" border="1px solid #d7e2df" borderRadius="9px" overflow="hidden">
      <Flex gap={2} align="end" wrap="wrap" p={3} borderBottom="1px solid #e8eeee">
        <Box flex="1" minW={{ base: "100%", md: "250px" }} position="relative">
          <Box position="absolute" left="13px" top="50%" transform="translateY(-50%)" color={GREEN} pointerEvents="none"><FiSearch size={17}/></Box>
          <Input aria-label="Pesquisar por aluno ou matrícula" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aluno, matrícula ou plano..." h="36px" pl="40px" borderColor="#d6e0df" fontSize="12px"/>
        </Box>
        <Box w={{ base: "calc(50% - 4px)", md: "125px" }}><Text color="#617980" mb={1} fontSize="10px">Ano</Text><NativeSelect.Root size="sm"><NativeSelect.Field value={year} onChange={e => setYear(e.target.value)} aria-label="Filtrar por ano"><option value="all">Todos os anos</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Box>
        <Box w={{ base: "calc(50% - 4px)", md: "155px" }}><Text color="#617980" mb={1} fontSize="10px">Pagamento</Text><NativeSelect.Root size="sm"><NativeSelect.Field value={payment} onChange={e => setPayment(e.target.value)} aria-label="Filtrar pagamentos"><option value="all">Todos</option><option value="unpaid">Sem pagamento</option><option value="partial">Parcial</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Box>
        <Box w={{ base: "calc(50% - 4px)", md: "160px" }}><Text color="#617980" mb={1} fontSize="10px">Atividade</Text><NativeSelect.Root size="sm"><NativeSelect.Field value={activity} onChange={e => setActivity(e.target.value)} aria-label="Filtrar atividade"><option value="all">Todas</option>{activities.map(value => <option key={value} value={value}>{value}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Box>
        <Box w={{ base: "calc(50% - 4px)", md: "190px" }}><Text color="#617980" mb={1} fontSize="10px">Ordenar</Text><NativeSelect.Root size="sm"><NativeSelect.Field value={order} onChange={e => setOrder(e.target.value)} aria-label="Ordenar mensalidades"><option value="newest">Vencimento recente</option><option value="oldest">Mais antigas primeiro</option><option value="balance">Maior saldo</option><option value="student">Aluno (A–Z)</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Box>
        {hasFilters && <Button size="sm" variant="ghost" color="#677d78" onClick={clearFilters}><FiX/> Limpar</Button>}
      </Flex>

      <Flex p={3} gap={2} bg="#fbfcfc" align="center" justify="space-between" borderBottom="1px solid #e6ecea" wrap="wrap">
        <Box><Heading fontSize="15px" color="#062f2b">Todas as mensalidades em atraso</Heading><Text fontSize="11px" color="#71858a" mt="3px">Inclui anos anteriores e pagamentos parciais vencidos</Text></Box>
        <Text fontSize="11px" color="#607873">{loading ? "Carregando..." : `${filtered.length} de ${fees.length} mensalidade(s)`}</Text>
      </Flex>

      {loading && <Flex minH="250px" align="center" justify="center" direction="column" gap={2}><FiClock size={25} color={GREEN}/><Text fontSize="12px" color="#607873">Consultando todas as competências...</Text></Flex>}
      {!loading && error && <Flex minH="190px" align="center" justify="center" direction="column" gap={3} p={4}><Text color="#ad3338" fontSize="12px">{error}</Text><Button size="sm" variant="outline" onClick={() => setRefresh(n => n + 1)}>Tentar novamente</Button></Flex>}
      {!loading && !error && filtered.length === 0 && <Flex minH="220px" align="center" justify="center" direction="column" gap={2} px={4} textAlign="center"><FiAlertCircle size={25} color="#9aaead"/><Text color={GREEN} fontSize="13px" fontWeight="700">Nenhuma mensalidade atrasada encontrada</Text><Text color="#6b817d" fontSize="11px">{hasFilters ? "Tente ajustar ou limpar os filtros." : "Não existem cobranças vencidas com saldo pendente."}</Text>{hasFilters && <Button size="sm" variant="outline" onClick={clearFilters}>Limpar filtros</Button>}</Flex>}

      {!loading && !error && filtered.length > 0 && <>
        <Box display={{ base: "none", md: "block" }} overflowX="auto">
          <Table.Root size="sm" variant="line" minW="930px">
            <Table.Header bg="#f4f7f7"><Table.Row>
              { ["Aluno", "Competência", "Vencimento", "Contrato", "Valor", "Pago", "Saldo", "Atraso", "Situação"].map(label => <Table.ColumnHeader key={label} color="#174f4a" fontSize="11px" py={3}>{label}</Table.ColumnHeader>) }
            </Table.Row></Table.Header>
            <Table.Body>{filtered.map(fee => <Table.Row key={fee.id} cursor="pointer" tabIndex={0} onClick={() => openFee(fee)} onKeyDown={event => { if (event.key === "Enter") openFee(fee); }} _hover={{ bg: "#f7fbfa" }} title="Abrir detalhes da mensalidade">
              <Table.Cell><HStack gap={2}><Avatar.Root size="sm"><Avatar.Image src={fee.student?.avatar}/><Avatar.Fallback name={fee.student?.name || "Aluno"}/></Avatar.Root><Box minW={0}><Text fontWeight="700" fontSize="11px" color={GREEN}>{fee.student?.name || "Aluno não encontrado"}</Text><Text fontSize="10px" color="#71858a">MAT: {fee.student?.id || "—"}</Text></Box></HStack></Table.Cell>
              <Table.Cell fontSize="11px" color="#174f4a">{formatReference(fee.reference)}</Table.Cell>
              <Table.Cell fontSize="11px">{formatDate(fee.dueDate)}</Table.Cell>
              <Table.Cell fontSize="11px">{fee.student?.contract || "—"}</Table.Cell>
              <Table.Cell fontSize="11px">{formatMoney(fee.amount)}</Table.Cell>
              <Table.Cell fontSize="11px" color="#14833b">{formatMoney(fee.paidAmount)}</Table.Cell>
              <Table.Cell fontWeight="800" fontSize="12px" color={RED}>{formatMoney(remaining(fee))}</Table.Cell>
              <Table.Cell><Text fontSize="11px" color="#a4363a" fontWeight="600">{Number(fee.daysOverdue) || 0} dias</Text></Table.Cell>
              <Table.Cell><Badge bg={isPartial(fee) ? "#fff3cf" : "#ffe2e3"} color={isPartial(fee) ? "#8a5a00" : RED} fontSize="10px" borderRadius="full" px={2} py={1}>{isPartial(fee) ? "Parcial em atraso" : "Em atraso"}</Badge></Table.Cell>
            </Table.Row>)}</Table.Body>
          </Table.Root>
        </Box>

        <VStack display={{ base: "flex", md: "none" }} gap={0} align="stretch">
          {filtered.map(fee => <Box key={fee.id} px={3} py={3} borderBottom="1px solid #e7eceb" onClick={() => openFee(fee)} onKeyDown={event => { if (event.key === "Enter") openFee(fee); }} tabIndex={0} cursor="pointer" _active={{ bg: "#f7fbfa" }}>
            <Flex justify="space-between" gap={3} align="flex-start"><HStack gap={2} minW={0}><Avatar.Root size="sm"><Avatar.Image src={fee.student?.avatar}/><Avatar.Fallback name={fee.student?.name || "Aluno"}/></Avatar.Root><Box minW={0}><Text fontSize="12px" fontWeight="700" color={GREEN}>{fee.student?.name || "Aluno não encontrado"}</Text><Text fontSize="10px" color="#71858a">MAT: {fee.student?.id || "—"}</Text></Box></HStack><Box textAlign="right" flexShrink={0}><Text color={RED} fontWeight="800" fontSize="14px">{formatMoney(remaining(fee))}</Text><Text fontSize="10px" color="#a4363a">{Number(fee.daysOverdue) || 0} dias de atraso</Text></Box></Flex>
            <Flex justify="space-between" align="center" gap={2} mt={3} wrap="wrap"><Text fontSize="11px" color="#607873">{formatReference(fee.reference)} • Venc. {formatDate(fee.dueDate)}</Text><Badge bg={isPartial(fee) ? "#fff3cf" : "#ffe2e3"} color={isPartial(fee) ? "#8a5a00" : RED} borderRadius="full" fontSize="9px">{isPartial(fee) ? "Parcial em atraso" : "Em atraso"}</Badge></Flex>
            <Flex align="center" justify="between" gap={2} mt={2}><Text color="#607873" fontSize="10px">{fee.student?.contract || "Contrato"} • Pago: {formatMoney(fee.paidAmount)}</Text><HStack gap={1} color={GREEN}><Text fontSize="10px" fontWeight="600">Ver detalhes</Text><FiArrowRight size={12}/></HStack></Flex>
          </Box>)}
        </VStack>
      </>}
    </Box>
    <Text fontSize="10px" color="#738883">Critério: vencimento anterior a hoje, mensalidade não cancelada e saldo maior que zero. A lista se atualiza após registrar um pagamento ao voltar e clicar em Atualizar.</Text>
  </VStack>;
}
