import { useLocation } from "react-router-dom";
import ActivityManagementUserActivity from "../../activities/pages/activityManagementUserActivity";
import activitiesServices from "../../../services/activitiesServices";
import { useEffect, useState } from "react";
import { useDisclosure } from "@chakra-ui/react";
import CardActivity from "../../../components/cards/cardActivity";
import HandleBack from "../../../components/handleBack";
import { Box, Button, Flex, Heading, VStack } from "@chakra-ui/react";
import HeadingPage from "../../../components/headingPage";
import DialogAddActivity from "./dialog/dialogAddActivity";

export default function PeopleManagementActivities() {
  const location = useLocation();
  const { userData } = location.state || {};
  const { getActivitiesByMat, userActivitiesList, refetchActivities } =
    activitiesServices();

  // Substitui useState por useDisclosure
  const { open, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (refetchActivities) {
      getActivitiesByMat(userData.user_activities);
    }
  }, [refetchActivities]);

  const handleSavedActivities = (activitiesMat) => {
    getActivitiesByMat(activitiesMat);
  };

  return (
    <>
      <Flex>
        <Box flex="1" minW={0} display={"flex"} flexDirection={"column"} gap={4}>

          <HeadingPage content={"Atividades do usuário"} />

          <Button size="xs" variant="surface" onClick={onOpen}>
            Adicionar Atividade
          </Button>

          <VStack gap={2} align="stretch">
            {userActivitiesList.map((activity) => (
              <Box
                key={activity._id}
                cursor="pointer"
                transition="0.2s"
                _hover={{ transform: "scale(1.01)", bg: "blackAlpha.100" }}
              >
                <CardActivity key={activity._id} data={activity} />
              </Box>
            ))}
          </VStack>
        </Box>

        <Box w="50%" ml={4} mt="-65px" mr="-1em">
          <ActivityManagementUserActivity />
        </Box>
      </Flex>

      <DialogAddActivity
        open={open}
        onClose={onClose}
        userData={userData}
        onSaved={handleSavedActivities}
      />
    </>
  );
}