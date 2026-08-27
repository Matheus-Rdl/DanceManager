import { selectOptions } from "../utils/userSelectOptions";
import Select from "react-select";
import {
  Field,
  Input,
  NativeSelect,
  Box,
  Text,
} from "@chakra-ui/react";
import { IoIosArrowDown } from "react-icons/io";

export default function FormTextArea({
  field,
  addMode,
  viewMode,
  handleChange,
  data,
  currentMode,
  nextMat,
  errors,
  dateRegister,
}) {

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================

  // Retorna as opções cadastradas para determinado campo.
  //
  // Exemplo:
  // getSelectOptions("activity_type")
  //
  // Retorna:
  // {
  //   1: "1 - INGLÊS",
  //   2: "2 - ESPANHOL",
  //   3: "3 - FOTOGRAFIA",
  //   4: "4 - GENÉRICO"
  // }
  //
  // O ?. evita erro caso selectOptions ou o campo não exista.
  const getSelectOptions = (fieldName) => {
    return selectOptions?.[fieldName] || {};
  };


  // Pega o valor correspondente a uma opção do select.
  //
  // Exemplo:
  // getFormattedValue("activity_type", "1")
  //
  // Retorna:
  // "1 - INGLÊS"
  //
  // Se não encontrar a opção, retorna o próprio valor.
  const getFormattedValue = (fieldName, value) => {
    if (!fieldName || value === undefined || value === null) return "";

    const options = getSelectOptions(fieldName);

    return options?.[value] || value || "";
  };


  // Verifica se o campo pode ser editado no modo atual.
  //
  // field.mode contém os modos em que o campo pode ser alterado.
  const isFieldEnabled = field.mode?.includes(currentMode);

  // ============================================================
  // LARGURA DOS CAMPOS
  // ============================================================

  // Define a largura do campo de acordo com o maxLength
  // definido na configuração do campo.
  //
  // Exemplo:
  // maxLength = 20
  // 20 * 8 = 160px
  //
  // Porém o campo nunca terá menos que 300px
  // nem mais que 600px.
  const getFieldWidth = (maxLength) => {
    if (!maxLength) return "600px";

    const width = maxLength * 8;

    return `${Math.min(Math.max(width, 300), 600)}px`;
  };


  // ============================================================
  // ESTILOS PADRÃO DOS INPUTS
  // ============================================================

  const commonInputProps = {
    bg: "rgba(156, 155, 155, 0.3)",

    borderColor: "gray.500",

    _hover: {
      bg: "rgba(156, 155, 155, 0.4)",
    },

    _focus: {
      bg: "rgba(156, 155, 155, 0.5)",
      borderColor: "black",
      boxShadow: "1px 1px 2px black",
    },
  };


  // ============================================================
  // REMOVE O CÓDIGO DAS OPÇÕES
  // ============================================================

  // As opções estão armazenadas assim:
  //
  // "1 - INGLÊS"
  // "2 - ESPANHOL"
  // "3 - FOTOGRAFIA"
  //
  // Essa função remove o código e deixa somente:
  //
  // "INGLÊS"
  // "ESPANHOL"
  // "FOTOGRAFIA"
  //
  const removeCode = (value) => {
    if (typeof value !== "string") return value;

    return value.replace(/^\d+\s*-\s*/, "");
  };

  // ============================================================
  // VALOR QUE SERÁ MOSTRADO NO MODO VISUALIZAÇÃO
  // ============================================================
  // Essa função decide qual texto deverá aparecer
  // dentro do Input quando estiver em viewMode.
  const getViewValue = () => {
    // Caso o campo seja um multiselect normal.
    //
    // Exemplo:
    //
    // data[field.field] = ["1", "2"]
    //
    // transforma em:
    //
    // "INGLÊS | ESPANHOL"
    if (Array.isArray(data?.[field.field])) {
      return data[field.field]
        .map((id) =>
          removeCode(
            getFormattedValue(field.field, id)
          )
        )
        .join("  |  ");
    }
    // Caso seja um campo normal, não-array.
    return removeCode(
      getFormattedValue(
        field.field,
        data?.[field.field]
      )
    );
  };
  // Guarda o valor final que será mostrado no modo visualização.
  const viewValue = getViewValue();

  // ============================================================
  // LARGURA DO CAMPO NO MODO VISUALIZAÇÃO
  // ============================================================
  // Calcula a largura com base no tamanho do texto.
  //
  // Exemplo:
  //
  // "INGLÊS"
  //
  // tem poucos caracteres → campo menor.
  //
  // "INGLÊS | GENÉRICO"
  //
  // tem mais caracteres → campo maior.
  const getViewFieldWidth = (value) => {
    // Se não existir valor, utiliza 300px.
    if (!value) return "300px";
    // Aproximadamente 8px por caractere.
    const width = value.length * 8;
    // Nunca menor que 300px
    // nem maior que 600px.
    return `${Math.min(Math.max(width, 300), 600)}px`;
  };
  // ============================================================
  // RENDERIZAÇÃO
  // ============================================================
  return (
    <>
      {/* ========================================================
          TIPO 1 — INPUT DE TEXTO
          ======================================================== */}
      {field.input === 1 && (
        <Field.Root invalid={!!errors[field.field]}>
          <Box
            w={`${field.maxLength}ch`}
            minW="250px"
            maxW="500px"
          >
            <Field.Label
              fontWeight="bold"
              htmlFor={field.field}
            >
              {field.title}
              {field.required && (
                <Text color="red.500">*</Text>
              )}
            </Field.Label>
            <Input
              id={field.field}
              name={field.field}
              type={field.type}
              maxLength={field.maxLength}
              // No modo de adicionar usuário,
              // user_mat recebe nextMat.
              //
              // Caso contrário, utiliza o valor existente.
              value={
                addMode && field.field === "user_mat"
                  ? nextMat
                  : data?.[field.field] || ""
              }
              onChange={handleChange}
              disabled={!isFieldEnabled}
              {...commonInputProps}
            />
            {errors[field.field] && (
              <Field.ErrorText
                fontSize="0.8rem"
                mt="4px"
              >
                {errors[field.field]}
              </Field.ErrorText>
            )}
          </Box>
        </Field.Root>
      )}
      {/* ========================================================
      TIPO 2 — SELECT SIMPLES
      ======================================================== */}
      {field.input === 2 && (
        <Field.Root invalid={!!errors[field.field]}>
          <Box
            w="100%"
            maxW={getFieldWidth(field.maxLength)}
          >
            <Field.Label
              fontWeight="bold"
              htmlFor={field.field}
            >
              {field?.title}
              {field.required && (
                <Text color="red.500">*</Text>
              )}
            </Field.Label>
            {/* ============================
            MODO VISUALIZAÇÃO
            ============================ */}
            {viewMode ? (
              <Input
                type="text"
                disabled
                // Mostra somente o texto da opção,
                // sem o código.
                //
                // Exemplo:
                // "1 - MASCULINO"
                //
                // vira:
                // "MASCULINO"
                value={removeCode(
                  getFormattedValue(
                    field?.field,
                    data?.[field?.field]
                  )
                )}
                {...commonInputProps}
              />
            ) : (
              /* ============================
              MODO EDIÇÃO
              ============================ */
              <NativeSelect.Root position="relative">
                <Box
                  position="absolute"
                  right="10px"
                  top="50%"
                  transform="translateY(-50%)"
                  pointerEvents="none"
                >
                  <IoIosArrowDown />
                </Box>
                <NativeSelect.Field
                  id={field.field}
                  name={field.field}
                  // Aqui deve permanecer o ID da opção,
                  // pois o backend salva "1", "2", "3" etc.
                  value={data?.[field.field] || ""}
                  onChange={handleChange}
                  disabled={!isFieldEnabled}
                  {...commonInputProps}
                >
                  <option value="">
                    Selecione uma opção
                  </option>
                  {Object.entries(
                    getSelectOptions(field?.field)
                  ).map(
                    ([key, value]) => (

                      <option
                        key={key}
                        value={key}
                      >
                        {removeCode(value)}
                      </option>
                    )
                  )}
                </NativeSelect.Field>
              </NativeSelect.Root>
            )}

            {errors[field.field] && (
              <Field.ErrorText fontSize="0.8rem" mt="4px">
                {errors[field.field]}
              </Field.ErrorText>
            )}
          </Box>
        </Field.Root>
      )}
      {/* ========================================================
          TIPO 3 — MULTISELECT
          ======================================================== */}
      {field.input === 3 && (
        <Field.Root invalid={!!errors[field.field]}>
          <Box
            w="100%"
            maxW={getFieldWidth(field.maxLength)}
          >
            <Field.Label
              fontWeight="bold"
              htmlFor={field.field}
            >
              {field?.title}
              {field.required && (
                <Text color="red.500">*</Text>
              )}
            </Field.Label>
            {/* ==================================================
                MODO VISUALIZAÇÃO
            ================================================== */}
            {viewMode ? (
              <Input
                type="text"
                disabled
                value={
                  Array.isArray(data?.[field.field])
                    ? data[field.field]
                      .map((id) =>
                        removeCode(
                          getFormattedValue(
                            field.field,
                            id
                          )
                        )
                      )
                      .join("  |  ")
                    : removeCode(
                      getFormattedValue(
                        field.field,
                        data?.[field.field]
                      )
                    )
                }
                // Define a largura baseada no conteúdo.
                w={getViewFieldWidth(viewValue)}
                {...commonInputProps}
              />
            ) : (
              /* ==================================================
                MODO EDIÇÃO
              ================================================== */
              <Box>
                <Select
                  id={field.field}
                  name={field.field}
                  // Permite selecionar múltiplas opções.
                  isMulti
                  // Define quais opções aparecem selecionadas.
                  value={
                    Array.isArray(data?.[field.field])
                      ? data[field.field]
                        // Ordena os IDs.
                        .sort((a, b) => a - b)
                        // Converte os IDs para o formato
                        // esperado pelo react-select.
                        .map((id) => ({
                          value: String(id),
                          label: removeCode(
                            getFormattedValue(
                              field.field,
                              id
                            )
                          ),
                        }))
                      : []
                  }
                  // Executado quando o usuário altera
                  // as opções selecionadas.
                  onChange={(selectedOptions) => {
                    // Extrai somente os valores.
                    //
                    // Exemplo:
                    //
                    // [
                    //   { value: "1", label: "INGLÊS" },
                    //   { value: "4", label: "GENÉRICO" }
                    // ]
                    //
                    // vira:
                    //
                    // [1, 4]
                    const values = selectedOptions
                      ? selectedOptions.map(
                        (option) =>
                          Number(option.value)
                      )
                      : [];
                    // Cria um objeto parecido com
                    // um evento HTML tradicional.
                    //
                    // Isso permite continuar utilizando
                    // sua função handleChange.
                    const syntheticEvent = {
                      target: {
                        name: field.field,
                        value: values,
                        type: "select-multiple",
                      },
                    };
                    handleChange(
                      syntheticEvent
                    );
                  }}
                  // Opções disponíveis no Select.
                  options={Object.entries(
                    getSelectOptions(field.field)
                  )
                    // Ordena pelo código.
                    .sort(([a], [b]) =>
                      Number(a) - Number(b)
                    )
                    // Converte para o formato do react-select.
                    .map(
                      ([value, label]) => ({
                        value: String(value),
                        label: removeCode(label),
                      })
                    )
                  }
                  // Desabilita o campo dependendo
                  // do modo atual.
                  isDisabled={!isFieldEnabled}
                  placeholder="Selecione uma ou mais opções..."
                  classNamePrefix="react-select"
                  // Estilização do react-select.
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused ? "rgba(156, 155, 155, 0.5)" : "rgba(156, 155, 155, 0.3)",
                      borderColor: state.isFocused ? "black" : "gray",
                      boxShadow: state.isFocused ? "1px 1px 2px black" : "none",
                      borderRadius: "0.3em",
                    }),
                  }}
                />
              </Box>
            )}

            {/* ==================================================
                MENSAGEM DE ERRO
                ================================================== */}
            {errors[field.field] && (
              <Field.ErrorText fontSize="0.8rem" mt="4px">
                {errors[field.field]}
              </Field.ErrorText>
            )}
          </Box>
        </Field.Root>
      )}

    </>
  );
}