import { Spinner, Flex } from "@chakra-ui/react";

export default function Loading() {
  return (
    <Flex 
      alignItems="center" 
      justifyContent="center" 
      h="80vh" 
      w="100%"
    >
      <Spinner size="xl" color="brand.primary" />
    </Flex>
  );
}