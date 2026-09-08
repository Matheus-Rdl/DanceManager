import { useLocation } from "react-router-dom";

import ActivityManagementUserActivity from "../../activities/pages/activityManagementUserActivity";
import activitiesServices from "../../../services/activitiesServices";

import { useEffect } from "react";

import { useDisclosure } from "@chakra-ui/react";

import CardActivity from "../../../components/cards/cardActivity";
import HeadingPage from "../../../components/headingPage";
import DialogAddActivity from "./dialog/dialogAddActivity";

import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";


export default function PeopleManagementActivities() {

  const location = useLocation();

  const {
    userData,
  } = location.state || {};


  const {
    getActivitiesByMat,
    userActivitiesList,
    refetchActivities,
  } = activitiesServices();


  // ============================================================
  // DIALOG
  // ============================================================

  const {
    open,
    onOpen,
    onClose,
  } = useDisclosure();


  // ============================================================
  // CARREGA ATIVIDADES
  // ============================================================

  useEffect(() => {

    if (
      refetchActivities &&
      userData?.user_activities
    ) {

      getActivitiesByMat(
        userData.user_activities
      );

    }

  }, [
    refetchActivities,
    userData,
  ]);


  // ============================================================
  // APÓS SALVAR ATIVIDADE
  // ============================================================

  const handleSavedActivities = (
    activitiesMat
  ) => {

    getActivitiesByMat(
      activitiesMat
    );

  };


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <VStack
      gap={4}
      align="stretch"
    >

      {/* ======================================================
          TÍTULO
          ====================================================== */}

      <HeadingPage
        content="Atividades do usuário"
      />


      {/* ======================================================
          INFORMAÇÕES DO ALUNO
          ====================================================== */}

      <Box>

        <Text
          fontSize="sm"
          color="gray.500"
        >
          Aluno
        </Text>


        <Text
          fontSize="lg"
          fontWeight="bold"
        >

          {userData?.user_name ||
            userData?.name ||
            "Aluno selecionado"}

        </Text>

      </Box>


      {/* ======================================================
          BOTÕES
          ====================================================== */}

      <HStack
        gap={2}
      >

        <Button
          size="xs"
          variant="surface"
          onClick={onOpen}
        >
          Adicionar atividade
        </Button>

      </HStack>


      {/* ======================================================
          LISTA DE ATIVIDADES
          ====================================================== */}

      <Box
        mt={2}
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        overflow="hidden"
      >

        {userActivitiesList.length === 0 ? (

          // ==================================================
          // NENHUMA ATIVIDADE
          // ==================================================

          <Box
            p={8}
            textAlign="center"
          >

            <Text
              color="gray.500"
            >
              Este aluno ainda não possui
              atividades.
            </Text>

          </Box>

        ) : (

          // ==================================================
          // ATIVIDADES
          // ==================================================

          <VStack
            align="stretch"
            gap={0}
          >

            {userActivitiesList.map(
              (activity, index) => (

                <Box
                  key={activity._id}
                  px={4}
                  py={3}
                  borderBottom={
                    index !==
                      userActivitiesList.length - 1
                      ? "1px solid"
                      : "none"
                  }
                  borderColor="gray.200"
                  transition="0.2s"
                  _hover={{
                    bg: "blackAlpha.50",
                  }}
                >

                  <CardActivity
                    data={activity}
                  />

                </Box>

              )
            )}

          </VStack>

        )}

      </Box>


      {/* ======================================================
          DIALOG — ADICIONAR ATIVIDADE
          ====================================================== */}

      <DialogAddActivity
        open={open}
        onClose={onClose}
        userData={userData}
        onSaved={handleSavedActivities}
      />

    </VStack>

  );

}