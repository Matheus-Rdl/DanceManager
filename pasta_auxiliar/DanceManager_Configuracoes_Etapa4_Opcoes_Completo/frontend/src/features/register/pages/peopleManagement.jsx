import { useFieldOptions } from "../../../utils/userSelectOptions";
/*

    Type: Page

    Name: PeopleManagement

    Description:

      Página peopleManagement responsável por orquestrar a tela, seus estados locais, integrações e componentes visuais.

    Author: Matheus Rodrigues

    Last Edit: 25/08/2026

*/

import { Table, Box, Button, Heading, HStack, VStack, Flex, Dialog, Portal, Input, NativeSelect, Avatar, Text, Badge } from "@chakra-ui/react";

import { useEffect, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { LuPlus, LuPencil, LuFileText, LuUsers, LuEllipsis, LuTrash2, LuUserCheck, LuUserX, LuCalendarPlus, LuSearch, LuArrowRight, LuX } from "react-icons/lu";

import { LiaUsersSolid } from "react-icons/lia";

//Services

import usersServices from "../../../services/usersServices";

import activitiesServices from "../../../services/activitiesServices";

import fieldsServices from "../../../services/fieldsServices";

import contractsServices from "../../../services/contractsServices";
import { getUserSituation } from "../../../utils/userSituation";
import { getSelectableFieldOptions } from "../../../utils/userSelectOptions";

//Components

import HeadingPage from "../../../components/headingPage";

import Loading from "../../../components/loading";

import HeaderFilter from "../../../components/headerFilter";

//Hooks

import useTableFilter from "../../../hooks/useTableFilter";

import List from "../../../components/list";

/* Componente principal: concentra a consulta de dados, os filtros e a renderização da gestão de pessoas. */

export default function PeopleManagement() {
  useFieldOptions();

  const navigate = useNavigate();

  //Services

  const { getUsers, refetchUsers, usersList, usersLoading, deleteUser } = usersServices();

  const { getActivities, refetchActivities, activitiesList, activitiesLoading, deleteActivity } = activitiesServices();

  const { getContractsByUser } = contractsServices();

  /* Armazena os contratos organizados pelo identificador de cada aluno. */

  const [contractsByUser, setContractsByUser] = useState({});

  /* Indica quando a consulta de contratos ainda está em andamento. */

  const [contractsFetching, setContractsFetching] = useState(false);

  /* Consulta contratos por aluno. O service deve retornar os dados da requisição. */

  /* Busca os contratos após o carregamento da lista de alunos. */

  useEffect(() => {

    if (!Array.isArray(usersList) || usersLoading || !usersList.length) return;

    let cancelled = false;

    const loadContracts = async () => {

      setContractsFetching(true);

      const result = {};

      /* Remove IDs repetidos antes de consultar o serviço de contratos. */

      const ids = [...new Set(usersList.map(user => String(user._id ?? "")).filter(Boolean))];

      /* Limita requisições simultâneas para não sobrecarregar a API. */

      for (let i = 0; i < ids.length; i += 4) {

        if (cancelled) break;

        await Promise.all(ids.slice(i, i + 4).map(async (id) => {

          try {

            /* Consulta os contratos de um aluno usando o service existente. */

            const response = await getContractsByUser(id);

            /* Aceita diferentes formatos de resposta sem modificar o retorno original. */

            const payload = response?.data?.data ?? response?.data ?? response?.contracts ?? response?.contractsList ?? response;

            const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.contracts) ? payload.contracts : Array.isArray(payload?.contractsList) ? payload.contractsList : null);

            result[id] = list === null ? null : list.filter(contract => String(contract.userId ?? id) === id);

          } catch (error) {

            console.error("Erro ao buscar contratos do aluno:", id, error);

            result[id] = null;

          }

        }));

      }

      /* Atualiza o estado somente se o componente ainda estiver montado. */

      if (!cancelled) { setContractsByUser(result); setContractsFetching(false); }

    };

    loadContracts();

    return () => { cancelled = true; };

  }, [usersList, usersLoading]);

  useEffect(() => {

    getUsers();

  }, [refetchUsers]);

  useEffect(() => {

    getActivities();

  }, [refetchActivities]);

  //Inicializa a busca de campos do banco de dados

  const {

    fieldsLoading,

    fieldsListByCollectionAndPage,

    getFieldsByCollectionAndPage

  } = fieldsServices();

  //Pega os campos do banco de dados e atualiza a lista de filtros

  useEffect(() => {

    getFieldsByCollectionAndPage(

      "users",

      "peopleManagement"

    );

  }, []);

  //States

  const [userActive, setuserActive] = useState(null);

  //Variables

  const [open, setOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const menuRef = useRef(null);

  const selectedUser = usersList?.find((u) => u._id === userActive);

  const toggleMenu = () => setOpen((prev) => !prev);

  const [filters, setFilters] = useState({});

  /* Estados dos filtros rápidos apresentados acima da tabela. */

  const [quickSearch, setQuickSearch] = useState("");

  const [quickLink, setQuickLink] = useState("all");

  const [quickActivity, setQuickActivity] = useState("all");

  const [quickBirthday, setQuickBirthday] = useState("all");

  const [quickContract, setQuickContract] = useState("all");
  const [quickSituation, setQuickSituation] = useState("all");

  // Fecha o menu se clicar fora

  useEffect(() => {

    // Função de evento "handleClickOutside". Normalmente é acionada por clique, submit ou interação do usuário.

    const handleClickOutside = (event) => {

      if (menuRef.current && !menuRef.current.contains(event.target)) {

        setOpen(false);

      }

    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  //Função para atualizar filtros

  // Função de evento "handleFilterChange". Normalmente é acionada por clique, submit ou interação do usuário.

  const handleFilterChange = (field, value) => {

    setFilters(prev => ({

      ...prev,

      [field]: value

    }));

  };

  // Ordena os campos recebidos do banco de dados

  /* Respeita a ordem e o agrupamento dos campos definidos na configuração do sistema. */

  const sortedDataFields = [...fieldsListByCollectionAndPage].sort((a, b) => {

    const folderA = a.folder === 0 ? 999 : a.folder;

    const folderB = b.folder === 0 ? 999 : b.folder;

    if (folderA !== folderB) {

      return folderA - folderB;

    }

    return a.order - b.order;

  });

  const sortedFields = [...sortedDataFields]

    .map((field) => ({

      text: field.title,

      type: field.filterType || field.type || "text",

      input: field.input,

      dataKey: field.field,

      optionsKey: field.optionsKey,

      minWidth: field.minWidth || "120px",

      maxWidth: field.maxWidth || "400px",

    }));

  //Função principal que vai filtrar na tela

  // Aplica a regra de filtro em memória antes da renderização, mantendo a tabela desacoplada da lógica de busca.

  const filteredUsers = useTableFilter(

    usersList,

    filters,

    sortedFields

  );

  /* Filtros rápidos aplicados sobre a lista já filtrada pelos campos do sistema */

  /* Normaliza os identificadores das atividades vinculadas a cada aluno. */

  const getUserActivityIds = (user) => (Array.isArray(user.user_activities) ? user.user_activities : []).map((item) => String(typeof item === "object" && item !== null ? (item.activity_mat ?? item.activityMat ?? item._id ?? item.id ?? item.name ?? "") : item));

  const activityOptions = (activitiesList || []).map((activity) => ({

    value: String(activity.activity_mat ?? activity._id ?? activity.activityMat ?? activity.id ?? ""),

    label: String(activity.activity_title ?? activity.activity_name ?? activity.activityName ?? activity.name ?? activity.title ?? activity._id ?? "Atividade")

  })).filter((item) => item.value);

  /* Define a situação exibida na coluna Contrato a partir dos contratos consultados. */

  const getContractStatus = (user) => {

    const list = contractsByUser[String(user._id)];

    const neutral = { key: "unknown", label: contractsFetching ? "Carregando..." : "Não informado", bg: "#edf1f2", color: "#64748b" };

    if (!Array.isArray(list)) return neutral;

    if (!list.length) return { key: "none", label: "Sem contrato", bg: "#edf1f2", color: "#64748b" };

    const today = new Date(); today.setHours(0, 0, 0, 0);

    const toLocalDate = (value) => {

      if (!value) return null;

      const raw = typeof value === "object" && value.$date ? value.$date : value;

      const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);

      if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

      const date = new Date(raw);

      return Number.isNaN(date.getTime()) ? null : date;

    };

    const sorted = [...list].sort((a, b) => (toLocalDate(b.startDate)?.getTime() ?? 0) - (toLocalDate(a.startDate)?.getTime() ?? 0));

    /* Prioriza o contrato marcado como ativo e ainda não encerrado. */

    const active = sorted.find(c => c.active === true && !c.closedAt);

    if (active) {

      if (active.indefinite) return { key: "active", label: "Vigente", bg: "#dff5e6", color: "#14833b" };

      const end = toLocalDate(active.plannedEndDate);

      if (!end) return neutral;

      const days = Math.round((end.getTime() - today.getTime()) / 86400000);

      if (days < 0) return { key: "expired", label: "Vencido", bg: "#ffe2e3", color: "#c53030" };

      if (days <= 30) return { key: "soon", label: "A vencer", bg: "#fff2d8", color: "#a66b00" };

      return { key: "active", label: "Vigente", bg: "#dff5e6", color: "#14833b" };

    }

    /* Sem contrato ativo, avalia o registro mais recente para identificar encerramento. */

    const last = sorted[0];

    if (last?.closedAt || last?.active === false) return { key: "closed", label: "Encerrado", bg: "#f0f2f2", color: "#637673" };

    return neutral;

  };

  /* Converte os vínculos de atividades em nomes legíveis na tabela. */

  const getUserActivityNames = (user) => getUserActivityIds(user).map((id) => { const activity = (activitiesList || []).find((a) => [a.activity_mat, a._id, a.activityMat].some((key) => String(key ?? "") === id)); return activity?.activity_title ?? activity?.activity_name ?? activity?.name ?? id; }).join(", ");

  /* Aniversário: utiliza o campo disponível no cadastro, sem calcular idade */

  /* Extrai dia e mês de nascimento dos campos disponíveis no cadastro. */

  /* Obtém o aniversário do aluno */
  const getBirthday = (user) => {
    const raw = user.user_date_nasc ?? user.user_birth_date ?? user.user_birthdate ?? user.user_date_birth ?? user.user_date_of_birth ?? user.user_birthday ?? user.birthDate ?? user.dateOfBirth ?? user.birthday;

    if (!raw) return null;

    const value = typeof raw === "object" && raw.$date ? raw.$date : String(raw);

    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) return { day: Number(match[3]), month: Number(match[2]) };

    const br = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})/);

    if (br) return { day: Number(br[1]), month: Number(br[2]) };

    return null;
  };

  /* Formata o aniversário e destaca quando a data corresponde ao dia atual. */

  const birthdayLabel = (user) => {

    const date = getBirthday(user);

    if (!date || date.day < 1 || date.day > 31 || date.month < 1 || date.month > 12) return "Não informado";

    const today = new Date();

    if (date.day === today.getDate() && date.month === today.getMonth() + 1) return "🎂 Hoje!";

    return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}`;

  };

  /* Filtra aniversariantes de hoje, dos próximos sete dias ou do mês atual. */

/* Filtra os aniversariantes conforme a opção selecionada */
const matchesBirthdayFilter = (user) => {
  if (quickBirthday === "all") return true;

  const date = getBirthday(user);

  /* Exibe somente pessoas sem data de nascimento */
  if (quickBirthday === "unknown") {
    return !date;
  }

  if (!date) return false;

  const today = new Date();

  if (quickBirthday === "today") {
    return date.day === today.getDate() && date.month === today.getMonth() + 1;
  }

  if (quickBirthday === "month") {
    return date.month === today.getMonth() + 1;
  }

  if (quickBirthday === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      return d.getDate() === date.day && d.getMonth() + 1 === date.month;
    }).some(Boolean);
  }

  return true;
};

  /* Combina a busca por nome/matrícula com os filtros de turma, atividade, aniversário e contrato. */

  const visibleUsers = (filteredUsers || []).filter((user) => {

    const search = quickSearch.trim().toLocaleLowerCase("pt-BR");

    const name = String(user.user_name ?? user.name ?? "").toLocaleLowerCase("pt-BR");

    const mat = String(user.user_mat ?? user.user_mat_number ?? user.user_registration ?? user.mat ?? "").toLocaleLowerCase("pt-BR");

    const userActivities = getUserActivityIds(user);

    return (!search || name.includes(search) || mat.includes(search)) &&

      (quickLink === "all" || (quickLink === "linked" ? userActivities.length > 0 : userActivities.length === 0)) &&

      (quickActivity === "all" || userActivities.includes(quickActivity) || (activitiesList || []).some((a) => String(a.activity_mat) === quickActivity && userActivities.includes(String(a._id)))) &&

      matchesBirthdayFilter(user) &&
      (quickSituation === "all" || getUserSituation(user).code === quickSituation) &&
      (quickContract === "all" || getContractStatus(user).key === quickContract);

  });

  /* Situação contratual: usa os contratos consultados pelo contractsServices. */



  /* Abre a visão geral do aluno, preservando os dados enviados pela navegação. */

  const openUserOverview = (user) => navigate("/PeopleManagementDetailed", { state: { userId: user._id, userData: user, currentMode: "E" } });

  const hasQuickFilters = quickSearch || quickLink !== "all" || quickActivity !== "all" || quickBirthday !== "all" || quickContract !== "all" || quickSituation !== "all";

  const clearQuickFilters = () => { setQuickSearch(""); setQuickLink("all"); setQuickActivity("all"); setQuickBirthday("all"); setQuickContract("all"); setQuickSituation("all"); };

  //Ele carrega a pagina até encontrar os estudantes

  if (usersLoading || fieldsLoading) {

    return <Loading />;

  }

  console.log(usersList)

  /* Exclui o aluno selecionado após a confirmação no diálogo. */

  const handleDeleteUser = async () => {

    try {

      const result = await deleteUser(userActive);

      if (result.success) {

        setDeleteDialogOpen(false);

        setOpen(false);

        setuserActive(null);

        getUsers();

      } else {

        console.log(result);

      }

    } catch (error) {

      console.log(error);

    }

  };

  /* Indicadores de gestão - calculados apenas no frontend */

  const totalPeople = usersList?.length || 0;

  const peopleWithActivities = usersList?.filter((user) => Array.isArray(user.user_activities) && user.user_activities.length > 0).length || 0;

  const peopleWithoutActivities = totalPeople - peopleWithActivities;

  const now = new Date();

  const newPeopleThisMonth = usersList?.filter((user) => {

    if (!user.user_registration_date) return false;

    const registrationDate = new Date(user.user_registration_date);

    if (Number.isNaN(registrationDate.getTime())) return false;

    return registrationDate.getMonth() === now.getMonth() && registrationDate.getFullYear() === now.getFullYear();

  }).length || 0;

  /* Configura os indicadores apresentados no topo da página. */

  const cards = [

    {

      titleCard: "Total de pessoas",

      dataCard: totalPeople,

      descriptionCard: "pessoas cadastradas",

      icon: LuUsers,

      borderColor: "#c8e8df",

      bgColor: "#f2fbf8",

      iconBg: "#007565",

      textColor: "#007565"

    },

    {

      titleCard: "Vinculados a turmas",

      dataCard: peopleWithActivities,

      descriptionCard: "pessoas com turma",

      icon: LuUserCheck,

      borderColor: "#bde6cf",

      bgColor: "#f1fbf5",

      iconBg: "#149447",

      textColor: "#149447"

    },

    {

      titleCard: "Sem turma",

      dataCard: peopleWithoutActivities,

      descriptionCard: "pessoas sem vínculo",

      icon: LuUserX,

      borderColor: "#eadfc3",

      bgColor: "#fffaf0",

      iconBg: "#b7791f",

      textColor: "#9c6418"

    },

    {

      titleCard: "Novos no mês",

      dataCard: newPeopleThisMonth,

      descriptionCard: "cadastros neste mês",

      icon: LuCalendarPlus,

      borderColor: "#a1b9e4",

      bgColor: "#dfe5f0",

      iconBg: "#4267a9",

      textColor: "#4267a9"

    }

  ];

  return (

    <VStack gap={3} align="stretch" width="100%" minWidth={0} bg="#f8faf9">

      {/* Cabeçalho */}

      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">

        <Flex align="center" gap={3}>

          <Flex w="48px" h="48px" borderRadius="full" bg="#0b6b5b" color="white" align="center" justify="center" flexShrink={0}>

            <LiaUsersSolid size={25} />

          </Flex>

          <Box>

            <Heading as="h1" fontSize={{ base: "22px", md: "26px" }} fontWeight="700" lineHeight="1.1" color="#062f2b">Gerenciar Pessoas</Heading>

            <Box mt="4px" fontSize="12px" color="#5e7471">Gerencie pessoas, dados pessoais, contratos e turmas.</Box>

          </Box>

        </Flex>

        <Link to="/PeopleManagement/add" state={{ userId: userActive, userData: selectedUser, currentMode: "A" }}>

          <Button h="36px" px={5} borderRadius="8px" bg="#064e43" color="white" fontSize="12px" fontWeight="700" _hover={{ bg: "#043f37" }}>

            <LuPlus size={16} /> Inserir pessoa

          </Button>

        </Link>

      </Flex>

      {/* Painel principal */}

      <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="visible">

        {/* Ações */}

        <Flex p={3} gap={2} align="center" justify="space-between" wrap="wrap" borderBottom="1px solid #e6ecea">

          <Flex gap={2} wrap="wrap">

            <Link to="/PeopleManagementDetailed" state={{ userId: userActive, userData: selectedUser, currentMode: "E" }}>

              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={userActive === null}><LuPencil /> Dados Pessoais</Button>

            </Link>

            <Link to="/PeopleManagementContracts" state={{ userId: userActive, userData: selectedUser }}>

              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={userActive === null}><LuFileText /> Contratos</Button>

            </Link>

            <Link to="/PeopleManagementActivities" state={{ userData: selectedUser }}>

              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={userActive === null}><LuUsers /> Turmas</Button>

            </Link>

            <Box ref={menuRef} position="relative">

              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={userActive === null} onClick={toggleMenu}><LuEllipsis /> Outras opções</Button>

              {open && (

                <Box as="ul" listStyleType="none" position="absolute" top="100%" left={0} mt={1} py={1} minW="180px" borderRadius="8px" border="1px solid #d7e2df" bg="white" boxShadow="0 8px 24px rgba(0,0,0,.08)" zIndex={100} fontSize="12px" color="#173f3a">

                  <Box as="li" cursor="pointer" py={2} px={3} color="#c53030" display="flex" alignItems="center" gap={2} _hover={{ bg: "#fff5f5" }} onClick={() => { setOpen(false); setDeleteDialogOpen(true); }}><LuTrash2 /> Excluir usuário</Box>

                </Box>

              )}

            </Box>

          </Flex>

          <Box fontSize="12px" color="#607873">{filteredUsers?.length || 0} registros</Box>

        </Flex>

        {/* Indicadores de gestão */}

        <Box width="95%" mx="auto" mt={3} mb={3}>

          <Flex gap={2} wrap="wrap">

            {cards.map((card, index) => {

              const Icon = card.icon;

              return (

                <Box

                  key={index}

                  flex="1"

                  minW="180px"

                  p={3}

                  border="1px solid"

                  borderColor={card.borderColor}

                  borderRadius="8px"

                  bg={card.bgColor}

                >

                  <Flex align="center" gap={3}>

                    <Flex

                      w="34px"

                      h="34px"

                      borderRadius="full"

                      bg={card.iconBg}

                      color="white"

                      align="center"

                      justify="center"

                      flexShrink={0}

                    >

                      <Icon size={16} />

                    </Flex>

                    <Box minW={0}>

                      <Box

                        fontSize="12px"

                        fontWeight="700"

                        color={card.textColor}

                      >

                        {card.titleCard}

                      </Box>

                      <Heading

                        mt="1px"

                        fontSize="20px"

                        color="#063f37"

                        fontWeight="800"

                      >

                        {card.dataCard}

                      </Heading>

                      <Box

                        fontSize="11px"

                        color="#60777c"

                      >

                        {card.descriptionCard}

                      </Box>

                    </Box>

                  </Flex>

                </Box>

              );

            })}

          </Flex>

        </Box>

        {/* Lista de pessoas — visual da tela de Mensalidades */}

        <Box borderTop="1px solid #e6ecea">

          <Flex p={3} gap={2} align="end" wrap="wrap" borderBottom="1px solid #e9efee">

            <Box flex="1" minW={{ base: "100%", md: "260px" }} position="relative">

              <Box position="absolute" left="13px" top="50%" transform="translateY(-50%)" color="#174f4a" zIndex={1}><LuSearch size={17} /></Box>

              <Input value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} placeholder="Buscar pessoa ou matrícula..." h="36px" pl="40px" borderColor="#d6e0df" borderRadius="8px" fontSize="12px" _focus={{ borderColor: "#8ab6ad", boxShadow: "0 0 0 1px #8ab6ad" }} />

            </Box>

            <Box w={{ base: "calc(50% - 4px)", md: "175px" }}>

              <Text mb="4px" fontSize="11px" color="#617980">Vínculo</Text>

              <NativeSelect.Root><NativeSelect.Field value={quickLink} onChange={(e) => setQuickLink(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px" color="#173f3a"><option value="all">Todos</option><option value="linked">Com turma</option><option value="unlinked">Sem turma</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>

            </Box>

            <Box w={{ base: "calc(50% - 4px)", md: "190px" }}>

              <Text mb="4px" fontSize="11px" color="#617980">Atividade</Text>

              <NativeSelect.Root><NativeSelect.Field value={quickActivity} onChange={(e) => setQuickActivity(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px" color="#173f3a"><option value="all">Todas</option>{activityOptions.map((activity) => <option key={activity.value} value={activity.value}>{activity.label}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>

            </Box>

            <Box w={{ base: "calc(50% - 4px)", md: "155px" }}><Text mb="4px" fontSize="11px" color="#617980">Aniversário</Text><NativeSelect.Root><NativeSelect.Field value={quickBirthday} onChange={(e) => setQuickBirthday(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px"><option value="all">Todos</option><option value="today">Hoje</option><option value="week">Próximos 7 dias</option><option value="month">Este mês</option><option value="unknown">Não informado</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>

            <Box w={{ base: "calc(50% - 4px)", md: "175px" }}>
              <Text mb="4px" fontSize="11px" color="#617980">Situação</Text>
              <NativeSelect.Root><NativeSelect.Field value={quickSituation} onChange={(e) => setQuickSituation(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px" color="#173f3a">
                <option value="all">Todas</option>
                {getSelectableFieldOptions("user_situation", quickSituation).map(({value, label}) => <option key={value} value={value}>{label}</option>)}
                <option value="">Não definida</option>
              </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
            </Box>

            <Box w={{ base: "calc(50% - 4px)", md: "155px" }}><Text mb="4px" fontSize="11px" color="#617980">Contrato</Text><NativeSelect.Root><NativeSelect.Field value={quickContract} onChange={(e) => setQuickContract(e.target.value)} h="36px" borderColor="#d8e1e0" borderRadius="8px" fontSize="12px"><option value="all">Todos</option><option value="active">Vigente</option><option value="soon">A vencer</option><option value="expired">Vencido</option><option value="closed">Encerrado</option><option value="none">Sem contrato</option><option value="unknown">Não informado</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>

            {hasQuickFilters && <Button onClick={clearQuickFilters} h="36px" px={3} variant="ghost" color="#607873" fontSize="11px"><LuX size={14} /> Limpar</Button>}

          </Flex>

          <Flex px={3} py="10px" align="center" justify="space-between" gap={2} bg="#fbfcfc" borderBottom="1px solid #e9efee">

            <Box><Heading fontSize="15px" color="#062f2b">Pessoas cadastradas</Heading><Text mt="2px" fontSize="11px" color="#71858a">Clique para selecionar; dois cliques para abrir a visão geral</Text></Box>

            <Text fontSize="11px" color="#607873" flexShrink={0}>{visibleUsers.length} {visibleUsers.length === 1 ? "resultado" : "resultados"}</Text>

          </Flex>

          <Box display={{ base: "none", md: "block" }} overflowX="auto" maxH="calc(100vh - 330px)" overflowY="auto">

            <Table.Root size="sm" variant="line" minW="900px">

              <Table.Header bg="#f4f7f7"><Table.Row>{["Pessoa", "Turmas / Atividades", "Situação", "Aniversário", "Contrato"].map((title) => <Table.ColumnHeader key={title} h="37px" color="#174f4a" fontSize="11px" fontWeight="600" borderColor="#e2e8e7">{title}</Table.ColumnHeader>)}</Table.Row></Table.Header>

              <Table.Body>{visibleUsers.map((user) => {

                const active = userActive === user._id;

                return <Table.Row key={user._id} h="62px" bg={active ? "#eaf7f2" : "white"} cursor="pointer" _hover={{ bg: "#e0f2ed" }} onClick={() => setuserActive(user._id)} onDoubleClick={() => openUserOverview(user)} title="Dois cliques para abrir a visão geral">

                  <Table.Cell borderColor="#e7eceb"><HStack gap="11px"><Avatar.Root size="sm"><Avatar.Fallback name={String(user.user_name ?? user.name ?? "Pessoa")} /></Avatar.Root><Box><Text fontWeight="700" fontSize="12px" color="#164c47">{user.user_name ?? user.name ?? "Sem nome"}</Text><Text mt="2px" fontSize="10px" color="#71858a">MAT: {user.user_mat ?? user.user_mat_number ?? user.user_registration ?? user.mat ?? "—"}</Text></Box></HStack></Table.Cell>

                  <Table.Cell borderColor="#e7eceb" fontSize="11px" color="#174f4a" maxW="280px"><Text truncate>{getUserActivityNames(user) || "Sem atividade"}</Text></Table.Cell>

                  <Table.Cell borderColor="#e7eceb">{(() => { const situation = getUserSituation(user); return <Badge px="10px" py="4px" borderRadius="full" bg={situation.bg} color={situation.color} fontSize="10px">{situation.label}</Badge>; })()}</Table.Cell>

                  <Table.Cell borderColor="#e7eceb" fontSize="11px" color="#174f4a">{birthdayLabel(user)}</Table.Cell>

                  <Table.Cell borderColor="#e7eceb">{(() => { const status = getContractStatus(user); return <Badge px="10px" py="4px" borderRadius="full" bg={status.bg} color={status.color} fontSize="10px">{status.label}</Badge>; })()}</Table.Cell>

                </Table.Row>;

              })}</Table.Body>

            </Table.Root>

          </Box>

          <VStack display={{ base: "flex", md: "none" }} gap={0} align="stretch">

            {visibleUsers.map((user) => {

              const situation = getUserSituation(user);

              return <Box key={user._id} px={3} py={3} borderBottom="1px solid #e7eceb" bg={userActive === user._id ? "#eaf7f2" : "white"} onClick={() => setuserActive(user._id)}>

                <Flex align="center" justify="space-between" gap={2}><HStack minW={0} gap="10px"><Avatar.Root size="sm" flexShrink={0}><Avatar.Fallback name={String(user.user_name ?? user.name ?? "Pessoa")} /></Avatar.Root><Box minW={0}><Text fontWeight="700" fontSize="12px" color="#164c47" truncate>{user.user_name ?? user.name ?? "Sem nome"}</Text><Text fontSize="10px" color="#71858a">MAT: {user.user_mat ?? user.user_mat_number ?? user.user_registration ?? user.mat ?? "—"}</Text></Box></HStack><Badge flexShrink={0} bg={situation.bg} color={situation.color} borderRadius="full" px={2} fontSize="9px">{situation.label}</Badge></Flex>

                <Flex mt={2} align="center" gap={2} wrap="wrap"><Text fontSize="10px" color="#607873">Aniversário: {birthdayLabel(user)}</Text><Text fontSize="10px" color="#607873">|</Text><Text fontSize="10px" color="#607873">Contrato: <Badge bg={getContractStatus(user).bg} color={getContractStatus(user).color} borderRadius="full" px={2} fontSize="9px">{getContractStatus(user).label}</Badge></Text></Flex>

                <Flex mt={2} align="center" justify="space-between" gap={2}><Text fontSize="10px" color="#607873" truncate>{getUserActivityNames(user) || "Sem atividade"}</Text><Text fontSize="10px" fontWeight="700" color="#0b6b5b" flexShrink={0}><Button size="xs" variant="ghost" color="#0b6b5b" onClick={(e) => { e.stopPropagation(); openUserOverview(user); }}>Ver visão geral <LuArrowRight size={12} /></Button></Text></Flex>

              </Box>;

            })}

          </VStack>

          {visibleUsers.length === 0 && <Box py={10} px={4} textAlign="center"><Text fontWeight="700" color="#174f4a">Nenhuma pessoa encontrada</Text><Text mt={1} fontSize="11px" color="#71858a">Tente outros termos ou filtros.</Text>{hasQuickFilters && <Button mt={3} size="sm" variant="outline" onClick={clearQuickFilters}>Limpar filtros</Button>}</Box>}

        </Box>

      </Box>

      {/* Modal de exclusão */}

      <Dialog.Root open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)} placement="center">

        <Portal>

          <Dialog.Backdrop />

          <Dialog.Positioner>

            <Dialog.Content borderRadius="10px">

              <Dialog.Header><Dialog.Title color="#062f2b">Excluir usuário</Dialog.Title></Dialog.Header>

              <Dialog.Body>

                <VStack align="start" gap={2}>

                  <Box>Tem certeza que deseja excluir este usuário?</Box>

                  {selectedUser && <Box fontWeight="bold">{selectedUser.user_name}</Box>}

                  <Box fontSize="sm" color="gray.500">Essa ação não poderá ser desfeita.</Box>

                </VStack>

              </Dialog.Body>

              <Dialog.Footer>

                <Flex gap={2} justify="flex-end" width="100%">

                  <Dialog.ActionTrigger asChild><Button variant="outline">Cancelar</Button></Dialog.ActionTrigger>

                  <Button colorPalette="red" onClick={handleDeleteUser}>Sim, excluir</Button>

                </Flex>

              </Dialog.Footer>

            </Dialog.Content>

          </Dialog.Positioner>

        </Portal>

      </Dialog.Root>

    </VStack>

  );

}
