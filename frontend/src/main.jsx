import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider, Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { createHashRouter, RouterProvider } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";
import system from "./theme.js";
import { Toaster } from "./components/ui/toaster.jsx";
import Home from "./home/home.jsx";

import PeopleManagement from "./features/register/pages/peopleManagement.jsx";
import PeopleManagementDetailed from "./features/register/pages/peopleManagementDetailed.jsx";
import PeopleManagementContracts from "./features/register/pages/peopleManagementContracts.jsx";

import ActivityAttendance from "./features/activities/pages/activityAttendance.jsx";
import ActivityManagement from "./features/activities/pages/activityManagement.jsx";
import ActivityManagementDetailed from "./features/activities/pages/activityManagementDetailed.jsx";
import ActivityManagementUsers from "./features/activities/pages/activityManagementUsers.jsx";

import UnderConstruction from "./components/underConstruction.jsx";
import PeopleManagementActivities from "./features/register/pages/peopleManagementActivities.jsx";

document.documentElement.setAttribute(
  "data-env",
  import.meta.env.VITE_ENV
);

const pages = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "/", element: <Home /> },

      { path: "/PeopleManagement", element: <PeopleManagement /> },
      { path: "/PeopleManagement/add", element: <PeopleManagementDetailed /> },
      { path: "/PeopleManagement/view", element: <PeopleManagementDetailed /> },
      { path: "/PeopleManagement/alter", element: <PeopleManagementDetailed /> },

      {
        path: "/PeopleManagementActivities",
        element: <PeopleManagementActivities />,
      },

      {
        path: "/PeopleManagement/contracts",
        element: <PeopleManagementContracts />,
      },

      { path: "/ActivityAttendance", element: <ActivityAttendance /> },
      { path: "/ActivityManagement", element: <ActivityManagement /> },
      {
        path: "/ActivityManagement/add",
        element: <ActivityManagementDetailed />,
      },
      {
        path: "/ActivityManagement/view",
        element: <ActivityManagementDetailed />,
      },
      {
        path: "/ActivityManagement/alter",
        element: <ActivityManagementDetailed />,
      },
      {
        path: "/ActivityManagementUsers",
        element: <ActivityManagementUsers />,
      },

      {
        path: "/relatorios",
        element: <UnderConstruction title="Relatórios" />,
      },
      {
        path: "/financeiro",
        element: <UnderConstruction title="Financeiro" />,
      },
      {
        path: "/configuracoes",
        element: <UnderConstruction title="Configurações" />,
      },
    ],
  },
]);

const API_URL = import.meta.env.VITE_API_URL;

function ServerLoading() {
  return (
    <Flex
      minH="100vh"
      w="100vw"
      align="center"
      justify="center"
      direction="column"
      gap={4}
      bg="gray.50"
    >
      <Text
        fontSize="2xl"
        fontWeight="bold"
        color="#013E34"
      >
        Dance Manager
      </Text>

      <Spinner
        size="xl"
        color="#013E34"
      />

      <Text color="gray.600">
        Conectando ao servidor...
      </Text>

      <Text
        fontSize="sm"
        color="gray.500"
      >
        Isso pode levar alguns segundos.
      </Text>
    </Flex>
  );
}

function ServerError() {
  return (
    <Flex
      minH="100vh"
      w="100vw"
      align="center"
      justify="center"
      direction="column"
      gap={4}
      bg="gray.50"
      px={6}
      textAlign="center"
    >
      <Text
        fontSize="2xl"
        fontWeight="bold"
        color="#013E34"
      >
        Dance Manager
      </Text>

      <Text
        fontSize="lg"
        fontWeight="semibold"
      >
        Não foi possível conectar ao servidor.
      </Text>

      <Text color="gray.600">
        Verifique sua conexão com a internet e tente novamente.
      </Text>
    </Flex>
  );
}

function Root() {
  const [serverReady, setServerReady] = useState(false);
  const [serverError, setServerError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkServer = async () => {
      while (!cancelled) {
        try {
          const response = await fetch(`${API_URL}/health`, {
            method: "GET",
          });

          if (response.ok) {
            if (!cancelled) {
              setServerReady(true);
            }

            return;
          }
        } catch (error) {
          console.log("Servidor ainda iniciando...");
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 2000);
        });
      }
    };

    checkServer();

    return () => {
      cancelled = true;
    };
  }, []);

  if (serverError) {
    return <ServerError />;
  }

  if (!serverReady) {
    return <ServerLoading />;
  }

  return (
    <>
      <RouterProvider router={pages} />
      <Toaster />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <Root />
    </ChakraProvider>
  </StrictMode>
);