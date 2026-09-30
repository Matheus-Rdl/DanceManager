import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Badge, Box, Button, Dialog, Flex, Heading, HStack, Input, NativeSelect, Portal, SimpleGrid, Table, Text, VStack } from "@chakra-ui/react";
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCalendar, FiCheck, FiClock, FiCreditCard, FiDollarSign, FiFileText, FiInfo, FiMoreVertical, FiPlus, FiX } from "react-icons/fi";

const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const statusConfig = {
  paid: { label: "Pago", fg: "#14833b", bg: "#dff5e6", icon: FiCheck },
  pending: { label: "Pendente", fg: "#d98900", bg: "#fff2d8", icon: FiClock },
  overdue: { label: "Em atraso", fg: "#d9343a", bg: "#ffe2e3", icon: FiAlertCircle },
  upcoming: { label: "A vencer", fg: "#64748b", bg: "#edf1f2", icon: FiClock },
  cancelled: { label: "Cancelada", fg: "#718096", bg: "#edf1f2", icon: FiX },
};

const defaultStudent = {
  studentId: "000123",
  name: "João Pedro Silva",
  avatar: "https://i.pravatar.cc/120?img=12",
  contract: "Balanço",
  periodicity: "Semestral",
  monthlyAmount: 270,
  contractStart: "17/05/2026",
  contractEnd: "16/11/2026",
  active: true,
};

const mockInstallments = [
  { id: "fee-01", number: 1, reference: "Maio/2026", period: "17/05 → 16/06", dueDate: "17/05/2026", amount: 270, status: "paid", paidAmount: 270, paymentMethod: "Pix", paidAt: "17/05/2026 às 14:32", receipt: true },
  { id: "fee-02", number: 2, reference: "Junho/2026", period: "17/06 → 16/07", dueDate: "17/06/2026", amount: 270, status: "paid", paidAmount: 270, paymentMethod: "Cartão", paidAt: "17/06/2026 às 18:10", receipt: true },
  { id: "fee-03", number: 3, reference: "Julho/2026", period: "17/07 → 16/08", dueDate: "17/07/2026", amount: 270, status: "paid", paidAmount: 270, paymentMethod: "Pix", paidAt: "17/07/2026 às 09:21", receipt: true },
  { id: "fee-04", number: 4, reference: "Agosto/2026", period: "17/08 → 16/09", dueDate: "17/08/2026", amount: 270, status: "overdue", paidAmount: 0, paymentMethod: "", paidAt: "", receipt: false },
  { id: "fee-05", number: 5, reference: "Setembro/2026", period: "17/09 → 16/10", dueDate: "17/09/2026", amount: 270, status: "pending", paidAmount: 0, paymentMethod: "", paidAt: "", receipt: false },
  { id: "fee-06", number: 6, reference: "Outubro/2026", period: "17/10 → 16/11", dueDate: "17/10/2026", amount: 270, status: "upcoming", paidAmount: 0, paymentMethod: "", paidAt: "", receipt: false },
];

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <Badge display="inline-flex" alignItems="center" gap="6px" px="10px" py="5px" borderRadius="999px" bg={config.bg} color={config.fg} fontWeight="600" fontSize="10px">
      <Flex w="15px" h="15px" borderRadius="full" bg={config.fg} color="white" align="center" justify="center"><Icon size={9} /></Flex>
      {config.label}
    </Badge>
  );
}

