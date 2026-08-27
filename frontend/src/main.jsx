import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { createHashRouter, RouterProvider } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";
import system from "./theme.js";
import { Toaster } from "./components/ui/toaster.jsx";
import Home from "./home/home.jsx";

import PeopleManagement from "./features/register/pages/peopleManagement.jsx";
import PeopleManagementDetailed from "./features/register/pages/peopleManagementDetailed.jsx";

import ActivityManagement from './features/activities/pages/activityManagement.jsx'
import ActivityManagementDetailed from './features/activities/pages/activityManagementDetailed.jsx'
import ActivityManagementUsers from './features/activities/pages/activityManagementUsers.jsx'

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
      { path: "/PeopleManagementActivities", element: <PeopleManagementActivities /> },

      { path: "/ActivityManagement", element: <ActivityManagement /> },
      { path: "/ActivityManagement/add", element: <ActivityManagementDetailed /> },
      { path: "/ActivityManagement/view", element: <ActivityManagementDetailed /> },
      { path: "/ActivityManagement/alter", element: <ActivityManagementDetailed /> },
      { path: "/ActivityManagementUsers", element: <ActivityManagementUsers /> },

      { path: "/relatorios", element: <UnderConstruction title="Relatórios" /> },
      { path: "/financeiro", element: <UnderConstruction title="Financeiro" /> },
      { path: "/configuracoes", element: <UnderConstruction title="Configurações" /> },
    ]
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <RouterProvider router={pages} />
      <Toaster />
    </ChakraProvider>
  </StrictMode>
);