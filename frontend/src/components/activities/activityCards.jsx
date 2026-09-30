import {
  Box,
  SimpleGrid,
  Text,
  Heading,
  Badge,
  VStack,
  HStack
} from "@chakra-ui/react";


export default function ActivityCards({
  activities,
  activityActive,
  setActivityActive
}) {

  return (

    <Box
      mt={4}
      maxH="calc(100vh - 295px)"
      minH="calc(100vh - 295px)"
      overflowY="auto"
      p={1}
    >

      <SimpleGrid
        columns={{
          base: 1,
          sm: 2,
          lg: 3,
          xl: 4
        }}
        gap={4}
      >

        {activities.map((activity) => {

          const selected =
            activityActive === activity._id;


          return (

            <Box
              key={activity._id}

              p={4}

              border="1px solid"

              borderColor={
                selected
                  ? "brand.primary"
                  : "gray.200"
              }

              borderRadius="lg"

              backgroundColor={
                selected
                  ? "brand.secondary"
                  : "white"
              }

              cursor="pointer"

              transition="all 0.15s"

              onClick={() =>
                setActivityActive(
                  activity._id
                )
              }

              _hover={{
                shadow: "md",
                transform:
                  "translateY(-2px)"
              }}
            >

              <VStack
                align="stretch"
                gap={3}
              >

                {/* Nome */}

                <Heading
                  size="sm"
                  color="brand.primary"
                  lineHeight="1.3"
                >
                  {
                    activity.activity_name ||
                    activity.activity_title ||
                    "Sem nome"
                  }
                </Heading>


                {/* Matrícula */}

                {activity.activity_mat && (

                  <Text
                    fontSize="xs"
                    color="gray.500"
                  >
                    Matrícula:{" "}
                    {activity.activity_mat}
                  </Text>

                )}


                {/* Informações */}

                <VStack
                  align="stretch"
                  gap={1}
                  fontSize="sm"
                >

                  {activity.activity_days !==
                    undefined && (

                      <Text>
                        <strong>Dia:</strong>{" "}
                        {getDayName(
                          activity.activity_days
                        )}
                      </Text>

                    )}


                  {activity.start_time && (

                    <Text>
                      <strong>Horário:</strong>{" "}
                      {activity.start_time}

                      {activity.end_time &&
                        ` - ${activity.end_time}`}
                    </Text>

                  )}


                  {activity.active !==
                    undefined && (

                      <HStack>

                        <Text fontSize="sm">
                          <strong>Status:</strong>
                        </Text>

                        <Badge
                          colorPalette={
                            Number(
                              activity.active
                            ) === 1
                              ? "green"
                              : "red"
                          }
                        >
                          {
                            Number(
                              activity.active
                            ) === 1
                              ? "Ativa"
                              : "Inativa"
                          }
                        </Badge>

                      </HStack>

                    )}

                </VStack>

              </VStack>

            </Box>

          );

        })}

      </SimpleGrid>

    </Box>

  );
}


/*
=========================================================
CONVERTE O NÚMERO DO DIA PARA O NOME
=========================================================
*/

function getDayName(day) {

  const days = {

    1: "Segunda-feira",

    2: "Terça-feira",

    3: "Quarta-feira",

    4: "Quinta-feira",

    5: "Sexta-feira",

    6: "Sábado",

    7: "Domingo"

  };


  return days[day] || "Dia não informado";

}