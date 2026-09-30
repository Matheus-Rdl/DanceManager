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

const BRAND = "#003f36";
const BRAND_DARK = "#00342d";
const BORDER = "#dfe8e6";
const TEXT = "#073f39";

const mockStudents = [
  { id: "000123", name: "João Pedro Silva", contract: "Balanço", amount: 270, dueDate: "17/10/2026", status: "paid", avatar: "https://i.pravatar.cc/80?img=12" },
  { id: "000124", name: "Maria Silva", contract: "Raiz", amount: 190, dueDate: "05/10/2026", status: "pending", avatar: "https://i.pravatar.cc/80?img=47" },
  { id: "000125", name: "Carlos Santos", contract: "Imersão", amount: 320, dueDate: "02/10/2026", status: "overdue", avatar: "https://i.pravatar.cc/80?img=11" },
  { id: "000126", name: "Ana Souza", contract: "Beco", amount: 430, dueDate: "20/10/2026", status: "pending", avatar: "https://i.pravatar.cc/80?img=44" },
  { id: "000127", name: "Lucas Ferreira", contract: "Balanço", amount: 270, dueDate: "28/09/2026", status: "paid", avatar: "https://i.pravatar.cc/80?img=13" },
  { id: "000128", name: "Beatriz Lima", contract: "Imersão", amount: 320, dueDate: "15/10/2026", status: "no_contract", avatar: "https://i.pravatar.cc/80?img=45" },
  { id: "000129", name: "Rafael Costa", contract: "Raiz", amount: 190, dueDate: "10/10/2026", status: "pending", avatar: "https://i.pravatar.cc/80?img=15" },
  { id: "000130", name: "Gabriela Oliveira", contract: "Balanço", amount: 270, dueDate: "12/10/2026", status: "paid", avatar: "https://i.pravatar.cc/80?img=48" },
  { id: "000131", name: "Pedro Henrique", contract: "Beco", amount: 430, dueDate: "08/10/2026", status: "overdue", avatar: "https://i.pravatar.cc/80?img=14" },
  { id: "000132", name: "Juliana Martins", contract: "Raiz", amount: 190, dueDate: "22/10/2026", status: "pending", avatar: "https://i.pravatar.cc/80?img=49" },
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


const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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

  // Os totais abaixo reproduzem exatamente o layout da referência visual.
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
            <Heading as="h1" fontSize={{ base: "22px", md: "26px" }} fontWeight={"700"} lineHeight="1.1" color="#062f2b">Mensalidades</Heading>
            <Box mt="4px" fontSize="12px" color="#5e7471">Gerencie as mensalidades dos seus alunos.</Box>
          </Box>
        </Flex>
      </Flex>

      {/*Painel principal de buscas e filtros*/}
      <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="visible">
        {/* Filtros e busca */}
        <Flex p={3} gap={2} align="end" borderBottom="1px solid" borderColor="#e9efee">
          <Box flex="1" w="100%">
            <Box position="relative">
              <Box position="absolute" left="16px" top="50%" transform="translateY(-50%)" color="#174f4a" zIndex="1"><FiSearch size={21} /></Box>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aluno..." h="46px" pl="48px" borderColor="#d6e0df" borderRadius="9px" fontSize="14px" _focus={{ borderColor: "#8ab6ad", boxShadow: "0 0 0 1px #8ab6ad" }} />
            </Box>
          </Box>
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} width={{ base: "100%", md: "260px" }} options={[["all", "Todos"], ["paid", "Pago"], ["pending", "Pendente"], ["overdue", "Atrasado"], ["no_contract", "Sem contrato"]]} />
          <FilterSelect label="Período" value={periodFilter} onChange={setPeriodFilter} width={{ base: "100%", md: "274px" }} options={[["all", "Todos"], ["current_month", "Este mês"]]} />
        </Flex>

        <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap="24px" px={4}>
          {summaryCards.map((card) => <SummaryCard key={card.title} {...card} />)}
        </SimpleGrid>

        <Flex px={3} pb={3} justify="space-between" align="center">
          <Heading fontSize="16px" fontWeight="700" color="#062f2b">Alunos</Heading>
          <Text color="#607873" fontSize="13px">24 alunos</Text>
        </Flex>

        <Box mx="16px" mb="16px" border="1px solid" borderColor="#e2e8e7" borderRadius="8px" overflow="hidden">
          <Box overflowX="auto">
            <Table.Root size="sm" variant="line" minW="940px">
              <Table.Header bg="#f4f7f7">
                <Table.Row>
                  {['Aluno', 'Contrato atual', 'Vencimento', 'Valor', 'Status', 'Ações'].map((h) => <Table.ColumnHeader key={h} h="37px" color="#174f4a" fontSize="12px" fontWeight="600" borderColor="#e2e8e7">{h}</Table.ColumnHeader>)}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredStudents.slice(0, 7).map((student) => <StudentRow key={student.id} student={student} />)}
              </Table.Body>
            </Table.Root>
          </Box>
          {filteredStudents.length === 0 && <Box py="50px" textAlign="center"><Text fontWeight="700">Nenhum aluno encontrado.</Text><Text mt="4px" color="#71858a" fontSize="sm">Tente alterar os filtros ou a busca.</Text></Box>}
          <Flex px="5px" py="11px" pl="4px" align="center" justify="space-between" borderTop="1px solid" borderColor="#e7eceb">
            <Text ml="0" pl="0" fontSize="12px" color="#627a80">Mostrando 1–7 de 24 alunos</Text>
            <HStack gap="8px">
              <PageButton icon={<FiArrowLeft />} />
              {[1, 2, 3, 4].map((n) => <PageButton key={n} active={page === n} onClick={() => setPage(n)}>{n}</PageButton>)}
              <PageButton icon={<FiArrowRight />} />
            </HStack>
          </Flex>
        </Box>
      </Box>
    </VStack>
  );
}

