/*
    Type: Page
    Name: PeopleManagement
    Description:
      Página peopleManagement responsável por orquestrar a tela, seus estados locais, integrações e componentes visuais.
    Author: Matheus Rodrigues
    Last Edit: 25/08/2026
*/

import { Table, Box, Button, Heading, HStack, VStack, Flex } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

//Services
import usersServices from "../../../services/usersServices";
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
  const { getUsers, refetchUsers, usersList, usersLoading } = usersServices();

  useEffect(() => {
    getUsers();
  }, [refetchUsers]);

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
      minWidth: field.minWidth || "300px",
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

  return (
    <VStack gap={4} align="stretch">

      <HeadingPage content={"Gestão de pessoas"} />

      <HStack gap={2}>
        <Link
          to={"/PeopleManagement/add"}
          state={{
            userId: userActive,
            userData: selectedUser,
            currentMode: "A",
          }}
        >
          <Button size="xs" variant="surface">Inserir</Button>
        </Link>

        <Link
          to={"/PeopleManagement/view"}
          state={{
            userId: userActive,
            userData: selectedUser,
            currentMode: "V",
          }}
        >
          <Button size="xs" variant="surface" disabled={userActive === null}>
            Visualizar
          </Button>
        </Link>

        <Link
          to={"/PeopleManagement/alter"}
          state={{
            userId: userActive,
            userData: selectedUser,
            currentMode: "E",
          }}
        >
          <Button size="xs" variant="surface" disabled={userActive === null}>Alterar</Button>
        </Link>

        <Box ref={menuRef} position="relative">
          <Button size="xs" variant="surface" disabled={userActive === null} onClick={toggleMenu}>
            Outras opções ▼
          </Button>

          {/* Renderização condicional: esse bloco só aparece quando o estado correspondente estiver ativo. */}
          {open && (
            <Box
              as="ul"
              listStyleType="none"
              position="absolute"
              top="100%"
              left={0}
              mt={1}
              py={2}
              px={3}
              borderRadius="md"
              border="1px solid"
              borderColor="brand.primary"
              bg="brand.secondary"
              zIndex={100}
              fontSize="xs"
              color="black"
              whiteSpace="nowrap"
            >
              <Link
                to={"/PeopleManagementActivities"}
                state={{ userData: selectedUser }}
              >
                <Box as="li" cursor="pointer" py={1} px={2} borderRadius="sm" _hover={{ filter: "brightness(0.92)" }}>
                  Atividades
                </Box>
              </Link>
            </Box>
          )}
        </Box>
      </HStack>

      <Box
        mt={4}
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        maxW="100%"
        overflow="hidden"
      >
        <Box
          maxH="calc(100vh - 220px)"
          minH="calc(100vh - 220px)"
          overflow="auto"
        >
          <Table.Root variant="line" size="sm" whiteSpace="nowrap">
            {/* Estrutura tabular principal onde o cabeçalho e as linhas são montados dinamicamente. */}
            <HeaderFilter
              fields={sortedFields}
              filters={filters}
              onFilterChange={handleFilterChange}
            />

            {/* Corpo da tabela: percorre os dados já filtrados e instancia uma linha por item. */}
            <Table.Body>
              {/* Mapeamento da lista para JSX: cada elemento do array gera um componente visual independente. */}
              {filteredUsers.map((data) => (
                <List
                  data={data}
                  fields={sortedFields}
                  ativo={userActive === data._id}
                  onClick={() => setuserActive(data._id)}
                  key={data._id}
                />
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

    </VStack>
  );
}
