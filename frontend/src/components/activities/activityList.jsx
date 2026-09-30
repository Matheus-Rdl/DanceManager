import {
  Box,
  Table
} from "@chakra-ui/react";

import HeaderFilter from "../headerFilter";
import List from "../list";


export default function ActivityList({
  activities,
  fields,
  filters,
  onFilterChange,
  activityActive,
  setActivityActive
}) {

  return (

    <Box
      mt={4}
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      maxW="100%"
      overflow="hidden"
    >

      <Box
        maxH="calc(100vh - 295px)"
        minH="calc(100vh - 295px)"
        overflow="auto"
      >

        <Table.Root
          variant="line"
          size="sm"
          whiteSpace="nowrap"
        >

          {/* Filtros da tabela */}

          <HeaderFilter
            fields={fields}
            filters={filters}
            onFilterChange={onFilterChange}
          />


          {/* Dados */}

          <Table.Body>

            {activities.map((data) => (

              <List
                pageId="activityManagement"

                data={data}

                fields={fields}

                ativo={
                  activityActive === data._id
                }

                onClick={() =>
                  setActivityActive(data._id)
                }

                key={data._id}
              />

            ))}

          </Table.Body>

        </Table.Root>

      </Box>

    </Box>

  );

}