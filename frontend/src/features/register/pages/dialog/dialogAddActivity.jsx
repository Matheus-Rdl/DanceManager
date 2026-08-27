import {
  Dialog,
  Button,
  Checkbox,
  Box,
  HStack,
  VStack,
  Heading,
  Portal,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import Select from "react-select";
import activitiesServices from "../../../../services/activitiesServices";
import usersServices from "../../../../services/usersServices";
import CardList from "../../../../components/cards/cardList";
import CardActivitySelect from "../../../../components/cards/cardActivity";

export default function DialogAddActivity({ open, onClose, userData, onSaved }) {
  const { getActivitiesByType, activityTypeList, refetchActivities } =
    activitiesServices();
  const { getActivities } = activitiesServices();
  const { updateUserActivities } = usersServices();

  useEffect(() => {
    getActivities();
  }, []);

  const [selectedActivities, setSelectedActivities] = useState([]);

  useEffect(() => {
    if (userData?.user_activities) {
      setSelectedActivities(userData.user_activities);
    }
  }, [userData]);

  const [listActive, setListActive] = useState(1);

  const activity_type = {
    1: "1 - Inglês",
    2: "2 - Espanhol",
    3: "3 - Fotografia",
    4: "4 - Genérico",
  };

  useEffect(() => {
    if (refetchActivities) {
      getActivitiesByType(["1", "2", "3", "4"]);
    }
  }, [refetchActivities]);

  const handleToggle = (activityMat) => {
    setSelectedActivities((prev) =>
      prev.includes(activityMat)
        ? prev.filter((mat) => mat !== activityMat)
        : [...prev, activityMat]
    );
  };

  const handleSave = async () => {
    console.log("1 - CLICOU EM SALVAR");

    console.log("2 - userData:", userData);
    console.log("3 - selectedActivities:", selectedActivities);

    const result = await updateUserActivities(
      userData._id,
      selectedActivities
    );

    console.log("4 - RESULTADO:", result);

    if (typeof onSaved === "function") {
      onSaved(selectedActivities);
    }

    onClose();
  };

  const filteredActivities = activityTypeList.filter(
    (activity) => activity.activity_type === String(listActive)
  );

  /*useEffect(() => {
    console.log(activityTypeList);
  }, [activityTypeList]);*/

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose();
        }
      }}
      size="lg"
    >
      <Portal>
        <Dialog.Backdrop />

        <Dialog.Positioner>
          <Dialog.Content
            w="80vw"
            maxW="700px"
            maxH="80vh"
          >
            <Dialog.Header size="md" color="gray.600">
              Adicionar atividade
            </Dialog.Header>

            <Dialog.CloseTrigger />

            <Dialog.Body overflowY="auto" pb={4}>
              <HStack spacing={2} mb={6} wrap="wrap">
                {Object.entries(activity_type).map(([key, label]) => (
                  <CardList
                    key={key}
                    text={label.slice(3)}
                    active={listActive === Number(key)}
                    onClick={() => setListActive(Number(key))}
                  />
                ))}
              </HStack>

              <VStack
                align="stretch"
                spacing={2}
                maxH="400px"
              >
                {filteredActivities.map((activity) => (
                  <HStack
                    key={activity._id}
                    spacing={3}
                    p={2}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="gray.200"
                  >
                    <Checkbox.Root
                      checked={selectedActivities.includes(
                        activity.activity_mat
                      )}
                      onCheckedChange={() =>
                        handleToggle(activity.activity_mat)
                      }
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>

                    <Box flex="1">
                      <CardActivitySelect data={activity} />
                    </Box>
                  </HStack>
                ))}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancelar
              </Button>

              <Button colorScheme="blue" onClick={handleSave}>
                Salvar
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}