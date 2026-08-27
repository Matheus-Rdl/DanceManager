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
}) {
  const [openFilters, setOpenFilters] = useState({});
  const [openMultiselect, setOpenMultiselect] = useState(null);

  const multiSelectRef = useRef(null);

  /*
    Fecha o dropdown do multiselect quando clicar fora
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
    Abre/fecha o filtro da coluna
  */
  const toggleFilter = (field) => {
    setOpenFilters((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));

    /*
      Se o filtro estava aberto e será fechado,
      limpa o valor correspondente.
    */
    if (openFilters[field]) {
      onFilterChange(field, "");
      setOpenMultiselect(null);
    }
  };

  /*
    Remove o código das opções.

    Exemplo:
    "01 - ADMINISTRADOR"
    ↓
    "ADMINISTRADOR"
  */
  const removeCode = (value) => {
    if (typeof value !== "string") return value;

    return value.replace(/^\d+\s*-\s*/, "");
  };

  /*
    Formata o campo de data
  */
  const formatYearDateInput = (value) => {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length <= 4) return numbers;

    if (numbers.length <= 6) {
      return `${numbers.slice(0, 4)}/${numbers.slice(4)}`;
    }

    return `${numbers.slice(0, 4)}/${numbers.slice(
      4,
      6
    )}/${numbers.slice(6, 8)}`;
  };

  /*
    Abre/fecha o dropdown do multiselect
  */
  const toggleMultiselect = (dataKey) => {
    setOpenMultiselect((prev) =>
      prev === dataKey ? null : dataKey
    );
  };

  /*
    Seleciona ou remove uma opção do multiselect
  */
  const handleMultiselectChange = (dataKey, key) => {
    const currentValues = Array.isArray(filters[dataKey])
      ? filters[dataKey]
      : [];

    const exists = currentValues.includes(key);

    let newValues;

    if (exists) {
      /*
        Remove a opção
      */
      newValues = currentValues.filter(
        (value) => value !== key
      );
    } else {
      /*
        Adiciona a opção
      */
      newValues = [...currentValues, key];
    }

    onFilterChange(dataKey, newValues);
  };

  /*
    Texto que aparece no campo do multiselect
  */
  const getMultiselectLabel = (col) => {
    const selectedValues = Array.isArray(filters[col.dataKey])
      ? filters[col.dataKey]
      : [];

    if (selectedValues.length === 0) {
      return "Selecione as opções";
    }

    const options =
      UserSelectOptions[col.optionsKey] || {};

    const labels = selectedValues
      .map((key) => removeCode(options[key]))
      .filter(Boolean);

    /*
      Mostra até duas opções.
      Exemplo:
      "ADMINISTRADOR, FUNCIONÁRIO"
    */
    if (labels.length <= 2) {
      return labels.join(", ");
    }

    /*
      Caso tenha mais de duas:
      "ADMINISTRADOR, FUNCIONÁRIO +2"
    */
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2
      }`;
  };

  return (
    <Table.Header
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Table.Row>
        {fields.map((col) => (
          <Table.ColumnHeader
            key={col.dataKey}
            minW={col.minWidth}
            maxW={col.maxWidth}
            border="1px solid" 
            borderColor="gray.200"
            pl={4}
          >
            <Box
              display="flex"
              alignItems="center"
              gap={2}
              position="relative"
            >
              {/* Texto da coluna */}
              <Box
                as="p"
                flex="1"
                m={0}
              >
                {col.text}
              </Box>

              {/* ========================= */}
              {/* FILTRO DA COLUNA */}
              {/* ========================= */}

              {openFilters[col.dataKey] && (
                <>
                  {/* ========================= */}
                  {/* MULTISELECT */}
                  {/* ========================= */}

                  {col.input === 3 ? (
                    <Box
                      ref={multiSelectRef}
                      position="absolute"
                      left={0}
                      top={0}
                      zIndex={100}
                      backgroundColor="brand.secondary"
                      ml={-2}
                      width="calc(100% - 32px)"
                    >
                      {/* Campo que imita o select */}
                      <Box
                        height="40px"
                        px={3}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        border="1px solid"
                        borderColor="gray.300"
                        borderRadius="md"
                        backgroundColor="brand.secondary"
                        cursor="pointer"
                        fontSize="sm"
                        onClick={() =>
                          toggleMultiselect(col.dataKey)
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

                        <LuChevronDown />
                      </Box>

                      {/* Dropdown */}
                      {openMultiselect === col.dataKey && (
                        <Box
                          position="absolute"
                          top="36px"
                          left={0}
                          width="100%"
                          maxH="220px"
                          overflowY="auto"
                          backgroundColor="white"
                          border="1px solid"
                          borderColor="gray.300"
                          borderRadius="md"
                          boxShadow="md"
                          zIndex={200}
                        >
                          {Object.entries(
                            UserSelectOptions[
                            col.optionsKey
                            ] || {}
                          ).map(([key, value]) => {
                            const selectedValues =
                              Array.isArray(
                                filters[col.dataKey]
                              )
                                ? filters[col.dataKey]
                                : [];

                            const checked =
                              selectedValues.includes(key);

                            return (
                              <Box
                                key={key}
                                display="flex"
                                alignItems="center"
                                gap={2}
                                px={3}
                                py={2}
                                cursor="pointer"
                                fontSize="sm"
                                _hover={{
                                  backgroundColor:
                                    "gray.100",
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
                                  checked={checked}
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

                                <Box>
                                  {removeCode(value)}
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  ) : col.input === 2 ? (
                    /* ========================= */
                    /* SELECT NORMAL */
                    /* ========================= */

                    <NativeSelect.Root
                      position="absolute"
                      left={0}
                      top={0}
                      zIndex={15}
                      backgroundColor="brand.secondary"
                      ml={-2}
                      width="calc(100% - 32px)"
                    >
                      <NativeSelect.Field
                        autoFocus
                        value={
                          filters[col.dataKey] || ""
                        }
                        onChange={(e) =>
                          onFilterChange(
                            col.dataKey,
                            e.target.value
                          )
                        }
                        size="sm"
                      >
                        <option value="">
                          Selecione uma opção
                        </option>

                        {Object.entries(
                          UserSelectOptions[
                          col.optionsKey
                          ] || {}
                        ).map(([key, value]) => (
                          <option
                            key={key}
                            value={key}
                          >
                            {removeCode(value)}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  ) : (
                    /* ========================= */
                    /* INPUT NORMAL */
                    /* ========================= */

                    <Input
                      position="absolute"
                      left={0}
                      top={0}
                      zIndex={15}
                      backgroundColor="brand.secondary"
                      ml={-2}
                      width="calc(100% - 32px)"
                      autoFocus
                      size="sm"
                      type="text"
                      placeholder={
                        col.type === "date"
                          ? "aaaa/mm/dd"
                          : ""
                      }
                      value={
                        filters[col.dataKey] || ""
                      }
                      onChange={(e) => {
                        if (col.type === "date") {
                          const formatted =
                            formatYearDateInput(
                              e.target.value
                            );

                          onFilterChange(
                            col.dataKey,
                            formatted
                          );
                        } else {
                          onFilterChange(
                            col.dataKey,
                            e.target.value
                          );
                        }
                      }}
                    />
                  )}
                </>
              )}

              {/* ========================= */}
              {/* ÍCONE DO FILTRO */}
              {/* ========================= */}

              <IconButton
                aria-label={
                  openFilters[col.dataKey]
                    ? "Fechar filtro"
                    : "Abrir filtro"
                }
                variant="ghost"
                size="sm"
                onClick={() =>
                  toggleFilter(col.dataKey)
                }
              >
                {openFilters[col.dataKey] ? (
                  <LuSearchX />
                ) : (
                  <LuSearch />
                )}
              </IconButton>
            </Box>
          </Table.ColumnHeader>
        ))}
      </Table.Row>
    </Table.Header>
  );
}