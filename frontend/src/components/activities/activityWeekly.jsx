import {
  Box,
  Text,
  Heading,
  SimpleGrid,
  VStack,
  HStack,
  Button
} from "@chakra-ui/react";

import { useState } from "react";


export default function ActivityWeekly({
  activities,
  activityActive,
  setActivityActive
}) {

  console.log(activities);


  // ==========================================================
  // DIA SELECIONADO NO MOBILE
  // ==========================================================

  const [selectedDay, setSelectedDay] =
    useState(1);


  const weekDays = [

    {
      number: 1,
      name: "Segunda",
      short: "SEG"
    },

    {
      number: 2,
      name: "Terça",
      short: "TER"
    },

    {
      number: 3,
      name: "Quarta",
      short: "QUA"
    },

    {
      number: 4,
      name: "Quinta",
      short: "QUI"
    },

    {
      number: 5,
      name: "Sexta",
      short: "SEX"
    },

    {
      number: 6,
      name: "Sábado",
      short: "SÁB"
    },

    {
      number: 7,
      name: "Domingo",
      short: "DOM"
    }

  ];


  // ==========================================================
  // ATIVIDADES DO DIA SELECIONADO
  // ==========================================================

  const selectedDayData =
    weekDays.find(
      (day) =>
        day.number === selectedDay
    );


  const selectedDayActivities =
    activities.filter(
      (activity) =>
        Number(
          activity.activity_days
        ) === selectedDay
    );


  return (

    <Box
      mt={4}

      border="1px solid"

      borderColor="gray.200"

      borderRadius="md"

      overflow="hidden"

      maxH="calc(100vh - 295px)"

      minH="calc(100vh - 295px)"

      overflowY="auto"
    >


      {/* =====================================================
          MOBILE
      ====================================================== */}

      <Box
        display={{
          base: "block",
          md: "none"
        }}
      >

        {/* =================================================
            SELETOR DE DIAS
        ================================================== */}

        <Box
          overflowX="auto"

          borderBottom="1px solid"

          borderColor="gray.200"

          backgroundColor="white"
        >

          <HStack
            gap={0}
            minW="max-content"
          >

            {weekDays.map(
              (day) => {

                const selected =
                  selectedDay ===
                  day.number;


                return (

                  <Button

                    key={day.number}

                    variant="ghost"

                    borderRadius="0"

                    minW="55px"

                    height="50px"

                    fontSize="xs"

                    fontWeight={
                      selected
                        ? "bold"
                        : "normal"
                    }

                    color={
                      selected
                        ? "brand.primary"
                        : "gray.500"
                    }

                    borderBottom={
                      selected
                        ? "3px solid"
                        : "3px solid transparent"
                    }

                    borderColor={
                      selected
                        ? "brand.primary"
                        : "transparent"
                    }

                    onClick={() =>
                      setSelectedDay(
                        day.number
                      )
                    }

                  >

                    {day.short}

                  </Button>

                );

              }
            )}

          </HStack>

        </Box>


        {/* =================================================
            NOME DO DIA
        ================================================== */}

        <Box
          px={4}
          py={3}

          borderBottom="1px solid"

          borderColor="gray.200"

          backgroundColor="brand.secondary"
        >

          <Heading
            size="sm"
            color="brand.primary"
          >

            {selectedDayData.name}

          </Heading>

        </Box>


        {/* =================================================
            ATIVIDADES DO DIA
        ================================================== */}

        <Box
          p={2}

          backgroundColor="gray.50"
        >

          <VStack
            align="stretch"
            gap={2}
          >

            {selectedDayActivities.map(
              (activity) => {

                const selected =
                  activityActive ===
                  activity._id;


                return (

                  <Box

                    key={activity._id}

                    p={3}

                    borderRadius="md"

                    border="1px solid"

                    borderColor={
                      selected
                        ? "brand.primary"
                        : "gray.200"
                    }

                    backgroundColor={
                      selected
                        ? "brand.secondary"
                        : "white"
                    }

                    cursor="pointer"

                    boxShadow="sm"

                    onClick={() =>
                      setActivityActive(
                        activity._id
                      )
                    }

                    _hover={{
                      shadow: "md"
                    }}

                  >

                    {/* Nome */}

                    <Text
                      fontWeight="bold"
                      fontSize="sm"
                      color="brand.primary"
                    >

                      {
                        activity.activity_name ||
                        activity.activity_title ||
                        "Sem nome"
                      }

                    </Text>


                    {/* Horário */}

                    <Text
                      fontSize="xs"
                      mt={1}
                      color="gray.600"
                    >

                      {
                        activity.activity_time_start ||
                        "--:--"
                      }

                      {" - "}

                      {
                        activity.activity_time_end ||
                        "--:--"
                      }

                    </Text>


                    {/* Matrícula */}

                    {activity.activity_mat && (

                      <Text
                        fontSize="xs"
                        color="gray.500"
                        mt={1}
                      >

                        #
                        {activity.activity_mat}

                      </Text>

                    )}

                  </Box>

                );

              }
            )}


            {/* =================================================
                NENHUMA ATIVIDADE
            ================================================== */}

            {selectedDayActivities.length === 0 && (

              <Text
                fontSize="xs"
                color="gray.400"
                textAlign="center"
                py={8}
              >

                Nenhuma atividade

              </Text>

            )}

          </VStack>

        </Box>

      </Box>


      {/* =====================================================
          DESKTOP
      ====================================================== */}

      <Box
        display={{
          base: "none",
          md: "block"
        }}
      >

        {/* =================================================
            CABEÇALHO DOS DIAS
        ================================================== */}

        <SimpleGrid
          columns={7}
          minW="900px"
        >

          {weekDays.map(
            (day) => (

              <Box
                key={day.number}

                p={3}

                textAlign="center"

                backgroundColor="brand.secondary"

                borderRight="1px solid"

                borderColor="gray.200"
              >

                <Heading
                  size="xs"
                  color="brand.primary"
                >

                  {day.name}

                </Heading>

              </Box>

            )
          )}

        </SimpleGrid>


        {/* =================================================
            ÁREA DOS EVENTOS
        ================================================== */}

        <SimpleGrid
          columns={7}
          minW="900px"
        >

          {weekDays.map(
            (day) => {

              const dayActivities =
                activities.filter(
                  (activity) =>
                    Number(
                      activity.activity_days
                    ) === day.number
                );


              return (

                <Box
                  key={day.number}

                  minH="500px"

                  p={2}

                  borderRight="1px solid"

                  borderColor="gray.200"

                  backgroundColor="gray.50"
                >

                  <VStack
                    align="stretch"
                    gap={2}
                  >

                    {dayActivities.map(
                      (activity) => {

                        const selected =
                          activityActive ===
                          activity._id;


                        return (

                          <Box

                            key={activity._id}

                            p={3}

                            borderRadius="md"

                            border="1px solid"

                            borderColor={
                              selected
                                ? "brand.primary"
                                : "gray.200"
                            }

                            backgroundColor={
                              selected
                                ? "brand.secondary"
                                : "white"
                            }

                            cursor="pointer"

                            boxShadow="sm"

                            onClick={() =>
                              setActivityActive(
                                activity._id
                              )
                            }

                            _hover={{
                              shadow: "md"
                            }}

                          >

                            {/* Nome */}

                            <Text
                              fontWeight="bold"
                              fontSize="sm"
                              color="brand.primary"
                            >

                              {
                                activity.activity_name ||
                                activity.activity_title ||
                                "Sem nome"
                              }

                            </Text>


                            {/* Horário */}

                            <Text
                              fontSize="xs"
                              mt={1}
                              color="gray.600"
                            >

                              {
                                activity.activity_time_start ||
                                "--:--"
                              }

                              {" - "}

                              {
                                activity.activity_time_end ||
                                "--:--"
                              }

                            </Text>


                            {/* Matrícula */}

                            {activity.activity_mat && (

                              <Text
                                fontSize="xs"
                                color="gray.500"
                                mt={1}
                              >

                                #
                                {
                                  activity.activity_mat
                                }

                              </Text>

                            )}

                          </Box>

                        );

                      }
                    )}


                    {/* =================================================
                        NENHUMA ATIVIDADE
                    ================================================== */}

                    {dayActivities.length === 0 && (

                      <Text
                        fontSize="xs"
                        color="gray.400"
                        textAlign="center"
                        mt={4}
                      >

                        Nenhuma atividade

                      </Text>

                    )}

                  </VStack>

                </Box>

              );

            }
          )}

        </SimpleGrid>

      </Box>

    </Box>

  );

}