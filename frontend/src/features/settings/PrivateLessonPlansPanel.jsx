import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Button, Dialog, Flex, Heading, Input, Portal, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiCheck, FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import service from "../../services/privateLessonPlansServices.js";
import { buildPlanPayload, emptyPlan, filterPlans, money, planForm } from "./privateLessonPlansView.js";

/* EN: Mount a fresh dialog for each selection and block duplicate submissions.
   PT: Abre um formulário novo a cada seleção e bloqueia envios duplicados. */
function PackageDialog({ selected, onClose, onSaved }) {
  const original = selected === "new" ? null : selected;
  const [form, setForm] = useState(() => original ? planForm(original) : emptyPlan());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const close = () => { if (!pending.current) onClose(); };
  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    let data;
    try { data = buildPlanPayload(form, original); }
    catch (err) { setError(err.message); return; }
    if (!Object.keys(data).length) { onClose(); return; }
    pending.current = true; setSaving(true);
    try {
      if (original) await service.update(original.id, data);
      else await service.create(data);
      onSaved();
    } catch (err) { setError(err.message || "Não foi possível salvar o pacote."); }
    finally { pending.current = false; setSaving(false); }
  };
  let unit = "—";
  try {
    const data = buildPlanPayload({ ...form, name: "Pacote" });
    unit = money(data.amount / data.lessonCount);
  } catch { /* EN: Incomplete input. PT: Dados incompletos. */ }
  return <Dialog.Root open onOpenChange={e => { if (!e.open) close(); }} placement="center" size="md"
    closeOnEscape={!saving} closeOnInteractOutside={!saving}>
    <Portal><Dialog.Backdrop/><Dialog.Positioner><Dialog.Content mx={3} maxH="90dvh" borderRadius="12px" overflow="hidden">
      <Dialog.Header borderBottom="1px solid #e5ece9" pr={12}><Dialog.Title fontSize="17px" color="#103c35">{original ? "Editar pacote" : "Novo pacote"}</Dialog.Title></Dialog.Header>
      <Box as="form" onSubmit={submit} display="flex" flexDirection="column" minH={0}>
        <Dialog.Body overflowY="auto" py={4}><VStack align="stretch" gap={4}>
          <Box><Text as="label" htmlFor="private-plan-name" display="block" fontSize="12px" fontWeight="700" color="#315650" mb={1}>Nome do pacote</Text>
            <Input id="private-plan-name" value={form.name} onChange={e => set("name", e.target.value)} maxLength={70} disabled={saving} h="38px" fontSize="13px" borderColor="#cfd9d7" placeholder="Ex.: 4 aulas"/></Box>
          <SimpleGrid columns={{base:1,sm:2}} gap={3}>
            <Box><Text as="label" htmlFor="private-plan-count" display="block" fontSize="12px" fontWeight="700" color="#315650" mb={1}>Quantidade de aulas</Text>
              <Input id="private-plan-count" inputMode="numeric" value={form.lessonCount} onChange={e => set("lessonCount", e.target.value)} disabled={saving} h="38px" fontSize="13px" borderColor="#cfd9d7"/></Box>
            <Box><Text as="label" htmlFor="private-plan-amount" display="block" fontSize="12px" fontWeight="700" color="#315650" mb={1}>Valor total (R$)</Text>
              <Input id="private-plan-amount" inputMode="decimal" value={form.amount} onChange={e => set("amount", e.target.value)} disabled={saving} h="38px" fontSize="13px" borderColor="#cfd9d7" placeholder="0,00"/></Box>
          </SimpleGrid>
          <Box bg="#f3f8f6" p={3} border="1px solid #dbe6e2" borderRadius="10px"><Text fontSize="12px" color="#607873">Valor por aula</Text><Heading fontSize="21px" color="#075749" mt={1}>{unit}</Heading></Box>
          {original && <Flex gap={2} align="center" justify="space-between" wrap="wrap"><Text fontSize="12px" fontWeight="700" color="#315650">Situação do pacote</Text>
            <Button type="button" size="sm" variant="outline" color={form.active ? "#08715c" : "#7b461c"} disabled={saving} aria-pressed={form.active} onClick={() => set("active", !form.active)}>{form.active ? "Ativo — desativar" : "Inativo — ativar"}</Button></Flex>}
          <Text fontSize="11px" color="#607873">Alterações valem para novas contratações. Pacotes já vendidos manterão seus valores originais.</Text>
          {error && <Text role="alert" color="#b4232b" fontSize="12px">{error}</Text>}
        </VStack></Dialog.Body>
        <Dialog.Footer borderTop="1px solid #e5ece9"><Button type="button" variant="outline" size="sm" onClick={close} disabled={saving}>Cancelar</Button>
          <Button type="submit" size="sm" bg="#0b6b5b" color="white" loading={saving} disabled={saving}><FiCheck/> Salvar pacote</Button></Dialog.Footer>
      </Box>
      <Dialog.CloseTrigger asChild><Button type="button" position="absolute" top="10px" right="10px" aria-label="Fechar" variant="ghost" size="sm" disabled={saving} onClick={close}><FiX/></Button></Dialog.CloseTrigger>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}

