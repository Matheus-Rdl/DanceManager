
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

export default function MonthlyFeesDetailed() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Services */
  const {
    getMonthlyFees,
    getPaymentsByFee,
    addPayment,
    monthlyFeesList,
    monthlyFeesLoading,
    paymentsList,
    paymentsLoading
  } = monthlyFeesServices();

  /* States */
  const studentId = location.state?.studentId;
  const requestedFeeId = location.state?.feeId;
  const [selectedId, setSelectedId] = useState(requestedFeeId || "");
  const [paymentOpen, setPaymentOpen] = useState(false);
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

  const student = installments[0]?.student || {};
  const selected = installments.find((fee) => fee.id === selectedId)
    || installments[0];

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
      {/* Cabeçalho */}
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

      <Flex gap={3} direction={{ base: "column", xl: "row" }}>
        {/* Conteúdo principal */}
        <Box flex="1" minW={0} bg="white"
          border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">

          {/* Dados do aluno */}
          <Flex p={4} align="center" gap={4}>
            <Avatar.Root size="xl">
              <Avatar.Image src={student.avatar} />
              <Avatar.Fallback name={student.name} />
            </Avatar.Root>
            <Box>
              <Heading fontSize="19px" color="#003b36">
                {student.name || "Aluno"}
              </Heading>
              <Text mt={1} fontSize="12px" color="#60777c">
                MAT: {student.id || "—"}
              </Text>
              <Text mt={1} fontSize="11px" color="#60777c">
                {student.activity || ""}
              </Text>
            </Box>
          </Flex>

          {/* Contrato */}
          <Box mx={4} mb={3} p={3} bg="#f6f9f8"
            border="1px solid #e2e8e7" borderRadius="8px">
            <Text fontSize="10px" color="#60777c">Contrato</Text>
            <Text mt={1} fontWeight="700" fontSize="13px" color="#174f4a">
              {student.contract || "Não informado"}
            </Text>
          </Box>

          {/* Indicadores */}
          <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3} p={4}>
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

          {/* Lista de mensalidades */}
          <Box p={4}>
            <Heading fontSize="17px" color="#062f2b" mb={1}>
              Mensalidades do aluno
            </Heading>
            <Text fontSize="11px" color="#60777c" mb={3}>
              Selecione uma mensalidade para consultar ou registrar pagamentos.
            </Text>

            <Box border="1px solid #e2e8e7" borderRadius="8px"
              overflowX="auto">
              <Table.Root size="sm" minW="650px">
                <Table.Header bg="#f4f7f7">
                  <Table.Row>
                    {["Referência", "Vencimento", "Valor", "Pago", "Status"].map((header) => (
                      <Table.ColumnHeader key={header}
                        fontSize="11px" color="#174f4a">
                        {header}
                      </Table.ColumnHeader>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {installments.map((fee) => (
                    <Table.Row key={fee.id}
                      cursor="pointer"
                      bg={selected.id === fee.id ? "#f2faf7" : "white"}
                      _hover={{ bg: "#f7fbfa" }}
                      onClick={() => setSelectedId(fee.id)}>
                      <Table.Cell fontWeight="700" fontSize="11px">
                        {referenceBR(fee.reference)}
                      </Table.Cell>
                      <Table.Cell fontSize="11px">
                        {dateBR(fee.dueDate)}
                      </Table.Cell>
                      <Table.Cell fontSize="11px">
                        {money(fee.amount)}
                      </Table.Cell>
                      <Table.Cell fontSize="11px">
                        {money(fee.paidAmount)}
                      </Table.Cell>
                      <Table.Cell>
                        <StatusBadge status={fee.status} />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
            <Text mt={3} fontSize="10px" color="#60777c">
              Mostrando {installments.length} mensalidades.
            </Text>
          </Box>
        </Box>

        {/* Detalhes da mensalidade selecionada */}
        <Box w={{ base: "100%", xl: "330px" }} flexShrink={0}
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
            onClick={() => {
              setPaymentAmount(String(balance));
              setError("");
              setPaymentOpen(true);
            }}>
            <FiPlus /> Registrar novo pagamento
          </Button>
        </Box>
      </Flex>

      {/* Modal de pagamento */}
      <Dialog.Root open={paymentOpen}
        onOpenChange={(e) => setPaymentOpen(e.open)}>
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
                      {student.name}
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
                <Button variant="outline" onClick={() => setPaymentOpen(false)}
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
