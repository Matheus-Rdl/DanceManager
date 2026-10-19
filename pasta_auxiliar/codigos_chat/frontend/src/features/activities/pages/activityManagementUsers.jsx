import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ActivityNavigation from "../../../components/ActivityNavigation";
import useActivityContext from "../../../hooks/useActivityContext";
import { getActivityTeacherLabel } from "../../../utils/activityTeachers";
import { formatProperNoun } from "../../../utils/formatters";
import usersServices from "../../../services/usersServices";
import List from "../../../components/list";
import HeaderFilter from "../../../components/headerFilter";
import useTableFilter from "../../../hooks/useTableFilter";
import { Table, Box, Button, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import HeadingPage from "../../../components/headingPage";
import fieldsServices from "../../../services/fieldsServices";

export default function ActivityManagementUsers() {
  const { activityData, activityMat, activityLoading, activityError } = useActivityContext();
  const navigate = useNavigate();
  const { getUsersByActivity, userListActivies, refetchUsers, } =
    usersServices();
  const [userActivityActive, setUserActivityActive] = useState(null);
  const [filters, setFilters] = useState({});
  const selectedUser = userListActivies?.find((u) => u._id === userActivityActive);

  useEffect(() => {
    if (refetchUsers && activityMat) {
      //console.log("Buscando atividade:", activityData.activity_mat);
      getUsersByActivity(activityMat);
    }
  }, [refetchUsers, activityMat]);

  //Função para atualizar filtros
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
      "users",
      "peopleManagement"
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
      minWidth: field.minWidth || "120px",
      maxWidth: field.maxWidth || "400px",
    }));
  /* Identifica pessoas afastadas/inativas sem removê-las da turma. */
  if (!sortedFields.some(field => field.dataKey === "user_situation")) {
    sortedFields.push({ text: "Situação", type: "select", input: 2,
      dataKey: "user_situation", optionsKey: "user_situation", minWidth: "140px", maxWidth: "180px" });
  }

  //Função principal que vai filtrar na tela
  // Aplica a regra de filtro em memória antes da renderização, mantendo a tabela desacoplada da lógica de busca.
  const filteredUsers = useTableFilter(
    userListActivies,
    filters,
    sortedFields
  );

  if (!activityMat) return <Box p={4} bg="white" border="1px solid #d7e2df" borderRadius="8px">
    <Text fontSize="13px">Selecione uma turma na Gestão de Atividades para ver seus alunos.</Text>
    <Button mt={3} size="sm" variant="outline" onClick={() => navigate("/ActivityManagement")}>Voltar às atividades</Button>
  </Box>;

  return (
    <Flex w="100%" minW={0} gap={3} direction={{ base: "column", xl: "row" }} align="stretch">
      <Box flex="1" minW={0}>
        <HeadingPage content={activityData?.activity_title ? formatProperNoun(activityData.activity_title) : "Alunos da turma"} />
        {activityLoading && <Text color="gray.500" fontSize="xs" mt={1}>Carregando informações da turma...</Text>}
        {activityError && <Text color="red.600" fontSize="xs" mt={1}>{activityError}</Text>}
        <Box mt={3} border="1px solid #d7e2df" borderRadius="8px" overflow="hidden">
          <Box px={3} py={3} bg="white">
            <Text color="#063f39" fontWeight="700" fontSize="13px">{activityData?.activity_title || "Turma selecionada"}</Text>
            <Text color="gray.500" fontSize="11px">MAT: {activityMat} {activityData ? `• Professores: ${getActivityTeacherLabel(activityData)}` : ""}</Text>
          </Box>
          <ActivityNavigation activeTab="Lista de alunos" activityData={activityData} activityMat={activityMat} />
        </Box>
        <Text mt={3} fontSize="12px" color="#607873">Alunos vinculados a esta turma</Text>

        <HStack gap={2} mt={2}>
          <Link
            to={"/PeopleManagement/view"}
            state={{
              userId: userActivityActive,
              userData: selectedUser,
              currentMode: "V",
            }}
          >
            <Button size="xs" variant="surface" disabled={userActivityActive === null}>
              Visualizar
            </Button>
          </Link>

          <Link
            to={"/PeopleManagementDetailed"}
            state={{
              userId: userActivityActive,
              userData: selectedUser,
              currentMode: "E",
            }}
          >
            <Button size="xs" variant="surface" disabled={userActivityActive === null}>Alterar</Button>
          </Link>

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
            maxH="calc(100vh - 375px)"
            minH="calc(100vh - 375px)"
            overflow="auto"
          >
            <Table.Root variant="line" size="sm" whiteSpace="nowrap">
              <HeaderFilter
                fields={sortedFields}
                filters={filters}
                onFilterChange={handleFilterChange}
              />

              <Table.Body>
                {filteredUsers.map((data) => (
                  <List
                    pageId="peopleManagement"
                    data={data}
                    fields={sortedFields}
                    ativo={userActivityActive === data._id}
                    onClick={() => setUserActivityActive(data._id)}
                  />
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>

      </Box>

    </Flex>
  );
}
