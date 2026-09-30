/*
    Type: Page
    Name: ActivityManagement
    Description:
      Página activityManagement responsável por orquestrar a tela,
      seus estados locais, integrações e componentes visuais.
    Author: Matheus Rodrigues
*/


// React Router
import { Link } from "react-router-dom";


// Chakra UI
import {
  Box,
  Button,
  Heading,
  VStack,
  Flex,
  Dialog,
  Portal
} from "@chakra-ui/react";


// React
import {
  useEffect,
  useRef,
  useState
} from "react";


// Hooks
import useTableFilter from "../../../hooks/useTableFilter";


// Services
import fieldsServices from "../../../services/fieldsServices";
import activitiesServices from "../../../services/activitiesServices";


// Components
import Loading from "../../../components/loading";
import HeadingPage from "../../../components/headingPage";


// Visualizações
import ActivityList from "../../../components/activities/activityList";
import ActivityCards from "../../../components/activities/activityCards";
import ActivityWeekly from "../../../components/activities/activityWeekly";


// React Icons
import { FaThList } from "react-icons/fa";
import { MdViewWeek } from "react-icons/md";
import { PiCardsFill } from "react-icons/pi";


export default function ActivityManagement() {


  // =========================================================
  // ESTADOS
  // =========================================================

  // Atividade atualmente selecionada
  const [activityActive, setActivityActive] =
    useState(null);


  // Visualização atual
  //
  // list   = lista
  // cards  = cards
  // weekly = semanal
  //
  const [viewMode, setViewMode] =
    useState("list");


  // Controle do menu "Outras opções"
  const [open, setOpen] =
    useState(false);


  // Controle do modal de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);


  // Filtros da tela
  const [filters, setFilters] =
    useState({});


  // Referência do menu "Outras opções"
  const menuRef = useRef(null);



  // =========================================================
  // SERVICES
  // =========================================================

  const {
    getActivities,
    refetchActivities,
    activitiesList,
    activitiesLoading,
    deleteActivity
  } = activitiesServices();



  // =========================================================
  // ATIVIDADE SELECIONADA
  // =========================================================

  const selectedActivity =
    activitiesList?.find(
      (activity) =>
        activity._id === activityActive
    );



  // =========================================================
  // MENU OUTRAS OPÇÕES
  // =========================================================

  const toggleMenu = () => {

    setOpen((prev) => !prev);

  };


  // Fecha o menu quando clicar fora dele
  useEffect(() => {

    const handleClickOutside = (event) => {

      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {

        setOpen(false);

      }

    };


    document.addEventListener(
      "mousedown",
      handleClickOutside
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);



  // =========================================================
  // BUSCA ATIVIDADES
  // =========================================================

  useEffect(() => {

    if (refetchActivities) {

      getActivities();

    }

  }, [refetchActivities]);



  // =========================================================
  // FILTROS
  // =========================================================

  const handleFilterChange = (
    field,
    value
  ) => {

    setFilters((prev) => ({

      ...prev,

      [field]: value

    }));

  };



  // =========================================================
  // SERVICES DE CAMPOS
  // =========================================================

  const {
    fieldsLoading,
    fieldsListByCollectionAndPage,
    getFieldsByCollectionAndPage
  } = fieldsServices();



  // Busca os campos da página
  useEffect(() => {

    getFieldsByCollectionAndPage(
      "activities",
      "activitiesManagement"
    );

  }, []);



  // =========================================================
  // ORDENAÇÃO DOS CAMPOS
  // =========================================================

  const sortedDataFields = [
    ...fieldsListByCollectionAndPage
  ].sort((a, b) => {

    const folderA =
      a.folder === 0
        ? 999
        : a.folder;


    const folderB =
      b.folder === 0
        ? 999
        : b.folder;


    if (folderA !== folderB) {

      return folderA - folderB;

    }


    return a.order - b.order;

  });



  // =========================================================
  // CAMPOS UTILIZADOS PELO FILTRO
  // =========================================================

  const sortedFields =
    sortedDataFields.map(
      (field) => ({

        text: field.title,

        type:
          field.filterType ||
          field.type ||
          "text",

        input: field.input,

        dataKey: field.field,

        optionsKey: field.field,

        minWidth:
          field.minWidth ||
          "120px",

        maxWidth:
          field.maxWidth ||
          "400px"

      })
    );



  // =========================================================
  // FILTRO PRINCIPAL
  // =========================================================

  const filteredActivities =
    useTableFilter(
      activitiesList,
      filters,
      sortedFields
    );



  // =========================================================
  // LOADING
  // =========================================================

  if (
    activitiesLoading ||
    fieldsLoading
  ) {

    return <Loading />;

  }



  // =========================================================
  // EXCLUIR ATIVIDADE
  // =========================================================

  const handleDeleteActivity =
    async () => {

      try {

        const result =
          await deleteActivity(
            activityActive
          );


        if (result.success) {

          setDeleteDialogOpen(
            false
          );

          setOpen(false);

          setActivityActive(
            null
          );

          getActivities();

        } else {

          console.log(result);

        }

      } catch (error) {

        console.log(error);

      }

    };



  // =========================================================
  // COMPONENTE
  // =========================================================

  return (

    <VStack
      gap={4}
      align="stretch"
      width="100%"
      minWidth={0}
    >


      {/* =====================================================
          TÍTULO
      ====================================================== */}

      <HeadingPage
        content="Gerenciar Atividades"
      />



      {/* =====================================================
          AÇÕES PRINCIPAIS
      ====================================================== */}

      <Flex

        gap={2}

        align="center"

        wrap="wrap"

        width="100%"

      >


        {/* =================================================
            INSERIR
        ================================================== */}

        <Link
          to="/ActivityManagement/add"
          state={{
            activityId:
              activityActive,

            activityData:
              selectedActivity,

            currentMode: "A"
          }}
        >

          <Button
            size="xs"
            variant="surface"
          >
            Inserir
          </Button>

        </Link>



        {/* =================================================
            VISUALIZAR
        ================================================== */}

        <Link
          to="/ActivityManagement/view"
          state={{
            activityId:
              activityActive,

            activityData:
              selectedActivity,

            currentMode: "V"
          }}
        >

          <Button
            size="xs"
            variant="surface"
            disabled={
              activityActive === null
            }
          >
            Visualizar
          </Button>

        </Link>



        {/* =================================================
            ALTERAR
        ================================================== */}

        <Link
          to="/ActivityManagement/alter"
          state={{
            activityId:
              activityActive,

            activityData:
              selectedActivity,

            currentMode: "E"
          }}
        >

          <Button
            size="xs"
            variant="surface"
            disabled={
              activityActive === null
            }
          >
            Alterar
          </Button>

        </Link>



        {/* =================================================
            PRESENÇAS
        ================================================== */}

        <Link
          to="/ActivityAttendance"
          state={{
            activityData:
              selectedActivity
          }}
        >

          <Button
            size="xs"
            variant="surface"
            disabled={
              activityActive === null
            }
          >
            Presenças
          </Button>

        </Link>



        {/* =================================================
            OUTRAS OPÇÕES
        ================================================== */}

        <Box
          ref={menuRef}
          position="relative"
        >

          <Button
            size="xs"
            variant="surface"
            disabled={
              activityActive === null
            }
            onClick={toggleMenu}
          >

            Outras opções ▼

          </Button>



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


              {/* Alunos */}

              <Link
                to="/ActivityManagementUsers"
                state={{
                  activityData:
                    activitiesList.find(
                      (activity) =>
                        activity._id ===
                        activityActive
                    )
                }}
              >

                <Box

                  as="li"

                  cursor="pointer"

                  py={1}

                  px={2}

                  borderRadius="sm"

                  _hover={{
                    filter:
                      "brightness(0.92)"
                  }}

                >

                  Alunos

                </Box>

              </Link>



              {/* Excluir */}

              <Box

                as="li"

                cursor="pointer"

                py={1}

                px={2}

                borderRadius="sm"

                _hover={{
                  filter:
                    "brightness(0.92)"
                }}

                onClick={() => {

                  setOpen(false);

                  setDeleteDialogOpen(
                    true
                  );

                }}

              >

                Excluir turma

              </Box>

            </Box>

          )}

        </Box>

      </Flex>



      {/* =====================================================
          MODAL DE EXCLUSÃO
      ====================================================== */}

      <Dialog.Root

        open={
          deleteDialogOpen
        }

        onOpenChange={(e) =>
          setDeleteDialogOpen(
            e.open
          )
        }

        placement="center"

      >

        <Portal>

          <Dialog.Backdrop />

          <Dialog.Positioner>

            <Dialog.Content>


              <Dialog.Header>

                <Dialog.Title>

                  Excluir turma

                </Dialog.Title>

              </Dialog.Header>



              <Dialog.Body>

                <VStack
                  align="start"
                  gap={2}
                >


                  <Box>

                    Tem certeza que deseja
                    excluir esta turma?

                  </Box>



                  {selectedActivity && (

                    <Box
                      fontWeight="bold"
                    >

                      {
                        selectedActivity
                          .activity_name
                      }

                    </Box>

                  )}



                  <Box

                    fontSize="sm"

                    color="gray.500"

                  >

                    Essa ação não poderá
                    ser desfeita.

                  </Box>

                </VStack>

              </Dialog.Body>



              <Dialog.Footer>

                <Flex
                  gap={2}
                  wrap="wrap"
                  justify="flex-end"
                  width="100%"
                >

                  <Dialog.ActionTrigger
                    asChild
                  >

                    <Button
                      variant="outline"
                    >
                      Cancelar
                    </Button>

                  </Dialog.ActionTrigger>



                  <Button

                    colorPalette="red"

                    onClick={
                      handleDeleteActivity
                    }

                  >

                    Sim, excluir

                  </Button>

                </Flex>

              </Dialog.Footer>

            </Dialog.Content>

          </Dialog.Positioner>

        </Portal>

      </Dialog.Root>



      {/* =====================================================
          SELETOR DE VISUALIZAÇÃO
      ====================================================== */}

      <Flex

        gap={2}

        align="center"

        mt={2}

        p={2}

        borderRadius="md"

        width="100%"

        minWidth={0}

        overflow="hidden"

      >


        {/* =================================================
            TEXTO
        ================================================== */}

        <Heading

          as="h3"

          size="sm"

          color="brand.primary"

          display={{
            base: "none",
            md: "block"
          }}

          whiteSpace="nowrap"

        >

          Visualizações:

        </Heading>



        {/* =================================================
            LISTA
        ================================================== */}

        <Flex

          align="center"

          justify="center"

          gap={2}

          p={2}

          borderRadius="md"

          cursor="pointer"

          flexShrink={0}

          backgroundColor={

            viewMode === "list"

              ? "brand.secondary"

              : "gray.100"

          }

          onClick={() =>
            setViewMode("list")
          }

          _hover={{

            filter:
              "brightness(0.95)"

          }}

        >

          <FaThList
            size={20}
          />


          <Heading

            as="h3"

            size="sm"

            color="brand.primary"

            display={{
              base: "none",
              md: "block"
            }}

          >

            Lista

          </Heading>

        </Flex>



        {/* =================================================
            CARDS
        ================================================== */}

        <Flex

          align="center"

          justify="center"

          gap={2}

          p={2}

          borderRadius="md"

          cursor="pointer"

          flexShrink={0}

          backgroundColor={

            viewMode === "cards"

              ? "brand.secondary"

              : "gray.100"

          }

          onClick={() =>
            setViewMode("cards")
          }

          _hover={{

            filter:
              "brightness(0.95)"

          }}

        >

          <PiCardsFill
            size={20}
          />


          <Heading

            as="h3"

            size="sm"

            color="brand.primary"

            display={{
              base: "none",
              md: "block"
            }}

          >

            Cards

          </Heading>

        </Flex>



        {/* =================================================
            SEMANAL
        ================================================== */}

        <Flex

          align="center"

          justify="center"

          gap={2}

          p={2}

          borderRadius="md"

          cursor="pointer"

          flexShrink={0}

          backgroundColor={

            viewMode === "weekly"

              ? "brand.secondary"

              : "gray.100"

          }

          onClick={() =>
            setViewMode("weekly")
          }

          _hover={{

            filter:
              "brightness(0.95)"

          }}

        >

          <MdViewWeek
            size={20}
          />


          <Heading

            as="h3"

            size="sm"

            color="brand.primary"

            display={{
              base: "none",
              md: "block"
            }}

          >

            Semanal

          </Heading>

        </Flex>

      </Flex>



      {/* =====================================================
          VISUALIZAÇÃO — LISTA
      ====================================================== */}

      {viewMode === "list" && (

        <Box
          width="100%"
          minWidth={0}
          overflowX="auto"
        >

          <ActivityList

            activities={
              filteredActivities
            }

            fields={
              sortedFields
            }

            filters={
              filters
            }

            onFilterChange={
              handleFilterChange
            }

            activityActive={
              activityActive
            }

            setActivityActive={
              setActivityActive
            }

          />

        </Box>

      )}



      {/* =====================================================
          VISUALIZAÇÃO — CARDS
      ====================================================== */}

      {viewMode === "cards" && (

        <Box
          width="100%"
          minWidth={0}
        >

          <ActivityCards

            activities={
              filteredActivities
            }

            activityActive={
              activityActive
            }

            setActivityActive={
              setActivityActive
            }

          />

        </Box>

      )}



      {/* =====================================================
          VISUALIZAÇÃO — SEMANAL
      ====================================================== */}

      {viewMode === "weekly" && (

        <Box
          width="100%"
          minWidth={0}
        >

          <ActivityWeekly

            activities={
              filteredActivities
            }

            activityActive={
              activityActive
            }

            setActivityActive={
              setActivityActive
            }

          />

        </Box>

      )}

    </VStack>

  );

}
