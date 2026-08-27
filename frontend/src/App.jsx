import { Outlet } from "react-router-dom";
import { Box, Flex } from "@chakra-ui/react";
import NavBar from "./components/navbar";
import Header from "./components/header";

function App() {

  return (
    <Flex h="100vh" w="100vw" overflow="hidden" bg="gray.50" color="gray.800">

      {/* Menu lateral de navegação */}
      <NavBar />

      {/* Área principal (direita) */}
      <Flex direction="column" flex="1" overflow="hidden">

        {/* HEADER NOVO */}
        <Header />

        {/* CONTEÚDO PRINCIPAL (Telas de negócio) */}
        <Box flex="1" overflowY="auto" p={4} bg="gray.50">
          <Outlet />
        </Box>
      </Flex>

    </Flex>
  )
}

export default App