export default function PrivateLessonPlansPanel() {
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  /* EN: Abort obsolete reads when the tab changes or refreshes.
     PT: Cancela consultas obsoletas ao mudar de aba ou atualizar. */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    service.list({ signal: controller.signal }).then(rows => { if (!controller.signal.aborted) setPlans(rows); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || "Não foi possível carregar os pacotes."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  const visible = useMemo(() => filterPlans(plans, search, status), [plans, search, status]);
  const reload = () => { setLoading(true); setRefresh(n => n + 1); };
  const saved = () => { setSelected(null); setNotice("Pacote salvo com sucesso."); reload(); };
  return <VStack align="stretch" gap={4}>
    <Flex justify="space-between" align="center" gap={3} wrap="wrap">
      <Box><Heading as="h2" fontSize={{base:"19px",md:"23px"}} fontWeight="800" color="#075749">Pacotes de aulas particulares</Heading>
        <Text fontSize="12px" color="#607873" mt={1}>Configure os modelos, quantidades e valores das novas contratações.</Text></Box>
      <Flex gap={2} wrap="wrap"><Button size="sm" variant="outline" onClick={() => { setNotice(""); reload(); }} disabled={loading}><FiRefreshCw/> Atualizar</Button>
        <Button size="sm" bg="#0b6b5b" color="white" disabled={loading || Boolean(error)} onClick={() => {setNotice("");setSelected("new");}}><FiPlus/> Novo pacote</Button></Flex>
    </Flex>
    <Flex bg="white" p={3} border="1px solid #dbe6e2" borderRadius="10px" gap={3} align="center" wrap="wrap">
      <Flex flex="1" minW="180px" align="center" gap={2} px={3} border="1px solid #dce6e3" borderRadius="8px"><FiSearch color="#78918b"/>
        <Input aria-label="Buscar pacote" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pacote..." border="none" _focus={{boxShadow:"none"}} px={0} h="36px" fontSize="12px"/></Flex>
      <Box as="select" aria-label="Situação dos pacotes" value={status} onChange={e => setStatus(e.target.value)} h="38px" px={3} bg="white" border="1px solid #cfd9d7" borderRadius="8px" fontSize="12px">
        <option value="all">Todas as situações</option><option value="active">Ativos</option><option value="inactive">Inativos</option>
      </Box>
    </Flex>
    {notice && <Text role="status" fontSize="12px" color="#08715c">{notice}</Text>}
    {loading ? <Flex align="center" justify="center" gap={2} py={8}><Spinner color="#0b6b5b"/><Text fontSize="12px">Carregando pacotes...</Text></Flex> : error ?
      <Box role="alert" bg="white" border="1px solid #efc6c6" p={4} borderRadius="10px"><Text fontSize="13px" color="#b4232b">{error}</Text></Box> :
      <Box bg="white" border="1px solid #dbe6e2" borderRadius="10px" overflow="hidden">
        {visible.length === 0 ? <Text p={5} fontSize="13px" color="#607873">{plans.length ? "Nenhum pacote corresponde aos filtros." : "Nenhum modelo cadastrado. Crie um novo pacote."}</Text> :
          <Box overflowX="auto"><Box as="table" w="100%" minW="610px" style={{borderCollapse:"collapse"}} fontSize="12px">
            <Box as="thead" bg="#f3f8f6" color="#315650"><Box as="tr">{["Pacote","Aulas","Valor total","Valor por aula","Situação","Ações"].map(label => <Box as="th" key={label} scope="col" textAlign="left" px={3} py={3}>{label}</Box>)}</Box></Box>
            <Box as="tbody">{visible.map(plan => <Box as="tr" key={plan.id} borderTop="1px solid #edf2f0" _hover={{bg:"#f5faf8"}}>
              <Box as="td" px={3} py={3} fontWeight="700" color="#19473f" overflowWrap="anywhere">{plan.name}</Box>
              <Box as="td" px={3} py={3}>{plan.lessonCount}</Box><Box as="td" px={3} py={3} whiteSpace="nowrap" fontWeight="600">{money(plan.amount)}</Box>
              <Box as="td" px={3} py={3} whiteSpace="nowrap">{money(plan.amount / plan.lessonCount)}</Box>
              <Box as="td" px={3} py={3}><Badge bg={plan.active ? "#dff5e6" : "#edf1f2"} color={plan.active ? "#14833b" : "#637673"}>{plan.active ? "Ativo" : "Inativo"}</Badge></Box>
              <Box as="td" px={3} py={3}><Button type="button" size="xs" variant="ghost" aria-label={`Editar ${plan.name}`} onClick={() => {setNotice("");setSelected(plan);}}><FiEdit2/> Editar</Button></Box>
            </Box>)}</Box>
          </Box></Box>}
      </Box>}
    {selected && <PackageDialog key={selected === "new" ? "new" : selected.id} selected={selected} onClose={() => setSelected(null)} onSaved={saved}/>}
  </VStack>;
}
