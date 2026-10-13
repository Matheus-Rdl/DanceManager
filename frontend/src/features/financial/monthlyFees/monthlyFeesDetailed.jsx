import StudentNavigation from "../../../components/StudentNavigation";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar, Badge, Box, Button, Dialog, Flex, Heading,
  HStack, Input, NativeSelect, Portal, SimpleGrid,
  Table, Text, VStack
} from "@chakra-ui/react";
import {
  FiAlertCircle, FiArrowLeft, FiCalendar, FiCheck,
  FiClock, FiCreditCard, FiFileText, FiPlus, FiX
} from "react-icons/fi";
import monthlyFeesServices from "../../../services/monthlyFeesServices";
import paymentsServices from "../../../services/paymentsServices";
/* Formatadores */
import {
  formatCPF,
  formatDate,
  formatName,
  formatRG,
  formatProperNoun,
} from "../../../utils/formatters";
const money = (value) => new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL"
}).format(Number(value) || 0);
const dateBR = (value) => {
  if (!value) return "—";
  const date = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }
  return String(value);
};
const referenceBR = (value) => {
  if (!value) return "—";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric"
  }).format(new Date(year, month - 1, 1));
};
/* Referência atual no fuso local do navegador, sem conversão UTC. */
const currentReference = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};
const statusConfig = {
  paid: { label: "Pago", color: "#14833b", bg: "#dff5e6" },
  pending: { label: "Pendente", color: "#d98900", bg: "#fff2d8" },
  overdue: { label: "Em atraso", color: "#d9343a", bg: "#ffe2e3" },
  upcoming: { label: "A vencer", color: "#64748b", bg: "#edf1f2" },
  partial: { label: "Parcial", color: "#8a5a00", bg: "#fff3cf" },
  cancelled: { label: "Cancelada", color: "#718096", bg: "#edf1f2" }
};
function StatusBadge({ status }) {
  const item = statusConfig[status] || statusConfig.pending;
  return (
    <Badge bg={item.bg} color={item.color} px={3} py={1}
      borderRadius="full" fontSize="10px">
      {item.label}
    </Badge>
  );
}
/* Mensalidades: usa studentId para consultar cobranças do aluno. */
export default function MonthlyFeesDetailed() {
  const navigate = useNavigate();
  const location = useLocation();
  /* Services */
  const {
    getMonthlyFees,
    monthlyFeesList,
    monthlyFeesLoading
  } = monthlyFeesServices();
  const { getPaymentsByFee, addPayment, paymentsList, paymentsLoading } = paymentsServices();
  /* States */
  const studentId = location.state?.studentId || location.state?.userId || location.state?.userData?._id;
  const requestedFeeId = location.state?.feeId;
  const [selectedId, setSelectedId] = useState(requestedFeeId || "");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => currentReference().slice(0, 4));
  const currentMonth = currentReference();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toLocaleDateString("en-CA")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  /* Buscar mensalidades do aluno */
  useEffect(() => {
    if (studentId) getMonthlyFees({ userId: studentId });
  }, [studentId]);
  const installments = useMemo(() => {
    return monthlyFeesList
      .filter((fee) => fee.userId === studentId || fee.studentId === studentId)
      .sort((a, b) => String(a.reference).localeCompare(String(b.reference)));
  }, [monthlyFeesList, studentId]);
  /* Anos disponíveis: somente os que possuem mensalidades cadastradas */
  const availableYears = useMemo(() => [...new Set(installments.map((fee) => String(fee.reference || "").slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))].sort((a, b) => b.localeCompare(a)), [installments]);
  useEffect(() => {
    if (!availableYears.length) return;
    if (!availableYears.includes(selectedYear)) {
      const thisYear = currentMonth.slice(0, 4);
      setSelectedYear(availableYears.includes(thisYear) ? thisYear : availableYears[0]);
    }
  }, [availableYears, selectedYear]);
  const visibleInstallments = useMemo(() => installments.filter((fee) => String(fee.reference || "").startsWith(selectedYear)), [installments, selectedYear]);
  /* Seleciona uma mensalidade: no mobile abre os detalhes em Dialog */
  const openFeeDetails = (fee) => {
    setSelectedId(fee.id);
    setDetailsOpen(true);
  };
  /* Mobile: troca o Dialog de detalhes pelo Dialog de pagamento */
  const openPayment = () => {
    setPaymentAmount(String(balance));
    setError("");
    setDetailsOpen(false);
    setPaymentOpen(true);
  };
  const closePayment = () => {
    setPaymentOpen(false);
    if (window.matchMedia("(max-width: 767px)").matches) setDetailsOpen(true);
  };
  const studentData = location.state?.userData || installments[0]?.student || {};
  const student = studentData;
  const selected = installments.find((fee) => fee.id === selectedId)
    || installments.find((fee) => String(fee.reference) === currentMonth)
    || visibleInstallments[0] || installments[0];
  useEffect(() => {
    if (selected?.id && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected?.id, selectedId]);
  /* Buscar pagamentos da mensalidade selecionada */
  useEffect(() => {
    if (selected?.id) getPaymentsByFee(selected.id);
  }, [selected?.id]);
  const selectedPayments = useMemo(() => {
    return paymentsList.filter((payment) =>
      payment.monthlyFeeId === selected?.id
    );
  }, [paymentsList, selected?.id]);
  /* Indicadores */
  const totals = useMemo(() => {
    const valid = installments.filter((fee) => fee.status !== "cancelled");
    const paid = valid.filter((fee) => fee.status === "paid");
    const overdue = valid.filter((fee) => fee.status === "overdue");
    const pending = valid.filter((fee) =>
      ["pending", "upcoming", "partial"].includes(fee.status)
    );
    const balance = (fee) =>
      Math.max(Number(fee.amount) - Number(fee.paidAmount || 0), 0);
    return {
      count: valid.length,
      expected: valid.reduce((sum, fee) => sum + Number(fee.amount), 0),
      paidCount: paid.length,
      received: valid.reduce((sum, fee) => sum + Number(fee.paidAmount || 0), 0),
      pendingCount: pending.length,
      pendingValue: pending.reduce((sum, fee) => sum + balance(fee), 0),
      overdueCount: overdue.length,
      overdueValue: overdue.reduce((sum, fee) => sum + balance(fee), 0)
    };
  }, [installments]);
  const cards = [
    { title: "Total de mensalidades", value: totals.count, detail: money(totals.expected), icon: FiCalendar, color: "#174f4a", bg: "#f6f9f8" },
    { title: "Pagas", value: totals.paidCount, detail: money(totals.received), icon: FiCheck, color: "#14833b", bg: "#f5fbf7" },
    { title: "Pendentes / a vencer", value: totals.pendingCount, detail: money(totals.pendingValue), icon: FiClock, color: "#d98900", bg: "#fffaf0" },
    { title: "Em atraso", value: totals.overdueCount, detail: money(totals.overdueValue), icon: FiAlertCircle, color: "#d9343a", bg: "#fff5f5" }
  ];
  /* Registrar pagamento */
  const registerPayment = async () => {
    if (!selected || saving) return;
    const amount = Number(String(paymentAmount).replace(",", "."));
    const balance = Math.max(selected.amount - (selected.paidAmount || 0), 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      setError("Informe um valor válido, sem ultrapassar o saldo em aberto.");
      return;
    }
    if (!paymentDate) {
      setError("Informe a data do pagamento.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await addPayment(selected.id, {
        amount,
        method: paymentMethod,
        paidAt: new Date(`${paymentDate}T12:00:00`).toISOString(),
        receipt: false
      });
      if (!result.success) {
        setError(result.message || "Não foi possível registrar o pagamento.");
        return;
      }
      await getMonthlyFees({ userId: studentId });
      await getPaymentsByFee(selected.id);
      setPaymentOpen(false);
      setPaymentAmount("");
    } catch (err) {
      setError(err.message || "Erro ao registrar pagamento.");
    } finally {
      setSaving(false);
    }
  };
  if (monthlyFeesLoading && !monthlyFeesList.length) {
    return <Box p={6} color="#607873">Carregando mensalidades...</Box>;
  }
  if (!selected) {
    return (
      <Box p={6}>
        <Heading fontSize="18px" color="#063f39">
          Nenhuma mensalidade encontrada.
        </Heading>
        <Button mt={4} onClick={() => navigate(-1)}>
          <FiArrowLeft /> Voltar
        </Button>
      </Box>
    );
  }
  const paidAmount = Number(selected.paidAmount || 0);
  const balance = Math.max(Number(selected.amount) - paidAmount, 0);
  return (
    <VStack gap={3} align="stretch" width="100%" minW={0} bg="#f8faf9">
      {/* TÍTULO */}
      <Flex>
        <Button onClick={() => navigate(-1)} alignSelf="flex-start" variant="ghost" h="34px" px="4px" color="#174f4a" fontSize="12px" fontWeight="600" borderRadius="6px">
          <FiArrowLeft /> Voltar
        </Button>
        <Flex align="center" gap={3} marginLeft={12}>
          <Flex w="36px" h="36px" borderRadius="full" bg="#0b6b5b" color="white" align="center" justify="center" flexShrink={0}>
            <FiCalendar size={18} />
          </Flex>
          <Box>
            <Heading as="h1" fontSize={{ base: "16px", md: "20px" }} fontWeight="700" lineHeight="1.1" color="#062f2b">
              Mensalidades
            </Heading>
            <Text fontSize="11px" color="#60777c">
              Acompanhamento financeiro do aluno
            </Text>
          </Box>
        </Flex>
      </Flex>
      {/* Cabeçalho */}
      {/*
      <Flex align="center" gap={4} wrap="wrap">
        <Button variant="ghost" onClick={() => navigate(-1)}
          color="#174f4a" size="sm">
          <FiArrowLeft /> Voltar
        </Button>
        <Flex w="38px" h="38px" borderRadius="full" bg="#0b6b5b"
          color="white" align="center" justify="center">
          <FiCalendar size={19} />
        </Flex>
        <Box>
          <Heading fontSize="21px" color="#062f2b">Mensalidades</Heading>
          <Text fontSize="11px" color="#60777c">
            Acompanhamento financeiro do aluno
          </Text>
        </Box>
      </Flex>
      */}
      {/* NAVEGAÇÃO - DADOS DE USUÁRIO */}
      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="8px"
        overflow="hidden"
        width="100%"
      >
        {/* DADOS DO ALUNO */}
        <Flex px={{ base: 3, md: 4 }} py={4} gap={4} justify="flex-start" align={{ base: "flex-start", lg: "center" }} direction={{ base: "column", lg: "row" }}>
          <HStack gap={4} minW={0}>
            <Avatar.Root w={{ base: "64px", md: "76px" }} h={{ base: "64px", md: "76px" }} flexShrink={0}>
              <Avatar.Fallback name={student.user_name || student.name || "Usuário"} />
              {(student.user_photo || student.photo) && (
                <Avatar.Image src={student.user_photo || student.photo} />
              )}
            </Avatar.Root>
            <Box minW={0}>
              <Heading fontSize="xl" lineHeight="1.2" color="#003b36" fontWeight="700">
                {formatName(student.user_name || student.name || "Usuário")}
              </Heading>
              <Text mt="5px" fontSize="12px" color="#60777c">
                Matrícula: {student.user_mat || student.id || "-"}
              </Text>
              <Badge mt="8px" px="9px" py="4px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="10px">
                <FiCheck /> Aluno ativo
              </Badge>
            </Box>
          </HStack>
        </Flex>
        {/* ABAS */}
        <StudentNavigation activeTab="Mensalidades" userId={studentId} userData={studentData} />
      </Box>
      {/* MENSALIDADES - CONTEUDO PRINCIPAL */}
      <Flex gap={3} direction={{ base: "column", xl: "row" }}>
        <Flex direction={{ base: "column", lg: "column" }} gap={3} flex="1" minW={0} bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">
          <Flex align="center" justify="space-between" px={4} py={3} borderBottom="1px solid #e6ecea" gap={2} flexWrap="wrap">
            <Heading fontSize="16px" color="#062f2b">Informações da mensalidade</Heading>
          </Flex>
          {/* Contrato */}
          <Box p={3} mx={3} bg="#f6f9f8"
            border="1px solid #e2e8e7" borderRadius="8px">
            <Text fontSize="10px" color="#60777c">Contrato</Text>
            <Text mt={1} fontWeight="700" fontSize="13px" color="#174f4a">
              {student.contract || "Não informado"}
            </Text>
          </Box>
          {/* Indicadores */}
          <SimpleGrid mx={3} columns={{ base: 2, lg: 4 }} gap={3}>
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Flex key={card.title} p={3} gap={2}
                  bg={card.bg} border="1px solid #e2e8e7"
                  borderRadius="8px" align="flex-start">
                  <Flex color={card.color} mt={1}>
                    <Icon size={18} />
                  </Flex>
                  <Box minW={0}>
                    <Text fontSize="10px" color="#60777c">
                      {card.title}
                    </Text>
                    <Text fontSize="20px" fontWeight="800" color={card.color}>
                      {card.value}
                    </Text>
                    <Text fontSize="10px" color="#60777c">
                      {card.detail}
                    </Text>
                  </Box>
                </Flex>
              );
            })}
          </SimpleGrid>
          {/* Filtro de ano: funciona no desktop e no mobile */}
          <Flex mx={3} justify="space-between" align="center" gap={2} wrap="wrap">
            <Text fontSize="12px" color="#60777c">Selecione uma mensalidade para consultar ou registrar pagamentos.</Text>
            <NativeSelect.Root width="125px" size="sm">
              <NativeSelect.Field aria-label="Ano das mensalidades" value={selectedYear} onChange={(e) => {
                  const year = e.target.value;
                  setSelectedYear(year);
                  const fee = installments.find((item) => String(item.reference) === `${year}-${currentMonth.slice(5)}`)
                    || installments.find((item) => String(item.reference).startsWith(`${year}-`));
                  if (fee) setSelectedId(fee.id);
                }}>
                {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Flex>
          {/* Desktop: tabela original, apenas filtrada pelo ano */}
          <Box mx={3} display={{ base: "none", md: "block" }}>
            <Box border="1px solid #e2e8e7" borderRadius="8px" overflowX="auto">
              <Table.Root size="sm" minW="650px">
                <Table.Header bg="#f4f7f7"><Table.Row>
                  {["Referência", "Vencimento", "Valor", "Pago", "Status"].map((header) => (
                    <Table.ColumnHeader key={header} fontSize="11px" color="#174f4a">{header}</Table.ColumnHeader>
                  ))}
                </Table.Row></Table.Header>
                <Table.Body>
                  {visibleInstallments.map((fee) => (
                    <Table.Row key={fee.id} cursor="pointer" bg={selected.id === fee.id ? "#f2faf7" : String(fee.reference) === currentMonth ? "#f7fbf7" : "white"} _hover={{ bg: "#f7fbfa" }} onClick={() => setSelectedId(fee.id)}>
                      <Table.Cell fontWeight="700" fontSize="11px">
                        <HStack gap={2} wrap="wrap"><Text>{referenceBR(fee.reference)}</Text>
                          {String(fee.reference) === currentMonth && <Badge bg="#dff5e6" color="#14833b" fontSize="10px">Mês atual</Badge>}
                        </HStack>
                      </Table.Cell>
                      <Table.Cell fontSize="11px">{dateBR(fee.dueDate)}</Table.Cell>
                      <Table.Cell fontSize="11px">{money(fee.amount)}</Table.Cell>
                      <Table.Cell fontSize="11px">{money(fee.paidAmount)}</Table.Cell>
                      <Table.Cell><StatusBadge status={fee.status} /></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
          {/* Mobile: cards clicáveis que abrem os detalhes em Dialog */}
          <VStack mx={3} align="stretch" gap={2} display={{ base: "flex", md: "none" }}>
            {visibleInstallments.map((fee) => (
              <Box key={fee.id} as="button" type="button" textAlign="left" p={3} bg={String(fee.reference) === currentMonth ? "#f2faf7" : "white"} border="1px solid #d7e2df" borderRadius="8px" _active={{ bg: "#f2faf7" }} onClick={() => openFeeDetails(fee)}>
                <Flex justify="space-between" align="center" gap={2}>
                  <HStack gap={2} wrap="wrap"><Text fontWeight="700" fontSize="13px" color="#174f4a">{referenceBR(fee.reference)}</Text>
                    {String(fee.reference) === currentMonth && <Badge bg="#dff5e6" color="#14833b" fontSize="10px">Mês atual</Badge>}
                  </HStack>
                  <StatusBadge status={fee.status} />
                </Flex>
                <Text mt={2} fontSize="11px" color="#60777c">Vencimento: {dateBR(fee.dueDate)}</Text>
                <Flex justify="space-between" mt={1}>
                  <Text fontSize="12px" fontWeight="700">{money(fee.amount)}</Text>
                  <Text fontSize="11px" color="#174f4a">Ver detalhes ›</Text>
                </Flex>
              </Box>
            ))}
          </VStack>
          <Text mx={3} my={3} fontSize="10px" color="#60777c">Mostrando {visibleInstallments.length} mensalidades de {selectedYear}.</Text>
          {visibleInstallments.length === 0 && <Text mx={3} mb={3} fontSize="12px" color="#60777c">Nenhuma mensalidade neste ano.</Text>}
          {/* Detalhes da mensalidade selecionada */}
        </Flex>
        <Box display={{ base: "none", md: "block" }} w={{ md: "100%", xl: "330px" }} flexShrink={0}
          bg="white" border="1px solid #d7e2df"
          borderRadius="8px" p={4} alignSelf="flex-start">
          <Flex justify="space-between" align="center" gap={2}>
            <Heading fontSize="17px" color="#062f2b">
              Mensalidade
            </Heading>
            <StatusBadge status={selected.status} />
          </Flex>
          <Text mt={2} fontWeight="700" color="#174f4a">
            {referenceBR(selected.reference)}
          </Text>
          <Box mt={4} p={3} bg="#f3f6f5" borderRadius="8px">
            <Text fontSize="10px" color="#60777c">
              Período da mensalidade
            </Text>
            <Text mt={1} fontSize="11px" color="#174f4a">
              {dateBR(selected.periodStart)} até {dateBR(selected.periodEnd)}
            </Text>
          </Box>
          <VStack mt={3} gap={0} align="stretch">
            {[
              ["Vencimento", dateBR(selected.dueDate)],
              ["Valor da mensalidade", money(selected.amount)],
              ["Valor pago", money(paidAmount)],
              ["Saldo em aberto", money(balance)]
            ].map(([label, value]) => (
              <Flex key={label} justify="space-between" gap={3}
                py={3} borderBottom="1px solid #edf1f0">
                <Text fontSize="11px" color="#60777c">{label}</Text>
                <Text fontSize="11px" fontWeight="700" color="#174f4a">
                  {value}
                </Text>
              </Flex>
            ))}
          </VStack>
          {/* Pagamentos */}
          <Heading mt={5} fontSize="13px" color="#174f4a">
            Pagamentos registrados
          </Heading>
          {paymentsLoading && (
            <Text mt={3} fontSize="11px" color="#60777c">
              Carregando pagamentos...
            </Text>
          )}
          {!paymentsLoading && selectedPayments.length === 0 && (
            <Box mt={3} p={3} border="1px dashed #cfdcda"
              borderRadius="8px">
              <Text fontSize="11px" color="#71858a">
                Nenhum pagamento registrado.
              </Text>
            </Box>
          )}
          {selectedPayments.map((payment) => (
            <Box key={payment.id} mt={3} p={3}
              border="1px solid #e2e8e7" borderRadius="8px">
              <Flex justify="space-between" align="center">
                <HStack gap={2}>
                  <FiCheck color="#14833b" />
                  <Text fontWeight="700" fontSize="12px" color="#174f4a">
                    {money(payment.amount)}
                  </Text>
                </HStack>
                <Badge colorPalette="green" size="sm">Recebido</Badge>
              </Flex>
              <Text mt={2} fontSize="10px" color="#60777c">
                {payment.method} • {dateBR(payment.paidAt)}
              </Text>
              {payment.receipt && (
                <Text mt={2} fontSize="10px" color="#174f4a">
                  <FiFileText style={{ display: "inline" }} /> Comprovante disponível
                </Text>
              )}
            </Box>
          ))}
          <Button mt={4} w="100%" bg="#003f36" color="white"
            fontSize="11px" borderRadius="8px"
            disabled={balance <= 0 || selected.status === "cancelled"}
            onClick={openPayment}>
            <FiPlus /> Registrar novo pagamento
          </Button>
        </Box>
      </Flex>
      {/* Mobile: detalhes da mensalidade em primeiro Dialog */}
      <Dialog.Root open={detailsOpen} onOpenChange={(e) => { if (!e.open) setDetailsOpen(false); }} size="md">
        <Portal><Dialog.Backdrop /><Dialog.Positioner>
          <Dialog.Content mx={3} maxW="430px" borderRadius="10px">
            <Dialog.Header><Dialog.Title color="#063f39">Detalhes da mensalidade</Dialog.Title></Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={3}>
                <Flex justify="space-between" align="center" gap={2}>
                  <Text fontWeight="700" color="#174f4a">{referenceBR(selected.reference)}</Text>
                  <StatusBadge status={selected.status} />
                </Flex>
                <Box bg="#f3f6f5" p={3} borderRadius="8px">
                  <Text fontSize="10px" color="#60777c">Período da mensalidade</Text>
                  <Text fontSize="11px">{dateBR(selected.periodStart)} até {dateBR(selected.periodEnd)}</Text>
                </Box>
                {[["Vencimento", dateBR(selected.dueDate)], ["Valor da mensalidade", money(selected.amount)], ["Valor pago", money(paidAmount)], ["Saldo em aberto", money(balance)]].map(([label, value]) => (
                  <Flex key={label} justify="space-between" borderBottom="1px solid #edf1f0" py={2} gap={2}>
                    <Text fontSize="11px" color="#60777c">{label}</Text>
                    <Text fontSize="11px" fontWeight="700">{value}</Text>
                  </Flex>
                ))}
                <Heading fontSize="13px" color="#174f4a">Pagamentos registrados</Heading>
                {paymentsLoading && <Text fontSize="11px">Carregando pagamentos...</Text>}
                {!paymentsLoading && selectedPayments.length === 0 && <Text fontSize="11px" color="#60777c">Nenhum pagamento registrado.</Text>}
                {selectedPayments.map((payment) => (
                  <Box key={payment.id} p={2} border="1px solid #e2e8e7" borderRadius="8px">
                    <Text fontSize="12px" fontWeight="700">{money(payment.amount)}</Text>
                    <Text fontSize="10px" color="#60777c">{payment.method} • {dateBR(payment.paidAt)}</Text>
                  </Box>
                ))}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fechar</Button>
              <Button bg="#003f36" color="white" disabled={balance <= 0 || selected.status === "cancelled"} onClick={openPayment}><FiPlus /> Registrar pagamento</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild><Button position="absolute" top="10px" right="10px" variant="ghost" size="sm"><FiX /></Button></Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner></Portal>
      </Dialog.Root>
      {/* Modal de pagamento */}
      <Dialog.Root open={paymentOpen}
        onOpenChange={(e) => { if (!e.open) closePayment(); }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="430px" borderRadius="10px">
              <Dialog.Header>
                <Dialog.Title color="#063f39">
                  Registrar pagamento
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack align="stretch" gap={3}>
                  <Box p={3} bg="#f5f8f7" borderRadius="8px">
                    <Text fontSize="11px" color="#60777c">Aluno</Text>
                    <Text fontWeight="700" fontSize="13px" color="#174f4a">
                      {student.user_name || student.name || "Aluno"}
                    </Text>
                    <Text mt={2} fontSize="11px" color="#60777c">
                      {referenceBR(selected.reference)}
                    </Text>
                    <Text fontWeight="700" color="#174f4a">
                      Saldo: {money(balance)}
                    </Text>
                  </Box>
                  <Box>
                    <Text mb={1} fontSize="11px">Valor recebido</Text>
                    <Input value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      h="38px" fontSize="12px" />
                  </Box>
                  <Box>
                    <Text mb={1} fontSize="11px">Forma de pagamento</Text>
                    <NativeSelect.Root>
                      <NativeSelect.Field value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão">Cartão</option>
                        <option value="Transferência">Transferência</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Box>
                  <Box>
                    <Text mb={1} fontSize="11px">Data do pagamento</Text>
                    <Input type="date" value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)} />
                  </Box>
                  {error && (
                    <Text color="red.600" fontSize="11px">{error}</Text>
                  )}
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={closePayment}
                  disabled={saving}>
                  Cancelar
                </Button>
                <Button bg="#003f36" color="white" loading={saving}
                  onClick={registerPayment}>
                  <FiCreditCard /> Registrar pagamento
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button position="absolute" top="10px" right="10px"
                  variant="ghost" size="sm">
                  <FiX />
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </VStack>
  );
}
