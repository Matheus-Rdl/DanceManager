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

export default function NavBar({
  isMobileOpen = false,
  onMobileClose = () => {},
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Fecha a sidebar desktop em determinadas páginas
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
    {
      label: "Pesquisar",
      icon: IoMdSearch,
      route: null,
    },
    {
      label: "Início",
      icon: BiHome,
      route: "/",
    },
    {
      label: "Cadastros",
      icon: PiUsersThree,
      route: "/PeopleManagement",
    },
    {
      label: "Atividades",
      icon: LiaGraduationCapSolid,
      route: "/ActivityManagement",
    },
    {
      label: "Relatórios",
      icon: LuNewspaper,
      route: "/relatorios",
    },
    {
      label: "Financeiro",
      icon: PiMoneyWavy,
      route: "/financeiro",
    },
    {
      label: "Configurações",
      icon: IoSettingsOutline,
      route: "/configuracoes",
    },
  ];

  const handleNavigate = (route) => {
    if (route) {
      navigate(route);
    }

    // No celular, fecha depois de navegar
    onMobileClose();
  };

  /*
   * Conteúdo da sidebar
   */
  const navContent = (
    <Flex
      direction="column"
      flex="1"
      overflowY="auto"
      overflowX="hidden"
      pt={4}
      pb={4}
      gap={2}
    >
      {menuItems.map((item) => {
        const isActive =
          item.route && location.pathname === item.route;

        const MenuItemContent = (
          <Flex
            align="center"
            justify={
              isExpanded || isMobileOpen
                ? "flex-start"
                : "center"
            }
            px={
              isExpanded || isMobileOpen
                ? 6
                : 0
            }
            py={3}
            cursor="pointer"
            bg={
              isActive
                ? "brand.tertiary"
                : "transparent"
            }
            color={
              isActive
                ? "brand.primary"
                : "brand.secondary"
            }
            _hover={{
              bg: "brand.tertiary",
              color: "brand.primary",
            }}
            transition="all 0.2s"
            onClick={() =>
              handleNavigate(item.route)
            }
            w="100%"
          >
            <Icon
              as={item.icon}
              boxSize={6}
            />

            <Text
              ml={4}
              display={
                isExpanded || isMobileOpen
                  ? "block"
                  : "none"
              }
              whiteSpace="nowrap"
              fontWeight={
                isActive
                  ? "bold"
                  : "normal"
              }
            >
              {item.label}
            </Text>
          </Flex>
        );

        /*
         * Tooltip somente quando
         * sidebar está fechada no desktop
         */
        if (!isExpanded && !isMobileOpen) {
          return (
            <Tooltip
              key={item.label}
              content={item.label}
              positioning={{
                placement: "right",
              }}
            >
              <Box w="100%">
                {MenuItemContent}
              </Box>
            </Tooltip>
          );
        }

        return (
          <Box
            key={item.label}
            w="100%"
          >
            {MenuItemContent}
          </Box>
        );
      })}
    </Flex>
  );

  return (
    <>
      {/* ===================================== */}
      {/* DESKTOP NAVBAR */}
      {/* ===================================== */}

      <Flex
        display={{
          base: "none",
          md: "flex",
        }}
        direction="column"
        h="100vh"
        bg="brand.primary"
        color="brand.secondary"
        transition="width 0.3s ease"
        w={
          isExpanded
            ? "250px"
            : "80px"
        }
        flexShrink={0}
        zIndex={100}
        position="relative"
      >
        {navContent}

        <Icon
          right={0}
          marginRight={-4}
          marginTop={6}
          borderRadius="100%"
          position="absolute"
          cursor="pointer"
          color="brand.tertiary"
          backgroundColor="brand.primary"
          onClick={() =>
            setIsExpanded(!isExpanded)
          }
          as={
            isExpanded
              ? IoIosArrowDropleftCircle
              : IoIosArrowDroprightCircle
          }
          boxSize={8}
        />
      </Flex>


      {/* ===================================== */}
      {/* OVERLAY MOBILE */}
      {/* ===================================== */}

      {isMobileOpen && (
        <Box
          display={{
            base: "block",
            md: "none",
          }}
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={998}
          onClick={onMobileClose}
        />
      )}


      {/* ===================================== */}
      {/* NAVBAR MOBILE */}
      {/* ===================================== */}

      <Flex
        display={{
          base: "flex",
          md: "none",
        }}
        direction="column"
        position="fixed"
        top={0}
        left={0}
        h="100vh"
        w="250px"
        bg="brand.primary"
        color="brand.secondary"
        zIndex={999}
        transform={
          isMobileOpen
            ? "translateX(0)"
            : "translateX(-100%)"
        }
        transition="transform 0.3s ease"
        boxShadow={
          isMobileOpen
            ? "lg"
            : "none"
        }
      >
        {navContent}
      </Flex>
    </>
  );
}