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
import { LiaGraduationCapSolid } from "react-icons/lia";
import { PiCardsFill } from "react-icons/pi";
import { LuCalendarDays, LuPlus, LuEye, LuPencil, LuUsers, LuEllipsis, LuTrash2 } from "react-icons/lu";





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

  /* =========================================================
   COMPONENTE
========================================================= */
  const activeFilters = Object.values(filters).filter((value) => value !== "" && value !== null && value !== undefined).length;
  const viewLabel = viewMode === "list" ? "Lista" : viewMode === "cards" ? "Cards" : "Semanal";

  return (
    <VStack gap={3} align="stretch" width="100%" minWidth={0} bg="#f8faf9">
      {/* Cabeçalho */}
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
        <Flex align="center" gap={3}>
          <Flex w="48px" h="48px" borderRadius="full" bg="#0b6b5b" color="white" align="center" justify="center" flexShrink={0}>
            <LiaGraduationCapSolid size={24} />
          </Flex>
          <Box>
            <Heading as="h1" fontSize={{ base: "22px", md: "26px" }} fontWeight={"700"} lineHeight="1.1" color="#062f2b">Gerenciar Atividades</Heading>
            <Box mt="4px" fontSize="12px" color="#5e7471">Gerencie as atividades, turmas e visualizações.</Box>
          </Box>
        </Flex>
        <Link to="/ActivityManagement/add" state={{ activityId: activityActive, activityData: selectedActivity, currentMode: "A" }}>
          <Button h="36px" px={5} borderRadius="8px" bg="#064e43" color="white" fontSize="12px" fontWeight="700" _hover={{ bg: "#043f37" }}>
            <LuPlus size={16} /> Inserir atividade
          </Button>
        </Link>
      </Flex>

      {/* Painel principal */}
      <Box bg="white" border="1px solid #d7e2df" borderRadius="8px" overflow="visible">
        {/* Ações */}
        <Flex p={3} gap={2} align="center" justify="space-between" wrap="wrap" borderBottom="1px solid #e6ecea">
          <Flex gap={2} wrap="wrap">
            <Link to="/ActivityManagement/view" state={{ activityId: activityActive, activityData: selectedActivity, currentMode: "V" }}>
              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={activityActive === null}><LuEye /> Visualizar</Button>
            </Link>
            <Link to="/ActivityManagement/alter" state={{ activityId: activityActive, activityData: selectedActivity, currentMode: "E" }}>
              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={activityActive === null}><LuPencil /> Alterar</Button>
            </Link>
            <Link to="/ActivityAttendance" state={{ activityData: selectedActivity }}>
              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={activityActive === null}><LuUsers /> Presenças</Button>
            </Link>
            <Box ref={menuRef} position="relative">
              <Button size="sm" variant="outline" borderColor="#d2dfdc" color="#174c45" disabled={activityActive === null} onClick={toggleMenu}><LuEllipsis /> Outras opções</Button>
              {open && (
                <Box as="ul" listStyleType="none" position="absolute" top="100%" left={0} mt={1} py={1} minW="170px" borderRadius="8px" border="1px solid #d7e2df" bg="white" boxShadow="0 8px 24px rgba(0,0,0,.08)" zIndex={100} fontSize="12px" color="#173f3a">
                  <Link to="/ActivityManagementUsers" state={{ activityData: activitiesList.find((activity) => activity._id === activityActive) }}>
                    <Box as="li" cursor="pointer" py={2} px={3} _hover={{ bg: "#f1f7f5" }}>Alunos</Box>
                  </Link>
                  <Box as="li" cursor="pointer" py={2} px={3} color="#c53030" display="flex" alignItems="center" gap={2} _hover={{ bg: "#fff5f5" }} onClick={() => { setOpen(false); setDeleteDialogOpen(true); }}><LuTrash2 /> Excluir turma</Box>
                </Box>
              )}
            </Box>
          </Flex>

          {/* Visualizações */}
          <Flex gap={1} align="center" bg="#f5f8f7" border="1px solid #e0e8e6" borderRadius="8px" p="3px">
            <Flex align="center" gap={1.5} px={3} py={1.5} borderRadius="6px" cursor="pointer" fontSize="12px" fontWeight="600" color={viewMode === "list" ? "#075e50" : "#667a77"} bg={viewMode === "list" ? "#dff3ed" : "transparent"} onClick={() => setViewMode("list")}><FaThList size={13} /> Lista</Flex>
            <Flex align="center" gap={1.5} px={3} py={1.5} borderRadius="6px" cursor="pointer" fontSize="12px" fontWeight="600" color={viewMode === "cards" ? "#075e50" : "#667a77"} bg={viewMode === "cards" ? "#dff3ed" : "transparent"} onClick={() => setViewMode("cards")}><PiCardsFill size={14} /> Cards</Flex>
            <Flex align="center" gap={1.5} px={3} py={1.5} borderRadius="6px" cursor="pointer" fontSize="12px" fontWeight="600" color={viewMode === "weekly" ? "#075e50" : "#667a77"} bg={viewMode === "weekly" ? "#dff3ed" : "transparent"} onClick={() => setViewMode("weekly")}><MdViewWeek size={15} /> Semanal</Flex>
          </Flex>
        </Flex>

        {/* Resumo */}
        {/* CARDS DE RESUMO */}
        <Flex gap={3} wrap="wrap" width="95%" mx="auto" mt={3} mb={2} justify="space-between">

          {/* Total de atividades */}
          <Box flex="1" minW="190px" p={3} border="1px solid #c8e8df" borderRadius="8px" bg="#f2fbf8">
            <Flex align="center" gap={3}>
              <Flex w="34px" h="34px" borderRadius="full" bg="#007565" color="white" align="center" justify="center" flexShrink={0}>
                <FaThList size={15} />
              </Flex>
              <Box>
                <Box fontSize="14px" fontWeight="600" color="#007565">Total de atividades</Box>
                <Heading mt="1px" fontSize="20px" color="#063f37" fontWeight="800">
                  {activitiesList?.length || 0}
                </Heading>
                <Box fontSize="12px" color="#60777c">atividades cadastradas</Box>
              </Box>
            </Flex>
          </Box>

          {/* Em andamento */}
          <Box flex="1" minW="190px" p={3} border="1px solid #bde6cf" borderRadius="8px" bg="#f1fbf5">
            <Flex align="center" gap={3}>
              <Flex w="34px" h="34px" borderRadius="full" bg="#149447" color="white" align="center" justify="center" flexShrink={0}>
                ✓
              </Flex>
              <Box>
                <Box fontSize="14px" fontWeight="600" color="#149447">Em andamento</Box>
                <Heading mt="1px" fontSize="20px" color="#063f37" fontWeight="800">
                  {activitiesList?.filter((activity) => activity.activity_active === 1).length || 0}
                </Heading>
                <Box fontSize="12px" color="#60777c">atividades ativas</Box>
              </Box>
            </Flex>
          </Box>

          {/* Total de alunos */}
          <Box flex="1" minW="190px" p={3} border="1px solid #d8dfeb" borderRadius="8px" bg="#f7f9fc">
            <Flex align="center" gap={3}>
              <Flex w="34px" h="34px" borderRadius="full" bg="#4267a9" color="white" align="center" justify="center" flexShrink={0}>
                👥
              </Flex>
              <Box>
                <Box fontSize="14px" fontWeight="600" color="#4267a9">Total de alunos</Box>
                <Heading mt="1px" fontSize="20px" color="#063f37" fontWeight="800">
                  {activitiesList?.reduce(
                    (total, activity) => total + (activity.students?.length || 0),
                    0
                  ) || 0}
                </Heading>
                <Box fontSize="12px" color="#60777c">alunos matriculados</Box>
              </Box>
            </Flex>
          </Box>

        </Flex>

        {/* Conteúdo */}
        <Box px={3} pb={3}>
          <Flex justify="space-between" align="center">
            <Heading as="h2" fontSize="16px" color="#062f2b" fontWeight="700">Atividades</Heading>
            <Box fontSize="13px" color="#607873">{filteredActivities?.length || 0} registros</Box>
          </Flex>
          {viewMode === "list" && <Box width="100%" minWidth={0} overflowX="auto"><ActivityList activities={filteredActivities} fields={sortedFields} filters={filters} onFilterChange={handleFilterChange} activityActive={activityActive} setActivityActive={setActivityActive} /></Box>}
          {viewMode === "cards" && <Box width="100%" minWidth={0}><ActivityCards activities={filteredActivities} activityActive={activityActive} setActivityActive={setActivityActive} /></Box>}
          {viewMode === "weekly" && <Box width="100%" minWidth={0}><ActivityWeekly activities={filteredActivities} activityActive={activityActive} setActivityActive={setActivityActive} /></Box>}
        </Box>
      </Box>

      {/* Modal de exclusão */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)} placement="center">
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content borderRadius="10px">
          <Dialog.Header><Dialog.Title color="#062f2b">Excluir turma</Dialog.Title></Dialog.Header>
          <Dialog.Body><VStack align="start" gap={2}><Box>Tem certeza que deseja excluir esta turma?</Box>{selectedActivity && <Box fontWeight="bold">{selectedActivity.activity_name}</Box>}<Box fontSize="sm" color="gray.500">Essa ação não poderá ser desfeita.</Box></VStack></Dialog.Body>
          <Dialog.Footer><Flex gap={2} justify="flex-end" width="100%"><Dialog.ActionTrigger asChild><Button variant="outline">Cancelar</Button></Dialog.ActionTrigger><Button colorPalette="red" onClick={handleDeleteActivity}>Sim, excluir</Button></Flex></Dialog.Footer>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>
    </VStack>
  );
}
