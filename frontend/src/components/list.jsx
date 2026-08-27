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

export default function List({ data, fields, ativo, onClick }) {
  const { getActivitiesByMat, userActivitiesList, refetchActivities } =
    activitiesServices();

  useEffect(() => {
    if (
      refetchActivities &&
      Array.isArray(data?.user_activities) &&
      data.user_activities.length > 0
    ) {
      getActivitiesByMat(data.user_activities);
    }
  }, [refetchActivities, data?.user_activities]);

  const removeCode = (value) => {
    if (typeof value !== "string") return value;
    return value.replace(/^\d+\s*-\s*/, "");
  };

  // Função segura para obter o valor formatado
  const getFormattedValue = (field, value) => {
    if (value === undefined || value === null || value === "") {
      return "";
    }

    if (field.optionsKey) {
      const options = selectOptions?.[field.optionsKey];

      if (options) {
        if (Array.isArray(value)) {
          return value
            .map((item) => options?.[item] ?? item)
            .map(removeCode)
            .join(" | ");
        }

        return removeCode(options?.[value] ?? value);
      }
    }

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

    if (field.type === "proper") {
      return formatProperNoun(value);
    }

    return value;
  };

  const activeProps = ativo ? {
    bg: "brand.primary",
    color: "white",
    _hover: { bg: "brand.primary", opacity: 0.8 },
  } : {
    _hover: { bg: "gray.100" },
  };

  //console.log(userActivitiesList)

  return (

    <>
      <Table.Row
        cursor="pointer"
        onClick={onClick}
        {...activeProps}
      >
        {fields.map((field) => {

          const value = data?.[field.dataKey];

          return (
            <Table.Cell border="1px solid" borderColor="gray.200" key={field.dataKey}>
              {getFormattedValue(field, value)}
            </Table.Cell>
          );
        })}
      </Table.Row>
      {/*
      <>
        {page === "peopleManagement" ? (

          <Table.Row
            cursor="pointer"
            onClick={onClick}
            {...activeProps}
          >
            <Table.Cell>{getFormattedValue("user_situation", data.user_situation)}</Table.Cell>
            <Table.Cell>{data.user_mat}</Table.Cell>
            <Table.Cell>{formatName(data.user_name)}</Table.Cell>
            <Table.Cell>
              {data.user_type
                .map((id) => getFormattedValue("user_type", id))
                .join(" | ")}
            </Table.Cell>
            <Table.Cell>{formatCPF(data.user_cpf)}</Table.Cell>
            <Table.Cell>{formatRG(data.user_rg)}</Table.Cell>
            <Table.Cell>{formatDate(data.user_registration_date)}</Table.Cell>
            <Table.Cell>{formatDate(data.user_date_nasc)}</Table.Cell>
            <Table.Cell>{formatProperNoun(data.user_district)}</Table.Cell>
            <Table.Cell>{formatProperNoun(data.user_street)}</Table.Cell>
            <Table.Cell>{formatName(data.user_mother_name)}</Table.Cell>
          </Table.Row>

        ) : page === "activityManagement" ? (

          <Table.Row
            cursor="pointer"
            onClick={onClick}
            {...activeProps}
          >
            <Table.Cell>{data.activity_mat}</Table.Cell>
            <Table.Cell>{formatProperNoun(data.activity_title)}</Table.Cell>
            <Table.Cell>{getFormattedValue("activity_type", data.activity_type).slice(3)}</Table.Cell>
            <Table.Cell>
              {Array.isArray(data.activity_days)
                ? data.activity_days
                  .map(day => getFormattedValue("activity_days", day).slice(3))
                  .join(" | ")
                : getFormattedValue("activity_days", data.activity_days).slice(3)}
            </Table.Cell>
            <Table.Cell>{userListActivies.length}</Table.Cell>
            <Table.Cell>{data.activity_time_start}</Table.Cell>
            <Table.Cell>{data.activity_time_end}</Table.Cell>
          </Table.Row>

        ) : page === "activityManagementUsers" ? (

          <Table.Row
            cursor="pointer"
            onClick={onClick}
            {...activeProps}
          >
            <Table.Cell>{data.user_mat}</Table.Cell>
            <Table.Cell>{formatName(data.user_name)}</Table.Cell>
            <Table.Cell>{data.user_registration_date}</Table.Cell>
            <Table.Cell>{data.user_date_nasc}</Table.Cell>
          </Table.Row>

        ) : (
          <Table.Row
            cursor="pointer"
            onClick={onClick}
            {...activeProps}
          >
            {columns.map((col) => {

              let value = data[col.dataKey];

              if (col.optionsKey) {

                if (Array.isArray(value)) {
                  value = value
                    .map((v) => selectOptions[col.optionsKey]?.[v] ?? v)
                    .join(", ");
                } else {
                  value = selectOptions[col.optionsKey]?.[value] ?? value;
                }
              }

              return <Table.Cell key={col.dataKey}>{value}</Table.Cell>;
            })}
          </Table.Row>
        )}
      </>
    */}
    </>

  );
}
