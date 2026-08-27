import { Flex, Text, Box } from "@chakra-ui/react";
import { MenuRoot, MenuTrigger, MenuContent, MenuItem } from "./ui/menu";
import { getCurrentDateFormattedBR } from "../utils/dateFunctions";
import { FaUserCircle } from "react-icons/fa";

export default function Header() {
  const currentDate = getCurrentDateFormattedBR();

  return (
    <Flex
      w="100%"
      h="70px"
      align="center"
      justify="space-between"
      px={6}
      bg="white"
      shadow="sm"
    >
      <Text fontSize="xl" fontWeight="bold" color="brand.primary">
        Dance Manager
      </Text>

      <Flex gap={4}>
        <Text fontSize="md" color="gray.600">
          {currentDate}
        </Text>

        <MenuRoot>
          <MenuTrigger asChild>
            <Box cursor="pointer">
              <FaUserCircle size={28} color="#4A5568" />
            </Box>
          </MenuTrigger>
          <MenuContent>
            <MenuItem value="profile" onClick={() => console.log("Configurar Perfil")}>
              Configurar Perfil
            </MenuItem>
            <MenuItem value="password" onClick={() => console.log("Mudar Senha")}>
              Mudar Senha
            </MenuItem>
            <MenuItem value="logout" onClick={() => console.log("Sair do Sistema")}>
              Sair do Sistema
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>

    </Flex>
  );
}