export default function MonthlyFeesDetailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const receivedFee = location.state?.fee || {};
  const student = { ...defaultStudent, studentId: receivedFee.studentId || defaultStudent.studentId, name: receivedFee.name || defaultStudent.name, avatar: receivedFee.avatar || defaultStudent.avatar, contract: receivedFee.contract || defaultStudent.contract, monthlyAmount: receivedFee.amount || defaultStudent.monthlyAmount };
  const [installments, setInstallments] = useState(mockInstallments.map((item) => ({ ...item, amount: student.monthlyAmount, paidAmount: item.status === "paid" ? student.monthlyAmount : 0 })));
  const [selectedId, setSelectedId] = useState(receivedFee.reference === "2026-09" ? "fee-05" : "fee-01");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(String(student.monthlyAmount));
  const [paymentMethod, setPaymentMethod] = useState("Pix");

  const selected = installments.find((item) => item.id === selectedId) || installments[0];
  const totals = useMemo(() => {
    const total = installments.reduce((sum, item) => sum + item.amount, 0);
    const paid = installments.filter((item) => item.status === "paid");
    const pending = installments.filter((item) => item.status === "pending" || item.status === "upcoming");
    const overdue = installments.filter((item) => item.status === "overdue");
    return {
      total,
      totalCount: installments.length,
      paidValue: paid.reduce((sum, item) => sum + item.paidAmount, 0),
      paidCount: paid.length,
      pendingValue: pending.reduce((sum, item) => sum + item.amount, 0),
      pendingCount: pending.length,
      overdueValue: overdue.reduce((sum, item) => sum + item.amount, 0),
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
    const amount = Number(String(paymentAmount).replace(",", ".")) || selected.amount;
    setInstallments((current) => current.map((item) => item.id === selected.id ? { ...item, status: "paid", paidAmount: Math.min(amount, item.amount), paymentMethod, paidAt: "30/09/2026 às 19:30", receipt: true } : item));
    setPaymentOpen(false);
  };

  return (
    <VStack gap={3} align="stretch" width="100%" minWidth={0} bg="#f8faf9">
      <Button onClick={() => navigate(-1)} alignSelf="flex-start" variant="ghost" h="34px" px="4px" color="#174f4a" fontSize="12px" fontWeight="600" borderRadius="6px" _hover={{ bg: "transparent", color: "#003f36" }}><FiArrowLeft /> Voltar</Button>

      <Flex gap={3} align="stretch" direction={{ base: "column", xl: "row" }}>
        <Box flex="1" minW={0} bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">
          <Flex px={{ base: 3, md: 4 }} py={4} gap={4} justify="space-between" align={{ base: "flex-start", lg: "center" }} direction={{ base: "column", lg: "row" }}>
            <HStack gap={4} minW={0}>
              <Avatar.Root w={{ base: "64px", md: "76px" }} h={{ base: "64px", md: "76px" }} flexShrink={0}>
                <Avatar.Image src={student.avatar} />
                <Avatar.Fallback name={student.name} />
              </Avatar.Root>
              <Box minW={0}>
                <Heading fontSize={{ base: "19px", md: "23px" }} lineHeight="1.15" color="#063f39">{student.name}</Heading>
                <Text mt="5px" fontSize="12px" color="#60777c">MAT: {student.studentId}</Text>
                <Badge mt="8px" px="9px" py="4px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="10px"><FiCheck /> Aluno ativo</Badge>
              </Box>
            </HStack>

            <Flex w={{ base: "100%", lg: "430px" }} border="1px solid #e2e8e7" borderRadius="8px" overflow="hidden" direction={{ base: "column", sm: "row" }}>
              <Box flex="1" p={3}>
                <Text fontSize="10px" fontWeight="700" color="#174f4a">Contrato atual</Text>
                <Text mt="2px" fontSize="14px" fontWeight="800" color="#063f39">{student.contract}</Text>
                <Text mt="2px" fontSize="12px" color="#506a67">{student.periodicity} • {formatCurrency(student.monthlyAmount)} / mês</Text>
                <HStack mt="7px" gap="6px" wrap="wrap">
                  <Text fontSize="10px" color="#60777c">{student.contractStart} → {student.contractEnd}</Text>
                  <Badge px="7px" py="3px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="9px">Ativo</Badge>
                </HStack>
              </Box>
              <Flex p={3} minW={{ sm: "180px" }} borderLeft={{ base: "0", sm: "1px solid #e2e8e7" }} borderTop={{ base: "1px solid #e2e8e7", sm: "0" }} align="center" justify="center">
                <Button w="100%" h="36px" variant="outline" borderColor="#d6e0df" borderRadius="8px" color="#174f4a" bg="white" fontSize="11px" _hover={{ bg: "#f6faf9" }}><FiFileText /> Ver detalhes do contrato</Button>
              </Flex>
            </Flex>
          </Flex>

          <Flex px={{ base: 2, md: 3 }} borderTop="1px solid #e7eceb" borderBottom="1px solid #e7eceb" overflowX="auto" bg="#fff">
            {["Visão geral", "Contratos", "Mensalidades", "Pagamentos", "Histórico"].map((tab) => (
              <Button key={tab} flexShrink={0} h="44px" px="12px" variant="ghost" borderRadius="0" color={tab === "Mensalidades" ? "#063f39" : "#506a67"} fontSize="11px" fontWeight={tab === "Mensalidades" ? "700" : "500"} borderBottom={tab === "Mensalidades" ? "2px solid #063f39" : "2px solid transparent"} _hover={{ bg: "#f8fbfa" }}>{tab}</Button>
            ))}
          </Flex>

          <Box p={{ base: 3, md: 4 }}>
            <Heading fontSize="19px" color="#062f2b">Mensalidades</Heading>
            <Text mt="4px" fontSize="11px" color="#60777c">Veja todas as cobranças geradas a partir do contrato do aluno.</Text>

            <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3} mt={4}>
              {summaryCards.map((card) => { const Icon = card.icon; return (
                <Flex key={card.title} minH="96px" p={3} border="1px solid #e2e8e7" borderRadius="8px" bg={card.bg} align="flex-start" gap={3}>
                  <Flex display={{ base: "none", sm: "flex" }} w="34px" h="34px" borderRadius="full" bg={card.iconBg} color={card.fg} align="center" justify="center" flexShrink={0}><Icon size={17} /></Flex>
                  <Box minW={0}>
                    <Text fontSize="10px" color="#60777c">{card.title}</Text>
                    <Text mt="2px" fontSize="18px" fontWeight="800" color={card.fg}>{card.value}</Text>
                    <Text mt="5px" fontSize="10px" fontWeight="600" color="#174f4a">{card.detail}</Text>
                  </Box>
                </Flex>
              ); })}
            </SimpleGrid>

            <Box mt={4} border="1px solid #e2e8e7" borderRadius="8px" overflow="hidden">
              <Box display={{ base: "none", md: "block" }} overflowX="auto">
                <Table.Root size="sm" minW="820px">
                  <Table.Header bg="#f4f7f7"><Table.Row>
                    {[
                      ["Referência", "155px"], ["Período", "145px"], ["Vencimento", "135px"], ["Valor", "120px"], ["Status", "150px"], ["Ações", "125px"],
                    ].map(([label, width]) => <Table.ColumnHeader key={label} w={width} h="38px" borderColor="#e2e8e7" fontSize="10px" color="#174f4a" fontWeight="700">{label}</Table.ColumnHeader>)}
                  </Table.Row></Table.Header>
                  <Table.Body>
                    {installments.map((item) => (
                      <Table.Row key={item.id} h="61px" cursor="pointer" bg={selectedId === item.id ? "#f2faf7" : "white"} _hover={{ bg: "#f7fbfa" }} onClick={() => setSelectedId(item.id)}>
                        <Table.Cell borderColor="#e7eceb"><Text fontSize="11px" fontWeight="700" color="#174f4a">{item.reference}</Text><Text mt="2px" fontSize="9px" color="#71858a">{item.number}ª mensalidade</Text></Table.Cell>
                        <Table.Cell borderColor="#e7eceb" fontSize="10px" color="#174f4a">{item.period}</Table.Cell>
                        <Table.Cell borderColor="#e7eceb" fontSize="10px" color="#174f4a">{item.dueDate}</Table.Cell>
                        <Table.Cell borderColor="#e7eceb" fontSize="11px" fontWeight="700" color="#174f4a">{formatCurrency(item.amount)}</Table.Cell>
                        <Table.Cell borderColor="#e7eceb"><StatusBadge status={item.status} /></Table.Cell>
                        <Table.Cell borderColor="#e7eceb"><HStack gap="6px"><Button h="30px" px="10px" variant="outline" borderColor="#cfdcda" borderRadius="7px" color="#174f4a" bg="white" fontSize="10px" onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}><FiArrowRight /> Ver</Button><Button h="30px" minW="30px" w="30px" p="0" variant="ghost" color="#174f4a" onClick={(e) => e.stopPropagation()}><FiMoreVertical /></Button></HStack></Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>

              <VStack display={{ base: "flex", md: "none" }} align="stretch" gap={0}>
                {installments.map((item) => (
                  <Box key={item.id} p={3} borderBottom="1px solid #e7eceb" bg={selectedId === item.id ? "#f2faf7" : "white"} onClick={() => setSelectedId(item.id)}>
                    <Flex justify="space-between" align="flex-start" gap={3}>
                      <Box><Text fontSize="12px" fontWeight="700" color="#174f4a">{item.reference}</Text><Text mt="2px" fontSize="9px" color="#71858a">{item.number}ª mensalidade • {item.period}</Text></Box>
                      <Text fontSize="12px" fontWeight="800" color="#063f39">{formatCurrency(item.amount)}</Text>
                    </Flex>
                    <Flex mt={3} align="center" justify="space-between" gap={2}><StatusBadge status={item.status} /><Text fontSize="9px" color="#60777c">Venc. {item.dueDate}</Text></Flex>
                  </Box>
                ))}
              </VStack>
            </Box>

            <Text mt={3} fontSize="10px" color="#60777c">Mostrando todas as {installments.length} mensalidades deste contrato.</Text>
          </Box>
        </Box>

        <Box w={{ base: "100%", xl: "330px" }} flexShrink={0} bg="white" border="1px solid #d7e2df" borderRadius="8px" p={3}>
          <Flex align="flex-start" justify="space-between" gap={3}>
            <HStack align="flex-start" gap={3}>
              <Flex w="38px" h="38px" borderRadius="full" bg="#eef3f2" color="#174f4a" align="center" justify="center" flexShrink={0}><FiCalendar size={18} /></Flex>
              <Box><Heading fontSize="17px" color="#062f2b">Mensalidade</Heading><Text mt="3px" fontSize="14px" fontWeight="800" color="#174f4a">{selected.reference}</Text><Text mt="2px" fontSize="10px" color="#71858a">{selected.number}ª mensalidade</Text></Box>
            </HStack>
            <StatusBadge status={selected.status} />
          </Flex>

          <Box mt={4} p={3} borderRadius="8px" bg="#f3f6f5">
            <HStack gap="8px" align="flex-start"><FiInfo color="#60777c" /><Box><Text fontSize="10px" color="#60777c">Período da mensalidade</Text><Text mt="4px" fontSize="11px" color="#174f4a">{selected.period}</Text></Box></HStack>
          </Box>

          <VStack mt={3} align="stretch" gap={0}>
            {[
              ["Vencimento", selected.dueDate],
              ["Valor da mensalidade", formatCurrency(selected.amount)],
              ["Valor pago", formatCurrency(selected.paidAmount || 0)],
              ["Saldo em aberto", formatCurrency(Math.max(selected.amount - (selected.paidAmount || 0), 0))],
            ].map(([label, value]) => <Flex key={label} py="11px" justify="space-between" gap={3} borderBottom="1px solid #edf1f0"><Text fontSize="10px" color="#506a67">{label}</Text><Text textAlign="right" fontSize="10px" fontWeight="700" color="#173f3a">{value}</Text></Flex>)}
            <Flex py="11px" justify="space-between" gap={3} borderBottom="1px solid #edf1f0"><Text fontSize="10px" color="#506a67">Forma de pagamento</Text><Text textAlign="right" fontSize="10px" fontWeight="700" color="#173f3a">{selected.paymentMethod || "—"}</Text></Flex>
            <Flex py="11px" justify="space-between" gap={3} borderBottom="1px solid #edf1f0"><Text fontSize="10px" color="#506a67">Pago em</Text><Text textAlign="right" fontSize="10px" fontWeight="700" color="#173f3a">{selected.paidAt || "—"}</Text></Flex>
          </VStack>

          <Box mt={4} pt={3} borderTop="1px solid #e7eceb">
            <HStack gap="7px"><FiCheck color={selected.status === "paid" ? "#14833b" : "#71858a"} /><Text fontSize="10px" fontWeight="700" color="#174f4a">Pagamentos desta mensalidade</Text></HStack>
            {selected.status === "paid" ? (
              <Box mt={3} p={3} border="1px solid #e2e8e7" borderRadius="8px">
                <Flex justify="space-between" align="flex-start" gap={3}>
                  <HStack gap="9px"><Flex w="31px" h="31px" borderRadius="full" bg="#dff5e6" color="#14833b" align="center" justify="center"><FiCheck size={15} /></Flex><Box><Text fontSize="11px" fontWeight="800" color="#174f4a">{formatCurrency(selected.paidAmount)}</Text><Text mt="2px" fontSize="9px" color="#71858a">{selected.paymentMethod}</Text><Text mt="3px" fontSize="9px" color="#71858a">{selected.paidAt}</Text></Box></HStack>
                  <Button minW="28px" w="28px" h="28px" p="0" variant="ghost" color="#174f4a"><FiMoreVertical /></Button>
                </Flex>
                {selected.receipt && <Button mt={3} w="100%" h="32px" variant="outline" borderColor="#d6e0df" borderRadius="7px" color="#174f4a" fontSize="10px"><FiFileText /> Ver comprovante</Button>}
              </Box>
            ) : (
              <Box mt={3} p={3} border="1px dashed #cfdcda" borderRadius="8px" textAlign="center"><Text fontSize="10px" color="#71858a">Nenhum pagamento registrado nesta mensalidade.</Text></Box>
            )}
          </Box>

          <Button mt={4} w="100%" h="38px" bg="#003f36" color="white" borderRadius="7px" fontSize="10px" disabled={selected.status === "paid" || selected.status === "cancelled"} _hover={{ bg: "#00342d" }} onClick={() => { setPaymentAmount(String(Math.max(selected.amount - (selected.paidAmount || 0), 0))); setPaymentOpen(true); }}><FiPlus /> Registrar novo pagamento</Button>
        </Box>
      </Flex>

      <Dialog.Root open={paymentOpen} onOpenChange={(e) => setPaymentOpen(e.open)}>
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content maxW="430px" borderRadius="10px">
          <Dialog.Header><Dialog.Title color="#063f39" fontSize="17px">Registrar pagamento</Dialog.Title></Dialog.Header>
          <Dialog.Body>
            <VStack align="stretch" gap={3}>
              <Box p={3} bg="#f5f8f7" borderRadius="8px"><Text fontSize="10px" color="#71858a">Aluno</Text><Text mt="2px" fontSize="12px" fontWeight="700" color="#174f4a">{student.name}</Text><Text mt="6px" fontSize="10px" color="#71858a">Mensalidade</Text><Text mt="2px" fontSize="12px" fontWeight="700" color="#174f4a">{selected.reference} • {formatCurrency(selected.amount)}</Text></Box>
              <Box><Text mb="4px" fontSize="10px" color="#60777c">Valor recebido</Text><Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} h="38px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px" /></Box>
              <Box><Text mb="4px" fontSize="10px" color="#60777c">Forma de pagamento</Text><NativeSelect.Root><NativeSelect.Field value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} h="38px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
              <Box><Text mb="4px" fontSize="10px" color="#60777c">Data do pagamento</Text><Input type="date" defaultValue="2026-09-30" h="38px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px" /></Box>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer><Button variant="outline" borderColor="#d6e0df" color="#174f4a" onClick={() => setPaymentOpen(false)}>Cancelar</Button><Button bg="#003f36" color="white" _hover={{ bg: "#00342d" }} onClick={registerPayment}><FiCreditCard /> Registrar pagamento</Button></Dialog.Footer>
          <Dialog.CloseTrigger asChild><Button position="absolute" top="10px" right="10px" minW="30px" w="30px" h="30px" p="0" variant="ghost"><FiX /></Button></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>
    </VStack>
  );
}
