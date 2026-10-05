import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Badge, Box, Button, Dialog, Flex, Heading, HStack, Input, NativeSelect, Portal, SimpleGrid, Table, Text, VStack } from "@chakra-ui/react";

//React Icons
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCalendar, FiCheck, FiClock, FiCreditCard, FiFileText, FiInfo, FiMoreVertical, FiPlus, FiX } from "react-icons/fi";

//Formatters
import {
  formatCPF,
  formatDate,
  formatName,
  formatRG,
  formatProperNoun,
} from "../../../utils/formatters";

const STORAGE_KEY = "danceManager_financial_v1";
const STORAGE_EVENT = "danceManagerFinancialUpdated";

const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatReference = (reference) => {
  const [year, month] = reference.split("-").map(Number);
  const text = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const formatPeriod = (fee) => `${fee.periodStart?.slice(0, 5) || "—"} → ${fee.periodEnd?.slice(0, 5) || "—"}`;

const statusConfig = {
  paid: { label: "Pago", fg: "#14833b", bg: "#dff5e6", icon: FiCheck },
  pending: { label: "Pendente", fg: "#d98900", bg: "#fff2d8", icon: FiClock },
  overdue: { label: "Em atraso", fg: "#d9343a", bg: "#ffe2e3", icon: FiAlertCircle },
  upcoming: { label: "A vencer", fg: "#64748b", bg: "#edf1f2", icon: FiClock },
  partial: { label: "Parcial", fg: "#8a5a00", bg: "#fff3cf", icon: FiClock },
  cancelled: { label: "Cancelada", fg: "#718096", bg: "#edf1f2", icon: FiX },
};

function loadFinancialData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.error("Erro ao ler financeiro do localStorage:", error);
  }
  return { students: [], monthlyFees: [], payments: [] };
}

function saveFinancialData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  return <Badge display="inline-flex" alignItems="center" gap="6px" px="10px" py="5px" borderRadius="999px" bg={config.bg} color={config.fg} fontWeight="600" fontSize="10px"><Flex w="15px" h="15px" borderRadius="full" bg={config.fg} color="white" align="center" justify="center"><Icon size={9} /></Flex>{config.label}</Badge>;
}

