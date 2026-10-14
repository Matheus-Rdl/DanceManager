import { useEffect, useState } from "react";
import { Avatar, Badge, Box, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { FiCheck } from "react-icons/fi";
import StudentNavigation from "./StudentNavigation";
import { fetchUserById } from "../services/usersServices";
import { formatDate, formatName } from "../utils/formatters";

/* Cabeçalho reutilizável: busca o aluno por ID e mantém a navegação entre abas. */
export default function StudentProfileHeader({
  userId, activeTab, initialUserData = null, activeContract = undefined,
  showContractStatus = false, contractsLoading = false, showNavigation = true
}) {
  const resolvedId = userId || initialUserData?._id || initialUserData?.id;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Atualiza o cabeçalho quando muda o aluno; mantém os dados iniciais enquanto carrega. */
  useEffect(() => {
    if (!resolvedId) return;
    let active = true;
    setLoading(true);
    setError("");
    fetchUserById(resolvedId)
      .then((data) => { if (active) setProfile({ id: String(resolvedId), data }); })
      .catch((err) => { if (active) setError(err.message || "Erro ao buscar aluno."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [resolvedId]);

  const sameInitialId = initialUserData && String(initialUserData._id || initialUserData.id || "") === String(resolvedId);
  const user = (profile?.id === String(resolvedId) ? profile.data : null) || (sameInitialId ? initialUserData : null);
  const name = user?.user_name || user?.name || (loading ? "Carregando aluno..." : "Usuário");
  const photo = user?.user_photo || user?.photo;
  const hasContract = activeContract?.active === true;

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="8px" overflow="hidden" width="100%">
      {/* DADOS DO ALUNO */}
      <Flex px={{ base: 3, md: 4 }} py={4} gap={4} justify="flex-start" align={{ base: "flex-start", lg: "center" }} direction={{ base: "column", lg: "row" }}>
        <HStack gap={4} minW={0}>
          <Avatar.Root w={{ base: "64px", md: "76px" }} h={{ base: "64px", md: "76px" }} flexShrink={0}>
            <Avatar.Fallback name={name} />
            {photo && <Avatar.Image src={photo} />}
          </Avatar.Root>
          <Box minW={0}>
            <Heading fontSize="xl" lineHeight="1.2" color="#003b36" fontWeight="700">{formatName(name)}</Heading>
            <Text mt="5px" fontSize="12px" color="#60777c">Matrícula: {user?.user_mat || "-"}</Text>
            {showContractStatus ? (
              <Flex mt={2} align="center" gap={2} flexWrap="wrap">
                <Badge px="9px" py="4px" borderRadius="999px" bg={hasContract ? "#dff5e6" : "#edf1f2"} color={hasContract ? "#14833b" : "#64748b"} fontSize="10px">
                  {contractsLoading ? "Consultando contrato..." : hasContract ? "Contrato vigente" : "Sem contrato vigente"}
                </Badge>
                {!contractsLoading && hasContract && (
                  <Text fontSize="12px" color="#607873">Vigência: {activeContract.plannedEndDate ? `até ${formatDate(activeContract.plannedEndDate)}` : "prazo indeterminado"}</Text>
                )}
              </Flex>
            ) : user ? (
              <Badge mt="8px" px="9px" py="4px" borderRadius="999px" bg="#dff5e6" color="#14833b" fontSize="10px"><FiCheck /> Aluno ativo</Badge>
            ) : null}
            {error && <Text mt={2} fontSize="11px" color="red.600">{error}</Text>}
            {!resolvedId && <Text mt={2} fontSize="11px" color="orange.600">ID do aluno não informado.</Text>}
          </Box>
        </HStack>
      </Flex>
      {/* ABAS */}
      {showNavigation && <StudentNavigation activeTab={activeTab} userId={resolvedId} userData={user} />}
    </Box>
  );
}
