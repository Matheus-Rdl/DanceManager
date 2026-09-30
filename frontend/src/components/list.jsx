import { Table } from "@chakra-ui/react";
import {
  formatCPF,
  formatDate,
  formatName,
  formatRG,
  formatProperNoun,
} from "../utils/formatters";
import { selectOptions } from "../utils/userSelectOptions";
import activitiesServices from "../services/activitiesServices";
import { useEffect } from "react";

export default function List({
  data,
  fields,
  ativo,
  onClick,
}) {
  const {
    getActivitiesByMat,
    userActivitiesList,
    refetchActivities,
  } = activitiesServices();

  useEffect(() => {
    if (
      refetchActivities &&
      Array.isArray(
        data?.user_activities
      ) &&
      data.user_activities.length > 0
    ) {
      getActivitiesByMat(
        data.user_activities
      );
    }
  }, [
    refetchActivities,
    data?.user_activities,
  ]);

  /*
    ============================================================
    REMOVE O CÓDIGO DAS OPÇÕES
    ============================================================
  */

  const removeCode = (value) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.replace(
      /^\d+\s*-\s*/,
      ""
    );
  };

  /*
    ============================================================
    FORMATA O VALOR DA CÉLULA
    ============================================================
  */

  const getFormattedValue = (
    field,
    value
  ) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return "";
    }

    /*
      ATIVIDADES DO USUÁRIO
    */

    if (
      field.dataKey ===
      "user_activities"
    ) {
      if (!Array.isArray(value)) {
        return "";
      }

      return value
        .map((activityMat) => {
          const activity =
            userActivitiesList?.find(
              (item) =>
                item.activity_mat ===
                activityMat
            );

          return (
            activity?.activity_title ??
            activityMat
          );
        })
        .join(" | ");
    }

    /*
      CAMPOS COM OPTIONS
    */

    if (field.optionsKey) {
      const options =
        selectOptions?.[
          field.optionsKey
        ];

      if (options) {
        if (Array.isArray(value)) {
          return value
            .map(
              (item) =>
                options?.[item] ??
                item
            )
            .map(removeCode)
            .join(" | ");
        }

        return removeCode(
          options?.[value] ??
            value
        );
      }
    }

    /*
      FORMATAÇÕES
    */

    if (field.type === "cpf") {
      return formatCPF(value);
    }

    if (field.type === "rg") {
      return formatRG(value);
    }

    if (field.type === "date") {
      return formatDate(value);
    }

    if (field.type === "name") {
      return formatName(value);
    }

    if (
      field.type === "proper"
    ) {
      return formatProperNoun(
        value
      );
    }

    return value;
  };

  /*
    ============================================================
    RENDER
    ============================================================
  */

  return (
    <Table.Row
      cursor="pointer"
      onClick={onClick}
      bg={
        ativo
          ? "#e8f6f2"
          : "white"
      }
      color="#263a36"
      borderLeft={
        ativo
          ? "3px solid #007565"
          : "3px solid transparent"
      }
      transition="background 0.15s ease"
      _hover={{
        bg: ativo
          ? "#e0f2ed"
          : "#f7faf9",
      }}
    >
      {fields.map((field) => {
        const value =
          data?.[
            field.dataKey
          ];

        return (
          <Table.Cell
            key={
              field.dataKey
            }
            width={
              field.width
            }
            minW={
              field.width
            }
            maxW={
              field.width
            }
            px={4}
            py={3}
            fontSize="12px"
            fontWeight={
              ativo
                ? "600"
                : "400"
            }
            borderBottom="1px solid"
            borderColor="#e5ece9"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            verticalAlign="middle"
          >
            {getFormattedValue(
              field,
              value
            )}
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
}