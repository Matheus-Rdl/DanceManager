import { Box, Button, Flex } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";

/* Navegação da turma: dois menus principais. Dentro de Alunos, três opções.
   Todas as abas compartilham activityMat e recuperam a turma pelo contexto. */
const OVERVIEW = { label: "Visão geral", path: "/ActivityManagementDetailed" };
const STUDENT_TABS = [
  { label: "Lista de alunos", path: "/ActivityManagementUsers" },
  { label: "Presenças", path: "/ActivityAttendance" },
  { label: "Mensalidades", path: "/ActivityMonthlyFees" }
];

const getSelectedTab = (path, activeTab) => {
  if (activeTab === "Visão geral" || path.includes("ActivityManagementDetailed")) return "Visão geral";
  if (activeTab === "Presenças" || path.includes("ActivityAttendance")) return "Presenças";
  if (activeTab === "Mensalidades" || path.includes("ActivityMonthlyFees")) return "Mensalidades";
  return "Lista de alunos";
};

export default function ActivityNavigation({ activeTab, activityData, activityMat }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryMat = new URLSearchParams(location.search).get("activityMat");
  const mat = String(activityMat || activityData?.activity_mat || location.state?.activityData?.activity_mat || queryMat || "");
  const id = activityData?._id || location.state?.activityId;
  const selected = getSelectedTab(location.pathname, activeTab);
  const onStudents = selected !== "Visão geral";

  const goTo = (path) => {
    if (!mat || location.pathname === path) return;
    navigate(`${path}?activityMat=${encodeURIComponent(mat)}`, {
      state: {
        activityData: activityData || location.state?.activityData || null,
        activityId: id,
        currentMode: "E"
      }
    });
  };

  const mainStyle = active => ({
    flexShrink: 0, h: "44px", px: { base: "15px", md: "20px" },
    variant: "ghost", borderRadius: 0, fontSize: "12px",
    color: active ? "#063f39" : "#506a67", fontWeight: active ? "700" : "500",
    borderBottom: active ? "3px solid #0b6b5b" : "3px solid transparent",
    bg: active ? "#f5faf8" : "transparent",
    _hover: { bg: "#f1f7f5" }
  });

  return (
    <Box bg="white" w="100%" borderTop="1px solid #e7eceb" borderBottom="1px solid #e7eceb">
      <Flex px={{ base: 2, md: 3 }} overflowX="auto" gap={1}>
        <Button {...mainStyle(!onStudents)} aria-current={!onStudents ? "page" : undefined}
          disabled={!mat} onClick={() => goTo(OVERVIEW.path)}>Visão geral</Button>
        <Button {...mainStyle(onStudents)} aria-current={onStudents ? "page" : undefined}
          disabled={!mat} onClick={() => goTo(STUDENT_TABS[0].path)}>Alunos</Button>
      </Flex>
      {onStudents && <Flex px={{ base: 2, md: 3 }} py="8px" gap={2} borderTop="1px solid #edf1f0"
        overflowX="auto" bg="#fafcfb">
        {STUDENT_TABS.map(item => {
          const active = selected === item.label;
          return <Button key={item.label} size="sm" flexShrink={0} h="32px" px={3}
            bg={active ? "#e2f1ec" : "transparent"} color={active ? "#075747" : "#607873"}
            border="1px solid" borderColor={active ? "#b9dcd1" : "transparent"}
            borderRadius="7px" fontSize="11px" fontWeight={active ? "700" : "500"}
            aria-current={active ? "page" : undefined}
            disabled={!mat} onClick={() => goTo(item.path)}>{item.label}</Button>;
        })}
      </Flex>}
    </Box>
  );
}
