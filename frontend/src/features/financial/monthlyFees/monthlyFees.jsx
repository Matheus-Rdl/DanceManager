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

  Stack,

  VStack,

  Table,

  Text,

} from "@chakra-ui/react";

import {

  FiArrowLeft,

  FiArrowRight,

  FiCalendar,

  FiCheck,

  FiClock,

  FiPlus,

  FiSearch,

  FiAlertCircle,

} from "react-icons/fi";






const mockStudents = [

  { id: "000123", name: "João Pedro Silva", contract: "Balanço", amount: 270, dueDate: "17/10/2026", status: "paid", avatar: "https\://i.pravatar.cc/80?img=12" },

  { id: "000124", name: "Maria Silva", contract: "Raiz", amount: 190, dueDate: "05/10/2026", status: "pending", avatar: "https\://i.pravatar.cc/80?img=47" },

  { id: "000125", name: "Carlos Santos", contract: "Imersão", amount: 320, dueDate: "02/10/2026", status: "overdue", avatar: "https\://i.pravatar.cc/80?img=11" },

  { id: "000126", name: "Ana Souza", contract: "Beco", amount: 430, dueDate: "20/10/2026", status: "pending", avatar: "https\://i.pravatar.cc/80?img=44" },

  { id: "000127", name: "Lucas Ferreira", contract: "Balanço", amount: 270, dueDate: "28/09/2026", status: "paid", avatar: "https\://i.pravatar.cc/80?img=13" },

  { id: "000128", name: "Beatriz Lima", contract: "Imersão", amount: 320, dueDate: "15/10/2026", status: "no_contract", avatar: "https\://i.pravatar.cc/80?img=45" },

  { id: "000129", name: "Rafael Costa", contract: "Raiz", amount: 190, dueDate: "10/10/2026", status: "pending", avatar: "https\://i.pravatar.cc/80?img=15" },

  { id: "000130", name: "Gabriela Oliveira", contract: "Balanço", amount: 270, dueDate: "12/10/2026", status: "paid", avatar: "https\://i.pravatar.cc/80?img=48" },

  { id: "000131", name: "Pedro Henrique", contract: "Beco", amount: 430, dueDate: "08/10/2026", status: "overdue", avatar: "https\://i.pravatar.cc/80?img=14" },

  { id: "000132", name: "Juliana Martins", contract: "Raiz", amount: 190, dueDate: "22/10/2026", status: "pending", avatar: "https\://i.pravatar.cc/80?img=49" },

];



const statusConfig = {

  paid: { label: "Pago", fg: "#14833b", bg: "#dff5e6", icon: FiCheck },

  pending: { label: "Pendente", fg: "#e69a00", bg: "#fff2d8", icon: FiClock },

  overdue: { label: "Atrasado", fg: "#d9343a", bg: "#ffe2e3", icon: FiAlertCircle },

  no_contract: { label: "Sem contrato", fg: "#718096", bg: "#edf1f2", icon: FiAlertCircle },

};



const contractConfig = {

  "Balanço": { fg: "#08715c", bg: "#d8f2eb" },

  Raiz: { fg: "#5947c7", bg: "#e8e3ff" },

  "Imersão": { fg: "#0865c6", bg: "#dcecff" },

  Beco: { fg: "#7b461c", bg: "#eee2d6" },

};

