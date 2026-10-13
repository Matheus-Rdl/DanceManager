import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Badge, Box, Button, Dialog, Flex, Heading, HStack, NativeSelect, Portal, SimpleGrid, Table, Text, VStack } from "@chakra-ui/react";
import { FiArrowLeft, FiCalendar, FiCheck, FiCreditCard, FiDollarSign, FiEye, FiFileText, FiX } from "react-icons/fi";
import StudentNavigation from "../../../components/StudentNavigation";
import monthlyFeesServices from "../../../services/monthlyFeesServices";
import paymentsServices from "../../../services/paymentsServices";
import { formatName } from "../../../utils/formatters";

/* Formatação e identificação da referência */
const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
const dateBR = (value) => {
  if (!value) return "—";
  const valueString = String(value);
  const date = valueString.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }
  return valueString;
};
const referenceBR = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return value || "—";
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
};
const paymentDate = (payment) => payment.paidAt || payment.paymentDate || payment.date || "";
const paymentMethod = (payment) => payment.method || payment.paymentMethod || "Não informado";
const getId = (value) => String(value?._id || value?.id || value || "");
const currentYear = String(new Date().getFullYear());
const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

export default function PeopleManagementPayments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getMonthlyFeesByUser, monthlyFeesList, monthlyFeesLoading, monthlyFeesError } = monthlyFeesServices();
  const { getPaymentsByUser, paymentsList, paymentsLoading, paymentsError } = paymentsServices();
  const studentId = location.state?.studentId || location.state?.userId || location.state?.userData?._id;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  /* Busca mensalidades para exibir referência e vencimento de cada pagamento. */
  useEffect(() => { if (studentId) getMonthlyFeesByUser(studentId); }, [studentId]);
  /* Busca todo o histórico do aluno em uma única requisição ao módulo payments. */
  useEffect(() => { if (studentId) getPaymentsByUser(studentId); }, [studentId]);
  const installments = useMemo(() => (Array.isArray(monthlyFeesList) ? monthlyFeesList : []).filter((fee) =>
    getId(fee.userId) === getId(studentId) || getId(fee.studentId) === getId(studentId)
  ), [monthlyFeesList, studentId]);
  const studentData = location.state?.userData || installments[0]?.student || {};
  const student = studentData;
  const records = useMemo(() => {
    const byFee = new Map(installments.map((fee) => [getId(fee), fee]));
    return (Array.isArray(paymentsList) ? paymentsList : []).filter((payment) => getId(payment.userId) === getId(studentId)).map((payment, index) => {
      const feeId = getId(payment.monthlyFeeId);
      const fee = payment.monthlyFee || byFee.get(feeId);
      return { ...payment, _key: `${feeId}-${getId(payment) || index}`, _feeId: feeId,
        _reference: fee?.reference || "", _feeAmount: fee?.amount == null ? null : Number(fee.amount), _dueDate: fee?.dueDate };
    }).sort((a, b) => String(paymentDate(b)).localeCompare(String(paymentDate(a))));
  }, [paymentsList, installments, studentId]);
  const loadingPayments = paymentsLoading;

  /* Os filtros utilizam a data em que o pagamento foi recebido. */
  const years = useMemo(() => {
    const values = [...new Set(records.map((record) => String(paymentDate(record)).slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))];
    return values.sort((a, b) => b.localeCompare(a));
  }, [records]);
  useEffect(() => {
    if (!years.length) return;
    if (!years.includes(selectedYear)) setSelectedYear(years.includes(currentYear) ? currentYear : years[0]);
  }, [years, selectedYear]);
  const methods = useMemo(() => [...new Set(records.map(paymentMethod))].sort(), [records]);
  const visibleRecords = useMemo(() => records.filter((record) => {
    const date = String(paymentDate(record));
    return date.startsWith(selectedYear) && (selectedMonth === "all" || date.slice(5, 7) === selectedMonth) &&
      (selectedMethod === "all" || paymentMethod(record) === selectedMethod);
  }), [records, selectedYear, selectedMonth, selectedMethod]);
  const selected = visibleRecords.find((record) => record._key === selectedId) || visibleRecords[0];
  const yearlyRecords = records.filter((record) => String(paymentDate(record)).startsWith(selectedYear));
  const monthRecords = yearlyRecords.filter((record) => String(paymentDate(record)).slice(5, 7) === currentMonth && selectedYear === currentYear);
  const totalReceived = yearlyRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const monthReceived = monthRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const lastPayment = yearlyRecords[0];
  const cards = [
    { title: "Total recebido no ano", value: money(totalReceived), detail: `${selectedYear || "—"}`, icon: FiDollarSign, color: "#14833b", bg: "#f5fbf7" },
    { title: "Pagamentos no ano", value: yearlyRecords.length, detail: "Registros recebidos", icon: FiCheck, color: "#174f4a", bg: "#f6f9f8" },
    { title: "Recebido no mês atual", value: money(monthReceived), detail: selectedYear === currentYear ? "Mês vigente" : "Selecione o ano atual", icon: FiCalendar, color: "#d98900", bg: "#fffaf0" },
    { title: "Último pagamento no ano", value: lastPayment ? dateBR(paymentDate(lastPayment)) : "—", detail: lastPayment ? paymentMethod(lastPayment) : "Nenhum registro", icon: FiCreditCard, color: "#174f4a", bg: "#f6f9f8" }
  ];
  const openDetails = (record) => { setSelectedId(record._key); setDetailsOpen(true); };
  const detailContent = selected ? (
    <VStack align="stretch" gap={3}>
      <Flex align="center" justify="space-between" gap={2}>
        <Text fontSize="15px" fontWeight="700" color="#174f4a">{money(selected.amount)}</Text>
        <Badge bg="#dff5e6" color="#14833b" borderRadius="full" px={3}>Recebido</Badge>
      </Flex>
      <Box p={3} bg="#f3f6f5" borderRadius="8px">
        <Text fontSize="10px" color="#60777c">Mensalidade de referência</Text>
        <Text fontSize="13px" fontWeight="700" color="#174f4a">{referenceBR(selected._reference)}</Text>
      </Box>
      {[
        ["Data do pagamento", dateBR(paymentDate(selected))],
        ["Forma de pagamento", paymentMethod(selected)],
        ["Valor recebido", money(selected.amount)],
        ["Valor original da mensalidade", selected._feeAmount == null ? "Não disponível" : money(selected._feeAmount)],
        ["Vencimento da mensalidade", dateBR(selected._dueDate)]
      ].map(([label, value]) => <Flex key={label} justify="space-between" gap={3} py={2} borderBottom="1px solid #edf1f0">
        <Text fontSize="11px" color="#60777c">{label}</Text><Text fontSize="11px" fontWeight="700" textAlign="right">{value}</Text>
      </Flex>)}
      {selected.receipt && <Text fontSize="11px" color="#174f4a"><FiFileText style={{ display: "inline" }} /> Comprovante informado no registro</Text>}
    </VStack>
  ) : <Text fontSize="12px" color="#60777c">Selecione um pagamento.</Text>;

  return (
    <VStack gap={3} align="stretch" width="100%" minW={0} bg="#f8faf9">
      {/* Título */}
      <Flex align="center" gap={3}>
        <Button onClick={() => navigate(-1)} variant="ghost" h="34px" px="4px" color="#174f4a" fontSize="12px"><FiArrowLeft /> Voltar</Button>
        <Flex w="36px" h="36px" borderRadius="full" bg="#0b6b5b" color="white" align="center" justify="center"><FiCreditCard size={18} /></Flex>
        <Box><Heading fontSize={{ base: "16px", md: "20px" }} color="#062f2b">Pagamentos</Heading><Text fontSize="11px" color="#60777c">Histórico financeiro individual do aluno</Text></Box>
      </Flex>
      {/* Identificação do aluno e abas */}
      <Box bg="white" border="1px solid #e2e8e7" borderRadius="8px" overflow="hidden">
        <Flex px={{ base: 3, md: 4 }} py={4} align="center" gap={4}>
          <Avatar.Root w={{ base: "64px", md: "76px" }} h={{ base: "64px", md: "76px" }} flexShrink={0}>
            <Avatar.Fallback name={student.user_name || student.name || "Usuário"} />
            {(student.user_photo || student.photo) && <Avatar.Image src={student.user_photo || student.photo} />}
          </Avatar.Root>
          <Box minW={0}>
            <Heading fontSize="xl" lineHeight="1.2" color="#003b36">{formatName(student.user_name || student.name || "Usuário")}</Heading>
            <Text mt={1} fontSize="12px" color="#60777c">Matrícula: {student.user_mat || student.id || "—"}</Text>
            <Badge mt={2} bg="#dff5e6" color="#14833b" borderRadius="full"><FiCheck /> Aluno ativo</Badge>
          </Box>
        </Flex>
        <StudentNavigation activeTab="Pagamentos" userId={studentId} userData={studentData} />
      </Box>
      {!studentId && <Box p={4} bg="#fff2d8" borderRadius="8px"><Text fontSize="12px">Não foi possível identificar o aluno. Acesse esta aba pelo cadastro do aluno.</Text></Box>}
      {(monthlyFeesError || paymentsError) && <Box p={3} bg="#fff2d8" borderRadius="8px"><Text fontSize="12px" color="#8a5a00">{monthlyFeesError || paymentsError}</Text></Box>}
      {/* Conteúdo principal */}
      <Flex gap={3} direction={{ base: "column", xl: "row" }}>
        <VStack gap={3} align="stretch" flex="1" minW={0} bg="white" border="1px solid #d7e2df" borderRadius="8px" p={3}>
          <Heading fontSize="16px" color="#062f2b">Informações dos pagamentos</Heading>
          <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3}>
            {cards.map((card) => { const Icon = card.icon; return <Flex key={card.title} p={3} gap={2} bg={card.bg} border="1px solid #e2e8e7" borderRadius="8px" align="flex-start">
              <Box color={card.color} mt={1}><Icon size={18} /></Box>
              <Box minW={0}><Text fontSize="10px" color="#60777c">{card.title}</Text><Text fontSize={{ base: "15px", md: "19px" }} fontWeight="800" color={card.color}>{card.value}</Text><Text fontSize="10px" color="#60777c">{card.detail}</Text></Box>
            </Flex>; })}
          </SimpleGrid>
          {/* Filtros por ano, mês e forma de pagamento */}
          <Flex gap={2} wrap="wrap" align="center">
            <NativeSelect.Root width={{ base: "calc(50% - 4px)", md: "125px" }} size="sm"><NativeSelect.Field aria-label="Ano" value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth("all"); }}>
              {!years.length && <option value={currentYear}>{currentYear}</option>}
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
            <NativeSelect.Root width={{ base: "calc(50% - 4px)", md: "160px" }} size="sm"><NativeSelect.Field aria-label="Mês" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="all">Todos os meses</option>
              {Array.from({ length: 12 }, (_, index) => <option key={index} value={String(index + 1).padStart(2, "0")}>{new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2026, index, 1))}</option>)}
            </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
            <NativeSelect.Root width={{ base: "100%", md: "180px" }} size="sm"><NativeSelect.Field aria-label="Forma de pagamento" value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
              <option value="all">Todas as formas</option>{methods.map((method) => <option key={method} value={method}>{method}</option>)}
            </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
          </Flex>
          <Text fontSize="11px" color="#60777c">{loadingPayments || monthlyFeesLoading ? "Carregando histórico..." : `${visibleRecords.length} pagamento(s) encontrado(s).`}</Text>
          {/* Desktop: tabela de pagamentos */}
          <Box display={{ base: "none", md: "block" }} border="1px solid #e2e8e7" borderRadius="8px" overflowX="auto">
            <Table.Root size="sm" minW="620px">
              <Table.Header bg="#f4f7f7"><Table.Row>{["Data", "Mensalidade", "Valor recebido", "Forma", "Status"].map((label) => <Table.ColumnHeader key={label} fontSize="11px" color="#174f4a">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
              <Table.Body>{visibleRecords.map((record) => <Table.Row key={record._key} cursor="pointer" bg={selected?._key === record._key ? "#f2faf7" : "white"} _hover={{ bg: "#f7fbfa" }} onClick={() => setSelectedId(record._key)}>
                <Table.Cell fontSize="11px">{dateBR(paymentDate(record))}</Table.Cell><Table.Cell fontSize="11px" fontWeight="700">{referenceBR(record._reference)}</Table.Cell>
                <Table.Cell fontSize="11px">{money(record.amount)}</Table.Cell><Table.Cell fontSize="11px">{paymentMethod(record)}</Table.Cell>
                <Table.Cell><Badge bg="#dff5e6" color="#14833b" borderRadius="full" fontSize="10px">Recebido</Badge></Table.Cell>
              </Table.Row>)}</Table.Body>
            </Table.Root>
          </Box>
          {/* Mobile: cards com detalhes em Dialog */}
          <VStack align="stretch" gap={2} display={{ base: "flex", md: "none" }}>
            {visibleRecords.map((record) => <Box key={record._key} as="button" type="button" textAlign="left" p={3} bg="white" border="1px solid #d7e2df" borderRadius="8px" onClick={() => openDetails(record)}>
              <Flex justify="space-between" align="center" gap={2}><Text fontWeight="700" fontSize="13px" color="#174f4a">{referenceBR(record._reference)}</Text><Badge bg="#dff5e6" color="#14833b" borderRadius="full">Recebido</Badge></Flex>
              <Text mt={2} fontSize="11px" color="#60777c">{dateBR(paymentDate(record))} · {paymentMethod(record)}</Text>
              <Flex mt={2} justify="space-between"><Text fontSize="13px" fontWeight="700">{money(record.amount)}</Text><Text fontSize="11px" color="#174f4a"><FiEye style={{ display: "inline" }} /> Ver detalhes</Text></Flex>
            </Box>)}
          </VStack>
          {!loadingPayments && !monthlyFeesLoading && !visibleRecords.length && <Text py={5} textAlign="center" fontSize="12px" color="#60777c">Nenhum pagamento encontrado para os filtros selecionados.</Text>}
        </VStack>
        {/* Desktop: painel lateral de detalhes */}
        <Box display={{ base: "none", md: "block" }} w={{ md: "100%", xl: "330px" }} flexShrink={0} bg="white" border="1px solid #d7e2df" borderRadius="8px" p={4} alignSelf="flex-start">
          <Heading mb={4} fontSize="17px" color="#062f2b">Detalhes do pagamento</Heading>{detailContent}
        </Box>
      </Flex>
      {/* Mobile: detalhes em Dialog */}
      <Dialog.Root open={detailsOpen} onOpenChange={(event) => setDetailsOpen(event.open)} size="md">
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content mx={3} maxW="430px" borderRadius="10px">
          <Dialog.Header><Dialog.Title color="#063f39">Detalhes do pagamento</Dialog.Title></Dialog.Header>
          <Dialog.Body>{detailContent}</Dialog.Body>
          <Dialog.Footer><Button variant="outline" onClick={() => setDetailsOpen(false)}>Fechar</Button></Dialog.Footer>
          <Dialog.CloseTrigger asChild><Button position="absolute" top="10px" right="10px" variant="ghost" size="sm" aria-label="Fechar"><FiX /></Button></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>
    </VStack>
  );
}
