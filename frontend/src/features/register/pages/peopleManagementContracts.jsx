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
  // SERVICE
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
  // DIALOG ENCERRAMENTO
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

    contractType: "Plano",

    plan: "",

    periodicity: "",

    baseValue: "",

    contractedValue: "",

    startDate: "",

    plannedEndDate: "",

    indefinite: false,

    customValue: "",

  });


  // ============================================================
  // BUSCAR CONTRATOS
  // ============================================================

  useEffect(() => {

    if (!userId) {
      return;
    }

    getContractsByUser(userId);

  }, [userId]);


  // ============================================================
  // CONTRATO ATIVO
  // ============================================================

  const isContractActive = (
    contract
  ) => {

    return contract?.active === true;

  };


  const activeContract =
    contractsList.find(
      (contract) =>
        isContractActive(contract)
    );


  // ============================================================
  // IDENTIFICAR TIPO DO CONTRATO
  //
  // Isso é importante para contratos antigos.
  //
  // Se contractType não existir:
  //
  // specialCondition.type === "Valor personalizado"
  //     -> Personalizado
  //
  // specialCondition.type === "Bolsa"
  //     -> Bolsista
  //
  // caso contrário
  //     -> Plano
  // ============================================================

  const getContractType = (
    contract
  ) => {

    if (contract?.contractType) {

      return contract.contractType;

    }


    if (
      contract?.specialCondition?.type ===
      "Valor personalizado"
    ) {

      return "Personalizado";

    }


    if (
      contract?.specialCondition?.type ===
      "Bolsa"
    ) {

      return "Bolsista";

    }


    return "Plano";

  };


  // ============================================================
  // FORMATAR DINHEIRO
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


    if (
      typeof date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {

      const [
        year,
        month,
        day,
      ] = date.split("-");


      return `${day}/${month}/${year}`;

    }


    const parsedDate =
      new Date(date);


    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {

      return "-";

    }


    return parsedDate.toLocaleDateString(
      "pt-BR"
    );

  };


  // ============================================================
  // FORMATAR DATA E HORA
  // ============================================================

  const formatDateTime = (
    date
  ) => {

    if (!date) {
      return "-";
    }


    if (
      typeof date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {

      return formatDate(date);

    }


    const parsedDate =
      new Date(date);


    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {

      return "-";

    }


    return parsedDate.toLocaleString(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );

  };


  // ============================================================
  // CALCULAR FIM DO PLANO
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
  // VALOR DO PLANO
  // ============================================================

  const getPlanValue = (
    plan,
    periodicity
  ) => {

    if (
      !plan ||
      !periodicity
    ) {

      return 0;

    }


    const key =
      periodicity.toLowerCase();


    return (
      PLANS?.[plan]?.[key] ||
      0
    );

  };


  // ============================================================
  // ALTERAR FORMULÁRIO
  // ============================================================

  const handleChange = (
    field,
    value
  ) => {

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
      // TIPO DE CONTRATO
      // ========================================================

      if (
        field === "contractType"
      ) {

        // ------------------------------------------------------
        // PLANO
        // ------------------------------------------------------

        if (
          value === "Plano"
        ) {

          updated.plan = "";

          updated.periodicity = "";

          updated.baseValue = "";

          updated.contractedValue = "";

          updated.plannedEndDate = "";

          updated.indefinite = false;

          updated.customValue = "";

        }


        // ------------------------------------------------------
        // PERSONALIZADO
        // ------------------------------------------------------

        if (
          value === "Personalizado"
        ) {

          updated.plan = "";

          updated.periodicity = "";

          updated.baseValue = 0;

          updated.contractedValue =
            Number(
              prev.customValue || 0
            );

          updated.plannedEndDate = "";

          updated.indefinite = false;

        }


        // ------------------------------------------------------
        // BOLSISTA
        // ------------------------------------------------------

        if (
          value === "Bolsista"
        ) {

          updated.plan = "";

          updated.periodicity = "";

          updated.baseValue = 0;

          updated.contractedValue = 0;

          updated.plannedEndDate = "";

          updated.indefinite = false;

          updated.customValue = "";

        }

      }


      // ========================================================
      // PLANO
      // ========================================================

      if (
        field === "plan"
      ) {

        const planValue =
          getPlanValue(
            value,
            prev.periodicity
          );


        updated.baseValue =
          planValue;


        updated.contractedValue =
          planValue;


        if (
          prev.startDate &&
          prev.periodicity
        ) {

          updated.plannedEndDate =
            calculateEndDate(
              prev.startDate,
              prev.periodicity
            );

        }

      }


      // ========================================================
      // PERIODICIDADE
      // ========================================================

      if (
        field === "periodicity"
      ) {

        const planValue =
          getPlanValue(
            prev.plan,
            value
          );


        updated.baseValue =
          planValue;


        updated.contractedValue =
          planValue;


        if (
          prev.startDate
        ) {

          updated.plannedEndDate =
            calculateEndDate(
              prev.startDate,
              value
            );

        }

      }


      // ========================================================
      // DATA DE INÍCIO
      // ========================================================

      if (
        field === "startDate"
      ) {

        if (
          prev.contractType ===
          "Plano"
        ) {

          updated.plannedEndDate =
            calculateEndDate(
              value,
              prev.periodicity
            );

        }

      }


      // ========================================================
      // VALOR PERSONALIZADO
      // ========================================================

      if (
        field === "customValue"
      ) {

        if (
          prev.contractType ===
          "Personalizado"
        ) {

          updated.contractedValue =
            Number(
              value || 0
            );

        }

      }


      // ========================================================
      // PRAZO INDETERMINADO
      // ========================================================

      if (
        field === "indefinite"
      ) {

        if (value) {

          updated.plannedEndDate = "";

        }

      }


      return updated;

    });

  };


  // ============================================================
  // NOVO CONTRATO
  // ============================================================

  const handleNewContract = () => {

    if (activeContract) {
      return;
    }


    setSelectedContract(null);

    setDialogMode("new");


    setFormData({

      contractType: "Plano",

      plan: "",

      periodicity: "",

      baseValue: "",

      contractedValue: "",

      startDate: "",

      plannedEndDate: "",

      indefinite: false,

      customValue: "",

    });


    setIsDialogOpen(true);

  };


  // ============================================================
  // PREPARAR FORMULÁRIO DE CONTRATO
  // ============================================================

  const buildFormFromContract = (
    contract
  ) => {

    const contractType =
      getContractType(
        contract
      );


    return {

      contractType,

      plan:
        contract.plan ||
        "",

      periodicity:
        contract.periodicity ||
        "",

      baseValue:
        contract.baseValue ??
        "",

      contractedValue:
        contract.contractedValue ??
        "",

      startDate:
        contract.startDate ||
        "",

      plannedEndDate:
        contract.plannedEndDate ||
        "",

      indefinite:
        contract.indefinite === true,

      customValue:
        contract.specialCondition
          ?.customValue ??
        (
          contractType ===
          "Personalizado"
            ? contract.contractedValue
            : ""
        ),

    };

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


    setFormData(
      buildFormFromContract(
        contract
      )
    );


    setIsDialogOpen(
      true
    );

  };


  // ============================================================
  // EDITAR CONTRATO
  // ============================================================

  const handleEditContract = (
    contract
  ) => {

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


    setFormData(
      buildFormFromContract(
        contract
      )
    );


    setIsDialogOpen(
      true
    );

  };


  // ============================================================
  // ABRIR ENCERRAMENTO
  // ============================================================

  const handleEndContract = (
    contract
  ) => {

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
  // VALIDAR FORMULÁRIO
  // ============================================================

  const isFormValid = () => {

    // ----------------------------------------------------------
    // DATA DE INÍCIO
    // ----------------------------------------------------------

    if (
      !formData.startDate
    ) {

      return false;

    }


    // ----------------------------------------------------------
    // PLANO
    // ----------------------------------------------------------

    if (
      formData.contractType ===
      "Plano"
    ) {

      if (
        !formData.plan ||
        !formData.periodicity
      ) {

        return false;

      }


      if (
        !formData.contractedValue ||
        Number(
          formData.contractedValue
        ) <= 0
      ) {

        return false;

      }


      if (
        !formData.plannedEndDate
      ) {

        return false;

      }

    }


    // ----------------------------------------------------------
    // PERSONALIZADO
    // ----------------------------------------------------------

    if (
      formData.contractType ===
      "Personalizado"
    ) {

      if (
        !formData.customValue ||
        Number(
          formData.customValue
        ) <= 0
      ) {

        return false;

      }


      if (
        !formData.indefinite &&
        !formData.plannedEndDate
      ) {

        return false;

      }

    }


    // ----------------------------------------------------------
    // BOLSISTA
    // ----------------------------------------------------------

    if (
      formData.contractType ===
      "Bolsista"
    ) {

      if (
        !formData.indefinite &&
        !formData.plannedEndDate
      ) {

        return false;

      }

    }


    return true;

  };


  // ============================================================
  // SALVAR CONTRATO
  // ============================================================

  const handleSaveContract =
    async () => {

      if (
        dialogMode === "view"
      ) {

        return;

      }


      if (
        dialogMode === "edit" &&
        selectedContract &&
        !isContractActive(
          selectedContract
        )
      ) {

        return;

      }


      if (
        !isFormValid()
      ) {

        return;

      }


      if (
        dialogMode === "new" &&
        activeContract
      ) {

        return;

      }


      // ========================================================
      // DEFINIR VALORES
      // ========================================================

      let baseValue = 0;

      let contractedValue = 0;

      let plan = null;

      let periodicity = null;

      let plannedEndDate =
        formData.indefinite
          ? null
          : (
            formData.plannedEndDate ||
            null
          );


      // ========================================================
      // PLANO
      // ========================================================

      if (
        formData.contractType ===
        "Plano"
      ) {

        plan =
          formData.plan;

        periodicity =
          formData.periodicity;

        baseValue =
          Number(
            formData.baseValue || 0
          );

        contractedValue =
          Number(
            formData.contractedValue || 0
          );

      }


      // ========================================================
      // PERSONALIZADO
      // ========================================================

      if (
        formData.contractType ===
        "Personalizado"
      ) {

        baseValue = 0;

        contractedValue =
          Number(
            formData.customValue || 0
          );

        plan = null;

        periodicity = null;

      }


      // ========================================================
      // BOLSISTA
      // ========================================================

      if (
        formData.contractType ===
        "Bolsista"
      ) {

        baseValue = 0;

        contractedValue = 0;

        plan = null;

        periodicity = null;

      }


      // ========================================================
      // DADOS DO CONTRATO
      // ========================================================

      const contractData = {

        userId,

        contractType:
          formData.contractType,

        plan,

        periodicity,

        baseValue,

        contractedValue,

        startDate:
          formData.startDate,

        plannedEndDate,

        indefinite:
          formData.indefinite === true,

        specialCondition:
          formData.contractType ===
          "Personalizado"

            ? {

              type:
                "Valor personalizado",

              customValue:
                Number(
                  formData.customValue || 0
                ),

              scholarshipPercentage:
                null,

            }

            : formData.contractType ===
              "Bolsista"

              ? {

                type:
                  "Bolsa",

                customValue:
                  null,

                scholarshipPercentage:
                  100,

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
        flexWrap="wrap"
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

            Contrato vigente

            {activeContract.plannedEndDate
              ? (
                <>
                  {" "}até{" "}

                  <strong>
                    {formatDate(
                      activeContract.plannedEndDate
                    )}
                  </strong>
                </>
              )
              : " por prazo indeterminado"}

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
                    Tipo
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Plano
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Periodicidade
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Valor mensal
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Início
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Fim previsto
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Fim definitivo
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
                  (contract) => {

                    const contractType =
                      getContractType(
                        contract
                      );


                    return (

                      <Table.Row
                        key={
                          contract.id
                        }
                      >

                        {/* TIPO */}

                        <Table.Cell>

                          <Badge>

                            {
                              contractType
                            }

                          </Badge>

                        </Table.Cell>


                        {/* PLANO */}

                        <Table.Cell>

                          {contract.plan ||
                            "-"}

                        </Table.Cell>


                        {/* PERIODICIDADE */}

                        <Table.Cell>

                          {contract.periodicity ||
                            "-"}

                        </Table.Cell>


                        {/* VALOR */}

                        <Table.Cell>

                          <Text
                            fontWeight="bold"
                          >

                            {formatMoney(
                              contract.contractedValue
                            )}

                          </Text>

                        </Table.Cell>


                        {/* INÍCIO */}

                        <Table.Cell>

                          {formatDate(
                            contract.startDate
                          )}

                        </Table.Cell>


                        {/* FIM PREVISTO */}

                        <Table.Cell>

                          {contract.indefinite
                            ? "Indeterminado"
                            : formatDate(
                              contract.plannedEndDate
                            )}

                        </Table.Cell>


                        {/* FIM DEFINITIVO */}

                        <Table.Cell>

                          {contract.closedAt
                            ? formatDateTime(
                              contract.closedAt
                            )
                            : "-"}

                        </Table.Cell>


                        {/* STATUS */}

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


                        {/* AÇÕES */}

                        <Table.Cell>

                          <HStack
                            gap={1}
                          >

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

                    );

                  }
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

                  {/* ==================================================
                      ALUNO
                      ================================================== */}

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


                  {/* ==================================================
                      TIPO DE CONTRATO
                      ================================================== */}

                  <Field.Root>

                    <Field.Label>
                      Tipo de contrato
                    </Field.Label>


                    <NativeSelect.Root>

                      <NativeSelect.Field
                        value={
                          formData.contractType
                        }
                        disabled={
                          dialogMode ===
                          "view"
                        }
                        onChange={(e) =>
                          handleChange(
                            "contractType",
                            e.target.value
                          )
                        }
                      >

                        <option value="Plano">
                          Plano
                        </option>

                        <option value="Personalizado">
                          Personalizado
                        </option>

                        <option value="Bolsista">
                          Bolsista
                        </option>

                      </NativeSelect.Field>

                    </NativeSelect.Root>


                    <Text
                      fontSize="xs"
                      color="gray.500"
                      mt={1}
                    >

                      {formData.contractType ===
                        "Plano" &&
                        "Contrato baseado em um dos planos da escola."}

                      {formData.contractType ===
                        "Personalizado" &&
                        "Contrato sem plano, com valor mensal definido pelo professor."}

                      {formData.contractType ===
                        "Bolsista" &&
                        "Contrato com bolsa integral e valor mensal de R$ 0,00."}

                    </Text>

                  </Field.Root>


                  {/* ==================================================
                      BLOCO PLANO
                      ================================================== */}

                  {formData.contractType ===
                    "Plano" && (

                    <>

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


                      {/* PERIODICIDADE + VALOR */}

                      <HStack
                        align="start"
                        gap={4}
                      >

                        <Field.Root>

                          <Field.Label>
                            Duração
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
                                Selecione
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
                            Valor mensal
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

                    </>

                  )}


                  {/* ==================================================
                      PERSONALIZADO
                      ================================================== */}

                  {formData.contractType ===
                    "Personalizado" && (

                    <Box
                      borderWidth="1px"
                      borderRadius="md"
                      p={4}
                    >

                      <VStack
                        align="stretch"
                        gap={4}
                      >

                        <Field.Root>

                          <Field.Label>
                            Valor mensal
                          </Field.Label>


                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Ex.: 200"
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


                        <Text
                          fontSize="xs"
                          color="gray.500"
                        >

                          Este contrato não estará
                          vinculado a nenhum plano.
                          O valor informado será o
                          valor mensal da cobrança.

                        </Text>

                      </VStack>

                    </Box>

                  )}


                  {/* ==================================================
                      BOLSISTA
                      ================================================== */}

                  {formData.contractType ===
                    "Bolsista" && (

                    <Box
                      borderWidth="1px"
                      borderRadius="md"
                      p={4}
                    >

                      <VStack
                        align="stretch"
                        gap={2}
                      >

                        <Text
                          fontWeight="semibold"
                        >
                          Bolsa integral
                        </Text>


                        <Text
                          fontSize="sm"
                          color="gray.600"
                        >

                          Este aluno possui bolsa
                          de 100%.

                        </Text>


                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                        >

                          Valor mensal: R$ 0,00

                        </Text>


                        <Text
                          fontSize="xs"
                          color="gray.500"
                        >

                          O contrato não estará
                          vinculado a nenhum plano.

                        </Text>

                      </VStack>

                    </Box>

                  )}


                  {/* ==================================================
                      DATAS
                      ================================================== */}

                  <HStack
                    align="start"
                    gap={4}
                  >

                    {/* DATA INÍCIO */}

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


                    {/* FIM PREVISTO */}

                    <Field.Root>

                      <Field.Label>
                        Fim previsto
                      </Field.Label>


                      <Input
                        type="date"
                        value={
                          formData.plannedEndDate
                        }
                        disabled={
                          dialogMode ===
                          "view" ||
                          formData.indefinite ||
                          formData.contractType ===
                          "Plano"
                        }
                        readOnly={
                          formData.contractType ===
                          "Plano"
                        }
                        bg={
                          formData.contractType ===
                            "Plano"
                            ? "gray.50"
                            : undefined
                        }
                        onChange={(e) =>
                          handleChange(
                            "plannedEndDate",
                            e.target.value
                          )
                        }
                      />

                    </Field.Root>

                  </HStack>


                  {/* ==================================================
                      PRAZO INDETERMINADO
                      ================================================== */}

                  {formData.contractType !==
                    "Plano" && (

                    <Field.Root>

                      <HStack>

                        <input
                          type="checkbox"
                          checked={
                            formData.indefinite
                          }
                          disabled={
                            dialogMode ===
                            "view"
                          }
                          onChange={(e) =>
                            handleChange(
                              "indefinite",
                              e.target.checked
                            )
                          }
                        />

                        <Text
                          fontSize="sm"
                        >
                          Contrato por prazo
                          indeterminado
                        </Text>

                      </HStack>


                      <Text
                        fontSize="xs"
                        color="gray.500"
                        mt={1}
                      >

                        Quando selecionado, o contrato
                        permanecerá ativo até ser
                        encerrado manualmente.

                      </Text>

                    </Field.Root>

                  )}


                  {/* ==================================================
                      FIM DEFINITIVO
                      ================================================== */}

                  {dialogMode === "view" &&
                    selectedContract?.closedAt && (

                    <Field.Root>

                      <Field.Label>
                        Fim definitivo
                      </Field.Label>


                      <Input
                        value={
                          formatDateTime(
                            selectedContract.closedAt
                          )
                        }
                        readOnly
                        bg="gray.50"
                      />

                    </Field.Root>

                  )}


                  {/* ==================================================
                      VALOR FINAL
                      ================================================== */}

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
                          Valor mensal
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


                      <Badge>

                        {
                          formData.contractType
                        }

                      </Badge>

                    </HStack>

                  </Box>

                </VStack>

              </Dialog.Body>


              {/* ======================================================
                  FOOTER
                  ====================================================== */}

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
                      !isFormValid()
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
          DIALOG ENCERRAMENTO
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
                            getContractType(
                              contractToEnd
                            )
                          }

                        </Text>


                        {contractToEnd.plan && (

                          <Text
                            fontSize="sm"
                            color="gray.600"
                          >

                            Plano:{" "}

                            {
                              contractToEnd.plan
                            }

                          </Text>

                        )}


                        <Text
                          fontSize="sm"
                          color="gray.600"
                        >

                          Valor mensal:{" "}

                          {formatMoney(
                            contractToEnd.contractedValue
                          )}

                        </Text>


                        <Text
                          fontSize="sm"
                          color="gray.600"
                        >

                          Início:{" "}

                          {formatDate(
                            contractToEnd.startDate
                          )}

                        </Text>


                        <Text
                          fontSize="sm"
                          color="gray.600"
                        >

                          Fim previsto:{" "}

                          {contractToEnd.indefinite
                            ? "Indeterminado"
                            : formatDate(
                              contractToEnd.plannedEndDate
                            )}

                        </Text>

                      </VStack>

                    </Box>

                  )}


                  <Text
                    fontSize="sm"
                    color="gray.500"
                  >

                    Ao confirmar, o contrato será
                    marcado como encerrado e a
                    data e hora atuais serão
                    registradas como fim definitivo.

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