export default function MonthlyFees() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filteredStudents = useMemo(() => mockStudents.filter((student) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || student.name.toLowerCase().includes(q) || student.id.includes(q) || student.contract.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    return matchesSearch && matchesStatus && (periodFilter === "all" || periodFilter === "current_month");
  }), [search, statusFilter, periodFilter]);

  const summaryCards = [
    { title: "A receber", value: "R$ 4.320", detail: "12 mensalidades", icon: FiArrowRight, fg: "#006a54", bg: "#f1fbf8", border: "#c6e8df" },
    { title: "Recebido", value: "R$ 3.240", detail: "9 mensalidades", icon: FiCheck, fg: "#10923f", bg: "#f1fbf7", border: "#c6e8df" },
    { title: "Pendente", value: "R$ 810", detail: "3 mensalidades", icon: FiClock, fg: "#eea000", bg: "#fffaf0", border: "#f3dfb2" },
    { title: "Atrasado", value: "R$ 270", detail: "1 mensalidade", icon: FiAlertCircle, fg: "#e33237", bg: "#fff4f4", border: "#f3cdcf" },
  ];

  return (
    <VStack gap={3} align="stretch" width="100%" minWidth={0} bg="#f8faf9">
      {/* Cabeçalho */}
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
        <Flex align="center" gap={3}>
          <Flex w="48px" h="48px" borderRadius="full" bg="#0b6b5b" color="white" align="center" justify="center" flexShrink={0}>
            <FiCalendar size={24} />
          </Flex>
          <Box>
            <Heading as="h1" fontSize={{ base: "22px", md: "26px" }} fontWeight="700" lineHeight="1.1" color="#062f2b">Mensalidades</Heading>
            <Box mt="4px" fontSize="12px" color="#5e7471">Gerencie as mensalidades dos seus alunos.</Box>
          </Box>
        </Flex>
      </Flex>

      {/* Painel principal */}
      <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="visible">
        {/* Busca e filtros */}
        <Flex p={3} gap={2} align="end" wrap="wrap" borderBottom="1px solid" borderColor="#e9efee">
          <Box flex="1" minW={{ base: "100%", md: "280px" }}>
            <Box position="relative">
              <Box position="absolute" left="16px" top="50%" transform="translateY(-50%)" color="#174f4a" zIndex="1">
                <FiSearch size={21} />
              </Box>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aluno..." h="36px" pl="46px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px" _focus={{ borderColor: "#8ab6ad", boxShadow: "0 0 0 1px #8ab6ad" }} />
            </Box>
          </Box>

          <Box w={{ base: "100%", md: "220px" }}>
            <Text mb="4px" fontSize="12px" color="#617980">Status</Text>
            <NativeSelect.Root w="100%">
              <NativeSelect.Field value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px" color="#173f3a">
                <option value="all">Todos</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="overdue">Atrasado</option>
                <option value="no_contract">Sem contrato</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Box w={{ base: "100%", md: "220px" }}>
            <Text mb="4px" fontSize="12px" color="#617980">Período</Text>
            <NativeSelect.Root w="100%">
              <NativeSelect.Field value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px" color="#173f3a">
                <option value="all">Todos</option>
                <option value="current_month">Este mês</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>
        </Flex>

        {/* Cards */}
        <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={3} p={3}>
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Flex key={card.title} p={3} border="1px solid" borderColor={card.border} borderRadius="8px" bg={card.bg} align="flex-start" gap={3}>
                <Flex mt="1px" w="36px" h="36px" flex="0 0 36px" borderRadius="full" bg={card.fg} color="white" align="center" justify="center">
                  <Icon size={18} />
                </Flex>
                <Box>
                  <Text color={card.fg} fontSize="13px" fontWeight="600">{card.title}</Text>
                  <Text mt="2px" color={card.title === "Pendente" ? "#6d350b" : card.title === "Atrasado" ? "#b01218" : "#073f39"} fontSize="19px" lineHeight="1.2" fontWeight="800">{card.value}</Text>
                  <Text mt="4px" color="#60777c" fontSize="11px">{card.detail}</Text>
                </Box>
              </Flex>
            );
          })}
        </SimpleGrid>

        {/* Título da tabela */}
        <Flex px={3} pb={3} justify="space-between" align="center">
          <Heading fontSize="16px" fontWeight="700" color="#062f2b">Alunos</Heading>
          <Text color="#607873" fontSize="13px">{filteredStudents.length} alunos</Text>
        </Flex>

        {/* Tabela */}
        <Box mx={3} mb={3} border="1px solid" borderColor="#e2e8e7" borderRadius="8px" overflow="hidden">
          <Box overflowX="auto">
            <Table.Root size="sm" variant="line" minW="940px">
              <Table.Header bg="#f4f7f7">
                <Table.Row>
                  {["Aluno", "Contrato atual", "Vencimento", "Valor", "Status", "Ações"].map((h) => (
                    <Table.ColumnHeader key={h} h="37px" color="#174f4a" fontSize="12px" fontWeight="600" borderColor="#e2e8e7">{h}</Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredStudents.slice(0, 7).map((student) => {
                  const status = statusConfig[student.status];
                  const contract = contractConfig[student.contract] || contractConfig["Balanço"];
                  const StatusIcon = status.icon;
                  return (
                    <Table.Row key={student.id} h="64px" _hover={{ bg: "#fbfdfc" }}>
                      <Table.Cell borderColor="#e7eceb">
                        <HStack gap="12px">
                          <Avatar.Root size="sm">
                            <Avatar.Image src={student.avatar} />
                            <Avatar.Fallback name={student.name} />
                          </Avatar.Root>
                          <Box>
                            <Text fontWeight="700" fontSize="13px" color="#164c47">{student.name}</Text>
                            <Text mt="2px" fontSize="11px" color="#71858a">MAT: {student.id}</Text>
                          </Box>
                        </HStack>
                      </Table.Cell>
                      <Table.Cell borderColor="#e7eceb">
                        <Badge px="13px" py="4px" borderRadius="999px" bg={contract.bg} color={contract.fg} fontWeight="500" fontSize="12px">{student.contract}</Badge>
                      </Table.Cell>
                      <Table.Cell borderColor="#e7eceb" fontSize="12px" color="#174f4a">{student.dueDate}</Table.Cell>
                      <Table.Cell borderColor="#e7eceb" fontSize="12px" color="#174f4a">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(student.amount)}
                      </Table.Cell>
                      <Table.Cell borderColor="#e7eceb">
                        <Badge display="inline-flex" alignItems="center" gap="6px" px="11px" py="5px" borderRadius="999px" bg={status.bg} color={status.fg} fontWeight="500" fontSize="11px">
                          <Flex w="15px" h="15px" borderRadius="full" bg={status.fg} color="white" align="center" justify="center"><StatusIcon size={10} /></Flex>
                          {status.label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell borderColor="#e7eceb">
                        <Button h="34px" minW="74px" px="12px" variant="outline" borderColor="#d6e0df" borderRadius="8px" color="#174f4a" fontSize="12px" bg="white" _hover={{ bg: "#f6faf9" }}>
                          <FiArrowRight size={16} /> Ver
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>

          {filteredStudents.length === 0 && (
            <Box py="50px" textAlign="center">
              <Text fontWeight="700">Nenhum aluno encontrado.</Text>
              <Text mt="4px" color="#71858a" fontSize="sm">Tente alterar os filtros ou a busca.</Text>
            </Box>
          )}

          {/* Paginação diretamente no frontend */}
          <Flex px={3} py="10px" align="center" justify="space-between" borderTop="1px solid" borderColor="#e7eceb">
            <Text fontSize="12px" color="#627a80">Mostrando 1–{Math.min(7, filteredStudents.length)} de {filteredStudents.length} alunos</Text>
            <HStack gap="6px">
              <Button onClick={() => setPage((prev) => Math.max(1, prev - 1))} minW="34px" w="34px" h="34px" p="0" variant="outline" borderColor="#d8e1e0" borderRadius="8px" bg="white" color="#174f4a" _hover={{ bg: "#f6faf9" }}>
                <FiArrowLeft />
              </Button>
              {[1, 2, 3, 4].map((n) => (
                <Button key={n} onClick={() => setPage(n)} minW="34px" w="34px" h="34px" p="0" variant="outline" borderColor="#d8e1e0" borderRadius="8px" bg={page === n ? "#003f36" : "white"} color={page === n ? "white" : "#174f4a"} _hover={{ bg: page === n ? "#00342d" : "#f6faf9" }}>{n}</Button>
              ))}
              <Button onClick={() => setPage((prev) => Math.min(4, prev + 1))} minW="34px" w="34px" h="34px" p="0" variant="outline" borderColor="#d8e1e0" borderRadius="8px" bg="white" color="#174f4a" _hover={{ bg: "#f6faf9" }}>
                <FiArrowRight />
              </Button>
            </HStack>
          </Flex>
        </Box>
      </Box>
    </VStack>
  );
}
