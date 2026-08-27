import { useState, useEffect } from "react";
import { Flex, Text, Box, Icon } from "@chakra-ui/react";
import { Tooltip } from "./ui/tooltip";
import { useLocation, useNavigate } from "react-router-dom";

import {
  IoIosArrowDroprightCircle,
  IoIosArrowDropleftCircle,
  IoMdSearch,
} from "react-icons/io";
import { PiUsersThree, PiMoneyWavy } from "react-icons/pi";
import { LiaGraduationCapSolid } from "react-icons/lia";
import { IoSettingsOutline } from "react-icons/io5";
import { BiHome } from "react-icons/bi";
import { LuNewspaper } from "react-icons/lu";

export default function NavBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Verifica se a rota atual é de tabela para fechar a sidebar
  useEffect(() => {
    const currentPath = location.pathname.toLowerCase();
    if (
      currentPath.includes("peoplemanagement") ||
      currentPath.includes("activitymanagement") ||
      currentPath.includes("fieldsmanagement")
    ) {
      setIsExpanded(false);
    }
  }, [location]);

  const menuItems = [
    { label: "Pesquisar", icon: IoMdSearch, route: null },
    { label: "Início", icon: BiHome, route: "/" },
    { label: "Cadastros", icon: PiUsersThree, route: "/PeopleManagement" },
    { label: "Atividades", icon: LiaGraduationCapSolid, route: "/ActivityManagement" },
    { label: "Relatórios", icon: LuNewspaper, route: "/relatorios" },
    { label: "Financeiro", icon: PiMoneyWavy, route: "/financeiro" },
    { label: "Configurações", icon: IoSettingsOutline, route: "/configuracoes" },
  ];

  return (
    <Flex
      direction="column"
      h="100vh"
      bg="brand.primary"
      color="brand.secondary"
      transition="width 0.3s ease"
      w={isExpanded ? "250px" : "80px"}
      flexShrink={0}
      zIndex={100}
      position={"relative"}
    >
      <Flex direction="column" flex="1" overflowY="auto" overflowX="hidden" pt={4} pb={4} gap={2}>
        {menuItems.map((item) => {
          const isActive = item.route && location.pathname === item.route;

          const MenuItemContent = (
            <Flex
              align="center"
              justify={isExpanded ? "flex-start" : "center"}
              px={isExpanded ? 6 : 0}
              py={3}
              cursor="pointer"
              bg={isActive ? "brand.tertiary" : "transparent"}
              color={isActive ? "brand.primary" : "brand.secondary"}
              _hover={{ bg: "brand.tertiary", color: "brand.primary" }}
              transition="all 0.2s"
              onClick={() => {
                if (item.route) {
                  navigate(item.route);
                }
              }}
              w="100%"
            >
              <Icon as={item.icon} boxSize={6} />

              <Text
                ml={4}
                display={isExpanded ? "block" : "none"}
                whiteSpace="nowrap"
                fontWeight={isActive ? "bold" : "normal"}
              >
                {item.label}
              </Text>
            </Flex>
          );

          if (!isExpanded) {
            return (
              <Tooltip key={item.label} content={item.label} positioning={{ placement: "right" }}>
                <Box w="100%">{MenuItemContent}</Box>
              </Tooltip>
            );
          }

          return <Box key={item.label} w="100%">{MenuItemContent}</Box>;
        })}
      </Flex>
      <Icon
        right={0}
        marginRight={-4}
        marginTop={6}
        borderRadius={"100%"}
        position="absolute"
        cursor="pointer"
        color="brand.tertiary"
        backgroundColor={"brand.primary"}
        onClick={() => setIsExpanded(!isExpanded)}
        as={isExpanded ? IoIosArrowDropleftCircle : IoIosArrowDroprightCircle}
        boxSize={8}
      />

      {/*
        <Flex
          mt="auto"
          justify="center"
          align="center"
          py={4}
          _hover={{ color: "brand.tertiary" }}

        >
        </Flex>
      */}
    </Flex>
  );
}
