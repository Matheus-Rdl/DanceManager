import { Box, Text } from "@chakra-ui/react";

export default function CardList({ text, active, onClick, setActiveScreen }) {
  return (
    <Box
      w="fit-content"
      bg="brand.primary"
      borderRadius="sm"
      px={10}
      py={2}
      my={2}
      mx={1}
      transition="all 0.3s"
      cursor="pointer"
      boxShadow={active ? "md" : "sm"}
      transform={active ? "scale(1.03)" : "none"}
      _hover={{
        transform: "scale(1.03)",
        filter: "brightness(0.92)",
        boxShadow: "md",
      }}
      onClick={onClick}
    >
      <Text
        color="brand.secondary"
        pb="1px"
        m="0"
        fontWeight="bold"
        fontSize="md"
      >
        {text}
      </Text>
    </Box>
  );
}