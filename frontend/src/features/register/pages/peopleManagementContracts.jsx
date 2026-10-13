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
  Flex,
  Heading,
  Avatar,
} from "@chakra-ui/react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import HeadingPage from "../../../components/headingPage";
import { LuArrowLeft, LuPlus, LuFileText, LuEye, LuPencil, LuCircleX } from "react-icons/lu";
import { TbUserSquareRounded } from "react-icons/tb";
import contractsServices from "../../../services/contractsServices";
//Formatters
import {
  formatCPF,
  formatDate,
  formatName,
  formatRG,
  formatProperNoun,
} from "../../../utils/formatters";

import { FiArrowLeft, FiCalendar, FiCheck, FiFileText } from "react-icons/fi";

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
  // Ordena uma cópia, preservando a lista recebida do service.
  const sortedContracts = [...(contractsList || [])].sort((a, b) => {
    const dateValue = (contract) => {
      const raw = contract.startDate || contract.createdAt || contract.created_at;
      if (!raw) return 0;
      const time = new Date(raw).getTime();
      return Number.isNaN(time) ? 0 : time;
    };
    const difference = dateValue(b) - dateValue(a);
    if (difference !== 0) return difference;
    const created = (contract) => {
      const time = new Date(contract.createdAt || contract.created_at || 0).getTime();
      return Number.isNaN(time) ? 0 : time;
    };
    return created(b) - created(a);
  });
  // ============================================================
  // RENDER
  // ============================================================
  return (

    <VStack gap={3} align="stretch" w="100%" minW={0} bg="#f8faf9">

      {/* TÍTULO */}
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
        <Flex>
          <Button onClick={() => navigate(-1)} alignSelf="flex-start" variant="ghost" h="34px" px="4px" color="#174f4a" fontSize="12px" fontWeight="600" borderRadius="6px">
            <FiArrowLeft /> Voltar
          </Button>
          <Flex align="center" gap={3} marginLeft={12}>
            <Flex w="36px" h="36px" borderRadius="full" bg="#0b6b5b" color="white" align="center" justify="center" flexShrink={0}>
              <LuFileText size={18} />
            </Flex>
            <Box>
              <Heading as="h1" fontSize={{ base: "16px", md: "20px" }} fontWeight="700" lineHeight="1.1" color="#062f2b">
                Contratos
              </Heading>
              <Text fontSize="11px" color="#60777c">
                Gerencie os contratos do aluno
              </Text>
            </Box>
          </Flex>
        </Flex>
        <Button size="sm" h="36px" px={4} bg="#064e43" color="white" borderRadius="8px" fontSize="12px" fontWeight="700" _hover={{ bg: "#043f37" }} onClick={handleNewContract} disabled={!!activeContract || contractsLoading}><LuPlus /> Novo contrato</Button>
      </Flex>

      {/* NAVEGAÇÃO - DADOS DE USUÁRIO */}
      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="8px"
        overflow="hidden"
        width="100%"
      >
        {/* DADOS DO ALUNO */}
        <Flex px={{ base: 3, md: 4 }} py={4} gap={4} justify="flex-start" align={{ base: "flex-start", lg: "center" }} direction={{ base: "column", lg: "row" }}>
          <HStack gap={4} minW={0}>
            <Avatar.Root w={{ base: "64px", md: "76px" }} h={{ base: "64px", md: "76px" }} flexShrink={0}>
              <Avatar.Fallback name={userData?.user_name || userData?.name || "Usuário"} />
              {(userData?.user_photo || userData?.photo) && (
                <Avatar.Image src={userData?.user_photo || userData?.photo} />
              )}
            </Avatar.Root>

            <Box minW={0}>
              <Heading fontSize="xl" lineHeight="1.2" color="#003b36" fontWeight="700">
                {formatName(userData?.user_name || userData?.name || "Usuário")}
              </Heading>
              <Text mt="5px" fontSize="12px" color="#60777c">
                Matrícula: {userData?.user_mat || "-"}
              </Text>
              <Flex align="center" gap={2} flexWrap="wrap">
                <Badge mt="8px" px="9px" py="4px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="10px">
                  {activeContract ? "Contrato vigente" : "Sem contrato vigente"}
                </Badge>
                <Text>
                  {activeContract && <Text mt={3} fontSize="12px" color="#607873">Vigência: {activeContract.plannedEndDate ? `até ${formatDate(activeContract.plannedEndDate)}` : "prazo indeterminado"}</Text>}
                </Text>
              </Flex>
            </Box>
          </HStack>
        </Flex>

        {/* ABAS */}
        <Flex px={{ base: 2, md: 3 }} borderTop="1px solid #e7eceb" borderBottom="1px solid #e7eceb" overflowX="auto" bg="#fff">
          {["Visão geral", "Contratos", "Mensalidades", "Pagamentos", "Histórico"].map((tab) =>
            <Button
              key={tab}
              flexShrink={0}
              h="44px" px="12px"
              variant="ghost"
              borderRadius="0"
              color={tab === "Contratos" ? "#063f39" : "#506a67"}
              fontSize="12px"
              fontWeight={tab === "Contratos" ? "700" : "500"}
              borderBottom={tab === "Contratos" ? "3px solid #063f39" : "3px solid transparent"}>
              {tab}
            </Button>
          )}
        </Flex>
      </Box>

      {/* LISTA - CONTEUDO PRINCIPAL */}
      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="8px"
        overflow="hidden"
        width="100%"
      >
        <Flex align="center" justify="space-between" px={4} py={3} borderBottom="1px solid #e6ecea" gap={2} flexWrap="wrap">
          <Heading fontSize="16px" color="#062f2b">Histórico de contratos</Heading>
          <Text fontSize="12px" color="#607873">{contractsList.length} registro(s)</Text>
        </Flex>
        {contractsLoading ? <Box p={8} textAlign="center" color="#607873">Carregando contratos...</Box> : contractsList.length === 0 ? <Box p={8} textAlign="center"><Text fontWeight="600" color="#174c45">Nenhum contrato cadastrado</Text><Text mt={1} fontSize="12px" color="#607873">Use “Novo contrato” para começar.</Text></Box> : (
          <>
            {/* Mobile: cards em vez de tabela */}
            <VStack display={{ base: "flex", md: "none" }} align="stretch" gap={3} p={3}>
              {sortedContracts.map((contract) => (
                <Box key={contract.id} border="1px solid #d7e2df" borderRadius="10px" bg="white" p={3}>
                  <Flex align="center" justify="space-between" gap={2} flexWrap="wrap" mb={3}>
                    <Badge bg="#e8f2ef" color="#0b6b5b" borderRadius="full" px={2}>{getContractType(contract)}</Badge>
                    <Badge bg={isContractActive(contract) ? "#e5f5ed" : "#f0f2f2"} color={isContractActive(contract) ? "#167347" : "#637673"} borderRadius="full" px={2}>{isContractActive(contract) ? "Ativo" : "Encerrado"}</Badge>
                  </Flex>
                  <Flex justify="space-between" align="start" gap={3} mb={3}>
                    <Box minW={0}><Text fontSize="11px" color="#607873">Plano</Text><Text fontSize="14px" fontWeight="700" color="#062f2b">{contract.plan || getContractType(contract)}</Text><Text fontSize="12px" color="#607873">{contract.periodicity || "Sem periodicidade"}</Text></Box>
                    <Box textAlign="right"><Text fontSize="11px" color="#607873">Valor mensal</Text><Text fontSize="18px" fontWeight="800" color="#063f37">{formatMoney(contract.contractedValue)}</Text></Box>
                  </Flex>
                  <Box borderTop="1px solid #e6ecea" pt={3}>
                    <Flex gap={3} wrap="wrap" justify="space-between">
                      <Box><Text fontSize="11px" color="#607873">Início</Text><Text fontSize="12px" color="#174c45" fontWeight="600">{formatDate(contract.startDate)}</Text></Box>
                      <Box><Text fontSize="11px" color="#607873">Fim previsto</Text><Text fontSize="12px" color="#174c45" fontWeight="600">{contract.indefinite ? "Indeterminado" : formatDate(contract.plannedEndDate)}</Text></Box>
                      {contract.closedAt && <Box><Text fontSize="11px" color="#607873">Fim definitivo</Text><Text fontSize="12px" color="#174c45" fontWeight="600">{formatDateTime(contract.closedAt)}</Text></Box>}
                    </Flex>
                  </Box>
                  <Flex gap={2} mt={3} pt={3} borderTop="1px solid #e6ecea" flexWrap="wrap">
                    <Button size="xs" variant="outline" borderColor="#d7e2df" color="#0b6b5b" onClick={() => handleViewContract(contract)}><LuEye /> Visualizar</Button>
                    {isContractActive(contract) && <Button size="xs" variant="outline" borderColor="#d7e2df" color="#0b6b5b" onClick={() => handleEditContract(contract)}><LuPencil /> Editar</Button>}
                    {isContractActive(contract) && <Button size="xs" variant="outline" borderColor="#f1cece" color="#c53030" onClick={() => handleEndContract(contract)}><LuCircleX /> Encerrar</Button>}
                  </Flex>
                </Box>
              ))}
            </VStack>
            {/* Desktop: tabela tradicional */}
            <Box display={{ base: "none", md: "block" }} overflowX="auto" w="100%">
              <Table.Root variant="line" size="sm" whiteSpace="nowrap" minW="900px">
                <Table.Header bg="#f4f8f7"><Table.Row>{["Tipo", "Plano", "Periodicidade", "Valor mensal", "Início", "Fim previsto", "Fim definitivo", "Status", "Ações"].map(label => <Table.ColumnHeader key={label} py={3} fontSize="11px" fontWeight="700" color="#54716b">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
                <Table.Body>{sortedContracts.map(contract => (
                  <Table.Row key={contract.id} _hover={{ bg: "#f7faf9" }}>
                    <Table.Cell><Badge bg="#e8f2ef" color="#0b6b5b" borderRadius="full" px={2}>{getContractType(contract)}</Badge></Table.Cell>
                    <Table.Cell>{contract.plan || "-"}</Table.Cell><Table.Cell>{contract.periodicity || "-"}</Table.Cell>
                    <Table.Cell fontWeight="700" color="#063f37">{formatMoney(contract.contractedValue)}</Table.Cell>
                    <Table.Cell>{formatDate(contract.startDate)}</Table.Cell>
                    <Table.Cell>{contract.indefinite ? "Indeterminado" : formatDate(contract.plannedEndDate)}</Table.Cell>
                    <Table.Cell>{contract.closedAt ? formatDateTime(contract.closedAt) : "-"}</Table.Cell>
                    <Table.Cell><Badge borderRadius="full" px={2} bg={isContractActive(contract) ? "#e5f5ed" : "#f0f2f2"} color={isContractActive(contract) ? "#167347" : "#637673"}>{isContractActive(contract) ? "Ativo" : "Encerrado"}</Badge></Table.Cell>
                    <Table.Cell><HStack gap={1}>
                      <Button size="xs" variant="ghost" color="#0b6b5b" onClick={() => handleViewContract(contract)}><LuEye /> Visualizar</Button>
                      {isContractActive(contract) && <Button size="xs" variant="ghost" color="#0b6b5b" onClick={() => handleEditContract(contract)}><LuPencil /> Editar</Button>}
                      {isContractActive(contract) && <Button size="xs" variant="ghost" color="#c53030" onClick={() => handleEndContract(contract)}><LuCircleX /> Encerrar</Button>}
                    </HStack></Table.Cell>
                  </Table.Row>
                ))}</Table.Body>
              </Table.Root>
            </Box>
          </>
        )}
      </Box>

      {/* DIALOG DE CONTRATO */}
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
            <Dialog.Content maxW={{ base: "calc(100vw - 64px)", md: "calc(100vw - 40%)" }} borderRadius="12px" overflow="hidden" border="1px solid #d7e2df">
              <Dialog.Header>
                <Dialog.Title color="#062f2b" fontWeight="700">
                  {dialogMode === "new" &&
                    "Novo contrato"}
                  {dialogMode === "edit" &&
                    "Editar contrato"}
                  {dialogMode === "view" &&
                    "Visualizar contrato"}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body bg="white">
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
                    <Field.Label fontSize="12px" fontWeight="600" color="#315650">
                      Tipo de contrato
                    </Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        h="38px" bg="white" borderColor="#cfd9d7" borderRadius="6px" fontSize="13px"
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
                          <Field.Label fontSize="12px" fontWeight="600" color="#315650">
                            Plano
                          </Field.Label>
                          <NativeSelect.Root>
                            <NativeSelect.Field
                              h="38px" bg="white" borderColor="#cfd9d7" borderRadius="6px" fontSize="13px"
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
                            <Field.Label fontSize="12px" fontWeight="600" color="#315650">
                              Duração
                            </Field.Label>
                            <NativeSelect.Root>
                              <NativeSelect.Field
                                h="38px" bg="white" borderColor="#cfd9d7" borderRadius="6px" fontSize="13px"
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
                            <Field.Label fontSize="12px" fontWeight="600" color="#315650">
                              Valor mensal
                            </Field.Label>
                            <Input
                              h="38px" borderColor="#cfd9d7" borderRadius="6px" fontSize="13px"
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
                            <Field.Label fontSize="12px" fontWeight="600" color="#315650">
                              Valor mensal
                            </Field.Label>
                            <Input
                              h="38px" borderColor="#cfd9d7" borderRadius="6px" fontSize="13px"
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
                      <Field.Label fontSize="12px" fontWeight="600" color="#315650">
                        Data de início
                      </Field.Label>
                      <Input
                        h="38px" borderColor="#cfd9d7" borderRadius="6px" fontSize="13px"
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
                      <Field.Label fontSize="12px" fontWeight="600" color="#315650">
                        Fim previsto
                      </Field.Label>
                      <Input
                        h="38px" borderColor="#cfd9d7" borderRadius="6px" fontSize="13px"
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
                        <Field.Label fontSize="12px" fontWeight="600" color="#315650">
                          Fim definitivo
                        </Field.Label>
                        <Input
                          h="38px" borderColor="#cfd9d7" borderRadius="6px" fontSize="13px"
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
              <Dialog.Footer bg="#f8faf9" borderTop="1px solid #e6ecea">
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

      {/* DIALOG ENCERRAMENTO */}
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
            <Dialog.Content maxW={{ base: "calc(100vw - 64px)", md: "calc(100vw - 40%)" }} borderRadius="12px" overflow="hidden" border="1px solid #d7e2df">
              <Dialog.Header>
                <Dialog.Title color="#062f2b" fontWeight="700">
                  Encerrar contrato
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body bg="white">
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
              <Dialog.Footer bg="#f8faf9" borderTop="1px solid #e6ecea">
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