export default function MonthlyFeesDetailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const [financialData, setFinancialData] = useState(loadFinancialData);
  const studentId = location.state?.studentId || location.state?.fee?.studentId || "000123";
  const requestedFeeId = location.state?.feeId || location.state?.fee?.id;
  const student = financialData.students.find((item) => item.id === studentId) || financialData.students[0] || {};
  const installments = useMemo(() => financialData.monthlyFees.filter((fee) => fee.studentId === studentId).sort((a, b) => a.reference.localeCompare(b.reference)), [financialData, studentId]);
  const [selectedId, setSelectedId] = useState(requestedFeeId || "");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [paymentDate, setPaymentDate] = useState(() => { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; });

  useEffect(() => {
    if (!selectedId && installments.length) setSelectedId(requestedFeeId || installments[0].id);
  }, [installments, requestedFeeId, selectedId]);

  useEffect(() => {
    const refresh = () => setFinancialData(loadFinancialData());
    window.addEventListener("storage", refresh);
    window.addEventListener(STORAGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(STORAGE_EVENT, refresh);
    };
  }, []);

  const selected = installments.find((item) => item.id === selectedId) || installments[0];
  const selectedPayments = useMemo(() => financialData.payments.filter((payment) => payment.monthlyFeeId === selected?.id).sort((a, b) => b.id.localeCompare(a.id)), [financialData, selected]);

  const totals = useMemo(() => {
    const total = installments.reduce((sum, item) => sum + item.amount, 0);
    const paid = installments.filter((item) => item.status === "paid");
    const pending = installments.filter((item) => ["pending", "upcoming", "partial"].includes(item.status));
    const overdue = installments.filter((item) => item.status === "overdue");
    return {
      total,
      totalCount: installments.length,
      paidValue: installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0),
      paidCount: paid.length,
      pendingValue: pending.reduce((sum, item) => sum + Math.max(item.amount - (item.paidAmount || 0), 0), 0),
      pendingCount: pending.length,
      overdueValue: overdue.reduce((sum, item) => sum + Math.max(item.amount - (item.paidAmount || 0), 0), 0),
      overdueCount: overdue.length,
    };
  }, [installments]);

  const summaryCards = [
    { title: "Total de mensalidades", value: totals.totalCount, detail: formatCurrency(totals.total), icon: FiCalendar, fg: "#174f4a", bg: "#f6f9f8", iconBg: "#e7eeec" },
    { title: "Pagas", value: totals.paidCount, detail: formatCurrency(totals.paidValue), icon: FiCheck, fg: "#14833b", bg: "#f5fbf7", iconBg: "#dff5e6" },
    { title: "Pendentes / a vencer", value: totals.pendingCount, detail: formatCurrency(totals.pendingValue), icon: FiClock, fg: "#d98900", bg: "#fffaf0", iconBg: "#fff0cf" },
    { title: "Em atraso", value: totals.overdueCount, detail: formatCurrency(totals.overdueValue), icon: FiAlertCircle, fg: "#d9343a", bg: "#fff5f5", iconBg: "#ffe2e3" },
  ];

  const registerPayment = () => {
    if (!selected) return;
    const amount = Number(String(paymentAmount).replace(",", "."));
    if (!amount || amount <= 0) return;

    const currentPaid = selected.paidAmount || 0;
    const remaining = Math.max(selected.amount - currentPaid, 0);
    const acceptedAmount = Math.min(amount, remaining);
    const newPaidAmount = currentPaid + acceptedAmount;
    const newStatus = newPaidAmount >= selected.amount ? "paid" : "partial";
    const paidAt = new Date(`${paymentDate}T12:00:00`).toLocaleDateString("pt-BR") + " às 12:00";

    const newPayment = {
      id: `pay-${Date.now()}`,
      monthlyFeeId: selected.id,
      studentId,
      amount: acceptedAmount,
      method: paymentMethod,
      paidAt,
      receipt: false,
    };

    const nextData = {
      ...financialData,
      monthlyFees: financialData.monthlyFees.map((fee) => fee.id === selected.id ? { ...fee, paidAmount: newPaidAmount, status: newStatus } : fee),
      payments: [...financialData.payments, newPayment],
    };

    saveFinancialData(nextData);
    setFinancialData(nextData);
    setPaymentOpen(false);
  };

  if (!student.id || !selected) {
    return <Box p={6}>
      <Heading fontSize="18px" color="#063f39">Nenhuma mensalidade encontrada.</Heading>
      <Button mt={4} onClick={() => navigate(-1)}>
        <FiArrowLeft /> Voltar
      </Button>
    </Box>;
  }

  const selectedPaid = selected.paidAmount || 0;
  const selectedBalance = Math.max(selected.amount - selectedPaid, 0);

  return (
    <VStack gap={3} align="stretch" width="100%" minWidth={0} bg="#f8faf9">

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
          </Box>
        </Flex>
      </Flex>


      {/* CABEÇALHO */}
      <Flex gap={3} align="stretch" direction={{ base: "column", xl: "row" }}>
        <Box flex="1" minW={0} bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">

          <Flex px={{ base: 3, md: 4 }} py={4} gap={4} justify="space-between" align={{ base: "flex-start", lg: "center" }} direction={{ base: "column", lg: "row" }}>
            {/* DADOS DO ALUNO */}
            <HStack gap={4} minW={0}>
              {/* FOTO DO ALUNO */}
              <Avatar.Root w={{ base: "64px", md: "76px" }} h={{ base: "64px", md: "76px" }} flexShrink={0}>
                <Avatar.Image src={student.avatar} />
                <Avatar.Fallback name={student.name} />
              </Avatar.Root>

              {/* NOME, MATRICULA E SITUAÇÃO*/}
              <Box minW={0}>
                <Heading fontSize="xl" lineHeight="1.2" color="#003b36" fontWeight="700">
                  {student.name}
                </Heading>
                <Text mt="5px" fontSize="12px" color="#60777c">
                  MAT: {student.id}
                </Text>
                <Badge mt="8px" px="9px" py="4px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="10px">
                  <FiCheck /> Aluno ativo
                </Badge>
              </Box>
            </HStack>

          </Flex>

          <Flex px={{ base: 2, md: 3 }} borderTop="1px solid #e7eceb" borderBottom="1px solid #e7eceb" overflowX="auto" bg="#fff">
            {["Visão geral", "Contratos", "Mensalidades", "Pagamentos", "Histórico"].map((tab) =>
              <Button
                key={tab}
                flexShrink={0}
                h="44px" px="12px"
                variant="ghost"
                borderRadius="0"
                color={tab === "Mensalidades" ? "#063f39" : "#506a67"}
                fontSize="12px"
                fontWeight={tab === "Mensalidades" ? "700" : "500"}
                borderBottom={tab === "Mensalidades" ? "3px solid #063f39" : "3px solid transparent"}>
                {tab}
              </Button>
            )}
          </Flex>

          {/* DADOS DO CONTRATO */}
          <Flex m={3} w={{ base: "100%", lg: "430px" }} border="1px solid #e2e8e7" borderRadius="8px" overflow="hidden" direction={{ base: "column", sm: "row" }}>
            <Box flex="1" p={3}><Text fontSize="10px" fontWeight="700" color="#174f4a">Contrato atual</Text><Text mt="2px" fontSize="14px" fontWeight="800" color="#063f39">{student.contract}</Text><Text mt="2px" fontSize="12px" color="#506a67">{student.periodicity} • {formatCurrency(student.monthlyAmount)} / mês</Text><HStack mt="7px" gap="6px" wrap="wrap"><Text fontSize="10px" color="#60777c">{student.contractStart} → {student.contractEnd}</Text><Badge px="7px" py="3px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="9px">Ativo</Badge></HStack></Box>
            <Flex p={3} minW={{ sm: "180px" }} borderLeft={{ base: "0", sm: "1px solid #e2e8e7" }} borderTop={{ base: "1px solid #e2e8e7", sm: "0" }} align="center" justify="center"><Button w="100%" h="36px" variant="outline" borderColor="#d6e0df" borderRadius="8px" color="#174f4a" bg="white" fontSize="11px"><FiFileText /> Ver detalhes do contrato</Button></Flex>
          </Flex>

          <Box p={{ base: 3, md: 4 }}>
            <Heading fontSize="19px" color="#062f2b">Mensalidades</Heading>
            <Text mt="4px" fontSize="11px" color="#60777c">Veja todas as cobranças geradas a partir do contrato do aluno.</Text>

            <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3} mt={4}>
              {summaryCards.map((card) => { const Icon = card.icon; return <Flex key={card.title} minH="96px" p={3} border="1px solid #e2e8e7" borderRadius="8px" bg={card.bg} align="flex-start" gap={3}><Flex display={{ base: "none", sm: "flex" }} w="34px" h="34px" borderRadius="full" bg={card.iconBg} color={card.fg} align="center" justify="center"><Icon size={17} /></Flex><Box><Text fontSize="10px" color="#60777c">{card.title}</Text><Text mt="3px" fontSize="19px" lineHeight="1.1" fontWeight="800" color={card.fg}>{card.value}</Text><Text mt="6px" fontSize="10px" color="#506a67">{card.detail}</Text></Box></Flex>; })}
            </SimpleGrid>

            <Box mt={4} border="1px solid #e2e8e7" borderRadius="8px" overflow="hidden">
              <Box display={{ base: "none", md: "block" }} overflowX="auto">
                <Table.Root size="sm" variant="line" minW="760px">
                  <Table.Header bg="#f4f7f7"><Table.Row>{["Referência", "Período", "Vencimento", "Valor", "Status", "Ações"].map((header) => <Table.ColumnHeader key={header} h="36px" color="#174f4a" fontSize="10px" fontWeight="600" borderColor="#e2e8e7">{header}</Table.ColumnHeader>)}</Table.Row></Table.Header>
                  <Table.Body>
                    {installments.map((item) => <Table.Row key={item.id} h="61px" cursor="pointer" bg={selectedId === item.id ? "#f2faf7" : "white"} _hover={{ bg: "#f7fbfa" }} onClick={() => setSelectedId(item.id)}><Table.Cell borderColor="#e7eceb"><Text fontSize="11px" fontWeight="700" color="#174f4a">{formatReference(item.reference)}</Text><Text mt="2px" fontSize="9px" color="#71858a">{item.number}ª mensalidade</Text></Table.Cell><Table.Cell borderColor="#e7eceb" fontSize="10px" color="#174f4a">{formatPeriod(item)}</Table.Cell><Table.Cell borderColor="#e7eceb" fontSize="10px" color="#174f4a">{item.dueDate}</Table.Cell><Table.Cell borderColor="#e7eceb" fontSize="11px" fontWeight="700" color="#174f4a">{formatCurrency(item.amount)}</Table.Cell><Table.Cell borderColor="#e7eceb"><StatusBadge status={item.status} /></Table.Cell><Table.Cell borderColor="#e7eceb"><HStack gap="6px"><Button h="30px" px="10px" variant="outline" borderColor="#cfdcda" borderRadius="7px" color="#174f4a" bg="white" fontSize="10px" onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}><FiArrowRight /> Ver</Button><Button h="30px" minW="30px" w="30px" p="0" variant="ghost" color="#174f4a" onClick={(e) => e.stopPropagation()}><FiMoreVertical /></Button></HStack></Table.Cell></Table.Row>)}
                  </Table.Body>
                </Table.Root>
              </Box>

              <VStack display={{ base: "flex", md: "none" }} align="stretch" gap={0}>
                {installments.map((item) => <Box key={item.id} p={3} borderBottom="1px solid #e7eceb" bg={selectedId === item.id ? "#f2faf7" : "white"} onClick={() => setSelectedId(item.id)}><Flex justify="space-between" align="flex-start" gap={3}><Box><Text fontSize="12px" fontWeight="700" color="#174f4a">{formatReference(item.reference)}</Text><Text mt="2px" fontSize="9px" color="#71858a">{item.number}ª mensalidade • {formatPeriod(item)}</Text></Box><Text fontSize="12px" fontWeight="800" color="#063f39">{formatCurrency(item.amount)}</Text></Flex><Flex mt={3} align="center" justify="space-between" gap={2}><StatusBadge status={item.status} /><Text fontSize="9px" color="#60777c">Venc. {item.dueDate}</Text></Flex></Box>)}
              </VStack>
            </Box>
            <Text mt={3} fontSize="10px" color="#60777c">Mostrando todas as {installments.length} mensalidades deste contrato.</Text>
          </Box>
        </Box>

        <Box w={{ base: "100%", xl: "330px" }} flexShrink={0} bg="white" border="1px solid #d7e2df" borderRadius="8px" p={3}>
          <Flex align="flex-start" justify="space-between" gap={3}><HStack align="flex-start" gap={3}><Flex w="38px" h="38px" borderRadius="full" bg="#eef3f2" color="#174f4a" align="center" justify="center" flexShrink={0}><FiCalendar size={18} /></Flex><Box><Heading fontSize="17px" color="#062f2b">Mensalidade</Heading><Text mt="3px" fontSize="14px" fontWeight="800" color="#174f4a">{formatReference(selected.reference)}</Text><Text mt="2px" fontSize="10px" color="#71858a">{selected.number}ª mensalidade</Text></Box></HStack><StatusBadge status={selected.status} /></Flex>

          <Box mt={4} p={3} borderRadius="8px" bg="#f3f6f5"><HStack gap="8px" align="flex-start"><FiInfo color="#60777c" /><Box><Text fontSize="10px" color="#60777c">Período da mensalidade</Text><Text mt="4px" fontSize="11px" color="#174f4a">{formatPeriod(selected)}</Text></Box></HStack></Box>

          <VStack mt={3} align="stretch" gap={0}>
            {[["Vencimento", selected.dueDate], ["Valor da mensalidade", formatCurrency(selected.amount)], ["Valor pago", formatCurrency(selectedPaid)], ["Saldo em aberto", formatCurrency(selectedBalance)]].map(([label, value]) => <Flex key={label} py="11px" justify="space-between" gap={3} borderBottom="1px solid #edf1f0"><Text fontSize="10px" color="#506a67">{label}</Text><Text textAlign="right" fontSize="10px" fontWeight="700" color="#173f3a">{value}</Text></Flex>)}
          </VStack>

          <Box mt={4} pt={3} borderTop="1px solid #e7eceb">
            <HStack gap="7px"><FiCheck color={selectedPayments.length ? "#14833b" : "#71858a"} /><Text fontSize="10px" fontWeight="700" color="#174f4a">Pagamentos desta mensalidade</Text></HStack>
            {selectedPayments.length ? selectedPayments.map((payment) => <Box key={payment.id} mt={3} p={3} border="1px solid #e2e8e7" borderRadius="8px"><Flex justify="space-between" align="flex-start" gap={3}><HStack gap="9px"><Flex w="31px" h="31px" borderRadius="full" bg="#dff5e6" color="#14833b" align="center" justify="center"><FiCheck size={15} /></Flex><Box><Text fontSize="11px" fontWeight="800" color="#174f4a">{formatCurrency(payment.amount)}</Text><Text mt="2px" fontSize="9px" color="#71858a">{payment.method}</Text><Text mt="3px" fontSize="9px" color="#71858a">{payment.paidAt}</Text></Box></HStack><Button minW="28px" w="28px" h="28px" p="0" variant="ghost" color="#174f4a"><FiMoreVertical /></Button></Flex>{payment.receipt && <Button mt={3} w="100%" h="32px" variant="outline" borderColor="#d6e0df" borderRadius="7px" color="#174f4a" fontSize="10px"><FiFileText /> Ver comprovante</Button>}</Box>) : <Box mt={3} p={3} border="1px dashed #cfdcda" borderRadius="8px" textAlign="center"><Text fontSize="10px" color="#71858a">Nenhum pagamento registrado nesta mensalidade.</Text></Box>}
          </Box>

          <Button mt={4} w="100%" h="38px" bg="#003f36" color="white" borderRadius="7px" fontSize="10px" disabled={selectedBalance <= 0 || selected.status === "cancelled"} _hover={{ bg: "#00342d" }} onClick={() => { setPaymentAmount(String(selectedBalance)); setPaymentOpen(true); }}><FiPlus /> Registrar novo pagamento</Button>
        </Box>
      </Flex>

      <Dialog.Root open={paymentOpen} onOpenChange={(e) => setPaymentOpen(e.open)}>
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content maxW="430px" borderRadius="10px">
          <Dialog.Header><Dialog.Title color="#063f39" fontSize="17px">Registrar pagamento</Dialog.Title></Dialog.Header>
          <Dialog.Body><VStack align="stretch" gap={3}><Box p={3} bg="#f5f8f7" borderRadius="8px"><Text fontSize="10px" color="#71858a">Aluno</Text><Text mt="2px" fontSize="12px" fontWeight="700" color="#174f4a">{student.name}</Text><Text mt="6px" fontSize="10px" color="#71858a">Mensalidade</Text><Text mt="2px" fontSize="12px" fontWeight="700" color="#174f4a">{formatReference(selected.reference)} • {formatCurrency(selected.amount)}</Text><Text mt="4px" fontSize="10px" color="#71858a">Saldo atual: {formatCurrency(selectedBalance)}</Text></Box><Box><Text mb="4px" fontSize="10px" color="#60777c">Valor recebido</Text><Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} h="38px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px" /></Box><Box><Text mb="4px" fontSize="10px" color="#60777c">Forma de pagamento</Text><NativeSelect.Root><NativeSelect.Field value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} h="38px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box><Box><Text mb="4px" fontSize="10px" color="#60777c">Data do pagamento</Text><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} h="38px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px" /></Box></VStack></Dialog.Body>
          <Dialog.Footer><Button variant="outline" borderColor="#d6e0df" color="#174f4a" onClick={() => setPaymentOpen(false)}>Cancelar</Button><Button bg="#003f36" color="white" _hover={{ bg: "#00342d" }} onClick={registerPayment}><FiCreditCard /> Registrar pagamento</Button></Dialog.Footer>
          <Dialog.CloseTrigger asChild><Button position="absolute" top="10px" right="10px" minW="30px" w="30px" h="30px" p="0" variant="ghost"><FiX /></Button></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>
    </VStack>
  );
}