function FilterSelect({ label, value, onChange, options, width }) {
  return <Box w={width}><Text mb="4px" fontSize="12px" color="#617980">{label}</Text><NativeSelect.Root w="100%"><NativeSelect.Field value={value} onChange={(e) => onChange(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px" color="#173f3a">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>;
}

//Cards de informações resumidas, como "A receber", "Recebido", "Pendente" e "Atrasado"
function SummaryCard({ title, value, detail, icon: Icon, fg, bg, border }) {
  return <Flex p={3} border="1px solid" borderColor={border} borderRadius="9px" bg={bg} align="flex-start" gap="19px">
    <Flex mt="1px" w="39px" h="39px" flex="0 0 39px" borderRadius="50%" bg={fg} color="white" align="center" justify="center">
      <Icon size={22} />
    </Flex>
    <Box>
      <Text color={fg} fontSize="14px" fontWeight="600">{title}</Text>
      <Text mt="3px" color={title === "Pendente" ? "#6d350b" : title === "Atrasado" ? "#b01218" : "#073f39"} fontSize="20px" lineHeight="1.2" fontWeight="800">{value}</Text>
      <Text mt="5px" color="#60777c" fontSize="12px">{detail}</Text>
    </Box>
  </Flex>;
}

function StudentRow({ student }) {
  const status = statusConfig[student.status];
  const contract = contractConfig[student.contract] || contractConfig["Balanço"];
  const StatusIcon = status.icon;
  return <Table.Row h="64px" _hover={{ bg: "#fbfdfc" }}>
    <Table.Cell borderColor="#e7eceb"><HStack gap="12px"><Avatar.Root size="sm"><Avatar.Image src={student.avatar} /><Avatar.Fallback name={student.name} /></Avatar.Root><Box><Text fontWeight="700" fontSize="13px" color="#164c47">{student.name}</Text><Text mt="2px" fontSize="11px" color="#71858a">MAT: {student.id}</Text></Box></HStack></Table.Cell>
    <Table.Cell borderColor="#e7eceb"><Badge px="13px" py="4px" borderRadius="999px" bg={contract.bg} color={contract.fg} fontWeight="500" fontSize="12px">{student.contract}</Badge></Table.Cell>
    <Table.Cell borderColor="#e7eceb" fontSize="12px" color="#174f4a">{student.dueDate}</Table.Cell>
    <Table.Cell borderColor="#e7eceb" fontSize="12px" color="#174f4a">{formatCurrency(student.amount)}</Table.Cell>
    <Table.Cell borderColor="#e7eceb"><Badge display="inline-flex" alignItems="center" gap="6px" px="11px" py="5px" borderRadius="999px" bg={status.bg} color={status.fg} fontWeight="500" fontSize="11px"><Flex w="15px" h="15px" borderRadius="50%" bg={status.fg} color="white" align="center" justify="center"><StatusIcon size={10} /></Flex>{status.label}</Badge></Table.Cell>
    <Table.Cell borderColor="#e7eceb"><Button h="38px" minW="79px" px="13px" variant="outline" borderColor="#d6e0df" borderRadius="9px" color="#174f4a" fontSize="12px" bg="white" _hover={{ bg: "#f6faf9" }}><FiArrowRight size={17} /> Ver</Button></Table.Cell>
  </Table.Row>;
}

function PageButton({ children, active, icon, onClick }) {
  return <Button onClick={onClick} minW="36px" w="36px" h="36px" p="0" variant="outline" borderColor="#d8e1e0" borderRadius="8px" bg={active ? BRAND : "white"} color={active ? "white" : "#174f4a"} _hover={{ bg: active ? BRAND_DARK : "#f6faf9" }}>{icon || children}</Button>;
}
