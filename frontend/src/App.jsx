import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, Flex } from "@chakra-ui/react";

import NavBar from "./components/navbar";
import Header from "./components/header";

function App() {

  // Controla se o NavBar mobile está aberto
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <Flex
      h="100vh"
      w="100vw"
      overflow="hidden"
      bg="gray.50"
      color="gray.800"
    >

      {/* 
        Menu lateral de navegação

        No desktop funciona normalmente.
        No mobile fica sobre o conteúdo.
      */}
      <NavBar
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />


      {/* Área principal */}
      <Flex
        direction="column"
        flex="1"
        overflow="hidden"
      >

        {/* Header */}
        <Header
          onOpenMobileNav={() =>
            setIsMobileNavOpen(true)
          }
        />


        {/* Conteúdo principal */}
        <Box
          flex="1"
          overflowY="auto"
          p={4}
          bg="gray.50"
        >
          <Outlet />
        </Box>

      </Flex>

    </Flex>
  );
}

export default App;