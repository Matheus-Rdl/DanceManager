import { Box, Heading, Text, VStack, Icon } from "@chakra-ui/react";
import { LuConstruction } from "react-icons/lu";

export default function UnderConstruction({ title = "Em Construção" }) {
  return (
    <VStack gap={6} align="center" justify="center" h="60vh">
      <Icon as={LuConstruction} boxSize={20} color="brand.primary" />
      <Box textAlign="center">
        <Heading size="xl" color="brand.primary">{title}</Heading>
        <Text color="gray.500" mt={2} fontSize="lg">
          Esta funcionalidade está em desenvolvimento e será disponibilizada em breve.
        </Text>
      </Box>
    </VStack>
  );
}
