/*
    Type: Page
    Description: Dashboard principal do sistema — resumos e ações rápidas
    Last Edit: 25/08/2026
*/

import { Box, Card, Flex, Heading, SimpleGrid, Text, VStack, Icon } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { PiUsersThree, PiMoneyWavy } from "react-icons/pi";
import { LiaGraduationCapSolid } from "react-icons/lia";
import { LuNewspaper } from "react-icons/lu";

export default function Home() {
  return (
    <VStack gap={8} align="stretch">

      {/* Cabeçalho de boas-vindas */}
      <Box>
        <Heading size="2xl" color="brand.primary">Painel Principal</Heading>
        <Text color="gray.500" mt={1}>Bem-vindo ao sistema de gestão</Text>
      </Box>

      {/* Cards de resumo 
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={6}>
        {summaryCards.map((card) => (
          <Link to={card.to} key={card.label} style={{ textDecoration: "none" }}>
            <Card.Root
              variant="elevated"
              _hover={{ transform: "translateY(-4px)", shadow: "lg" }}
              transition="all 0.2s"
              cursor="pointer"
            >
              <Card.Body>
                <Flex align="center" gap={4}>
                  <Flex
                    w={12}
                    h={12}
                    borderRadius="md"
                    bg={card.color}
                    align="center"
                    justify="center"
                  >
                    <Icon as={card.icon} boxSize={6} color="white" />
                  </Flex>
                  <Box>
                    <Text fontWeight="bold" fontSize="lg">{card.label}</Text>
                    <Text color="gray.500" fontSize="sm">{card.description}</Text>
                  </Box>
                </Flex>
              </Card.Body>
            </Card.Root>
          </Link>
        ))}
      </SimpleGrid>

      Ações Rápidas 
      <Box>
        <Heading size="lg" color="brand.primary" mb={4}>Ações Rápidas</Heading>
        <Flex gap={3} wrap="wrap">
          {quickActions.map((action) => (
            <Link to={action.to} key={action.label}>
              <Card.Root
                as="span"
                variant={action.variant}
                _hover={{ transform: "scale(1.03)" }}
                transition="all 0.2s"
                cursor="pointer"
              >
                <Card.Body py={3} px={6}>
                  <Text fontWeight="medium" fontSize="sm">{action.label}</Text>
                </Card.Body>
              </Card.Root>
            </Link>
          ))}
        </Flex>
      </Box>
      */}
    </VStack>
  );
}
