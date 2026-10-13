import { Flex, Button } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
/* Rotas disponíveis para cada aba do cadastro. */
const TABS = [
  { label: "Visão geral", path: "/PeopleManagementDetailed" },
  { label: "Contratos", path: "/PeopleManagementContracts" },
  { label: "Mensalidades", path: "/MonthlyFeesDetailed" },
  { label: "Turmas", path: "/PeopleManagementActivities" },
  { label: "Pagamentos", path: null },
  { label: "Histórico", path: null },
];
export default function StudentNavigation({ activeTab, userData, userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  /* Resolve o ID vindo da tela atual ou da rota anterior. */
  const resolvedId = userId || userData?._id || userData?.id || location.state?.userId || location.state?.studentId;
  const resolvedData = userData || location.state?.userData || null;
  /* Mantém userId, studentId e userData ao navegar. */
  return (
    <Flex px={{ base: 2, md: 3 }} borderTop="1px solid #e7eceb" borderBottom="1px solid #e7eceb" overflowX="auto" bg="#fff">
      {TABS.map(({ label, path }) => {
        const active = activeTab === label;
        return (
          <Button key={label} flexShrink={0} h="44px" px="12px" variant="ghost" borderRadius="0"
            disabled={!path || !resolvedId}
            title={!path ? "Página ainda não implementada" : undefined}
            color={active ? "#063f39" : "#506a67"} fontSize="12px"
            fontWeight={active ? "700" : "500"}
            borderBottom={active ? "3px solid #063f39" : "3px solid transparent"}
            onClick={() => {
              if (!path || !resolvedId || active) return;
              navigate(path, { state: {
                ...location.state,
                userId: resolvedId,
                studentId: resolvedId,
                userData: resolvedData,
                currentMode: "V"
              }});
            }}>
            {label}
          </Button>
        );
      })}
    </Flex>
  );
}
