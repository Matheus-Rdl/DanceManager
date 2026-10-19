import { Button, Flex } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";

/* Navegação da TURMA: diferente das abas do aluno, conserva activity_mat.
   A matrícula também fica na URL para permitir reabrir o link diretamente. */
const TABS = [
  { label: "Visão geral", path: "/ActivityManagementDetailed" },
  { label: "Presenças", path: "/ActivityAttendance" },
  { label: "Mensalidades", path: "/ActivityMonthlyFees" }
];

export default function ActivityNavigation({ activeTab, activityData, activityMat }) {
  const navigate = useNavigate();
  const location = useLocation();
  const mat = String(activityMat || activityData?.activity_mat || location.state?.activityData?.activity_mat || new URLSearchParams(location.search).get("activityMat") || "");
  const id = activityData?._id || location.state?.activityId;

  return (
    <Flex px={{ base: 2, md: 3 }} borderTop="1px solid #e7eceb" borderBottom="1px solid #e7eceb" overflowX="auto" bg="#fff" width="100%">
      {TABS.map(({ label, path }) => {
        const active = activeTab === label;
        return <Button key={label} flexShrink={0} h="44px" px="12px"
          variant="ghost" borderRadius="0" disabled={!mat}
          aria-current={active ? "page" : undefined}
          color={active ? "#063f39" : "#506a67"} fontSize="12px"
          fontWeight={active ? "700" : "500"}
          borderBottom={active ? "3px solid #063f39" : "3px solid transparent"}
          onClick={() => {
            if (!mat || active) return;
            navigate(`${path}?activityMat=${encodeURIComponent(mat)}`, { state: {
              activityData: activityData || location.state?.activityData || null,
              activityId: id,
              currentMode: "E"
            }});
          }}>{label}</Button>;
      })}
    </Flex>
  );
}
