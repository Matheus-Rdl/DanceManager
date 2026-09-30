/*

    Type: Page

    Name: PeopleManagement

    Description:

      Página peopleManagement responsável por orquestrar a tela, seus estados locais, integrações e componentes visuais.

    Author: Matheus Rodrigues

    Last Edit: 25/08/2026

\*/



import { Table, Box, Button, Heading, HStack, VStack, Flex, Dialog, Portal } from "@chakra-ui/react";

import { useEffect, useRef, useState } from "react";

import { Link } from "react-router-dom";
import { LuPlus, LuPencil, LuFileText, LuUsers, LuEllipsis, LuTrash2, LuUserCheck, LuUserX, LuCalendarPlus } from "react-icons/lu";
import { LiaUsersSolid } from "react-icons/lia";



//Services

import usersServices from "../../../services/usersServices";

import activitiesServices from "../../../services/activitiesServices";

import fieldsServices from "../../../services/fieldsServices";



//Components

import HeadingPage from "../../../components/headingPage";

import Loading from "../../../components/loading";

import HeaderFilter from "../../../components/headerFilter";



//Hooks

import useTableFilter from "../../../hooks/useTableFilter";

import List from "../../../components/list";



export default function PeopleManagement() {



  //Services

  const { getUsers, refetchUsers, usersList, usersLoading, deleteUser } = usersServices();

  const { getActivities, refetchActivities, activitiesList, activitiesLoading, deleteActivity } = activitiesServices();



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



  //Ele carrega a pagina até encontrar os estudantes

  if (usersLoading || fieldsLoading) {

    return <Loading />;

  }



  console.log(usersList)



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
            <Link to="/PeopleManagement/alter" state={{ userId: userActive, userData: selectedUser, currentMode: "E" }}>
              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={userActive === null}><LuPencil /> Dados Pessoais</Button>
            </Link>
            <Link to="/PeopleManagement/contracts" state={{ userId: userActive, userData: selectedUser }}>
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
            <Box flex="1" minW="180px" p={3} border="1px solid #c8e8df" borderRadius="8px" bg="#f2fbf8">
              <Flex align="center" gap={3}>
                <Flex w="34px" h="34px" borderRadius="full" bg="#007565" color="white" align="center" justify="center" flexShrink={0}><LuUsers size={16} /></Flex>
                <Box minW={0}>
                  <Box fontSize="12px" fontWeight="700" color="#007565">Total de pessoas</Box>
                  <Heading mt="1px" fontSize="20px" color="#063f37" fontWeight="800">{totalPeople}</Heading>
                  <Box fontSize="11px" color="#60777c">pessoas cadastradas</Box>
                </Box>
              </Flex>
            </Box>
            <Box flex="1" minW="180px" p={3} border="1px solid #bde6cf" borderRadius="8px" bg="#f1fbf5">
              <Flex align="center" gap={3}>
                <Flex w="34px" h="34px" borderRadius="full" bg="#16865f" color="white" align="center" justify="center" flexShrink={0}><LuUserCheck size={16} /></Flex>
                <Box minW={0}>
                  <Box fontSize="12px" fontWeight="700" color="#16865f">Vinculados a turmas</Box>
                  <Heading mt="1px" fontSize="20px" color="#063f37" fontWeight="800">{peopleWithActivities}</Heading>
                  <Box fontSize="11px" color="#60777c">pessoas com turma</Box>
                </Box>
              </Flex>
            </Box>
            <Box flex="1" minW="180px" p={3} border="1px solid #eadfc3" borderRadius="8px" bg="#fffaf0">
              <Flex align="center" gap={3}>
                <Flex w="34px" h="34px" borderRadius="full" bg="#b7791f" color="white" align="center" justify="center" flexShrink={0}><LuUserX size={16} /></Flex>
                <Box minW={0}>
                  <Box fontSize="12px" fontWeight="700" color="#9c6418">Sem turma</Box>
                  <Heading mt="1px" fontSize="20px" color="#063f37" fontWeight="800">{peopleWithoutActivities}</Heading>
                  <Box fontSize="11px" color="#60777c">pessoas sem vínculo</Box>
                </Box>
              </Flex>
            </Box>
            <Box flex="1" minW="180px" p={3} border="1px solid #d8dfeb" borderRadius="8px" bg="#f7f9fc">
              <Flex align="center" gap={3}>
                <Flex w="34px" h="34px" borderRadius="full" bg="#4267a9" color="white" align="center" justify="center" flexShrink={0}><LuCalendarPlus size={16} /></Flex>
                <Box minW={0}>
                  <Box fontSize="12px" fontWeight="700" color="#4267a9">Novos no mês</Box>
                  <Heading mt="1px" fontSize="20px" color="#063f37" fontWeight="800">{newPeopleThisMonth}</Heading>
                  <Box fontSize="11px" color="#60777c">cadastros neste mês</Box>
                </Box>
              </Flex>
            </Box>
          </Flex>
        </Box>

        {/* Tabela */}
        <Box px={3} pb={3}>
          <Flex justify="space-between" align="center" mb={2}>
            <Heading as="h2" fontSize="16px" color="#062f2b" fontWeight="700">Pessoas</Heading>
            <Box fontSize="13px" color="#607873">{filteredUsers?.length || 0} registros</Box>
          </Flex>
          <Box border="1px solid #e1e8e6" borderRadius="8px" maxW="100%" overflow="hidden" bg="white">
            <Box maxH="calc(100vh - 330px)" minH="320px" overflow="auto">
              <Table.Root variant="line" size="sm" whiteSpace="nowrap" tableLayout="fixed" width="max-content" minW="100%">
                <HeaderFilter fields={sortedFields} filters={filters} onFilterChange={handleFilterChange} activities={activitiesList} />
                <Table.Body>
                  {filteredUsers.map((data) => (
                    <List data={data} fields={sortedFields} ativo={userActive === data._id} onClick={() => setuserActive(data._id)} key={data._id} />
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
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
