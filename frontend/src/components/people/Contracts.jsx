import { useEffect, useState } from "react";

import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Input,
  NativeSelect,
  Flex,
} from "@chakra-ui/react";


export default function Contracts() {

  // ============================================================
  // PLANOS
  // ============================================================

  const plans = {

    Raiz: {
      mensal: 190,
      semestral: 170,
      anual: 150,
    },

    Balanço: {
      mensal: 270,
      semestral: 240,
      anual: 220,
    },

    Imersão: {
      mensal: 320,
      semestral: 290,
      anual: 260,
    },

    Beco: {
      mensal: 430,
      semestral: 390,
      anual: 350,
    },

  };


  // ============================================================
  // ESTADOS
  // ============================================================

  const [plan, setPlan] = useState("Beco");

  const [periodicity, setPeriodicity] =
    useState("mensal");


  // ============================================================
  // CONDIÇÃO ESPECIAL
  // ============================================================

  const [conditionEnabled, setConditionEnabled] =
    useState(false);

  const [conditionType, setConditionType] =
    useState("desconto");

  const [conditionPercentage, setConditionPercentage] =
    useState("");

  const [conditionValue, setConditionValue] =
    useState("");

  const [conditionReason, setConditionReason] =
    useState("");


  // ============================================================
  // DATAS DO CONTRATO
  // ============================================================

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [endDate, setEndDate] = useState("");


  // ============================================================
  // VALOR DO PLANO
  // ============================================================

  const baseValue =
    plans[plan]?.[periodicity] || 0;


  // ============================================================
  // CALCULA DATA FINAL
  // ============================================================

  const calculateEndDate = (
    start,
    period
  ) => {

    if (!start) {
      return "";
    }


    const date =
      new Date(`${start}T00:00:00`);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }


    // ----------------------------------------------------------
    // MENSAL
    // ----------------------------------------------------------

    if (period === "mensal") {

      date.setMonth(
        date.getMonth() + 1
      );

      date.setDate(
        date.getDate() - 1
      );

    }


    // ----------------------------------------------------------
    // SEMESTRAL
    // ----------------------------------------------------------

    if (period === "semestral") {

      date.setMonth(
        date.getMonth() + 6
      );

      date.setDate(
        date.getDate() - 1
      );

    }


    // ----------------------------------------------------------
    // ANUAL
    // ----------------------------------------------------------

    if (period === "anual") {

      date.setFullYear(
        date.getFullYear() + 1
      );

      date.setDate(
        date.getDate() - 1
      );

    }


    return date
      .toISOString()
      .split("T")[0];

  };


  // ============================================================
  // ATUALIZA DATA FINAL
  // ============================================================

  useEffect(() => {

    const newEndDate =
      calculateEndDate(
        startDate,
        periodicity
      );

    setEndDate(
      newEndDate
    );

  }, [
    startDate,
    periodicity
  ]);


  // ============================================================
  // VALOR CONTRATADO
  // ============================================================

  const calculateContractedValue = () => {

    // ----------------------------------------------------------
    // SEM CONDIÇÃO ESPECIAL
    // ----------------------------------------------------------

    if (!conditionEnabled) {

      return baseValue;

    }


    // ----------------------------------------------------------
    // DESCONTO
    // ----------------------------------------------------------

    if (
      conditionType === "desconto"
    ) {

      const percentage =
        Number(
          conditionPercentage
        ) || 0;


      return Math.max(
        0,
        baseValue -
        (
          baseValue *
          percentage
        ) / 100
      );

    }


    // ----------------------------------------------------------
    // BOLSA
    // ----------------------------------------------------------

    if (
      conditionType === "bolsa"
    ) {

      const percentage =
        Number(
          conditionPercentage
        ) || 0;


      return Math.max(
        0,
        baseValue -
        (
          baseValue *
          percentage
        ) / 100
      );

    }


    // ----------------------------------------------------------
    // VALOR PERSONALIZADO
    // ----------------------------------------------------------

    if (
      conditionType ===
      "personalizado"
    ) {

      return (
        Number(
          conditionValue
        ) || 0
      );

    }


    return baseValue;

  };


  const contractedValue =
    calculateContractedValue();


  // ============================================================
  // FORMATA VALOR
  // ============================================================

  const formatMoney = (
    value
  ) => {

    return Number(
      value
    ).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );

  };


  // ============================================================
  // FORMATA DATA PARA EXIBIÇÃO
  // ============================================================

  const formatDate = (
    date
  ) => {

    if (!date) {
      return "";
    }


    const [
      year,
      month,
      day
    ] = date.split("-");


    return `${day}/${month}/${year}`;

  };


  // ============================================================
  // LIMPA CAMPOS AO ALTERAR O TIPO
  // ============================================================

  useEffect(() => {

    setConditionPercentage("");

    setConditionValue("");

  }, [
    conditionType
  ]);


  // ============================================================
  // ALTERAR PLANO
  // ============================================================

  const handlePlanChange = (
    e
  ) => {

    setPlan(
      e.target.value
    );

  };


  // ============================================================
  // ALTERAR PERIODICIDADE
  // ============================================================

  const handlePeriodicityChange = (
    value
  ) => {

    setPeriodicity(
      value
    );

  };


  // ============================================================
  // ADICIONAR CONDIÇÃO
  // ============================================================

  const handleAddCondition = () => {

    setConditionEnabled(
      true
    );

  };


  // ============================================================
  // REMOVER CONDIÇÃO
  // ============================================================

  const handleRemoveCondition = () => {

    setConditionEnabled(
      false
    );

    setConditionPercentage(
      ""
    );

    setConditionValue(
      ""
    );

    setConditionReason(
      ""
    );

  };


  // ============================================================
  // SALVAR CONTRATO
  // ============================================================

  const handleSaveContract = () => {

    const contractData = {

      plan,

      periodicity,

      baseValue,

      contractedValue,

      startDate,

      endDate,

      specialCondition:
        conditionEnabled
          ? {

            type:
              conditionType,

            percentage:
              conditionType === "bolsa" ||
                conditionType === "desconto"
                ? Number(
                  conditionPercentage
                )
                : null,

            value:
              conditionType ===
                "personalizado"
                ? Number(
                  conditionValue
                )
                : null,

            reason:
              conditionReason,

          }
          : null,

    };


    console.log(
      "CONTRATO:",
      contractData
    );

  };


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <VStack
      align="stretch"
      gap={6}
      width="100%"
    >

      {/* ======================================================
          PLANO
          ====================================================== */}

      <Box>

        <Text
          fontSize="sm"
          fontWeight="medium"
          mb={2}
        >
          Plano
        </Text>


        <NativeSelect.Root>

          <NativeSelect.Field
            value={plan}
            onChange={
              handlePlanChange
            }
          >

            <option value="Raiz">
              Raiz
            </option>

            <option value="Balanço">
              Balanço
            </option>

            <option value="Imersão">
              Imersão
            </option>

            <option value="Beco">
              Beco
            </option>

          </NativeSelect.Field>

        </NativeSelect.Root>

      </Box>


      {/* ======================================================
          PERIODICIDADE
          ====================================================== */}

      <Box>

        <Text
          fontSize="sm"
          fontWeight="medium"
          mb={3}
        >
          Periodicidade
        </Text>


        <Flex
          gap={2}
          flexWrap="wrap"
        >

          {/* --------------------------------------------------
              MENSAL
              -------------------------------------------------- */}

          <Button
            type="button"
            variant={
              periodicity === "mensal"
                ? "solid"
                : "outline"
            }
            onClick={() =>
              handlePeriodicityChange(
                "mensal"
              )
            }
          >

            Mensal

            <Text ml={2}>
              {formatMoney(
                plans[plan].mensal
              )}
            </Text>

          </Button>


          {/* --------------------------------------------------
              SEMESTRAL
              -------------------------------------------------- */}

          <Button
            type="button"
            variant={
              periodicity === "semestral"
                ? "solid"
                : "outline"
            }
            onClick={() =>
              handlePeriodicityChange(
                "semestral"
              )
            }
          >

            Semestral

            <Text ml={2}>
              {formatMoney(
                plans[plan].semestral
              )}
            </Text>

          </Button>


          {/* --------------------------------------------------
              ANUAL
              -------------------------------------------------- */}

          <Button
            type="button"
            variant={
              periodicity === "anual"
                ? "solid"
                : "outline"
            }
            onClick={() =>
              handlePeriodicityChange(
                "anual"
              )
            }
          >

            Anual

            <Text ml={2}>
              {formatMoney(
                plans[plan].anual
              )}
            </Text>

          </Button>

        </Flex>


        {/* ==================================================
            DATAS DO CONTRATO
            ================================================== */}

        <Flex
          gap={4}
          mt={4}
          flexWrap="wrap"
        >

          {/* ==================================================
              DATA INICIAL
              ================================================== */}

          <Box
            flex="1"
            minW="220px"
          >

            <Text
              fontSize="sm"
              fontWeight="medium"
              mb={2}
            >
              Data inicial
            </Text>


            <Input
              type="date"
              value={startDate}
              onChange={(e) =>
                setStartDate(
                  e.target.value
                )
              }
            />

          </Box>


          {/* ==================================================
              DATA FINAL
              ================================================== */}

          <Box
            flex="1"
            minW="220px"
          >

            <Text
              fontSize="sm"
              fontWeight="medium"
              mb={2}
            >
              Data final
            </Text>


            <Input
              type="date"
              value={endDate}
              disabled
              bg="gray.100"
            />

          </Box>

        </Flex>

      </Box>


      {/* ======================================================
          VALOR DO PLANO
          ====================================================== */}

      <Box>

        <Text
          fontSize="sm"
          fontWeight="medium"
          mb={2}
        >
          Valor do plano
        </Text>


        <Input
          value={
            formatMoney(
              baseValue
            )
          }
          disabled
          bg="gray.100"
        />

      </Box>


      {/* ======================================================
          CONDIÇÃO ESPECIAL
          ====================================================== */}

      <Box>

        <HStack
          justify="space-between"
          mb={3}
        >

          <Text
            fontSize="sm"
            fontWeight="medium"
          >
            Condição especial
          </Text>


          {!conditionEnabled && (

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={
                handleAddCondition
              }
            >
              + Adicionar condição
            </Button>

          )}

        </HStack>


        {/* ====================================================
            FORMULÁRIO DA CONDIÇÃO
            ==================================================== */}

        {conditionEnabled && (

          <Box
            borderWidth="1px"
            borderColor="gray.300"
            borderRadius="md"
            p={5}
          >

            <VStack
              align="stretch"
              gap={5}
            >

              {/* ==================================================
                  TIPO
                  ================================================== */}

              <Box>

                <Text
                  fontSize="sm"
                  mb={2}
                >
                  Tipo
                </Text>


                <NativeSelect.Root>

                  <NativeSelect.Field
                    value={
                      conditionType
                    }
                    onChange={(e) =>
                      setConditionType(
                        e.target.value
                      )
                    }
                  >

                    <option value="desconto">
                      Desconto
                    </option>

                    <option value="bolsa">
                      Bolsa
                    </option>

                    <option value="personalizado">
                      Valor personalizado
                    </option>

                  </NativeSelect.Field>

                </NativeSelect.Root>

              </Box>


              {/* ==================================================
                  PERCENTUAL
                  ================================================== */}

              {(
                conditionType ===
                "desconto" ||

                conditionType ===
                "bolsa"
              ) && (

                  <Box>

                    <Text
                      fontSize="sm"
                      mb={2}
                    >
                      Percentual
                    </Text>


                    <HStack>

                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Ex.: 20"
                        value={
                          conditionPercentage
                        }
                        onChange={(e) =>
                          setConditionPercentage(
                            e.target.value
                          )
                        }
                      />

                      <Text>
                        %
                      </Text>

                    </HStack>

                  </Box>

                )}


              {/* ==================================================
                  VALOR PERSONALIZADO
                  ================================================== */}

              {conditionType ===
                "personalizado" && (

                  <Box>

                    <Text
                      fontSize="sm"
                      mb={2}
                    >
                      Valor
                    </Text>


                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex.: 150"
                      value={
                        conditionValue
                      }
                      onChange={(e) =>
                        setConditionValue(
                          e.target.value
                        )
                      }
                    />

                  </Box>

                )}


              {/* ==================================================
                  MOTIVO
                  ================================================== */}

              <Box>

                <Text
                  fontSize="sm"
                  mb={2}
                >
                  Motivo
                </Text>


                <Input
                  placeholder="Ex.: Projeto social"
                  value={
                    conditionReason
                  }
                  onChange={(e) =>
                    setConditionReason(
                      e.target.value
                    )
                  }
                />

              </Box>


              {/* ==================================================
                  RESUMO
                  ================================================== */}

              <Box
                borderTopWidth="1px"
                borderColor="gray.200"
                pt={4}
              >

                <Text
                  fontSize="sm"
                  color="gray.600"
                >
                  Valor original
                </Text>


                <Text
                  fontWeight="medium"
                >
                  {formatMoney(
                    baseValue
                  )}
                </Text>


                <Text
                  fontSize="sm"
                  color="gray.600"
                  mt={3}
                >
                  Valor contratado
                </Text>


                <Text
                  fontSize="lg"
                  fontWeight="bold"
                >
                  {formatMoney(
                    contractedValue
                  )}
                </Text>

              </Box>


              {/* ==================================================
                  REMOVER CONDIÇÃO
                  ================================================== */}

              <HStack
                justify="flex-end"
              >

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={
                    handleRemoveCondition
                  }
                >
                  Remover condição
                </Button>

              </HStack>

            </VStack>

          </Box>

        )}

      </Box>


      {/* ======================================================
          VALOR CONTRATADO
          ====================================================== */}

      <Box>

        <Text
          fontSize="sm"
          fontWeight="medium"
          mb={2}
        >
          Valor contratado
        </Text>


        <Input
          value={
            formatMoney(
              contractedValue
            )
          }
          disabled
          bg="gray.100"
        />

      </Box>


      {/* ======================================================
          SALVAR CONTRATO
          ====================================================== */}

      <HStack
        justify="flex-end"
      >

        <Button
          type="button"
          onClick={
            handleSaveContract
          }
        >
          Salvar contrato
        </Button>

      </HStack>

    </VStack>

  );

}