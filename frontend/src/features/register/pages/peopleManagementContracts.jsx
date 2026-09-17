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

import contractsServices from "../../../services/contractsServices";


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


// ============================================================
// COMPONENTE
// ============================================================

export default function PeopleManagementContracts() {

  const location = useLocation();

  const navigate = useNavigate();


  // ============================================================
  // DADOS DO ALUNO
  // ============================================================

  const {
    userId,
    userData,
  } = location.state || {};


  // ============================================================
  // SERVICE DE CONTRATOS
  // ============================================================

  const {
    getContractsByUser,
    addContract,
    updateContract,
    closeContract,
    contractsList,
    contractsLoading,
  } = contractsServices();


  // ============================================================
  // DIALOG PRINCIPAL
  // ============================================================

  const [
    isDialogOpen,
    setIsDialogOpen,
  ] = useState(false);


  // ============================================================
  // MODO DO DIALOG
  // ============================================================

  const [
    dialogMode,
    setDialogMode,
  ] = useState("new");


  // ============================================================
  // CONTRATO SELECIONADO
  // ============================================================

  const [
    selectedContract,
    setSelectedContract,
  ] = useState(null);


  // ============================================================
  // DIALOG DE CONFIRMAÇÃO
  // ============================================================

  const [
    isEndContractDialogOpen,
    setIsEndContractDialogOpen,
  ] = useState(false);


  const [
    contractToEnd,
    setContractToEnd,
  ] = useState(null);


  // ============================================================
  // FORMULÁRIO
  // ============================================================

  const [
    formData,
    setFormData,
  ] = useState({

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
  // BUSCAR CONTRATOS DO ALUNO
  // ============================================================

  useEffect(() => {

    if (!userId) {
      return;
    }


    getContractsByUser(userId);

  }, [userId]);


  // ============================================================
  // VERIFICAR SE CONTRATO ESTÁ ATIVO
  // ============================================================

  const isContractActive = (
    contract
  ) => {

    return contract?.active === true;

  };


  // ============================================================
  // CONTRATO ATIVO
  // ============================================================

  const activeContract =
    contractsList.find(
      (contract) =>
        isContractActive(contract)
    );


  // ============================================================
  // FORMATAR VALOR
  // ============================================================

  const formatMoney = (
    value
  ) => {

    return Number(
      value || 0
    ).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );

  };


  // ============================================================
  // FORMATAR DATA
  // ============================================================

  const formatDate = (
    date
  ) => {

    if (!date) {
      return "-";
    }


    const [
      year,
      month,
      day,
    ] = date.split("-");


    return `${day}/${month}/${year}`;

  };


  // ============================================================
  // CALCULAR DATA DE FIM
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


    const [
      year,
      month,
      day,
    ] = startDate
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
      ).padStart(
        2,
        "0"
      );


    const finalDay =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );


    return `${finalYear}-${finalMonth}-${finalDay}`;

  };


  // ============================================================
  // CALCULAR VALOR CONTRATADO
  // ============================================================

  const calculateContractedValue = ({
    baseValue,
    conditionType,
    customValue,
    scholarshipPercentage,
  }) => {

    const base =
      Number(
        baseValue || 0
      );


    // ----------------------------------------------------------
    // SEM CONDIÇÃO
    // ----------------------------------------------------------

    if (!conditionType) {

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
      conditionType ===
      "Bolsa"
    ) {

      const percentage =
        Number(
          scholarshipPercentage || 0
        );


      return (
        base -
        (base * percentage) /
          100
      );

    }


    return base;

  };


  // ============================================================
  // ALTERAR FORMULÁRIO
  // ============================================================

  const handleChange = (
    field,
    value
  ) => {

    // ----------------------------------------------------------
    // NÃO PERMITE ALTERAÇÃO EM VISUALIZAÇÃO
    // ----------------------------------------------------------

    if (
      dialogMode === "view"
    ) {

      return;

    }


    setFormData((prev) => {

      const updated = {
        ...prev,
        [field]: value,
      };


      // ========================================================
      // PLANO
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


          updated.contractedValue =
            calculateContractedValue({

              baseValue:
                planValue,

              conditionType:
                prev.specialConditionType,

              customValue:
                prev.customValue,

              scholarshipPercentage:
                prev.scholarshipPercentage,

            });

        }

      }


      // ========================================================
      // PERIODICIDADE
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


          updated.contractedValue =
            calculateContractedValue({

              baseValue:
                planValue,

              conditionType:
                prev.specialConditionType,

              customValue:
                prev.customValue,

              scholarshipPercentage:
                prev.scholarshipPercentage,

            });

        }


        updated.endDate =
          calculateEndDate(
            prev.startDate,
            value
          );

      }


      // ========================================================
      // DATA DE INÍCIO
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
      // CONDIÇÃO ESPECIAL
      // ========================================================

      if (
        field ===
        "specialConditionType"
      ) {

        // ------------------------------------------------------
        // NENHUMA
        // ------------------------------------------------------

        if (!value) {

          updated.customValue =
            "";

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

          updated.customValue =
            "";

          updated.contractedValue =
            calculateContractedValue({

              baseValue:
                prev.baseValue,

              conditionType:
                "Bolsa",

              customValue:
                "",

              scholarshipPercentage:
                prev.scholarshipPercentage,

            });

        }

      }


      // ========================================================
      // VALOR PERSONALIZADO
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
      // BOLSA
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

              customValue:
                "",

              scholarshipPercentage:
                value,

            });

        }

      }


      return updated;

    });

  };


  // ============================================================
  // NOVO CONTRATO
  // ============================================================

  const handleNewContract = () => {

    /*
      Só bloqueia se existir contrato
      realmente ativo.

      Contratos encerrados não impedem
      a criação de um novo.
    */

    if (activeContract) {
      return;
    }


    setSelectedContract(null);


    setDialogMode("new");


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
  // VISUALIZAR CONTRATO
  // ============================================================

  const handleViewContract = (
    contract
  ) => {

    setSelectedContract(
      contract
    );


    setDialogMode(
      "view"
    );


    setFormData({

      plan:
        contract.plan,

      periodicity:
        contract.periodicity,

      baseValue:
        contract.baseValue,

      contractedValue:
        contract.contractedValue,

      startDate:
        contract.startDate,

      endDate:
        contract.endDate,

      specialConditionType:
        contract.specialCondition?.type ||
        "",

      customValue:
        contract.specialCondition?.customValue ||
        "",

      scholarshipPercentage:
        contract.specialCondition
          ?.scholarshipPercentage ||
        "",

    });


    setIsDialogOpen(true);

  };


  // ============================================================
  // EDITAR CONTRATO
  // ============================================================

  const handleEditContract = (
    contract
  ) => {

    /*
      CONTRATO ENCERRADO NÃO PODE SER EDITADO.
    */

    if (
      !isContractActive(
        contract
      )
    ) {

      return;

    }


    setSelectedContract(
      contract
    );


    setDialogMode(
      "edit"
    );


    setFormData({

      plan:
        contract.plan,

      periodicity:
        contract.periodicity,

      baseValue:
        contract.baseValue,

      contractedValue:
        contract.contractedValue,

      startDate:
        contract.startDate,

      endDate:
        contract.endDate,

      specialConditionType:
        contract.specialCondition?.type ||
        "",

      customValue:
        contract.specialCondition?.customValue ||
        "",

      scholarshipPercentage:
        contract.specialCondition
          ?.scholarshipPercentage ||
        "",

    });


    setIsDialogOpen(
      true
    );

  };


  // ============================================================
  // ABRIR CONFIRMAÇÃO DE ENCERRAMENTO
  // ============================================================

  const handleEndContract = (
    contract
  ) => {

    /*
      Só pode encerrar contrato
      que esteja ativo.
    */

    if (
      !isContractActive(
        contract
      )
    ) {

      return;

    }


    setContractToEnd(
      contract
    );


    setIsEndContractDialogOpen(
      true
    );

  };


  // ============================================================
  // CONFIRMAR ENCERRAMENTO
  // ============================================================

  const handleConfirmEndContract =
    async () => {

      if (!contractToEnd) {
        return;
      }


      /*
        Segurança adicional:
        verificamos novamente se
        o contrato ainda está ativo.
      */

      if (
        !isContractActive(
          contractToEnd
        )
      ) {

        handleCancelEndContract();

        return;

      }


      try {

        const result =
          await closeContract(
            contractToEnd.id
          );


        /*
          O service retorna o resultado
          da API.

          Se o backend retornar erro,
          não fechamos o dialog.
        */

        if (!result?.ok) {
          return;
        }


        setIsEndContractDialogOpen(
          false
        );


        setContractToEnd(
          null
        );

      } catch (error) {

        console.log(
          "Erro ao encerrar contrato:",
          error
        );

      }

    };


  // ============================================================
  // CANCELAR ENCERRAMENTO
  // ============================================================

  const handleCancelEndContract = () => {

    setIsEndContractDialogOpen(
      false
    );


    setContractToEnd(
      null
    );

  };


  // ============================================================
  // SALVAR CONTRATO
  // ============================================================

  const handleSaveContract =
    async () => {

      // ========================================================
      // VISUALIZAÇÃO
      // ========================================================

      if (
        dialogMode === "view"
      ) {

        return;

      }


      // ========================================================
      // EDIÇÃO
      // ========================================================

      /*
        Não permite salvar alterações
        se o contrato tiver sido encerrado.
      */

      if (
        dialogMode === "edit" &&
        selectedContract &&
        !isContractActive(
          selectedContract
        )
      ) {

        return;

      }


      // ========================================================
      // VALIDAÇÃO
      // ========================================================

      if (
        !formData.plan ||
        !formData.periodicity ||
        !formData.contractedValue ||
        !formData.startDate
      ) {

        return;

      }


      // ========================================================
      // NOVO CONTRATO
      // ========================================================

      if (
        dialogMode === "new"
      ) {

        /*
          Segurança adicional:

          nunca permite criar um novo contrato
          caso já exista outro ativo.
        */

        if (activeContract) {
          return;
        }

      }


      // ========================================================
      // DADOS DO CONTRATO
      // ========================================================

      const contractData = {

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


      // ========================================================
      // CRIAR
      // ========================================================

      if (
        dialogMode === "new"
      ) {

        try {

          const result =
            await addContract(
              contractData
            );


          /*
            Se o backend retornar erro,
            não fechamos o dialog.
          */

          if (!result?.ok) {
            return;
          }


        } catch (error) {

          console.log(
            "Erro ao criar contrato:",
            error
          );

          return;

        }

      }


      // ========================================================
      // EDITAR
      // ========================================================

      if (
        dialogMode === "edit" &&
        selectedContract
      ) {

        try {

          const result =
            await updateContract(
              selectedContract.id,
              contractData
            );


          /*
            Se o backend retornar erro,
            não fechamos o dialog.
          */

          if (!result?.ok) {
            return;
          }


        } catch (error) {

          console.log(
            "Erro ao editar contrato:",
            error
          );

          return;

        }

      }


      // ========================================================
      // FECHAR
      // ========================================================

      setIsDialogOpen(
        false
      );


      setSelectedContract(
        null
      );

    };


  // ============================================================
  // FECHAR DIALOG
  // ============================================================

  const handleCloseDialog = () => {

    setIsDialogOpen(
      false
    );


    setSelectedContract(
      null
    );


    setDialogMode(
      "new"
    );

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
          ALUNO
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
          AÇÕES
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
          disabled={
            !!activeContract ||
            contractsLoading
          }
        >
          Novo contrato
        </Button>


        {activeContract && (

          <Text
            fontSize="sm"
            color="gray.500"
          >

            Contrato vigente até{" "}

            <strong>
              {formatDate(
                activeContract.endDate
              )}
            </strong>

          </Text>

        )}


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
          TABELA
          ====================================================== */}

      <Box
        mt={2}
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        overflow="hidden"
      >

        {contractsLoading ? (

          <Box
            p={8}
            textAlign="center"
          >

            <Text
              color="gray.500"
            >
              Carregando contratos...
            </Text>

          </Box>

        ) : contractsList.length === 0 ? (

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

              {/* ==================================================
                  HEADER
                  ================================================== */}

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

                  <Table.ColumnHeader>
                    Status
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Ações
                  </Table.ColumnHeader>

                </Table.Row>

              </Table.Header>


              {/* ==================================================
                  BODY
                  ================================================== */}

              <Table.Body>

                {contractsList.map(
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


                      {/* ==================================================
                          STATUS
                          ================================================== */}

                      <Table.Cell>

                        {isContractActive(
                          contract
                        ) ? (

                          <Badge>
                            Ativo
                          </Badge>

                        ) : (

                          <Badge
                            variant="outline"
                          >
                            Encerrado
                          </Badge>

                        )}

                      </Table.Cell>


                      {/* ==================================================
                          AÇÕES
                          ================================================== */}

                      <Table.Cell>

                        <HStack
                          gap={1}
                        >

                          {/* VISUALIZAR */}

                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() =>
                              handleViewContract(
                                contract
                              )
                            }
                          >
                            Visualizar
                          </Button>


                          {/* EDITAR */}

                          {isContractActive(
                            contract
                          ) && (

                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                handleEditContract(
                                  contract
                                )
                              }
                            >
                              Editar
                            </Button>

                          )}


                          {/* ENCERRAR */}

                          {isContractActive(
                            contract
                          ) && (

                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() =>
                                handleEndContract(
                                  contract
                                )
                              }
                            >
                              Encerrar
                            </Button>

                          )}

                        </HStack>

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
          DIALOG PRINCIPAL
          ====================================================== */}

      <Dialog.Root
        open={
          isDialogOpen
        }
        onOpenChange={(e) => {

          if (!e.open) {

            handleCloseDialog();

          } else {

            setIsDialogOpen(
              true
            );

          }

        }}
        size="lg"
      >

        <Portal>

          <Dialog.Backdrop />


          <Dialog.Positioner>

            <Dialog.Content>

              <Dialog.Header>

                <Dialog.Title>

                  {dialogMode === "new" &&
                    "Novo contrato"}

                  {dialogMode === "edit" &&
                    "Editar contrato"}

                  {dialogMode === "view" &&
                    "Visualizar contrato"}

                </Dialog.Title>

              </Dialog.Header>


              <Dialog.Body>

                <VStack
                  align="stretch"
                  gap={5}
                >

                  {/* ALUNO */}

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


                  {/* PLANO */}

                  <Field.Root>

                    <Field.Label>
                      Plano
                    </Field.Label>


                    <NativeSelect.Root>

                      <NativeSelect.Field
                        value={
                          formData.plan
                        }
                        disabled={
                          dialogMode ===
                          "view"
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


                  {/* PERIODICIDADE */}

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
                          disabled={
                            dialogMode ===
                            "view"
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


                    {/* VALOR DO PLANO */}

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


                  {/* DATAS */}

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
                        disabled={
                          dialogMode ===
                          "view"
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


                  {/* CONDIÇÃO */}

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
                          disabled={
                            dialogMode ===
                            "view"
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


                    {/* VALOR PERSONALIZADO */}

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
                            disabled={
                              dialogMode ===
                              "view"
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


                    {/* BOLSA */}

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
                              disabled={
                                dialogMode ===
                                "view"
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


                  {/* VALOR FINAL */}

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


              {/* FOOTER */}

              <Dialog.Footer>

                <Button
                  variant="ghost"
                  onClick={
                    handleCloseDialog
                  }
                >

                  {dialogMode === "view"
                    ? "Fechar"
                    : "Cancelar"}

                </Button>


                {dialogMode !== "view" && (

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

                    {dialogMode === "edit"
                      ? "Salvar alterações"
                      : "Criar contrato"}

                  </Button>

                )}

              </Dialog.Footer>


              <Dialog.CloseTrigger />

            </Dialog.Content>

          </Dialog.Positioner>

        </Portal>

      </Dialog.Root>


      {/* ======================================================
          DIALOG DE CONFIRMAÇÃO
          ====================================================== */}

      <Dialog.Root
        open={
          isEndContractDialogOpen
        }
        onOpenChange={(e) => {

          if (!e.open) {

            handleCancelEndContract();

          }

        }}
        size="sm"
      >

        <Portal>

          <Dialog.Backdrop />


          <Dialog.Positioner>

            <Dialog.Content>

              <Dialog.Header>

                <Dialog.Title>
                  Encerrar contrato
                </Dialog.Title>

              </Dialog.Header>


              <Dialog.Body>

                <VStack
                  align="stretch"
                  gap={3}
                >

                  <Text>

                    Tem certeza que deseja
                    encerrar este contrato?

                  </Text>


                  {contractToEnd && (

                    <Box
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                      bg="gray.50"
                    >

                      <VStack
                        align="start"
                        gap={1}
                      >

                        <Text
                          fontWeight="bold"
                        >

                          {
                            contractToEnd.plan
                          }

                        </Text>


                        <Text
                          fontSize="sm"
                          color="gray.600"
                        >

                          {
                            contractToEnd.periodicity
                          }

                        </Text>


                        <Text
                          fontSize="sm"
                          color="gray.600"
                        >

                          Vigência:{" "}

                          {formatDate(
                            contractToEnd.startDate
                          )}

                          {" "}até{" "}

                          {formatDate(
                            contractToEnd.endDate
                          )}

                        </Text>

                      </VStack>

                    </Box>

                  )}


                  <Text
                    fontSize="sm"
                    color="gray.500"
                  >

                    O contrato será marcado como
                    encerrado e permanecerá no
                    histórico do aluno.

                  </Text>

                </VStack>

              </Dialog.Body>


              <Dialog.Footer>

                <Button
                  variant="ghost"
                  onClick={
                    handleCancelEndContract
                  }
                >
                  Cancelar
                </Button>


                <Button
                  colorPalette="red"
                  onClick={
                    handleConfirmEndContract
                  }
                >
                  Encerrar contrato
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