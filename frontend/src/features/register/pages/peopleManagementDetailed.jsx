import { useLocation, useNavigate } from "react-router-dom";
import CardList from "../../../components/cards/cardList";
import { useEffect, useState } from "react";
import usersServices from "../../../services/usersServices";
import FormTextArea from "../../../components/formTextArea";
import { getCurrentDate } from "../../../utils/dateFunctions";
import fieldsServices from "../../../services/fieldsServices";
import { validateField } from "../../../utils/fieldValidators";
import HandleBack from "../../../components/handleBack";
import menusServices from "../../../services/menusServices";
import activitiesServices from "../../../services/activitiesServices";
import { Box, Button, Heading, HStack, SimpleGrid, VStack, createToaster, Flex } from "@chakra-ui/react";
import { toaster } from "../../../components/ui/toaster";
import HeadingPage from "../../../components/headingPage";

export default function PeopleManagementDetailed() {

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, userData, currentMode } = location.state || {};

  // Lista de menus
  const [listActive, setListActive] = useState(1 /*"Cadastrais"*/);

  // Utils
  const formattedDate = getCurrentDate();

  // Service que pega os dados das coleções -> "menus", "fields", "users"
  const { addUser, getUserNextMat, updateUser, refetchUsers, userNextMat } =
    usersServices();
  const { getFieldsByTitle, fieldsList } = fieldsServices();
  const { getMenus, refetchMenus, menusList } = menusServices();

  const isViewMode = currentMode === "V";
  const isEditMode = currentMode === "E";
  const isAddMode = currentMode === "A";

  const initializeFormData = () => {
    const initialData = {};

    fieldsList.forEach((field) => {
      switch (field.field) {
        case "user_mat":
          initialData[field.field] = userNextMat || "";
          break;
        //case "user_registration_date":
        //initialData[field.field] = formattedDate || "";
        //break;
        default:
          // Inicializa com string vazia para garantir que o campo exista
          initialData[field.field] = "";
      }
    });

    return initialData;
  };

  // No useEffect
  useEffect(() => {
    if (!isAddMode && userData) {
      setFormData({ ...userData });
    } else if (isAddMode) {
      setFormData(initializeFormData());
    }
  }, [isAddMode, userData, userNextMat, formattedDate, fieldsList]);

  //useEffect para menus
  useEffect(() => {
    if (refetchMenus) {
      getMenus();
    }
  }, [refetchMenus]);

  // Leva uma mensagem para o services, a função getUserNextMat caso seja para adicionar usuário
  if (isAddMode) {
    useEffect(() => {
      if (refetchUsers) {
        getUserNextMat();
      }
    }, [refetchUsers]);
  }

  useEffect(() => {
    getFieldsByTitle("users");
  }, []);

  useEffect(() => {
    // valor que representa "SIM"
    const YES_VALUE = "1"; // ajuste se for "S", true, etc.

    if (formData.user_physically_disabled !== YES_VALUE) {
      setFormData((prev) => {
        // se já estiver vazio, não faz nada
        if (!prev.user_type_physically_disabled) return prev;

        return {
          ...prev,
          user_type_physically_disabled: "",
        };
      });
    }
  }, [formData.user_physically_disabled]);


  //FUNÇõES
  /* COLOCA PARA MAIUSCULO, É MELHOR COLOCAR EM MAIUSCULO NA HORA QUE ENVIAR O FORMULÁRIO
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: typeof value === "string" ? value.toUpperCase() : value,
    }));
  };
  */

  //Valida os campos
  const validateFields = (fieldsList, formData) => {
    const newErrors = {};

    fieldsList.forEach((field) => {

      if (field.dependsOn) {
        const { field: dependsField, value } = field.dependsOn;

        if (formData[dependsField] !== value) {
          return; // 🔥 não valida este campo
        }
      }

      const value = formData[field.field];
      const errors = validateField(field, value);

      if (errors.length > 0) {
        newErrors[field.field] = errors.join(", ");
      }
    });

    return newErrors;
  };

  //Aparece o toast
  const showSnackbar = (message, type = "error") => {
    toaster.create({
      title: message,
      type: type,
      duration: 4000,
    });
  };

  // Verifica a mudança dos inputs
  const handleChange = async (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "user_cep" && value.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const dataCep = await res.json();

        if (!dataCep.erro) {
          setFormData((prev) => ({
            ...prev,
            user_street: dataCep.logradouro || "",
            user_district: dataCep.bairro || "",
            user_country: dataCep.localidade || "",
            user_state: dataCep.uf || "",
          }));
        } else {
          //console.warn("CEP inválido!");
        }
      } catch (err) {
        //console.warn("Erro ao consultar CEP: ", err);
      }
    }
  };

  /*
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  */

  /*
    const [mat, setMat] = useState("");
  
    useEffect(() => {
      if (!isAddMode && userData) {
        setMat(userData.mat|| "");
      }
    }, [isAddMode, userData]);
  */

  //Função para voltar a tela
  const handleBack = (e) => {
    e.preventDefault();
    navigate(-1);
  };

  //CRUD
  //Função finalizando o formulário, inserir
  const handleSubmitForm = (e) => {
    e.preventDefault();

    const validationErrors = validateFields(fieldsList, formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);

      const fields = Object.keys(validationErrors)
        .map((key) => fieldsList.find((f) => f.field === key)?.title)
        .join(", ");

      if (fields.length <= 50) {
        showSnackbar(
          `Preencha todos os campos corretamente : ${fields}`,
          "error"
        );
      } else {
        showSnackbar(`Preencha todos os campos corretamente!`, "error");
      }
      return;
    }

    // Garante que todos os campos estejam presentes antes de enviar
    const completeFormData = { ...formData };

    // Verifica se algum campo da fieldsList está faltando e adiciona com valor vazio
    fieldsList.forEach((field) => {
      if (!(field.field in completeFormData)) {
        completeFormData[field.field] = "";
      }
    });

    // Verifica se vai atualizar ou adicionar
    if (currentMode === "A") {
      setErrors({});
      addUser(completeFormData);
      showSnackbar("Usuário adicionado com sucesso!", "success");
      setTimeout(() => navigate(-1), 1500);
    } else {
      setErrors({});
      let updateData = {};
      for (const key in formData) {
        if (!(formData[key] === userData[key])) {
          updateData[key] = formData[key];
        }
      }

      //Verifica o tamanho do Objeto de atualização
      if (!updateData || Object.keys(updateData).length === 0) {
        showSnackbar("Nenhum dado foi atualizado", "error");
      } else {
        updateUser(formData._id, updateData);
        showSnackbar("Usuário atualizado com sucesso!", "success");
        setTimeout(() => navigate(-1), 1500);
      }

      /* OPÇÃO MAIS MODERNA ESTUDAR!!!!
        const updateData = Object.entries(formData).reduce((acc, [key, value]) => {
          if (value !== userData[key]) {
            acc[key] = value; // adiciona a propriedade que mudou
          }
          return acc;
        }, {});
      */
    }
  };

  return (
    <VStack gap={4} align="stretch">

      {isViewMode && <HeadingPage content={"Gestão de pessoas - Visualizar"} />}
      {isAddMode && <HeadingPage content={"Gestão de pessoas - Inserir"} />}
      {isEditMode && <HeadingPage content={"Gestão de pessoas - Alterar"} />}

      {/* MONTA a distribuição de menus recebido pelo banco e somente da página "people Management"*/}
      <HStack gap={2} overflowX="auto" overflowY="hidden">
        {menusList
          .filter(menu => menu.pageId === "peopleManagement")
          .sort((a, b) => {
            if (a.order === 0) return 1;
            if (b.order === 0) return -1;
            return a.order - b.order;
          })
          .map((menu) => (
            <CardList
              key={menu._id}
              text={menu.name}
              active={listActive === Number(menu.order)}
              onClick={() => setListActive(Number(menu.order))}
            />
          ))}
      </HStack>

      <Box>
        <Box as="form" onSubmit={handleSubmitForm} autoComplete="off" mt={6}>

          {/* DUMMY FIELDS PARA BLOQUEAR AUTOFILL */}
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

          <Flex gap={4} flexWrap="wrap">
            {fieldsList.map((field) => {

              // ✅ REGRA DE DEPENDÊNCIA (GENÉRICA)
              if (field.dependsOn) {
                const { field: dependsField, value } = field.dependsOn;

                if (formData[dependsField] !== value) {
                  return null; // 🔥 não renderiza o campo
                }
              }

              return (
                <Box
                  key={field._id}
                  display={field.folder === listActive ? "block" : "none"}
                >
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

          <HStack position="fixed" top="72px" right="12px" gap={2}>
            <Button size="xs" variant="surface" type="button" onClick={handleBack}>Cancelar</Button>
            {!isViewMode && <Button size="xs" variant="surface" type="submit">Salvar</Button>}
          </HStack>
        </Box>
      </Box>
    </VStack>
  );
}
