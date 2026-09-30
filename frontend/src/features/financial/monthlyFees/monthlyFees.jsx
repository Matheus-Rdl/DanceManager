import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Text,
  VStack,
  Table,
} from "@chakra-ui/react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiClock,
  FiSearch,
  FiAlertCircle,
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/* MOCK - depois será substituído pelos dados do backend */
const mockMonthlyFees = [
  {
    id: "fee-001",
    studentId: "000123",
    name: "João Pedro Silva",
    contract: "Balanço",
    activity: "Forró",
    amount: 270,
    dueDate: "17/09/2026",
    status: "paid",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    id: "fee-002",
    studentId: "000124",
    name: "Maria Silva",
    contract: "Raiz",
    activity: "Samba",
    amount: 190,
    dueDate: "05/09/2026",
    status: "overdue",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=47",
  },
  {
    id: "fee-003",
    studentId: "000125",
    name: "Carlos Santos",
    contract: "Imersão",
    activity: "Forró",
    amount: 320,
    dueDate: "02/09/2026",
    status: "paid",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=11",
  },
  {
    id: "fee-004",
    studentId: "000126",
    name: "Ana Souza",
    contract: "Beco",
    activity: "Sertanejo",
    amount: 430,
    dueDate: "20/09/2026",
    status: "pending",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=44",
  },
  {
    id: "fee-005",
    studentId: "000127",
    name: "Lucas Ferreira",
    contract: "Balanço",
    activity: "Samba",
    amount: 270,
    dueDate: "28/09/2026",
    status: "paid",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=13",
  },
  {
    id: "fee-006",
    studentId: "000128",
    name: "Beatriz Lima",
    contract: "Imersão",
    activity: "Forró",
    amount: 320,
    dueDate: "15/09/2026",
    status: "paid",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=45",
  },
  {
    id: "fee-007",
    studentId: "000129",
    name: "Rafael Costa",
    contract: "Raiz",
    activity: "Sertanejo",
    amount: 190,
    dueDate: "10/09/2026",
    status: "overdue",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=15",
  },
  {
    id: "fee-008",
    studentId: "000130",
    name: "Gabriela Oliveira",
    contract: "Balanço",
    activity: "Forró",
    amount: 270,
    dueDate: "12/09/2026",
    status: "paid",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=48",
  },
  {
    id: "fee-009",
    studentId: "000131",
    name: "Pedro Henrique",
    contract: "Beco",
    activity: "Samba",
    amount: 430,
    dueDate: "08/09/2026",
    status: "overdue",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=14",
  },
  {
    id: "fee-010",
    studentId: "000132",
    name: "Juliana Martins",
    contract: "Raiz",
    activity: "Forró",
    amount: 190,
    dueDate: "22/09/2026",
    status: "paid",
    reference: "2026-09",
    avatar: "https://i.pravatar.cc/80?img=49",
  },

  /* Agosto */
  {
    id: "fee-011",
    studentId: "000123",
    name: "João Pedro Silva",
    contract: "Balanço",
    activity: "Forró",
    amount: 270,
    dueDate: "17/08/2026",
    status: "paid",
    reference: "2026-08",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    id: "fee-012",
    studentId: "000124",
    name: "Maria Silva",
    contract: "Raiz",
    activity: "Samba",
    amount: 190,
    dueDate: "05/08/2026",
    status: "paid",
    reference: "2026-08",
    avatar: "https://i.pravatar.cc/80?img=47",
  },

  /* Outubro */
  {
    id: "fee-013",
    studentId: "000123",
    name: "João Pedro Silva",
    contract: "Balanço",
    activity: "Forró",
    amount: 270,
    dueDate: "17/10/2026",
    status: "pending",
    reference: "2026-10",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    id: "fee-014",
    studentId: "000124",
    name: "Maria Silva",
    contract: "Raiz",
    activity: "Samba",
    amount: 190,
    dueDate: "05/10/2026",
    status: "pending",
    reference: "2026-10",
    avatar: "https://i.pravatar.cc/80?img=47",
  },
  {
    id: "fee-015",
    studentId: "000125",
    name: "Carlos Santos",
    contract: "Imersão",
    activity: "Forró",
    amount: 320,
    dueDate: "02/10/2026",
    status: "pending",
    reference: "2026-10",
    avatar: "https://i.pravatar.cc/80?img=11",
  },
];

