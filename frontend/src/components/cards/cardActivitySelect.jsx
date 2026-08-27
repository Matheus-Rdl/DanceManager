import { useEffect } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { selectOptions } from "../../utils/userSelectOptions";
import usersServices from "../../services/usersServices";

export default function CardActivity({ data }) {
  const { getUsersByActivity, userListActivies, refetchUsers } = usersServices();

  useEffect(() => {
    if (refetchUsers) {
      getUsersByActivity(data.activity_mat);
    }
  }, [refetchUsers]);

  const getSelectOptions = (fieldName) => {
    return selectOptions?.[fieldName] || {};
  };

  const getFormattedValue = (fieldName, value) => {
    if (!fieldName || value === undefined || value === null) return "";
    const options = getSelectOptions(fieldName);
    return options?.[value] || value || "";
  };

  return (
    <Box
      borderRadius="md"
      borderWidth="3px"
      borderColor="brand.primary"
      p={4}
      color="gray.600"
    >
      <Heading as="h1" size="md" pb="1px" mb={2}>
        {data.activity_title} - {getFormattedValue("activity_type", data.activity_type).slice(3)}
      </Heading>
      <Text fontSize="md" mb={1}>
        Quantidade de usuários: <strong>{userListActivies.length}</strong>
      </Text>
      <Text fontSize="md" mb={1}>
        Inicio: <strong>{data.activity_time_start}</strong> - Fim <strong>{data.activity_time_end}</strong>
      </Text>
      <Text fontSize="md" mb={1}>
        Código: <strong>{data.activity_mat}</strong>
      </Text>
      <Text fontSize="md" mb={0}>
        {Array.isArray(data.activity_days)
          ? data.activity_days
              .map((day) => getFormattedValue("activity_days", day).slice(3))
              .join(" | ")
          : getFormattedValue("activity_days", data.activity_days).slice(3)}
      </Text>
    </Box>
  );
}