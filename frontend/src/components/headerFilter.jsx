/*
  Type: Componente
  User: Matheus Rodrigues
  Description: Componente para montar filtro de tabelas no sistema
  Date: 18/02/2026
*/

import { useEffect, useRef, useState } from "react";
import { LuSearch, LuSearchX, LuChevronDown } from "react-icons/lu";
import {
  Table,
  Input,
  Box,
  IconButton,
  NativeSelect,
} from "@chakra-ui/react";
import { selectOptions as UserSelectOptions } from "../utils/userSelectOptions";

export default function HeaderFilter({
  fields,
  filters,
  onFilterChange,
  activities = [],
}) {
  const [openFilters, setOpenFilters] = useState({});
  const [openMultiselect, setOpenMultiselect] = useState(null);
  const multiSelectRef = useRef(null);

  /*
    ============================================================
    FECHA O DROPDOWN DO MULTISELECT AO CLICAR FORA
    ============================================================
  */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        multiSelectRef.current &&
        !multiSelectRef.current.contains(event.target)
      ) {
        setOpenMultiselect(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /*
    ============================================================
    ABRE / FECHA O FILTRO DA COLUNA
    ============================================================
  */

  const toggleFilter = (field) => {
    setOpenFilters((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));

    if (openFilters[field]) {
      onFilterChange(field, "");
      setOpenMultiselect(null);
    }
  };

  /*
    ============================================================
    REMOVE O CÓDIGO DAS OPÇÕES
    ============================================================
  */

  const removeCode = (value) => {
    if (typeof value !== "string") return value;
    return value.replace(/^\d+\s*-\s*/, "");
  };

  /*
    ============================================================
    FORMATA O CAMPO DE DATA
    ============================================================
  */

  const formatYearDateInput = (value) => {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length <= 4) {
      return numbers;
    }

    if (numbers.length <= 6) {
      return `${numbers.slice(0, 4)}/${numbers.slice(4)}`;
    }

    return `${numbers.slice(0, 4)}/${numbers.slice(
      4,
      6
    )}/${numbers.slice(6, 8)}`;
  };

  /*
    ============================================================
    ABRE / FECHA O DROPDOWN DO MULTISELECT
    ============================================================
  */

  const toggleMultiselect = (dataKey) => {
    setOpenMultiselect((prev) =>
      prev === dataKey ? null : dataKey
    );
  };

  /*
    ============================================================
    SELECIONA OU REMOVE UMA OPÇÃO DO MULTISELECT
    ============================================================
  */

  const handleMultiselectChange = (dataKey, key) => {
    const currentValues = Array.isArray(filters[dataKey])
      ? filters[dataKey]
      : [];

    const exists = currentValues.includes(key);

    let newValues;

    if (exists) {
      newValues = currentValues.filter(
        (value) => value !== key
      );
    } else {
      newValues = [...currentValues, key];
    }

    onFilterChange(dataKey, newValues);
  };

  /*
    ============================================================
    OBTÉM AS OPÇÕES DO CAMPO
    ============================================================
  */

  const getFieldOptions = (col) => {
    if (col.dataKey === "user_activities") {
      return (activities || []).reduce(
        (acc, activity) => {
          if (
            activity?.activity_mat &&
            activity?.activity_title
          ) {
            acc[activity.activity_mat] =
              activity.activity_title;
          }

          return acc;
        },
        {}
      );
    }

    return UserSelectOptions[col.optionsKey] || {};
  };

  /*
    ============================================================
    TEXTO DO MULTISELECT
    ============================================================
  */

  const getMultiselectLabel = (col) => {
    const selectedValues = Array.isArray(
      filters[col.dataKey]
    )
      ? filters[col.dataKey]
      : [];

    if (selectedValues.length === 0) {
      return "Selecione as opções";
    }

    const options = getFieldOptions(col);

    const labels = selectedValues
      .map((key) => options[key])
      .filter(Boolean)
      .map(removeCode);

    if (labels.length <= 2) {
      return labels.join(", ");
    }

    return `${labels.slice(0, 2).join(", ")} +${
      labels.length - 2
    }`;
  };

  /*
    ============================================================
    RENDER
    ============================================================
  */

  return (
    <Table.Header
      position="sticky"
      top={0}
      zIndex={20}
      bg="#f3f8f6"
    >
      <Table.Row bg="#f3f8f6">
        {fields.map((col) => (
          <Table.ColumnHeader
            key={col.dataKey}
            width={col.width}
            minW={col.width}
            maxW={col.width}
            px={4}
            py={2.5}
            bg="#f3f8f6"
            borderBottom="1px solid"
            borderColor="#d9e5e1"
            color="#315c54"
            fontSize="11px"
            fontWeight="700"
            textTransform="none"
            letterSpacing="0"
          >
            <Box
              display="flex"
              alignItems="center"
              gap={2}
              position="relative"
              width="100%"
              minH="30px"
            >
              {/* TEXTO DA COLUNA */}

              <Box
                as="p"
                flex="1"
                m={0}
                overflow="hidden"
                whiteSpace="nowrap"
                textOverflow="ellipsis"
              >
                {col.text}
              </Box>

              {/* FILTRO */}

              {openFilters[col.dataKey] && (
                <>
                  {/* MULTISELECT */}

                  {col.input === 3 ? (
                    <Box
                      ref={multiSelectRef}
                      position="absolute"
                      left={0}
                      top="50%"
                      transform="translateY(-50%)"
                      zIndex={100}
                      width="calc(100% - 32px)"
                    >
                      <Box
                        height="32px"
                        px={2}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={2}
                        border="1px solid"
                        borderColor="#b8d6ce"
                        borderRadius="6px"
                        bg="white"
                        cursor="pointer"
                        fontSize="11px"
                        fontWeight="400"
                        color="#354d47"
                        boxShadow="0 1px 2px rgba(0,0,0,0.04)"
                        onClick={() =>
                          toggleMultiselect(
                            col.dataKey
                          )
                        }
                      >
                        <Box
                          overflow="hidden"
                          whiteSpace="nowrap"
                          textOverflow="ellipsis"
                          flex="1"
                        >
                          {getMultiselectLabel(col)}
                        </Box>

                        <LuChevronDown
                          size={14}
                        />
                      </Box>

                      {/* DROPDOWN */}

                      {openMultiselect ===
                        col.dataKey && (
                        <Box
                          position="absolute"
                          top="36px"
                          left={0}
                          width="100%"
                          minW="180px"
                          maxH="220px"
                          overflowY="auto"
                          bg="white"
                          border="1px solid"
                          borderColor="#d5e2de"
                          borderRadius="8px"
                          boxShadow="0 8px 24px rgba(20,60,50,0.12)"
                          zIndex={200}
                          py={1}
                        >
                          {Object.entries(
                            getFieldOptions(col)
                          ).map(
                            ([key, value]) => {
                              const selectedValues =
                                Array.isArray(
                                  filters[
                                    col.dataKey
                                  ]
                                )
                                  ? filters[
                                      col.dataKey
                                    ]
                                  : [];

                              const checked =
                                selectedValues.includes(
                                  key
                                );

                              return (
                                <Box
                                  key={key}
                                  display="flex"
                                  alignItems="center"
                                  gap={2}
                                  px={3}
                                  py={2}
                                  cursor="pointer"
                                  fontSize="11px"
                                  fontWeight="400"
                                  color="#354d47"
                                  _hover={{
                                    bg: "#f1f8f6",
                                  }}
                                  onClick={() =>
                                    handleMultiselectChange(
                                      col.dataKey,
                                      key
                                    )
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      checked
                                    }
                                    onChange={() =>
                                      handleMultiselectChange(
                                        col.dataKey,
                                        key
                                      )
                                    }
                                    onClick={(e) =>
                                      e.stopPropagation()
                                    }
                                  />

                                  <Box
                                    overflow="hidden"
                                    whiteSpace="nowrap"
                                    textOverflow="ellipsis"
                                  >
                                    {removeCode(
                                      value
                                    )}
                                  </Box>
                                </Box>
                              );
                            }
                          )}
                        </Box>
                      )}
                    </Box>
                  ) : col.input === 2 ? (
                    /* SELECT NORMAL */

                    <NativeSelect.Root
                      position="absolute"
                      left={0}
                      top="50%"
                      transform="translateY(-50%)"
                      zIndex={15}
                      width="calc(100% - 32px)"
                      bg="white"
                    >
                      <NativeSelect.Field
                        autoFocus
                        value={
                          filters[
                            col.dataKey
                          ] || ""
                        }
                        onChange={(e) =>
                          onFilterChange(
                            col.dataKey,
                            e.target.value
                          )
                        }
                        height="32px"
                        minH="32px"
                        fontSize="11px"
                        borderColor="#b8d6ce"
                        borderRadius="6px"
                        bg="white"
                      >
                        <option value="">
                          Selecione uma opção
                        </option>

                        {Object.entries(
                          getFieldOptions(col)
                        ).map(
                          ([key, value]) => (
                            <option
                              key={key}
                              value={key}
                            >
                              {removeCode(
                                value
                              )}
                            </option>
                          )
                        )}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  ) : (
                    /* INPUT NORMAL */

                    <Input
                      position="absolute"
                      left={0}
                      top="50%"
                      transform="translateY(-50%)"
                      zIndex={15}
                      width="calc(100% - 32px)"
                      height="32px"
                      minH="32px"
                      px={2}
                      autoFocus
                      type="text"
                      fontSize="11px"
                      borderColor="#b8d6ce"
                      borderRadius="6px"
                      bg="white"
                      color="#263a36"
                      placeholder={
                        col.type === "date"
                          ? "aaaa/mm/dd"
                          : "Filtrar..."
                      }
                      _focus={{
                        borderColor:
                          "#007565",
                        boxShadow:
                          "0 0 0 1px #007565",
                      }}
                      value={
                        filters[
                          col.dataKey
                        ] || ""
                      }
                      onChange={(e) => {
                        if (
                          col.type ===
                          "date"
                        ) {
                          const formatted =
                            formatYearDateInput(
                              e.target
                                .value
                            );

                          onFilterChange(
                            col.dataKey,
                            formatted
                          );
                        } else {
                          onFilterChange(
                            col.dataKey,
                            e.target
                              .value
                          );
                        }
                      }}
                    />
                  )}
                </>
              )}

              {/* BOTÃO DO FILTRO */}

              <IconButton
                aria-label={
                  openFilters[col.dataKey]
                    ? "Fechar filtro"
                    : "Abrir filtro"
                }
                variant="ghost"
                size="xs"
                minW="28px"
                w="28px"
                h="28px"
                flexShrink={0}
                borderRadius="6px"
                color={
                  openFilters[col.dataKey]
                    ? "#007565"
                    : "#71817d"
                }
                bg={
                  openFilters[col.dataKey]
                    ? "#dff3ed"
                    : "transparent"
                }
                _hover={{
                  bg: "#dff3ed",
                  color: "#007565",
                }}
                onClick={() =>
                  toggleFilter(
                    col.dataKey
                  )
                }
              >
                {openFilters[
                  col.dataKey
                ] ? (
                  <LuSearchX
                    size={15}
                  />
                ) : (
                  <LuSearch
                    size={15}
                  />
                )}
              </IconButton>
            </Box>
          </Table.ColumnHeader>
        ))}
      </Table.Row>
    </Table.Header>
  );
}