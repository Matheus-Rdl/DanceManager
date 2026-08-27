import { useLocation, useNavigate } from "react-router-dom";
import fieldsServices from "../../../services/fieldsServices";
import { useEffect, useState } from "react";
import CardList from "../../../components/cards/cardList";
import FormTextArea from "../../../components/formTextArea";
import { validateField } from "../../../utils/fieldValidators";
import activitiesServices from "../../../services/activitiesServices";
import HandleBack from "../../../components/handleBack";
import {
  Box,
  Button,
  Heading,
  HStack,
  VStack,
  createToaster,
  Flex,
  SimpleGrid
} from "@chakra-ui/react";
import { toaster } from "../../../components/ui/toaster";
import HeadingPage from "../../../components/headingPage";

export default function ActivityManagementDetailed() {
  const [formData, setFormData] = useState({});
  const [listActive, setListActive] = useState(1);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const { activityId, activityData, currentMode } = location.state || {};
  const { getFieldsByTitle, fieldsList } = fieldsServices();
  const {
    addActivity,
    getActivityNextMat,
    updateActivity,
    refetchActivities,
    activityNextMat,
  } = activitiesServices();

  const isViewMode = currentMode === "V";
  const isEditMode = currentMode === "E";
  const isAddMode = currentMode === "A";

  const listItems = {
    1: "Cadastrais",
  };

  const initializeFormData = () => {
    const initialData = {};

    fieldsList.forEach((field) => {
      switch (field.field) {
        case "activity_mat":
          initialData[field.field] = activityNextMat || "";
          break;
        default:
          // Inicializa com string vazia para garantir que o campo exista
          initialData[field.field] = "";
      }
    });

    return initialData;
  };

  useEffect(() => {
    getFieldsByTitle("activities");
  }, []);

  if (isAddMode) {
    useEffect(() => {
      if (refetchActivities) {
        getActivityNextMat();
      }
    }, [refetchActivities]);
  }

  useEffect(() => {
    if (!isAddMode && activityData) {
      setFormData({ ...activityData });
    } else if (isAddMode) {
      setFormData(initializeFormData());
    }
  }, [isAddMode, activityData, activityNextMat, fieldsList]);

  //Valida os campos
  const validateFields = (fieldsList, formData) => {
    const newErrors = {};

    fieldsList.forEach((field) => {
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
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  //Função para voltar a tela
  const handleBack = (e) => {
    e.preventDefault();
    navigate(-1);
  };

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
      addActivity(completeFormData);
      showSnackbar("Atividade adicionada com sucesso!", "success");
      setTimeout(() => navigate(-1), 1500);
    } else {
      setErrors({});
      let updateData = {};
      for (const key in formData) {
        if (!(formData[key] === activityData[key])) {
          updateData[key] = formData[key];
        }
      }

      //Verifica o tamanho do Objeto de atualização
      if (!updateData || Object.keys(updateData).length === 0) {
        showSnackbar("Nenhum dado foi atualizado", "error");
      } else {
        updateActivity(formData._id, updateData);
        showSnackbar("Atividade atualizado com sucesso!", "success");
        setTimeout(() => navigate(-1), 1500);
      }
    }
  };

  return (
    <VStack gap={4} align="stretch">

      {isViewMode && <HeadingPage content={"Gerenciar Atividades - Visualizar"} />}
      {isAddMode && <HeadingPage content={"Gerenciar Atividades - Inserir"} />}
      {isEditMode && <HeadingPage content={"Gerenciar Atividades - Alterar"} />}

      <HStack gap={2} overflowX="auto" overflowY="hidden">
        {Object.entries(listItems).map(([key, label]) => (
          <CardList
            key={key}
            text={label}
            active={listActive === Number(key)}
            onClick={() => setListActive(Number(key))}
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
            {fieldsList.map((field) => (
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
                  errors={errors}
                  nextMat={activityNextMat}
                />
              </Box>
            ))}
          </Flex>

          <HStack position="fixed" top="72px" right="12px" gap={2}>
            <Button size="xs" variant="surface" onClick={handleBack}>Cancelar</Button>
            {!isViewMode && <Button size="xs" variant="surface" type="submit">Salvar</Button>}
          </HStack>
        </Box>
      </Box>
    </VStack>
  );
}
