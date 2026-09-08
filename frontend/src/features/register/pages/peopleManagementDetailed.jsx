
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Box, Button, HStack, VStack, Flex, Text } from "@chakra-ui/react";

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

    <VStack
      gap={4}
      align="stretch"
    >

      {/* ======================================================
          TÍTULO DA PÁGINA
          ====================================================== */}

      {isViewMode && (
        <HeadingPage
          content="Gestão de pessoas - Visualizar"
        />
      )}

      {isAddMode && (
        <HeadingPage
          content="Gestão de pessoas - Inserir"
        />
      )}

      {isEditMode && (
        <HeadingPage
          content="Gestão de pessoas - Alterar"
        />
      )}


      {/* ======================================================
          FORMULÁRIO
          ====================================================== */}

      <Box>

        <Box
          as="form"
          onSubmit={handleSubmitForm}
          autoComplete="off"
          mt={6}
        >


          {/* ==================================================
              BLOQUEIA AUTOFILL
              ================================================== */}

          <input
            type="text"
            name="fakeusernameremembered"
            style={{
              display: "none"
            }}
            autoComplete="username"
          />

          <input
            type="password"
            name="fakepasswordremembered"
            style={{
              display: "none"
            }}
            autoComplete="new-password"
          />


          {/* ==================================================
              SEÇÕES DOS CAMPOS
              ================================================== */}

          {pageMenus.map((menu) => {

            // ----------------------------------------------
            // CAMPOS PERTENCENTES AO MENU
            // ----------------------------------------------

            const menuFields =
              fieldsList.filter(
                (field) =>
                  Number(field.folder) ===
                  Number(menu.order)
              );


            // ----------------------------------------------
            // NÃO MOSTRA MENU SEM CAMPOS
            // ----------------------------------------------

            if (menuFields.length === 0) {
              return null;
            }


            return (

              <Box
                key={menu._id}
                mb={10}
              >

                {/* ========================================
                    TÍTULO DA SEÇÃO
                    ======================================== */}

                <HStack
                  gap={3}
                  mb={5}
                  align="center"
                >

                  <Text
                    fontSize="lg"
                    fontWeight="bold"
                    whiteSpace="nowrap"
                  >
                    {menu.name}
                  </Text>

                  <Box
                    flex="1"
                    height="1px"
                    bg="gray.300"
                  />

                </HStack>

                {/* ========================================
                    CAMPOS DA SEÇÃO
                    ======================================== */}
                <Flex gap={5} rowGap={5} flexWrap="wrap">
                  {menuFields.map((field) => {
                    // ======================================
                    // REGRA DE DEPENDÊNCIA
                    // ======================================
                    if (field.dependsOn) {
                      const {
                        field: dependsField,
                        value
                      } = field.dependsOn;
                      if (formData[dependsField] !== value) {
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

          {/* ==================================================
              BOTÕES
              ================================================== */}
          <HStack
            position="fixed"
            top="72px"
            right="12px"
            gap={2}
          >
            <Button
              size="xs"
              variant="surface"
              type="button"
              onClick={handleBack}
            >
              Cancelar
            </Button>

            {!isViewMode && (
              <Button
                size="xs"
                variant="surface"
                type="submit"
              >
                Salvar
              </Button>
            )}
          </HStack>
        </Box>
      </Box>
    </VStack>

  );
}
