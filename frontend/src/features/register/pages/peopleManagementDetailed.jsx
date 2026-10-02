
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Badge, Avatar, Box, Button, HStack, VStack, Flex, Text, Heading } from "@chakra-ui/react";

//Utils
import { getCurrentDate } from "../../../utils/dateFunctions";
import { validateField } from "../../../utils/fieldValidators";

//Services
import menusServices from "../../../services/menusServices";
import fieldsServices from "../../../services/fieldsServices";
import usersServices from "../../../services/usersServices";

//Components
import { toaster } from "../../../components/ui/toaster";
import HeadingPage from "../../../components/headingPage";
import FormTextArea from "../../../components/formTextArea";

//React Icons
import { FiArrowLeft, FiCalendar, FiCheck, FiFileText } from "react-icons/fi";
import { TbUserSquareRounded } from "react-icons/tb";


export default function PeopleManagementDetailed() {

  // ============================================================
  // ESTADOS
  // ============================================================

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const location = useLocation();

  const {
    userId,
    userData,
    currentMode
  } = location.state || {};


  // ============================================================
  // UTILS
  // ============================================================

  const formattedDate = getCurrentDate();


  // ============================================================
  // SERVICES
  // ============================================================

  const {
    addUser,
    getUserNextMat,
    updateUser,
    refetchUsers,
    userNextMat
  } = usersServices();

  const {
    getFieldsByTitle,
    fieldsList
  } = fieldsServices();

  const {
    getMenus,
    refetchMenus,
    menusList
  } = menusServices();


  // ============================================================
  // MODOS
  // ============================================================

  const isViewMode = currentMode === "V";
  const isEditMode = currentMode === "E";
  const isAddMode = currentMode === "A";


  // ============================================================
  // INICIALIZA FORMULÁRIO
  // ============================================================

  const initializeFormData = () => {

    const initialData = {};

    fieldsList.forEach((field) => {

      switch (field.field) {

        case "user_mat":

          initialData[field.field] =
            userNextMat || "";

          break;

        default:

          initialData[field.field] = "";

      }

    });

    return initialData;
  };


  // ============================================================
  // CARREGA DADOS DO USUÁRIO
  // ============================================================

  useEffect(() => {

    if (!isAddMode && userData) {

      setFormData({
        ...userData
      });

    } else if (isAddMode) {

      setFormData(
        initializeFormData()
      );

    }

  }, [
    isAddMode,
    userData,
    userNextMat,
    fieldsList
  ]);


  // ============================================================
  // CARREGA MENUS
  // ============================================================

  useEffect(() => {

    if (refetchMenus) {
      getMenus();
    }

  }, [refetchMenus]);


  // ============================================================
  // CARREGA PRÓXIMA MATRÍCULA
  // ============================================================

  useEffect(() => {

    if (!isAddMode) return;

    if (refetchUsers) {
      getUserNextMat();
    }

  }, [
    isAddMode,
    refetchUsers
  ]);


  // ============================================================
  // CARREGA CAMPOS
  // ============================================================

  useEffect(() => {

    getFieldsByTitle("users");

  }, []);


  // ============================================================
  // REGRA DE DEPENDÊNCIA
  // ============================================================

  useEffect(() => {

    // Valor que representa "SIM"
    const YES_VALUE = "1";

    if (
      formData.user_physically_disabled !== YES_VALUE
    ) {

      setFormData((prev) => {

        if (!prev.user_type_physically_disabled) {
          return prev;
        }

        return {
          ...prev,
          user_type_physically_disabled: ""
        };

      });

    }

  }, [
    formData.user_physically_disabled
  ]);


  // ============================================================
  // VALIDAÇÃO DOS CAMPOS
  // ============================================================

  const validateFields = (
    fieldsList,
    formData
  ) => {

    const newErrors = {};

    fieldsList.forEach((field) => {

      // ----------------------------------------
      // VERIFICA DEPENDÊNCIA
      // ----------------------------------------

      if (field.dependsOn) {

        const {
          field: dependsField,
          value
        } = field.dependsOn;

        if (
          formData[dependsField] !== value
        ) {
          return;
        }

      }


      // ----------------------------------------
      // VALIDA CAMPO
      // ----------------------------------------

      const value =
        formData[field.field];

      const fieldErrors =
        validateField(
          field,
          value
        );

      if (fieldErrors.length > 0) {

        newErrors[field.field] =
          fieldErrors.join(", ");

      }

    });

    return newErrors;
  };


  // ============================================================
  // TOAST
  // ============================================================

  const showSnackbar = (
    message,
    type = "error"
  ) => {

    toaster.create({

      title: message,

      type: type,

      duration: 4000

    });

  };


  // ============================================================
  // ALTERAÇÃO DOS CAMPOS
  // ============================================================

  const handleChange = async (e) => {

    const {
      name,
      value
    } = e.target;


    // ----------------------------------------
    // ATUALIZA FORM DATA
    // ----------------------------------------

    setFormData((prev) => ({

      ...prev,

      [name]: value

    }));


    // ----------------------------------------
    // BUSCA CEP
    // ----------------------------------------

    if (
      name === "user_cep" &&
      value.length === 8
    ) {

      try {

        const response =
          await fetch(
            `https://viacep.com.br/ws/${value}/json/`
          );

        const dataCep =
          await response.json();


        if (!dataCep.erro) {

          setFormData((prev) => ({

            ...prev,

            user_street:
              dataCep.logradouro || "",

            user_district:
              dataCep.bairro || "",

            user_country:
              dataCep.localidade || "",

            user_state:
              dataCep.uf || ""

          }));

        }

      } catch (error) {

        // Não interrompe o preenchimento
        // caso o ViaCEP esteja indisponível.

      }

    }

  };


  // ============================================================
  // VOLTAR
  // ============================================================

  const handleBack = (e) => {

    e.preventDefault();

    navigate(-1);

  };


  // ============================================================
  // SALVAR FORMULÁRIO
  // ============================================================

  const handleSubmitForm = (e) => {

    e.preventDefault();


    // ----------------------------------------
    // VALIDA CAMPOS
    // ----------------------------------------

    const validationErrors =
      validateFields(
        fieldsList,
        formData
      );


    if (
      Object.keys(validationErrors).length > 0
    ) {

      setErrors(
        validationErrors
      );


      const fields =
        Object.keys(validationErrors)
          .map(
            (key) =>
              fieldsList.find(
                (field) =>
                  field.field === key
              )?.title
          )
          .join(", ");


      if (fields.length <= 50) {

        showSnackbar(
          `Preencha todos os campos corretamente: ${fields}`,
          "error"
        );

      } else {

        showSnackbar(
          "Preencha todos os campos corretamente!",
          "error"
        );

      }

      return;

    }


    // ----------------------------------------
    // GARANTE TODOS OS CAMPOS
    // ----------------------------------------

    const completeFormData = {
      ...formData
    };


    fieldsList.forEach((field) => {

      if (
        !(field.field in completeFormData)
      ) {

        completeFormData[field.field] = "";

      }

    });


    // ----------------------------------------
    // INSERIR
    // ----------------------------------------

    if (currentMode === "A") {

      setErrors({});

      addUser(
        completeFormData
      );

      showSnackbar(
        "Usuário adicionado com sucesso!",
        "success"
      );


      setTimeout(
        () => navigate(-1),
        1500
      );

      return;

    }


    // ----------------------------------------
    // ALTERAR
    // ----------------------------------------

    setErrors({});


    const updateData = {};


    for (
      const key in formData
    ) {

      if (
        formData[key] !== userData[key]
      ) {

        updateData[key] =
          formData[key];

      }

    }


    // ----------------------------------------
    // NENHUMA ALTERAÇÃO
    // ----------------------------------------

    if (
      Object.keys(updateData).length === 0
    ) {

      showSnackbar(
        "Nenhum dado foi atualizado",
        "error"
      );

      return;

    }


    // ----------------------------------------
    // ATUALIZA
    // ----------------------------------------

    updateUser(
      formData._id,
      updateData
    );


    showSnackbar(
      "Usuário atualizado com sucesso!",
      "success"
    );


    setTimeout(
      () => navigate(-1),
      1500
    );

  };


  // ============================================================
  // MENUS DA PÁGINA
  // ============================================================

  const pageMenus = menusList
    .filter(
      (menu) =>
        menu.pageId === "peopleManagement"
    )
    .sort((a, b) => {

      if (a.order === 0) return 1;

      if (b.order === 0) return -1;

      return a.order - b.order;

    });


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <VStack gap={3} align="stretch" width="100%" minWidth={0} bg="#f8faf9">

      {/* TÍTULO */}
      <Flex>
        <Flex>
          <Button onClick={() => navigate(-1)} alignSelf="flex-start" variant="ghost" h="34px" px="4px" color="#174f4a" fontSize="12px" fontWeight="600" borderRadius="6px">
            <FiArrowLeft /> Voltar
          </Button>
          <Flex align="center" gap={3} marginLeft={12}>
            <Flex w="36px" h="36px" borderRadius="full" bg="#0b6b5b" color="white" align="center" justify="center" flexShrink={0}>
              <TbUserSquareRounded size={18} />
            </Flex>
            <Box>
              <Heading as="h1" fontSize={{ base: "16px", md: "20px" }} fontWeight="700" lineHeight="1.1" color="#062f2b">
                Visão geral do usuário
              </Heading>
            </Box>
          </Flex>
        </Flex>

        {/*}
        <HStack gap={2}>
          <Button
            size="xs"
            variant="outline"
            type="button"
            onClick={handleBack}
          >
            Cancelar
          </Button>

          {!isViewMode && (
            <Button
              size="xs"
              type="submit"
              form="people-management-form"
              bg="#00695c"
              color="white"
              _hover={{ bg: "#00574d" }}
            >
              Salvar
            </Button>
          )}
        </HStack>
{*/}

      </Flex>

      {/* CABEÇALHO */}
      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="8px"
        overflow="hidden"
        width="100%"
      >

        {/* CABEÇALHO */}
        {!isAddMode && (
          <Flex px={{ base: 3, md: 4 }} py={4} gap={4} justify="flex-start" align={{ base: "flex-start", lg: "center" }} direction={{ base: "column", lg: "row" }}>

            {/* DADOS DO ALUNO */}
            <HStack gap={4} minW={0}>
              <Avatar.Root w={{ base: "64px", md: "76px" }} h={{ base: "64px", md: "76px" }} flexShrink={0}>
                <Avatar.Fallback name={formData.user_name || formData.name || "Usuário"} />
                {(formData.user_photo || formData.photo) && (
                  <Avatar.Image src={formData.user_photo || formData.photo} />
                )}
              </Avatar.Root>

              <Box minW={0}>
                <Heading fontSize="xl" lineHeight="1.2" color="#003b36" fontWeight="700">
                  {/*formData.user_name || formData.name || "Usuário"*/}
                  João Pedro Silva
                </Heading>
                <Text mt="5px" fontSize="12px" color="#60777c">
                  MAT: {formData.user_mat || "-"}
                </Text>
                <Badge mt="8px" px="9px" py="4px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="10px">
                  <FiCheck /> Aluno ativo
                </Badge>
              </Box>
            </HStack>

            {/* DADOS DO CONTRATO */}
            <Flex w={{ base: "100%", lg: "430px" }} border="1px solid #e2e8e7" borderRadius="8px" overflow="hidden" direction={{ base: "column", sm: "row" }}>
              <Box flex="1" p={3}><Text fontSize="10px" fontWeight="700" color="#174f4a">Contrato atual</Text><Text mt="2px" fontSize="14px" fontWeight="800" color="#063f39">{/*student.contract*/}Sem contrato</Text><Text mt="2px" fontSize="12px" color="#506a67">{/*{/*student.periodicity*/} • {/*formatCurrency(/*student.monthlyAmount) / mês*/} Adicione um contrato ou plano mensal</Text><HStack mt="7px" gap="6px" wrap="wrap"><Text fontSize="10px" color="#60777c">{/*student.contractStart} → {student.contractEnd*/}</Text><Badge px="7px" py="3px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="9px">Ativo</Badge></HStack></Box>
              <Flex p={3} minW={{ sm: "180px" }} borderLeft={{ base: "0", sm: "1px solid #e2e8e7" }} borderTop={{ base: "1px solid #e2e8e7", sm: "0" }} align="center" justify="center"><Button w="100%" h="36px" variant="outline" borderColor="#d6e0df" borderRadius="8px" color="#174f4a" bg="white" fontSize="11px"><FiFileText /> Ver detalhes do contrato</Button></Flex>
            </Flex>
          </Flex>
        )}

        {/* ABAS */}
        {!isAddMode && (
          <HStack
            px={5}
            height="43px"
            gap={7}
            borderTopWidth="1px"
            borderColor="gray.200"
            overflowX="auto"
          >
            <Box
              height="43px"
              display="flex"
              alignItems="center"
              borderBottom="2px solid #00695c"
              color="#004d40"
              fontWeight="600"
              fontSize="xs"
              whiteSpace="nowrap"
              cursor="pointer"
            >
              Visão geral
            </Box>

            <Box
              height="43px"
              display="flex"
              alignItems="center"
              color="gray.600"
              fontSize="xs"
              whiteSpace="nowrap"
              cursor="pointer"
            >
              Contratos
            </Box>

            <Box
              height="43px"
              display="flex"
              alignItems="center"
              color="gray.600"
              fontSize="xs"
              whiteSpace="nowrap"
              cursor="pointer"
            >
              Mensalidades
            </Box>

            <Box
              height="43px"
              display="flex"
              alignItems="center"
              color="gray.600"
              fontSize="xs"
              whiteSpace="nowrap"
              cursor="pointer"
            >
              Pagamentos
            </Box>

            <Box
              height="43px"
              display="flex"
              alignItems="center"
              color="gray.600"
              fontSize="xs"
              whiteSpace="nowrap"
              cursor="pointer"
            >
              Histórico
            </Box>
          </HStack>
        )}
      </Box>

      {/* FORMULÁRIO */}
      <Box
        as="form"
        id="people-management-form"
        onSubmit={handleSubmitForm}
        autoComplete="off"
        mt={5}
        px={1}
      >
        <input
          type="text"
          name="fakeusernameremembered"
          style={{ display: "none" }}
          autoComplete="username"
        />

        <input
          type="password"
          name="fakepasswordremembered"
          style={{ display: "none" }}
          autoComplete="new-password"
        />

        {/* TÍTULO PARA NOVO CADASTRO */}
        {isAddMode && (
          <Box mb={6}>
            <Text
              fontSize="lg"
              fontWeight="700"
              color="#003b36"
            >
              Novo usuário
            </Text>

            <Text
              fontSize="sm"
              color="gray.500"
            >
              Preencha os dados para cadastrar uma nova pessoa.
            </Text>
          </Box>
        )}

        {/* SEÇÕES DOS CAMPOS */}
        {pageMenus.map((menu) => {

          const menuFields = fieldsList.filter(
            (field) =>
              Number(field.folder) ===
              Number(menu.order)
          );

          if (menuFields.length === 0) {
            return null;
          }

          return (
            <Box
              key={menu._id}
              mb={8}
              bg="white"
            >
              {/* TÍTULO DA SEÇÃO */}
              <HStack
                gap={3}
                mb={5}
                align="center"
              >
                <Text
                  fontSize="md"
                  fontWeight="700"
                  color="#1a1a1a"
                  whiteSpace="nowrap"
                >
                  {menu.name}
                </Text>

                <Box
                  flex="1"
                  height="1px"
                  bg="gray.200"
                />
              </HStack>

              {/* CAMPOS */}
              <Flex
                gap={5}
                rowGap={5}
                flexWrap="wrap"
              >
                {menuFields.map((field) => {

                  if (field.dependsOn) {
                    const {
                      field: dependsField,
                      value
                    } = field.dependsOn;

                    if (
                      formData[dependsField] !== value
                    ) {
                      return null;
                    }
                  }

                  return (
                    <Box key={field._id}>
                      <FormTextArea
                        field={field}
                        addMode={isAddMode}
                        viewMode={isViewMode}
                        handleChange={handleChange}
                        data={formData}
                        currentMode={currentMode}
                        nextMat={userNextMat}
                        errors={errors}
                        dateRegister={formattedDate}
                      />
                    </Box>
                  );
                })}
              </Flex>
            </Box>
          );
        })}

        {/* BOTÕES INFERIORES NO MOBILE */}
        <Flex
          display={{ base: "flex", md: "none" }}
          justify="flex-end"
          gap={2}
          pt={3}
          pb={6}
        >
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={handleBack}
          >
            Cancelar
          </Button>

          {!isViewMode && (
            <Button
              size="sm"
              type="submit"
              bg="#00695c"
              color="white"
              _hover={{ bg: "#00574d" }}
            >
              Salvar
            </Button>
          )}
        </Flex>
      </Box>
    </VStack>
  );
}
