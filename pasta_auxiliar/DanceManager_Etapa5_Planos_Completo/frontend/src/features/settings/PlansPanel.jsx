import { useEffect, useState } from "react";
import { Badge, Box, Button, Dialog, Flex, Heading, Input, Portal, SimpleGrid, Text, Textarea, VStack } from "@chakra-ui/react";
import { FiCheck, FiEdit2, FiLayers, FiPlus, FiRefreshCw, FiX } from "react-icons/fi";
import { addPlan, listPlans, updatePlan } from "../../services/plansServices.js";
import { PLAN_DURATIONS, PLAN_PALETTES, SYSTEM_PLAN_COLORS, getPalette } from "../../utils/planColors.js";

const money = n => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
const emptyPlan = () => ({ name: "", description: "", colorId: "green", active: true,
  modalities: Object.fromEntries(Object.keys(PLAN_DURATIONS).map(name => [name, { active: name === "Mensal", monthlyValue: "" }])) });
const fromApi = data => ({
  name: data.name || "", description: data.description || "", colorId: data.colorId || "slate", active: data.active !== false,
  modalities: Object.fromEntries(Object.keys(PLAN_DURATIONS).map(name => [name, {
    active: data.modalities?.[name]?.active === true,
    monthlyValue: String(data.modalities?.[name]?.monthlyValue ?? "")
  }]))
});

function PlanDialog({ selected, onClose, onSaved }) {
  const [form, setForm] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setForm(selected && selected !== "new" ? fromApi(selected) : emptyPlan()); setError(""); }, [selected]);
  const isNew = selected === "new";
  const setProp = (name, value) => setForm(old => ({ ...old, [name]: value }));
  const setDuration = (name, key, value) => setForm(old => ({ ...old,
    modalities: { ...old.modalities, [name]: { ...old.modalities[name], [key]: value } } }));
  const submit = async () => {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const modalities = Object.fromEntries(Object.keys(PLAN_DURATIONS).map(name => [name, {
        active: form.modalities[name].active,
        monthlyValue: form.modalities[name].monthlyValue === "" ? 0 : Number(form.modalities[name].monthlyValue)
      }]));
      const payload = { ...form, modalities };
      if (isNew) await addPlan(payload); else await updatePlan(selected._id, payload);
      onSaved();
    } catch (err) { setError(err.message || "Não foi possível salvar o plano."); }
    finally { setSaving(false); }
  };
  return <Dialog.Root open={Boolean(selected)} onOpenChange={e => { if (!e.open) onClose(); }} size="lg" placement="center">
    <Portal><Dialog.Backdrop/><Dialog.Positioner><Dialog.Content mx={3} maxW="650px" maxH="90dvh" overflow="hidden" borderRadius="12px">
      <Dialog.Header borderBottom="1px solid #e5ece9" pr={12}><Dialog.Title fontSize="17px" color="#103c35">{isNew ? "Novo plano" : `Editar plano — ${selected?.name || ""}`}</Dialog.Title></Dialog.Header>
      <Dialog.Body overflowY="auto" py={4}><VStack gap={4} align="stretch">
        <Box><Text fontSize="12px" fontWeight="700" color="#315650" mb={1}>Nome do plano</Text>
          <Input value={form.name} onChange={e => setProp("name", e.target.value)} maxLength={70} h="38px" fontSize="13px" borderColor="#cfd9d7"/></Box>
        <Box><Text fontSize="12px" fontWeight="700" color="#315650" mb={1}>Descrição</Text>
          <Textarea value={form.description} onChange={e => setProp("description", e.target.value)} maxLength={500} fontSize="13px" borderColor="#cfd9d7"/></Box>
        <Box><Text fontWeight="700" color="#315650" fontSize="12px" mb={2}>Cor do plano — 12 opções</Text>
          <SimpleGrid columns={{base:4,sm:6}} gap={2}>{PLAN_PALETTES.map(item => <Button key={item.id} type="button" h="53px" variant="outline" px={1}
            borderWidth={form.colorId === item.id ? "2px" : "1px"} borderColor={form.colorId === item.id ? item.fg : "#d8e1df"}
            bg={item.bg} color={item.fg} _hover={{bg:item.bg,opacity:0.9}} onClick={() => setProp("colorId", item.id)}
            flexDirection="column" gap="3px" aria-label={`Cor ${item.name}`} aria-pressed={form.colorId === item.id}>
            {form.colorId === item.id ? <FiCheck size={14}/> : <Box bg={item.fg} w="12px" h="12px" borderRadius="full"/>}
            <Text fontSize="10px">{item.name}</Text>
          </Button>)}</SimpleGrid>
        </Box>
        <Box border="1px solid #e2eae7" p={3} borderRadius="9px"><Text mb={2} fontWeight="700" fontSize="12px" color="#315650">Modalidades e valores mensais</Text>
          <VStack align="stretch" gap={3}>{Object.entries(PLAN_DURATIONS).map(([name, months]) => {
            const entry = form.modalities[name];
            return <Box key={name} p={3} border="1px solid #e4ebe9" borderRadius="8px" bg={entry.active ? "#f7faf9" : "#fff"}>
              <Flex align="center" justify="space-between" gap={2} mb={2}>
                <Text fontWeight="700" color="#174f4a" fontSize="13px">{name} <Text as="span" fontWeight="400" color="#71858a">({months} {months===1?"mês":"meses"})</Text></Text>
                <Button size="xs" variant={entry.active ? "solid" : "outline"} bg={entry.active ? "#0b6b5b" : "white"}
                  color={entry.active ? "white" : "#607873"} onClick={() => setDuration(name, "active", !entry.active)}>
                  {entry.active ? "Ativa" : "Desativada"}</Button>
              </Flex>
              <Flex gap={3} align="end" wrap="wrap"><Box flex="1" minW="125px"><Text fontSize="11px" color="#607873" mb={1}>Valor mensal (R$)</Text>
                <Input type="number" inputMode="decimal" min="0" step="0.01" h="36px" fontSize="13px" borderColor="#cfd9d7"
                  value={entry.monthlyValue} onChange={e => setDuration(name, "monthlyValue", e.target.value)} placeholder="0,00"/>
              </Box><Box flex="1" minW="125px"><Text fontSize="11px" color="#607873">Total do período</Text>
                <Text color="#0b6b5b" fontWeight="800" fontSize="16px">{money(Number(entry.monthlyValue) * months)}</Text></Box></Flex>
            </Box>;
          })}</VStack>
        </Box>
        <Flex gap={2} align="center" justify="space-between" p={3} bg="#f5faf8" borderRadius="8px">
          <Text fontSize="12px" color="#315650">Situação do plano</Text>
          <Button size="sm" onClick={() => setProp("active", !form.active)} variant="outline"
            color={form.active ? "#08715c" : "#7b461c"}>{form.active ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}</Button>
        </Flex>
        {error && <Text role="alert" color="#c53030" fontSize="12px">{error}</Text>}
      </VStack></Dialog.Body>
      <Dialog.Footer borderTop="1px solid #e5ece9"><Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button size="sm" bg="#0b6b5b" color="white" loading={saving} onClick={submit}><FiCheck/> Salvar plano</Button></Dialog.Footer>
      <Dialog.CloseTrigger asChild><Button position="absolute" top="10px" right="10px" aria-label="Fechar" variant="ghost" size="sm" onClick={onClose}><FiX/></Button></Dialog.CloseTrigger>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}

