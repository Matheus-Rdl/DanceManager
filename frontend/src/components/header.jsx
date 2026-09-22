import { Flex, Text, Box, Icon } from "@chakra-ui/react";
import {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
} from "./ui/menu";

import { getCurrentDateFormattedBR } from "../utils/dateFunctions";

import { FaUserCircle } from "react-icons/fa";
import { FiMenu } from "react-icons/fi";

export default function Header({
  onOpenMobileNav,
}) {
  const currentDate =
    getCurrentDateFormattedBR();

  return (
    <Flex
      w="100%"
      h="70px"
      align="center"
      justify="space-between"
      px={{
        base: 4,
        md: 6,
      }}
      bg="white"
      shadow="sm"
      flexShrink={0}
    >

      {/* ================================= */}
      {/* ESQUERDA */}
      {/* ================================= */}

      <Flex
        align="center"
        gap={3}
      >

        {/* Botão mobile */}

        <Box
          display={{
            base: "flex",
            md: "none",
          }}
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onClick={onOpenMobileNav}
          p={1}
        >
          <Icon
            as={FiMenu}
            boxSize={6}
            color="brand.primary"
          />
        </Box>


        {/* Logo / nome */}

        <Text
          fontSize={{
            base: "lg",
            md: "xl",
          }}
          fontWeight="bold"
          color="brand.primary"
          whiteSpace="nowrap"
        >
          Dance Manager
        </Text>
        <Text
          fontSize={{
            base: "lg",
            md: "xl",
          }}
          fontWeight="bold"
          color="brand.primary"
          whiteSpace="nowrap"
        >
          Teste
        </Text>

      </Flex>


      {/* ================================= */}
      {/* DIREITA */}
      {/* ================================= */}

      <Flex
        gap={{
          base: 2,
          md: 4,
        }}
        align="center"
      >

        {/* Data */}

        <Text
          display={{
            base: "none",
            sm: "block",
          }}
          fontSize="md"
          color="gray.600"
          whiteSpace="nowrap"
        >
          {currentDate}
        </Text>


        {/* Usuário */}

        <MenuRoot>
          <MenuTrigger asChild>
            <Box
              cursor="pointer"
              display="flex"
              alignItems="center"
            >
              <FaUserCircle
                size={28}
                color="#4A5568"
              />
            </Box>
          </MenuTrigger>

          <MenuContent>

            <MenuItem
              value="profile"
              onClick={() =>
                console.log(
                  "Configurar Perfil"
                )
              }
            >
              Configurar Perfil
            </MenuItem>

            <MenuItem
              value="password"
              onClick={() =>
                console.log(
                  "Mudar Senha"
                )
              }
            >
              Mudar Senha
            </MenuItem>

            <MenuItem
              value="logout"
              onClick={() =>
                console.log(
                  "Sair do Sistema"
                )
              }
            >
              Sair do Sistema
            </MenuItem>

          </MenuContent>
        </MenuRoot>

      </Flex>

    </Flex>
  );
}