import { useEffect, useState } from "react";

import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Table,
  Badge,
  Dialog,
  Input,
  Field,
  NativeSelect,
  Portal,
} from "@chakra-ui/react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import HeadingPage from "../../../components/headingPage";


// ============================================================
// PLANOS
// ============================================================

const PLANS = {

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


export default function PeopleManagementContracts() {

  const location = useLocation();
  const navigate = useNavigate();


  const {
    userId,
    userData,
  } = location.state || {};


  // ============================================================
  // ESTADOS
  // ============================================================

  const [contracts, setContracts] = useState([]);

  const [isDialogOpen, setIsDialogOpen] =
    useState(false);


  const [formData, setFormData] = useState({

    plan: "",

    periodicity: "",

    baseValue: "",

    contractedValue: "",

    startDate: "",

    endDate: "",

    specialConditionType: "",

    customValue: "",

    scholarshipPercentage: "",

  });


  // ============================================================
  // CARREGA CONTRATOS
  // ============================================================

  useEffect(() => {

    if (!userId) {

      setContracts([]);

      return;

    }


    const storedContracts =
      JSON.parse(
        localStorage.getItem(
          "danceManagerContracts"
        ) || "[]"
      );


    const userContracts =
      storedContracts.filter(
        (contract) =>
          contract.userId === userId
      );


    setContracts(userContracts);

  }, [userId]);


  // ============================================================
  // FORMATA VALOR
  // ============================================================

  const formatMoney = (value) => {

    return Number(value || 0).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );

  };


  // ============================================================
  // FORMATA DATA
  // ============================================================

  const formatDate = (date) => {

    if (!date) {

      return "-";

    }


    const [year, month, day] =
      date.split("-");


    return `${day}/${month}/${year}`;

  };


  // ============================================================
  // CALCULA DATA DE FIM
  // ============================================================

  const calculateEndDate = (
    startDate,
    periodicity
  ) => {

    if (
      !startDate ||
      !periodicity
    ) {

      return "";

    }


    const [year, month, day] =
      startDate
        .split("-")
        .map(Number);


    const date = new Date(
      year,
      month - 1,
      day
    );


    if (
      periodicity === "Mensal"
    ) {

      date.setMonth(
        date.getMonth() + 1
      );

    }


    if (
      periodicity === "Semestral"
    ) {

      date.setMonth(
        date.getMonth() + 6
      );

    }


    if (
      periodicity === "Anual"
    ) {

      date.setFullYear(
        date.getFullYear() + 1
      );

    }


    date.setDate(
      date.getDate() - 1
    );


    const finalYear =
      date.getFullYear();


    const finalMonth =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");


    const finalDay =
      String(
        date.getDate()
      ).padStart(2, "0");


    return `${finalYear}-${finalMonth}-${finalDay}`;

  };


  // ============================================================
  // CALCULA VALOR FINAL
  // ============================================================

  const calculateContractedValue = ({
    baseValue,
    conditionType,
    customValue,
    scholarshipPercentage,
  }) => {

    const base =
      Number(baseValue || 0);


    // ----------------------------------------------------------
    // NENHUMA CONDIÇÃO
    // ----------------------------------------------------------

    if (
      !conditionType
    ) {

      return base;

    }


    // ----------------------------------------------------------
    // VALOR PERSONALIZADO
    // ----------------------------------------------------------

    if (
      conditionType ===
      "Valor personalizado"
    ) {

      return Number(
        customValue || 0
      );

    }


    // ----------------------------------------------------------
    // BOLSA
    // ----------------------------------------------------------

    if (
      conditionType === "Bolsa"
    ) {

      const percentage =
        Number(
          scholarshipPercentage || 0
        );


      return (
        base -
        (base * percentage) / 100
      );

    }


    return base;

  };


  // ============================================================
  // ALTERA FORMULÁRIO
  // ============================================================

  const handleChange = (
    field,
    value
  ) => {

    setFormData((prev) => {

      const updated = {
        ...prev,
        [field]: value,
      };


      // ========================================================
      // ALTEROU PLANO
      // ========================================================

      if (
        field === "plan"
      ) {

        if (
          value &&
          prev.periodicity
        ) {

          const periodicityKey =
            prev.periodicity.toLowerCase();


          const planValue =
            PLANS[value]?.[
            periodicityKey
            ] || 0;


          updated.baseValue =
            planValue;


          // Se não houver condição especial,
          // o valor contratado acompanha
          // o valor do plano.

          if (
            !prev.specialConditionType
          ) {

            updated.contractedValue =
              planValue;

          }

          // Se for bolsa, recalcula

          if (
            prev.specialConditionType ===
            "Bolsa"
          ) {

            updated.contractedValue =
              calculateContractedValue({
                baseValue: planValue,
                conditionType:
                  prev.specialConditionType,
                customValue:
                  prev.customValue,
                scholarshipPercentage:
                  prev.scholarshipPercentage,
              });

          }

        }

      }


      // ========================================================
      // ALTEROU PERIODICIDADE
      // ========================================================

      if (
        field === "periodicity"
      ) {

        if (
          prev.plan &&
          value
        ) {

          const periodicityKey =
            value.toLowerCase();


          const planValue =
            PLANS[
            prev.plan
            ]?.[
            periodicityKey
            ] || 0;


          updated.baseValue =
            planValue;


          // Sem condição especial

          if (
            !prev.specialConditionType
          ) {

            updated.contractedValue =
              planValue;

          }


          // Bolsa

          if (
            prev.specialConditionType ===
            "Bolsa"
          ) {

            updated.contractedValue =
              calculateContractedValue({
                baseValue: planValue,
                conditionType:
                  prev.specialConditionType,
                customValue:
                  prev.customValue,
                scholarshipPercentage:
                  prev.scholarshipPercentage,
              });

          }

        }


        updated.endDate =
          calculateEndDate(
            prev.startDate,
            value
          );

      }


      // ========================================================
      // ALTEROU DATA DE INÍCIO
      // ========================================================

      if (
        field === "startDate"
      ) {

        updated.endDate =
          calculateEndDate(
            value,
            prev.periodicity
          );

      }


      // ========================================================
      // ALTEROU CONDIÇÃO ESPECIAL
      // ========================================================

      if (
        field ===
        "specialConditionType"
      ) {

        // ------------------------------------------------------
        // NENHUMA
        // ------------------------------------------------------

        if (!value) {

          updated.customValue = "";

          updated.scholarshipPercentage =
            "";

          updated.contractedValue =
            Number(
              prev.baseValue || 0
            );

        }


        // ------------------------------------------------------
        // VALOR PERSONALIZADO
        // ------------------------------------------------------

        if (
          value ===
          "Valor personalizado"
        ) {

          updated.scholarshipPercentage =
            "";

          updated.contractedValue =
            Number(
              prev.customValue || 0
            );

        }


        // ------------------------------------------------------
        // BOLSA
        // ------------------------------------------------------

        if (
          value === "Bolsa"
        ) {

          updated.customValue = "";

          updated.contractedValue =
            calculateContractedValue({
              baseValue:
                prev.baseValue,
              conditionType:
                "Bolsa",
              customValue: "",
              scholarshipPercentage:
                prev.scholarshipPercentage,
            });

        }

      }


      // ========================================================
      // ALTEROU VALOR PERSONALIZADO
      // ========================================================

      if (
        field ===
        "customValue"
      ) {

        if (
          prev.specialConditionType ===
          "Valor personalizado"
        ) {

          updated.contractedValue =
            Number(
              value || 0
            );

        }

      }


      // ========================================================
      // ALTEROU BOLSA
      // ========================================================

      if (
        field ===
        "scholarshipPercentage"
      ) {

        if (
          prev.specialConditionType ===
          "Bolsa"
        ) {

          updated.contractedValue =
            calculateContractedValue({
              baseValue:
                prev.baseValue,
              conditionType:
                "Bolsa",
              customValue: "",
              scholarshipPercentage:
                value,
            });

        }

      }


      return updated;

    });

  };


  // ============================================================
  // ABRIR NOVO CONTRATO
  // ============================================================

  const handleNewContract = () => {

    setFormData({

      plan: "",

      periodicity: "",

      baseValue: "",

      contractedValue: "",

      startDate: "",

      endDate: "",

      specialConditionType: "",

      customValue: "",

      scholarshipPercentage: "",

    });


    setIsDialogOpen(true);

  };


  // ============================================================
  // SALVAR CONTRATO
  // ============================================================

  const handleSaveContract = () => {

    if (
      !formData.plan ||
      !formData.periodicity ||
      !formData.contractedValue ||
      !formData.startDate
    ) {

      return;

    }


    const newContract = {

      id: crypto.randomUUID(),

      userId,

      plan:
        formData.plan,

      periodicity:
        formData.periodicity,

      baseValue:
        Number(
          formData.baseValue || 0
        ),

      contractedValue:
        Number(
          formData.contractedValue || 0
        ),

      startDate:
        formData.startDate,

      endDate:
        formData.endDate,

      specialCondition:
        formData.specialConditionType
          ? {

            type:
              formData.specialConditionType,

            customValue:
              formData.customValue
                ? Number(
                  formData.customValue
                )
                : null,

            scholarshipPercentage:
              formData.scholarshipPercentage
                ? Number(
                  formData.scholarshipPercentage
                )
                : null,

          }
          : null,

    };


    const storedContracts =
      JSON.parse(
        localStorage.getItem(
          "danceManagerContracts"
        ) || "[]"
      );


    const updatedContracts = [
      ...storedContracts,
      newContract,
    ];


    localStorage.setItem(
      "danceManagerContracts",
      JSON.stringify(
        updatedContracts
      )
    );


    setContracts((prev) => [
      ...prev,
      newContract,
    ]);


    setIsDialogOpen(false);

  };


  // ============================================================
  // VOLTAR
  // ============================================================

  const handleBack = () => {

    navigate(-1);

  };


  // ============================================================
  // SEM USUÁRIO
  // ============================================================

  if (!userId) {

    return (

      <VStack
        align="stretch"
        gap={4}
      >

        <HeadingPage
          content="Contratos"
        />


        <Box
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={6}
        >

          <Text>
            Nenhum usuário foi selecionado.
          </Text>

        </Box>

      </VStack>

    );

  }


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
        content="Contratos"
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
          onClick={
            handleNewContract
          }
        >
          Novo contrato
        </Button>


        <Button
          size="xs"
          variant="surface"
          onClick={
            handleBack
          }
        >
          Voltar
        </Button>

      </HStack>


      {/* ======================================================
          LISTA DE CONTRATOS
          ====================================================== */}

      <Box
        mt={2}
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        overflow="hidden"
      >

        {contracts.length === 0 ? (

          <Box
            p={8}
            textAlign="center"
          >

            <Text
              color="gray.500"
            >
              Este aluno ainda não possui
              contratos.
            </Text>

          </Box>

        ) : (

          <Box
            overflowX="auto"
          >

            <Table.Root
              variant="line"
              size="sm"
              whiteSpace="nowrap"
            >

              <Table.Header>

                <Table.Row>

                  <Table.ColumnHeader>
                    Plano
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Periodicidade
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Valor do plano
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Valor contratado
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Início
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Fim
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Condição
                  </Table.ColumnHeader>

                </Table.Row>

              </Table.Header>


              <Table.Body>

                {contracts.map(
                  (contract) => (

                    <Table.Row
                      key={
                        contract.id
                      }
                    >

                      <Table.Cell>
                        {
                          contract.plan
                        }
                      </Table.Cell>


                      <Table.Cell>
                        {
                          contract.periodicity
                        }
                      </Table.Cell>


                      <Table.Cell>
                        {formatMoney(
                          contract.baseValue
                        )}
                      </Table.Cell>


                      <Table.Cell>

                        <Text
                          fontWeight="bold"
                        >
                          {formatMoney(
                            contract.contractedValue
                          )}
                        </Text>

                      </Table.Cell>


                      <Table.Cell>
                        {formatDate(
                          contract.startDate
                        )}
                      </Table.Cell>


                      <Table.Cell>
                        {formatDate(
                          contract.endDate
                        )}
                      </Table.Cell>


                      <Table.Cell>

                        {contract.specialCondition ? (

                          <Badge>
                            {
                              contract
                                .specialCondition
                                .type
                            }
                          </Badge>

                        ) : (

                          <Text
                            color="gray.500"
                          >
                            Nenhuma
                          </Text>

                        )}

                      </Table.Cell>

                    </Table.Row>

                  )
                )}

              </Table.Body>

            </Table.Root>

          </Box>

        )}

      </Box>


      {/* ======================================================
          DIALOG — NOVO CONTRATO
          ====================================================== */}

      <Dialog.Root
        open={isDialogOpen}
        onOpenChange={(e) =>
          setIsDialogOpen(
            e.open
          )
        }
        size="lg"
      >

        <Portal>

          <Dialog.Backdrop />


          <Dialog.Positioner>

            <Dialog.Content>

              {/* ==================================================
                  HEADER
                  ================================================== */}

              <Dialog.Header>

                <Dialog.Title>
                  Novo contrato
                </Dialog.Title>

              </Dialog.Header>


              {/* ==================================================
                  BODY
                  ================================================== */}

              <Dialog.Body>

                <VStack
                  align="stretch"
                  gap={5}
                >

                  {/* ==============================================
                      ALUNO
                      ============================================== */}

                  <Box>

                    <Text
                      fontSize="sm"
                      color="gray.500"
                      mb={1}
                    >
                      Aluno
                    </Text>


                    <Text
                      fontWeight="semibold"
                    >

                      {userData?.user_name ||
                        userData?.name ||
                        "Aluno selecionado"}

                    </Text>

                  </Box>


                  {/* ==============================================
                      PLANO
                      ============================================== */}

                  <Field.Root>

                    <Field.Label>
                      Plano
                    </Field.Label>


                    <NativeSelect.Root>

                      <NativeSelect.Field
                        value={
                          formData.plan
                        }
                        onChange={(e) =>
                          handleChange(
                            "plan",
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          Selecione um plano
                        </option>


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

                  </Field.Root>

                  {/* ==============================================
                      PERIODICIDADE E VALOR DO PLANO
                      ============================================== */}
                  <HStack
                    align="start"
                    gap={4}
                  >
                    <Field.Root>

                      <Field.Label>
                        Periodicidade
                      </Field.Label>


                      <NativeSelect.Root>

                        <NativeSelect.Field
                          value={
                            formData.periodicity
                          }
                          onChange={(e) =>
                            handleChange(
                              "periodicity",
                              e.target.value
                            )
                          }
                        >

                          <option value="">
                            Selecione a periodicidade
                          </option>


                          <option value="Mensal">
                            Mensal
                          </option>


                          <option value="Semestral">
                            Semestral
                          </option>


                          <option value="Anual">
                            Anual
                          </option>

                        </NativeSelect.Field>

                      </NativeSelect.Root>

                    </Field.Root>

                    <Field.Root>

                      <Field.Label>
                        Valor do plano
                      </Field.Label>


                      <Input
                        value={
                          formData.baseValue
                            ? formatMoney(
                              formData.baseValue
                            )
                            : ""
                        }
                        readOnly
                        bg="gray.50"
                      />

                    </Field.Root>

                  </HStack>





                  {/* ==============================================
                      DATAS
                      ============================================== */}

                  <HStack
                    align="start"
                    gap={4}
                  >

                    <Field.Root>

                      <Field.Label>
                        Data de início
                      </Field.Label>


                      <Input
                        type="date"
                        value={
                          formData.startDate
                        }
                        onChange={(e) =>
                          handleChange(
                            "startDate",
                            e.target.value
                          )
                        }
                      />

                    </Field.Root>


                    <Field.Root>

                      <Field.Label>
                        Data de fim
                      </Field.Label>


                      <Input
                        type="date"
                        value={
                          formData.endDate
                        }
                        readOnly
                        bg="gray.50"
                      />

                    </Field.Root>

                  </HStack>


                  {/* ==============================================
                      CONDIÇÃO ESPECIAL
                      ============================================== */}

                  <HStack
                    align="start"
                    gap={4}
                  >

                    <Field.Root>

                      <Field.Label>
                        Condição especial
                      </Field.Label>


                      <NativeSelect.Root>

                        <NativeSelect.Field
                          value={
                            formData.specialConditionType
                          }
                          onChange={(e) =>
                            handleChange(
                              "specialConditionType",
                              e.target.value
                            )
                          }
                        >

                          <option value="">
                            Nenhuma
                          </option>


                          <option value="Valor personalizado">
                            Valor personalizado
                          </option>


                          <option value="Bolsa">
                            Bolsa
                          </option>

                        </NativeSelect.Field>

                      </NativeSelect.Root>

                    </Field.Root>


                    {/* ==============================================
                      VALOR PERSONALIZADO
                      ============================================== */}

                    {formData.specialConditionType ===
                      "Valor personalizado" && (

                        <Field.Root>

                          <Field.Label>
                            Valor personalizado
                          </Field.Label>


                          <Input
                            type="number"
                            placeholder="Ex.: 250"
                            value={
                              formData.customValue
                            }
                            onChange={(e) =>
                              handleChange(
                                "customValue",
                                e.target.value
                              )
                            }
                          />

                        </Field.Root>

                      )}


                    {/* ==============================================
                      BOLSA
                      ============================================== */}

                    {formData.specialConditionType ===
                      "Bolsa" && (

                        <Field.Root>

                          <Field.Label>
                            Bolsa
                          </Field.Label>


                          <HStack>

                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Ex.: 50"
                              value={
                                formData.scholarshipPercentage
                              }
                              onChange={(e) =>
                                handleChange(
                                  "scholarshipPercentage",
                                  e.target.value
                                )
                              }
                            />

                            <Text>
                              %
                            </Text>

                          </HStack>


                          <Text
                            fontSize="xs"
                            color="gray.500"
                            mt={1}
                          >
                            Percentual de desconto
                            aplicado sobre o valor
                            do plano.
                          </Text>

                        </Field.Root>

                      )}

                  </HStack>


                  {/* ==============================================
                      VALOR FINAL
                      ============================================== */}

                  <Box
                    borderWidth="1px"
                    borderRadius="md"
                    p={4}
                    bg="gray.50"
                  >

                    <HStack
                      justify="space-between"
                    >

                      <VStack
                        align="start"
                        gap={0}
                      >

                        <Text
                          fontSize="sm"
                          color="gray.500"
                        >
                          Valor final
                        </Text>


                        <Text
                          fontSize="xl"
                          fontWeight="bold"
                        >
                          {formatMoney(
                            formData.contractedValue
                          )}
                        </Text>

                      </VStack>


                      {formData.specialConditionType && (

                        <Badge>

                          {
                            formData.specialConditionType
                          }

                        </Badge>

                      )}

                    </HStack>

                  </Box>

                </VStack>

              </Dialog.Body>


              {/* ==================================================
                  FOOTER
                  ================================================== */}

              <Dialog.Footer>

                <Button
                  variant="ghost"
                  onClick={() =>
                    setIsDialogOpen(
                      false
                    )
                  }
                >
                  Cancelar
                </Button>


                <Button
                  onClick={
                    handleSaveContract
                  }
                  disabled={
                    !formData.plan ||
                    !formData.periodicity ||
                    !formData.startDate ||
                    !formData.contractedValue
                  }
                >
                  Criar contrato
                </Button>

              </Dialog.Footer>


              <Dialog.CloseTrigger />

            </Dialog.Content>

          </Dialog.Positioner>

        </Portal>

      </Dialog.Root>

    </VStack>

  );

}