export default function PlansPanel() {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchPlans = async () => {
    setLoading(true); setError("");
    try { setPlans(await listPlans()); }
    catch (err) { setError(err.message || "Não foi possível carregar planos."); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchPlans(); }, []);
  const saved = () => { setSelected(null); fetchPlans(); };
  return <VStack align="stretch" gap={4}>
    <Flex justify="space-between" gap={2} align="center" wrap="wrap">
      <Box><Heading fontSize="17px" color="#103c35">Planos da escola</Heading>
        <Text color="#607873" fontSize="12px" mt={1}>Configure os valores mensais, durações e a identificação visual.</Text></Box>
      <Flex gap={2}><Button size="sm" variant="outline" onClick={fetchPlans} disabled={loading}><FiRefreshCw/> Atualizar</Button>
        <Button size="sm" bg="#0b6b5b" color="white" onClick={() => setSelected("new")}><FiPlus/> Novo plano</Button></Flex>
    </Flex>
    {error && <Box role="alert" bg="#fff1f1" borderRadius="8px" p={3}><Text color="#b4232b" fontSize="12px">{error}</Text></Box>}
    {loading ? <Text color="#607873" fontSize="12px">Carregando planos...</Text> :
      <Box border="1px solid #dbe6e2" borderRadius="10px" overflow="hidden" bg="white">
        {plans.map((plan, i) => { const color = getPalette(plan.colorId); return <Button key={plan._id} variant="ghost" type="button"
          w="100%" minH="64px" h="auto" px={4} py={3} borderRadius="0" justifyContent="space-between" textAlign="left"
          borderBottom={i===plans.length-1?"none":"1px solid #edf2f0"} onClick={() => setSelected(plan)} _hover={{bg:"#f5faf8"}}>
          <Flex align="center" gap={3} minW={0}><Box px={3} py={1} borderRadius="full" bg={color.bg} color={color.fg} fontSize="12px" fontWeight="700">{plan.name}</Box>
            <Box textAlign="left"><Text fontSize="11px" color="#607873">{Object.entries(plan.modalities || {}).filter(([,v]) => v?.active).map(([k]) => k).join(" · ") || "Nenhuma duração ativa"}</Text></Box></Flex>
          <Badge bg={plan.active ? "#dff5e6" : "#edf1f2"} color={plan.active ? "#14833b" : "#637673"}>{plan.active ? "Ativo" : "Inativo"}</Badge>
        </Button>; })}
      </Box>}
    <Box><Heading fontSize="13px" color="#315650" mb={2}>Tipos de contrato do sistema</Heading>
      <Flex wrap="wrap" gap={2}>{Object.entries(SYSTEM_PLAN_COLORS).map(([name,color]) => <Badge key={name} px={3} py={2} borderRadius="full" bg={color.bg} color={color.fg}>{name}</Badge>)}</Flex>
      <Text fontSize="11px" color="#71858a" mt={2}>Essas três cores são fixas e não podem ser alteradas nesta tela.</Text>
    </Box>
    <PlanDialog selected={selected} onClose={() => setSelected(null)} onSaved={saved}/>
  </VStack>;
}
