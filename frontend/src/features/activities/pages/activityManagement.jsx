/*
    Type: Page
    Name: ActivityManagement
    Description:
      Página activityManagement responsável por orquestrar a tela, seus estados locais, integrações e componentes visuais.
    Author: Matheus Rodrigues
    Last Edit: 01/09/2026
*/


// internal imports
import { Link } from "react-router-dom";
import { Table, Box, Button, Heading, HStack, VStack, Flex, Dialog, Portal } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

//Hooks
import useTableFilter from "../../../hooks/useTableFilter";

//Services
import fieldsServices from "../../../services/fieldsServices";
import activitiesServices from "../../../services/activitiesServices";

//Components
import Loading from "../../../components/loading";
import HeadingPage from "../../../components/headingPage";
import HeaderFilter from "../../../components/headerFilter";
import List from "../../../components/list";

//React Icons
import { FaThList } from "react-icons/fa";
import { MdViewWeek } from "react-icons/md";
import { PiCardsFill } from "react-icons/pi";

export default function ActivityManagement() {

  const [activityActive, setActivityActive] = useState(null); // Estado local responsável por controlar "activityActive" durante o ciclo de vida do componente.
  const { getActivities, refetchActivities, activitiesList, activitiesLoading, deleteActivity } = activitiesServices(); // Serviço/hook de integração com a API, centralizando busca, envio e atualização de dados.
  const [open, setOpen] = useState(false); // Estado local responsável por controlar "open" durante o ciclo de vida do componente.
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const menuRef = useRef(null); // Referência persistente usada para acessar "menuRef" sem provocar nova renderização.
  const [filters, setFilters] = useState({}); // Estado local responsável por controlar "filters" durante o ciclo de vida do componente.
  const selectedActivity = activitiesList?.find((a) => a._id === activityActive);

  const toggleMenu = () => setOpen((prev) => !prev); // Função utilitária "toggleMenu" usada para alternar estados booleanos na interface.

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

  useEffect(() => {
    if (refetchActivities) {
      getActivities();
    }
  }, [refetchActivities]);

  //Função para atualizar filtros
  // Função de evento "handleFilterChange". Normalmente é acionada por clique, submit ou interação do usuário.
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  //Inicializa a busca de campos do banco de dados
  const {
    fieldsLoading,
    fieldsListByCollectionAndPage,
    getFieldsByCollectionAndPage
  } = fieldsServices();

  //Pega os campos do banco de dados e atualiza a lista de filtros
  useEffect(() => {
    getFieldsByCollectionAndPage(
      "activities",
      "activitiesManagement"
    );
  }, []);


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
      optionsKey: field.field,
      minWidth: field.minWidth || "300px",
      maxWidth: field.maxWidth || "400px",
    }));

  //Função principal que vai filtrar na tela
  // Aplica a regra de filtro em memória antes da renderização, mantendo a tabela desacoplada da lógica de busca.
  const filteredActivities = useTableFilter(
    activitiesList,
    filters,
    sortedFields
  );

  if (activitiesLoading || fieldsLoading) {
    return <Loading />;
  }

  const handleDeleteActivity = async () => {
    try {
      const result = await deleteActivity(activityActive);

      if (result.success) {
        setDeleteDialogOpen(false);
        setOpen(false);
        setActivityActive(null);
        getActivities();
      } else {
        console.log(result);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <VStack gap={4} align="stretch">

      <HeadingPage content={"Gerenciar Atividades"} />

      {/* Ações principais da tela: inserir, visualizar, alterar e demais operações relacionadas ao registro selecionado. */}
      <HStack gap={2}>
        <Link
          to={"/ActivityManagement/add"}
          state={{
            activityId: activityActive,
            activityData: selectedActivity,
            currentMode: "A",
          }}
        >
          <Button size="xs" variant="surface">Inserir</Button>
        </Link>

        <Link
          to={"/ActivityManagement/view"}
          state={{
            activityId: activityActive,
            activityData: selectedActivity,
            currentMode: "V",
          }}
        >
          <Button size="xs" variant="surface" disabled={activityActive === null}>
            Visualizar
          </Button>
        </Link>

        <Link
          to={"/ActivityManagement/alter"}
          state={{
            activityId: activityActive,
            activityData: selectedActivity,
            currentMode: "E",
          }}
        >
          <Button size="xs" variant="surface" disabled={activityActive === null}>Alterar</Button>
        </Link>

        <Box ref={menuRef} position="relative">
          <Button size="xs" variant="surface" disabled={activityActive === null} onClick={toggleMenu}>
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
              <Link to={'/ActivityManagementUsers'} state={{
                activityData: activitiesList.find((u) => u._id === activityActive)
              }}>
                <Box as="li" cursor="pointer" py={1} px={2} borderRadius="sm" _hover={{ filter: "brightness(0.92)" }}>
                  Alunos
                </Box>
              </Link>

              <Box as="li" cursor="pointer" py={1} px={2} borderRadius="sm" _hover={{ filter: "brightness(0.92)" }}
                onClick={() => {
                  setOpen(false);
                  setDeleteDialogOpen(true);
                }}
              >
                Excluir turma
              </Box>
            </Box>
          )}
        </Box>
      </HStack>

      <Dialog.Root
        open={deleteDialogOpen}
        onOpenChange={(e) => setDeleteDialogOpen(e.open)}
        placement="center"
      >
        <Portal>
          <Dialog.Backdrop />

          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Excluir turma</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                <VStack align="start" gap={2}>
                  <Box>
                    Tem certeza que deseja excluir esta turma?
                  </Box>

                  {selectedActivity && (
                    <Box fontWeight="bold">
                      {selectedActivity.activity_name}
                    </Box>
                  )}

                  <Box fontSize="sm" color="gray.500">
                    Essa ação não poderá ser desfeita.
                  </Box>
                </VStack>
              </Dialog.Body>

              <Dialog.Footer>
                <HStack>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">
                      Cancelar
                    </Button>
                  </Dialog.ActionTrigger>

                  <Button
                    colorPalette="red"
                    onClick={handleDeleteActivity}
                  >
                    Sim, excluir
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>


      <Flex gap={2} align="center" mt={2} p={2} borderRadius="md">

        <Heading as="h3" size="sm" color="brand.primary">
          Visualizações:
        </Heading>

        <Flex align="center" gap={2} backgroundColor="brand.secondary" p={2} borderRadius="md">
          <FaThList size={20} color="brand.primary" />
          <Heading as="h3" size="sm" color="brand.primary">
            Lista
          </Heading>
        </Flex>

        <Flex align="center" gap={2} backgroundColor="brand.secondary" p={2} borderRadius="md">
          <PiCardsFill size={20} color="brand.primary" />
          <Heading as="h3" size="sm" color="brand.primary">
            Cards
          </Heading>
        </Flex>

        <Flex align="center" gap={2} backgroundColor="brand.secondary" p={2} borderRadius="md">
          <MdViewWeek size={20} color="brand.primary" />
          <Heading as="h3" size="sm" color="brand.primary">
            Semanal
          </Heading>
        </Flex>

      </Flex>

      <Box
        mt={4}
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        maxW="100%"
        overflow="hidden"
      >
        <Box
          maxH="calc(100vh - 295px)"
          minH="calc(100vh - 295px)"
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
              {filteredActivities.map((data) => (
                <List
                  pageId="activityManagement"
                  data={data}
                  fields={sortedFields}
                  ativo={activityActive === data._id}
                  onClick={() => setActivityActive(data._id)}
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
