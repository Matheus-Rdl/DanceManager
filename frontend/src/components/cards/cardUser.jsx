import { Box, Heading, Text } from "@chakra-ui/react";

export default function CardUser({ title, quantity }) {
  return (
    <Box
      w="85%"
      h="60px"
      bg="brand.primary"
      borderRadius="md"
      boxShadow="md"
      px="4"
      pt="2"
      transition="all 0.3s"
      cursor="pointer"
      _hover={{ transform: "scale(1.03)" }}
    >
      <Box color="brand.secondary">
        <Heading as="h1" size="sm" pb="1px" m="0">
          {title}
        </Heading>
        <Text fontSize="md" m="0">
          Total: {quantity}
        </Text>
      </Box>
    </Box>
  );
}