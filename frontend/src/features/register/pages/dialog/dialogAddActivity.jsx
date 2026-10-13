import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Checkbox, Dialog, Flex, HStack, Input, NativeSelect, Portal, Text, VStack } from "@chakra-ui/react";
import { FiCalendar, FiCheck, FiClock, FiSearch } from "react-icons/fi";
import activitiesServices from "../../../../services/activitiesServices";
import usersServices from "../../../../services/usersServices";
/* Configuração das modalidades e dias usados no cadastro. */
const TYPES = { "1": "Samba", "2": "Funkeado", "3": "Forró", "4": "Bolero" };
const DAYS = { 1: "Segunda-feira", 2: "Terça-feira", 3: "Quarta-feira", 4: "Quinta-feira", 5: "Sexta-feira", 6: "Sábado", 7: "Domingo" };
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const getTeacher = (activity) => activity.teacher_name || activity.activity_teacher_name || activity.professor?.name || "Não informado";
const getMinutes = (time) => { const parts = String(time || "").split(":").map(Number); return parts.length === 2 && parts.every(Number.isFinite) ? parts[0] * 60 + parts[1] : null; };
/* Avisa quando duas turmas escolhidas ocupam o mesmo horário no mesmo dia. */
const overlaps = (a, b) => {
  if (String(a.activity_days) !== String(b.activity_days)) return false;
  const as = getMinutes(a.activity_time_start), ae = getMinutes(a.activity_time_end);
  const bs = getMinutes(b.activity_time_start), be = getMinutes(b.activity_time_end);
  return as !== null && ae !== null && bs !== null && be !== null && as < be && bs < ae;
};
export default function DialogAddActivity({ open, onClose, userData, onSaved }) {
  const { getActivitiesByType, activityTypeList = [], refetchActivities } = activitiesServices();
  const { updateUserActivities } = usersServices();
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [initialActivities, setInitialActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [day, setDay] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  /* Busca todas as modalidades, sem limitar a lista a uma única categoria. */
  useEffect(() => { if (open && refetchActivities) getActivitiesByType(Object.keys(TYPES)); }, [open, refetchActivities]);
  /* Ao abrir, restaura as matrículas do aluno; cancelar não altera os dados. */
  useEffect(() => {
    if (!open) return;
    const mats = (userData?.user_activities || []).map(String);
    setSelectedActivities(mats);
    setInitialActivities(mats);
    setSearch(""); setType("all"); setDay("all"); setOnlyAvailable(false); setError("");
  }, [open, userData?._id]);
  const allActivities = useMemo(() => activityTypeList.filter((activity) => activity.activity_mat), [activityTypeList]);
  const filteredActivities = useMemo(() => allActivities.filter((activity) => {
    const mat = String(activity.activity_mat);
    return (type === "all" || String(activity.activity_type) === type) && (day === "all" || String(activity.activity_days) === day) && (!onlyAvailable || !initialActivities.includes(mat)) && normalize(`${activity.activity_title} ${mat} ${TYPES[String(activity.activity_type)] || ""} ${DAYS[Number(activity.activity_days)] || ""}`).includes(normalize(search));
  }).sort((a, b) => Number(a.activity_days) - Number(b.activity_days) || String(a.activity_time_start).localeCompare(String(b.activity_time_start))), [allActivities, type, day, onlyAvailable, initialActivities, search]);
  const chosen = useMemo(() => allActivities.filter((activity) => selectedActivities.includes(String(activity.activity_mat))), [allActivities, selectedActivities]);
  const conflicts = useMemo(() => chosen.flatMap((activity, i) => chosen.slice(i + 1).filter((other) => overlaps(activity, other)).map((other) => `${activity.activity_title} e ${other.activity_title}`)), [chosen]);
  const changed = [...selectedActivities].sort().join("|") !== [...initialActivities].sort().join("|");
  const toggle = (mat) => setSelectedActivities((previous) => previous.includes(mat) ? previous.filter((item) => item !== mat) : [...previous, mat]);
  /* Salva apenas quando a atualização não sinaliza falha. */
  const handleSave = async () => {
    if (!userData?._id || saving) return;
    setSaving(true); setError("");
    try {
      const result = await updateUserActivities(userData._id, selectedActivities);
      if (result === false || result?.success === false || result?.error) { setError(result?.message || "Não foi possível salvar as atividades. Tente novamente."); return; }
      if (typeof onSaved === "function") await onSaved(selectedActivities);
      onClose();
    } catch (err) { setError(err?.message || "Erro ao salvar as atividades."); }
    finally { setSaving(false); }
  };
  return (
    <Dialog.Root open={open} onOpenChange={(details) => { if (!details.open && !saving) onClose(); }} size="lg">
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content w={{ base: "96vw", md: "85vw" }} maxW="780px" maxH="90vh" borderRadius="10px">
        <Dialog.Header borderBottom="1px solid #e6ecea" pb={3}><Box><Dialog.Title fontSize="17px" color="#063f39">Gerenciar atividades</Dialog.Title><Text mt={1} fontSize="11px" color="#60777c">Selecione as turmas de {userData?.user_name || userData?.name || "este aluno"}</Text></Box></Dialog.Header>
        <Dialog.Body overflowY="auto" py={4}>
          {/* Pesquisa e filtros para encontrar a turma rapidamente. */}
          <VStack gap={3} align="stretch">
            <Box><Text mb={1} fontSize="11px" color="#506a67"><FiSearch style={{ display: "inline" }} /> Buscar turma</Text><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, matrícula ou modalidade" size="sm" /></Box>
            <Flex gap={2} direction={{ base: "column", sm: "row" }}>
              <Box flex="1"><Text mb={1} fontSize="11px" color="#506a67">Modalidade</Text><NativeSelect.Root size="sm"><NativeSelect.Field value={type} onChange={(e) => setType(e.target.value)}><option value="all">Todas as modalidades</option>{Object.entries(TYPES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
              <Box flex="1"><Text mb={1} fontSize="11px" color="#506a67">Dia da semana</Text><NativeSelect.Root size="sm"><NativeSelect.Field value={day} onChange={(e) => setDay(e.target.value)}><option value="all">Todos os dias</option>{Object.entries(DAYS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
            </Flex>
            <Checkbox.Root checked={onlyAvailable} onCheckedChange={(details) => setOnlyAvailable(details.checked === true)}><Checkbox.HiddenInput /><Checkbox.Control /><Checkbox.Label fontSize="11px">Mostrar apenas turmas ainda não matriculadas</Checkbox.Label></Checkbox.Root>
            <Flex justify="space-between" align="center"><Text fontSize="12px" fontWeight="700" color="#063f39">Turmas disponíveis</Text><Badge bg="#edf3f1" color="#174f4a">{filteredActivities.length} encontradas</Badge></Flex>
            {/* Cada cartão inteiro pode ser clicado para selecionar ou remover. */}
            <VStack align="stretch" gap={2}>
              {filteredActivities.length === 0 && <Box p={5} textAlign="center" border="1px dashed #cfdcda" borderRadius="8px"><Text fontSize="12px" color="#60777c">Nenhuma turma encontrada para esses filtros.</Text></Box>}
              {filteredActivities.map((activity) => {
                const mat = String(activity.activity_mat), checked = selectedActivities.includes(mat), enrolled = initialActivities.includes(mat);
                return <Flex key={mat} align="center" gap={3} p={3} border="1px solid" borderColor={checked ? "#0b6b5b" : "#e2e8e7"} borderRadius="8px" bg={checked ? "#f2faf7" : "white"} cursor="pointer" onClick={() => toggle(mat)}>
                  <Box color={checked ? "#0b6b5b" : "#9aa9a6"}>{checked ? <FiCheck size={20} /> : <Box w="18px" h="18px" border="1px solid #aab8b5" borderRadius="4px" />}</Box>
                  <Box flex="1" minW={0}><Flex align="center" gap={2} wrap="wrap"><Text fontSize="12px" fontWeight="700" color="#063f39">{activity.activity_title || "Atividade"}</Text>{enrolled && <Badge bg="#dff5e6" color="#14833b" fontSize="10px">Já matriculado</Badge>}</Flex><Text fontSize="10px" color="#60777c">{TYPES[String(activity.activity_type)] || "Outra modalidade"} • Turma {mat}</Text><HStack mt={1} gap={3} wrap="wrap"><Text fontSize="11px" color="#506a67"><FiCalendar style={{ display: "inline" }} /> {DAYS[Number(activity.activity_days)] || "Dia não informado"}</Text><Text fontSize="11px" color="#506a67"><FiClock style={{ display: "inline" }} /> {activity.activity_time_start || "--:--"} às {activity.activity_time_end || "--:--"}</Text></HStack><Text mt={1} fontSize="11px" color="#60777c">Professor: {getTeacher(activity)}</Text></Box>
                </Flex>;
              })}
            </VStack>
            {/* Resumo: mostra alterações antes de enviar ao backend. */}
            <Box p={3} border="1px solid #d7e2df" borderRadius="8px" bg="#f7faf9"><Text fontWeight="700" fontSize="12px" color="#063f39">Resumo da seleção</Text><Text mt={1} fontSize="11px" color="#506a67">{selectedActivities.length} turma(s) selecionada(s) • {selectedActivities.filter((mat) => !initialActivities.includes(mat)).length} nova(s) • {initialActivities.filter((mat) => !selectedActivities.includes(mat)).length} removida(s)</Text>{conflicts.length > 0 && <Box mt={2} p={2} bg="#fff6e6" borderRadius="6px"><Text fontSize="11px" color="#8a5a00" fontWeight="600">Atenção: possíveis conflitos de horário</Text>{conflicts.map((item, i) => <Text key={i} fontSize="10px" color="#8a5a00">{item}</Text>)}</Box>}</Box>
            {error && <Text color="red.600" fontSize="12px">{error}</Text>}
          </VStack>
        </Dialog.Body>
        <Dialog.Footer borderTop="1px solid #e6ecea" gap={2}><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button bg="#064e43" color="white" loading={saving} disabled={!changed || saving} onClick={handleSave}>Salvar alterações</Button></Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  );
}