const statusConfig = {
  paid: {
    label: "Pago",
    fg: "#14833b",
    bg: "#dff5e6",
    icon: FiCheck,
  },
  pending: {
    label: "Pendente",
    fg: "#d98900",
    bg: "#fff2d8",
    icon: FiClock,
  },
  overdue: {
    label: "Em atraso",
    fg: "#d9343a",
    bg: "#ffe2e3",
    icon: FiAlertCircle,
  },
};

const contractConfig = {
  Balanço: { fg: "#08715c", bg: "#d8f2eb" },
  Raiz: { fg: "#5947c7", bg: "#e8e3ff" },
  Imersão: { fg: "#0865c6", bg: "#dcecff" },
  Beco: { fg: "#7b461c", bg: "#eee2d6" },
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatReference = (reference) => {
  const [year, month] = reference.split("-").map(Number);

  const text = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const changeReference = (reference, amount) => {
  const [year, month] = reference.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
};

export default function MonthlyFees() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [reference, setReference] = useState("2026-09");
  const [mobileSearchMode, setMobileSearchMode] = useState(false);

  const monthlyFees = useMemo(
    () => mockMonthlyFees.filter((fee) => fee.reference === reference),
    [reference]
  );

  const activities = useMemo(
    () => [...new Set(monthlyFees.map((fee) => fee.activity))].sort(),
    [monthlyFees]
  );

  const filteredMonthlyFees = useMemo(() => {
    const q = search.toLowerCase().trim();

    return monthlyFees.filter((fee) => {
      const matchesSearch =
        !q ||
        fee.name.toLowerCase().includes(q) ||
        fee.studentId.includes(q) ||
        fee.contract.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || fee.status === statusFilter;

      const matchesActivity =
        activityFilter === "all" || fee.activity === activityFilter;

      return matchesSearch && matchesStatus && matchesActivity;
    });
  }, [monthlyFees, search, statusFilter, activityFilter]);

  const totals = useMemo(() => {
    const expected = monthlyFees.reduce((sum, fee) => sum + fee.amount, 0);

    const receivedFees = monthlyFees.filter(
      (fee) => fee.status === "paid"
    );

    const openFees = monthlyFees.filter(
      (fee) => fee.status === "pending" || fee.status === "overdue"
    );

    const overdueFees = monthlyFees.filter(
      (fee) => fee.status === "overdue"
    );

    return {
      expected,
      expectedCount: monthlyFees.length,

      received: receivedFees.reduce(
        (sum, fee) => sum + fee.amount,
        0
      ),
      receivedCount: receivedFees.length,

      open: openFees.reduce(
        (sum, fee) => sum + fee.amount,
        0
      ),
      openCount: openFees.length,

      overdue: overdueFees.reduce(
        (sum, fee) => sum + fee.amount,
        0
      ),
      overdueCount: overdueFees.length,

      pendingCount: monthlyFees.filter(
        (fee) => fee.status === "pending"
      ).length,
    };
  }, [monthlyFees]);

  const summaryCards = [
    {
      title: "Previsto no período",
      value: formatCurrency(totals.expected),
      detail: `${totals.expectedCount} mensalidades`,
      icon: FiDollarSign,
      fg: "#006a54",
      bg: "#f1fbf8",
      border: "#c6e8df",
    },
    {
      title: "Recebido",
      value: formatCurrency(totals.received),
      detail: `${totals.receivedCount} mensalidades`,
      icon: FiCheck,
      fg: "#10923f",
      bg: "#f1fbf7",
      border: "#c6e8df",
    },
    {
      title: "Em aberto",
      value: formatCurrency(totals.open),
      detail: `${totals.openCount} mensalidades`,
      icon: FiClock,
      fg: "#d98900",
      bg: "#fffaf0",
      border: "#f3dfb2",
    },
    {
      title: "Em atraso",
      value: formatCurrency(totals.overdue),
      detail: `${totals.overdueCount} mensalidades`,
      icon: FiAlertCircle,
      fg: "#e33237",
      bg: "#fff4f4",
      border: "#f3cdcf",
    },
  ];

  const hasFilters =
    search || statusFilter !== "all" || activityFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setActivityFilter("all");
    setPage(1);
  };

  const changeMonth = (amount) => {
    setReference((current) => changeReference(current, amount));
    setPage(1);
  };

const handleView = (fee) => {
  navigate("/mensalidade/aluno", {
    state: {
      fee,
    },
  });
};

  return (
    <VStack
      gap={3}
      align="stretch"
      width="100%"
      minWidth={0}
      bg="#f8faf9"
    >
      {/* Cabeçalho */}
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        gap={3}
        wrap="wrap"
      >
        <Flex align="center" gap={3}>
          <Flex
            w="48px"
            h="48px"
            borderRadius="full"
            bg="#0b6b5b"
            color="white"
            align="center"
            justify="center"
            flexShrink={0}
          >
            <FiCalendar size={24} />
          </Flex>

          <Box>
            <Heading
              as="h1"
              fontSize={{ base: "22px", md: "26px" }}
              fontWeight="700"
              lineHeight="1.1"
              color="#062f2b"
            >
              Mensalidades
            </Heading>

            <Text
              mt="4px"
              fontSize="12px"
              color="#5e7471"
            >
              Acompanhe as mensalidades e os recebimentos dos alunos.
            </Text>
          </Box>
        </Flex>

        {totals.overdueCount > 0 && (
          <Badge
            display={{ base: "none", md: "inline-flex" }}
            alignItems="center"
            gap="6px"
            px="12px"
            py="7px"
            borderRadius="999px"
            bg="#fff0f0"
            color="#c72e34"
            fontSize="11px"
            fontWeight="600"
          >
            <FiAlertCircle size={14} />
            {totals.overdueCount}{" "}
            {totals.overdueCount === 1
              ? "mensalidade em atraso"
              : "mensalidades em atraso"}
          </Badge>
        )}
      </Flex>

      {/* Navegação da competência */}
      <Flex
        bg="white"
        border="1px solid #d7e2df"
        borderRadius="8px"
        px={{ base: 2, md: 3 }}
        py="9px"
        align="center"
        justify="space-between"
        gap={2}
      >
        <Button
          onClick={() => changeMonth(-1)}
          variant="ghost"
          h="34px"
          px={{ base: 2, md: 3 }}
          color="#174f4a"
          fontSize="12px"
          borderRadius="8px"
          _hover={{ bg: "#f2f7f6" }}
        >
          <FiChevronLeft size={17} />
          <Text display={{ base: "none", sm: "block" }}>
            Mês anterior
          </Text>
        </Button>

        <Flex
          align="center"
          justify="center"
          gap={2}
          minW={0}
        >
          <FiCalendar color="#0b6b5b" />

          <Box textAlign="center">
            <Text
              fontSize={{ base: "13px", md: "14px" }}
              fontWeight="700"
              color="#063f39"
            >
              {formatReference(reference)}
            </Text>

            <Text
              display={{ base: "none", md: "block" }}
              fontSize="10px"
              color="#71858a"
            >
              Competência selecionada
            </Text>
          </Box>
        </Flex>

        <Button
          onClick={() => changeMonth(1)}
          variant="ghost"
          h="34px"
          px={{ base: 2, md: 3 }}
          color="#174f4a"
          fontSize="12px"
          borderRadius="8px"
          _hover={{ bg: "#f2f7f6" }}
        >
          <Text display={{ base: "none", sm: "block" }}>
            Próximo mês
          </Text>
          <FiChevronRight size={17} />
        </Button>
      </Flex>

      {/* Cards */}
      <Box
        display={{
          base: mobileSearchMode ? "none" : "block",
          md: "block",
        }}
      >
        <SimpleGrid
          columns={{ base: 2, xl: 4 }}
          gap={3}
        >
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <Flex
                key={card.title}
                p={{ base: 3, md: 3 }}
                minH={{ base: "112px", md: "105px" }}
                border="1px solid"
                borderColor={card.border}
                borderRadius="8px"
                bg={card.bg}
                align="flex-start"
                gap={{ base: 2, md: 3 }}
              >
                <Flex
                  display={{ base: "none", sm: "flex" }}
                  mt="1px"
                  w="36px"
                  h="36px"
                  flex="0 0 36px"
                  borderRadius="full"
                  bg={card.fg}
                  color="white"
                  align="center"
                  justify="center"
                >
                  <Icon size={18} />
                </Flex>

                <Box minW={0}>
                  <Text
                    color={card.fg}
                    fontSize={{ base: "11px", md: "13px" }}
                    fontWeight="600"
                  >
                    {card.title}
                  </Text>

                  <Text
                    mt="3px"
                    color={
                      card.title === "Em atraso"
                        ? "#b01218"
                        : card.title === "Em aberto"
                        ? "#754700"
                        : "#073f39"
                    }
                    fontSize={{ base: "16px", md: "19px" }}
                    lineHeight="1.2"
                    fontWeight="800"
                  >
                    {card.value}
                  </Text>

                  <Text
                    mt="5px"
                    color="#60777c"
                    fontSize="10px"
                  >
                    {card.detail}
                  </Text>
                </Box>
              </Flex>
            );
          })}
        </SimpleGrid>
      </Box>

      {/* Painel da listagem */}
      <Box
        bg="white"
        border="1px solid #d7e2df"
        borderRadius="8px"
        overflow="hidden"
      >
        {/* Busca e filtros */}
        <Flex
          p={3}
          gap={2}
          align="end"
          wrap="wrap"
          borderBottom="1px solid"
          borderColor="#e9efee"
        >
          <Flex
            flex="1"
            minW={{ base: "100%", md: "280px" }}
            gap={2}
            align="center"
          >
            <Button
              display={{
                base: mobileSearchMode ? "flex" : "none",
                md: "none",
              }}
              onClick={() => {
                setMobileSearchMode(false);
                setSearch("");
              }}
              minW="36px"
              w="36px"
              h="36px"
              p="0"
              variant="outline"
              borderColor="#d6e0df"
              borderRadius="8px"
              color="#174f4a"
              bg="white"
              aria-label="Voltar"
            >
              <FiArrowLeft />
            </Button>

            <Box position="relative" flex="1">
              <Box
                position="absolute"
                left="14px"
                top="50%"
                transform="translateY(-50%)"
                color="#174f4a"
                zIndex="1"
              >
                <FiSearch size={18} />
              </Box>

              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                onFocus={() => setMobileSearchMode(true)}
                placeholder="Buscar aluno ou matrícula..."
                h="36px"
                pl="42px"
                borderColor="#d6e0df"
                borderRadius="8px"
                fontSize="12px"
                _focus={{
                  borderColor: "#8ab6ad",
                  boxShadow: "0 0 0 1px #8ab6ad",
                }}
              />
            </Box>
          </Flex>

          <Box
            w={{ base: "calc(50% - 4px)", md: "180px" }}
          >
            <Text
              mb="4px"
              fontSize="11px"
              color="#617980"
            >
              Status
            </Text>

            <NativeSelect.Root w="100%">
              <NativeSelect.Field
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                h="36px"
                borderColor="#d8e1e0"
                borderRadius="8px"
                fontSize="12px"
                color="#173f3a"
              >
                <option value="all">Todos</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="overdue">Em atraso</option>
              </NativeSelect.Field>

              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Box
            w={{ base: "calc(50% - 4px)", md: "180px" }}
          >
            <Text
              mb="4px"
              fontSize="11px"
              color="#617980"
            >
              Atividade
            </Text>

            <NativeSelect.Root w="100%">
              <NativeSelect.Field
                value={activityFilter}
                onChange={(e) => {
                  setActivityFilter(e.target.value);
                  setPage(1);
                }}
                h="36px"
                borderColor="#d8e1e0"
                borderRadius="8px"
                fontSize="12px"
                color="#173f3a"
              >
                <option value="all">Todas</option>

                {activities.map((activity) => (
                  <option
                    key={activity}
                    value={activity}
                  >
                    {activity}
                  </option>
                ))}
              </NativeSelect.Field>

              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          {hasFilters && (
            <Button
              onClick={clearFilters}
              h="36px"
              px="12px"
              variant="ghost"
              color="#607873"
              fontSize="11px"
              borderRadius="8px"
              _hover={{ bg: "#f5f8f7" }}
            >
              <FiX />
              Limpar
            </Button>
          )}
        </Flex>

        {/* Resumo do período */}
        <Flex
          px={3}
          py="10px"
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          gap={2}
          wrap="wrap"
          bg="#fbfcfc"
          borderBottom="1px solid"
          borderColor="#e9efee"
        >
          <Box>
            <Heading
              fontSize="15px"
              fontWeight="700"
              color="#062f2b"
            >
              Mensalidades de {formatReference(reference)}
            </Heading>

            <Text
              mt="2px"
              fontSize="11px"
              color="#71858a"
            >
              {totals.expectedCount} mensalidades •{" "}
              {totals.receivedCount} pagas •{" "}
              {totals.pendingCount} pendentes •{" "}
              {totals.overdueCount} em atraso
            </Text>
          </Box>

          <Text
            fontSize="11px"
            color="#607873"
          >
            {filteredMonthlyFees.length}{" "}
            {filteredMonthlyFees.length === 1
              ? "resultado"
              : "resultados"}
          </Text>
        </Flex>

        {/* DESKTOP */}
        <Box display={{ base: "none", md: "block" }}>
          <Box overflowX="auto">
            <Table.Root
              size="sm"
              variant="line"
              minW="850px"
            >
              <Table.Header bg="#f4f7f7">
                <Table.Row>
                  {[
                    "Aluno",
                    "Contrato",
                    "Vencimento",
                    "Valor",
                    "Status",
                    "Ações",
                  ].map((header) => (
                    <Table.ColumnHeader
                      key={header}
                      h="37px"
                      color="#174f4a"
                      fontSize="11px"
                      fontWeight="600"
                      borderColor="#e2e8e7"
                    >
                      {header}
                    </Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filteredMonthlyFees.map((fee) => {
                  const status = statusConfig[fee.status];
                  const contract =
                    contractConfig[fee.contract] ||
                    contractConfig.Balanço;
                  const StatusIcon = status.icon;

                  return (
                    <Table.Row
                      key={fee.id}
                      h="62px"
                      cursor="pointer"
                      transition="background .15s ease"
                      _hover={{ bg: "#f8fbfa" }}
                      onClick={() => handleView(fee)}
                    >
                      <Table.Cell borderColor="#e7eceb">
                        <HStack gap="11px">
                          <Avatar.Root size="sm">
                            <Avatar.Image src={fee.avatar} />
                            <Avatar.Fallback name={fee.name} />
                          </Avatar.Root>

                          <Box>
                            <Text
                              fontWeight="700"
                              fontSize="12px"
                              color="#164c47"
                            >
                              {fee.name}
                            </Text>

                            <Text
                              mt="2px"
                              fontSize="10px"
                              color="#71858a"
                            >
                              MAT: {fee.studentId} • {fee.activity}
                            </Text>
                          </Box>
                        </HStack>
                      </Table.Cell>

                      <Table.Cell borderColor="#e7eceb">
                        <Badge
                          px="11px"
                          py="4px"
                          borderRadius="999px"
                          bg={contract.bg}
                          color={contract.fg}
                          fontWeight="500"
                          fontSize="11px"
                        >
                          {fee.contract}
                        </Badge>
                      </Table.Cell>

                      <Table.Cell
                        borderColor="#e7eceb"
                        fontSize="11px"
                        color="#174f4a"
                      >
                        {fee.dueDate}
                      </Table.Cell>

                      <Table.Cell
                        borderColor="#e7eceb"
                        fontSize="12px"
                        fontWeight="600"
                        color="#174f4a"
                      >
                        {formatCurrency(fee.amount)}
                      </Table.Cell>

                      <Table.Cell borderColor="#e7eceb">
                        <Badge
                          display="inline-flex"
                          alignItems="center"
                          gap="6px"
                          px="10px"
                          py="5px"
                          borderRadius="999px"
                          bg={status.bg}
                          color={status.fg}
                          fontWeight="500"
                          fontSize="10px"
                        >
                          <Flex
                            w="15px"
                            h="15px"
                            borderRadius="full"
                            bg={status.fg}
                            color="white"
                            align="center"
                            justify="center"
                          >
                            <StatusIcon size={9} />
                          </Flex>

                          {status.label}
                        </Badge>
                      </Table.Cell>

                      <Table.Cell borderColor="#e7eceb">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(fee);
                          }}
                          h="32px"
                          minW="70px"
                          px="11px"
                          variant="outline"
                          borderColor="#d6e0df"
                          borderRadius="8px"
                          color="#174f4a"
                          fontSize="11px"
                          bg="white"
                          _hover={{ bg: "#f6faf9" }}
                        >
                          <FiArrowRight size={14} />
                          Ver
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>

        {/* MOBILE */}
        <VStack
          display={{ base: "flex", md: "none" }}
          align="stretch"
          gap={0}
        >
          {filteredMonthlyFees.map((fee) => {
            const status = statusConfig[fee.status];
            const contract =
              contractConfig[fee.contract] ||
              contractConfig.Balanço;
            const StatusIcon = status.icon;

            return (
              <Box
                key={fee.id}
                px={3}
                py={3}
                borderBottom="1px solid #e7eceb"
                cursor="pointer"
                onClick={() => handleView(fee)}
                _active={{ bg: "#f6faf9" }}
              >
                <Flex
                  justify="space-between"
                  align="flex-start"
                  gap={3}
                >
                  <HStack gap="10px" minW={0}>
                    <Avatar.Root size="sm" flexShrink={0}>
                      <Avatar.Image src={fee.avatar} />
                      <Avatar.Fallback name={fee.name} />
                    </Avatar.Root>

                    <Box minW={0}>
                      <Text
                        fontWeight="700"
                        fontSize="12px"
                        color="#164c47"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                      >
                        {fee.name}
                      </Text>

                      <Text
                        mt="2px"
                        fontSize="10px"
                        color="#71858a"
                      >
                        MAT: {fee.studentId}
                      </Text>
                    </Box>
                  </HStack>

                  <Text
                    fontSize="13px"
                    fontWeight="800"
                    color="#073f39"
                    flexShrink={0}
                  >
                    {formatCurrency(fee.amount)}
                  </Text>
                </Flex>

                <Flex
                  mt={3}
                  align="center"
                  justify="space-between"
                  gap={2}
                  wrap="wrap"
                >
                  <HStack gap="6px" wrap="wrap">
                    <Badge
                      px="9px"
                      py="3px"
                      borderRadius="999px"
                      bg={contract.bg}
                      color={contract.fg}
                      fontWeight="500"
                      fontSize="9px"
                    >
                      {fee.contract}
                    </Badge>

                    <Badge
                      display="inline-flex"
                      alignItems="center"
                      gap="4px"
                      px="8px"
                      py="3px"
                      borderRadius="999px"
                      bg={status.bg}
                      color={status.fg}
                      fontWeight="500"
                      fontSize="9px"
                    >
                      <StatusIcon size={9} />
                      {status.label}
                    </Badge>
                  </HStack>

                  <Text
                    fontSize="10px"
                    color="#607873"
                  >
                    Venc. {fee.dueDate}
                  </Text>
                </Flex>

                <Flex
                  mt="9px"
                  justify="space-between"
                  align="center"
                >
                  <Text
                    fontSize="10px"
                    color="#71858a"
                  >
                    {fee.activity}
                  </Text>

                  <Flex
                    align="center"
                    gap="4px"
                    fontSize="10px"
                    fontWeight="600"
                    color="#0b6b5b"
                  >
                    Ver detalhes
                    <FiArrowRight size={12} />
                  </Flex>
                </Flex>
              </Box>
            );
          })}
        </VStack>

        {/* Vazio */}
        {filteredMonthlyFees.length === 0 && (
          <Box
            py="55px"
            px={4}
            textAlign="center"
          >
            <Flex
              mx="auto"
              mb={3}
              w="42px"
              h="42px"
              borderRadius="full"
              bg="#eef5f3"
              color="#52756f"
              align="center"
              justify="center"
            >
              <FiCalendar size={20} />
            </Flex>

            <Text
              fontWeight="700"
              color="#174f4a"
            >
              Nenhuma mensalidade encontrada
            </Text>

            <Text
              mt="4px"
              color="#71858a"
              fontSize="11px"
            >
              Não há mensalidades para os filtros selecionados.
            </Text>

            {hasFilters && (
              <Button
                mt={3}
                onClick={clearFilters}
                size="sm"
                variant="outline"
                borderColor="#d6e0df"
                color="#174f4a"
                fontSize="11px"
              >
                Limpar filtros
              </Button>
            )}
          </Box>
        )}
      </Box>
    </VStack>
  );
}