import PrivateLessonCancellationPanel from "./PrivateLessonCancellationPanel.jsx";
import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Dialog, Flex, Heading, HStack, Input, Portal, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiCalendar, FiCheckCircle, FiDollarSign, FiEye, FiLayers, FiPlus, FiRefreshCw, FiSearch, FiUsers } from "react-icons/fi";
import { summarizeFinancialPackages, paymentStatusLabel } from "./privateLessonFinancialView.js";
import PrivateLessonSchedulePanel from "./PrivateLessonSchedulePanel.jsx";
import PrivateLessonPaymentPanel from "./PrivateLessonPaymentPanel.jsx";
import PrivateLessonPurchaseDialog from "./PrivateLessonPurchaseDialog.jsx";
import service from "../../services/privateLessonPackagesServices.js";
import { displayDate, emptyFilters, filterPackages, money, packageStatus, participantsOf, participantName, summarizePackages, validPeriod } from "./privateLessonPackagesView.js";

/* EN: Follow the compact indicator style used in Financial Overview.
   PT: Segue o padrão compacto de indicadores da Visão Geral financeira. */
function StatCard({ icon: Icon, title, value, caption }) {
  return <Box bg="linear-gradient(145deg, #ffffff 65%, #eff9f3 125%)" border="1px solid #e1e9e7" borderRadius="12px" p={{base:3,md:4}} minW={0} boxShadow="0 3px 12px rgba(7,63,51,0.04)">
    <HStack gap={2} mb={3}><Flex flexShrink={0} w="29px" h="29px" align="center" justify="center" borderRadius="full" color="#0a7650" bg="#eff9f3"><Icon size={17}/></Flex><Text fontSize={{base:"11px",md:"12px"}} fontWeight="600" color="#213b33">{title}</Text></HStack>
    <Heading fontSize={{base:"18px",md:"21px"}} color="#075749" fontWeight="800" overflowWrap="anywhere">{value}</Heading>
    <Text mt={2} fontSize="10px" color="#607873">{caption}</Text>
  </Box>;
}
function StatusBadge({ status }) {
  const style = packageStatus(status);
  return <Badge color={style.color} bg={style.bg} borderRadius="full" px={2} py={1} fontSize="10px">{style.label}</Badge>;
}
function Participants({ row }) {
  const people = participantsOf(row);
  return people.length ? <VStack align="start" gap={1}>{people.map(p => <Box key={p.id} minW={0}>
    <Text fontSize="12px" color="#173c37" overflowWrap="anywhere">{participantName(p)}</Text>
    {p.registration != null && p.registration !== "" && <Text fontSize="10px" color="#607873">Matrícula: {p.registration}</Text>}
  </Box>)}</VStack> : <Text fontSize="12px" color="#607873">—</Text>;
}
function Info({ label, children }) {
  return <Box minW={0}><Text fontSize="11px" color="#607873" mb={1}>{label}</Text><Text fontSize="13px" fontWeight="600" color="#173c37" overflowWrap="anywhere">{children}</Text></Box>;
}

/* EN: Fetch a fresh detail on open and abort when the dialog closes.
   PT: Consulta detalhes atualizados ao abrir e cancela a requisição ao fechar. */
function PackageDetails({ id, onClose, onChanged }) {
  const [row, setRow] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [detailRevision,setDetailRevision]=useState(0);
  const busy = paymentBusy || scheduleBusy || cancelBusy;
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    service.get(id, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setRow(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || "Não foi possível consultar o pacote."); });
    return () => controller.abort();
  }, [id]);
  return <Dialog.Root open onOpenChange={e => { if (!e.open && !busy) onClose(); }} placement="center" size="lg" closeOnEscape={!busy} closeOnInteractOutside={!busy}>
    <Portal><Dialog.Backdrop/><Dialog.Positioner><Dialog.Content mx={3} maxH="90dvh" borderRadius="12px" overflow="hidden">
      <Dialog.Header borderBottom="1px solid #e5ece9"><Dialog.Title color="#103c35" fontSize="17px">Detalhes da contratação</Dialog.Title></Dialog.Header>
      <Dialog.Body overflowY="auto" py={4}>
        {error ? <Text role="alert" color="#b4232b" fontSize="13px">{error}</Text> : !row ? <Flex align="center" gap={2}><Spinner color="#075749"/><Text fontSize="12px">Carregando...</Text></Flex> : <VStack align="stretch" gap={4}>
          <Flex align="center" justify="space-between" gap={2} wrap="wrap"><Heading fontSize="17px" color="#075749" overflowWrap="anywhere">{row.name}</Heading><StatusBadge status={row.status}/></Flex>
          <SimpleGrid columns={2} gap={4}><Info label="Data da contratação">{displayDate(row.contractedOn)}</Info><Info label="Tipo">{row.planId ? "Pacote padrão" : "Personalizado"}</Info><Info label="Aulas contratadas">{row.lessonCount}</Info><Info label="Valor contratado">{money(row.amount)}</Info><Info label="Valor por aula">{money(row.amount / row.lessonCount)}</Info></SimpleGrid>
          <Box borderTop="1px solid #e5ece9" pt={3}><Text fontSize="12px" fontWeight="700" color="#315650" mb={2}>Participantes</Text><Participants row={row}/></Box>
          <Box><Text fontSize="12px" fontWeight="700" color="#315650" mb={1}>Observações</Text><Text fontSize="13px" color="#173c37" whiteSpace="pre-wrap" overflowWrap="anywhere">{row.notes || "Nenhuma observação."}</Text></Box>
          <PrivateLessonSchedulePanel key={`schedule-${detailRevision}`} pkg={row} disabled={paymentBusy||cancelBusy} onBusy={setScheduleBusy} onChanged={onChanged} onStatus={status=>setRow(old=>old && old.status!==status?{...old,status}:old)}/>
          <PrivateLessonPaymentPanel key={`payment-${detailRevision}`} pkg={row} onBusy={setPaymentBusy} onChanged={onChanged} onFinancial={financial=>setRow(old=>old?{...old,financial}:old)} disabled={scheduleBusy||cancelBusy}/>
          <PrivateLessonCancellationPanel pkg={row} disabled={paymentBusy||scheduleBusy} onBusy={setCancelBusy} onCancelled={result=>{setRow(old=>({...old,status:result.packageStatus,cancelledAt:result.cancelledAt,cancellationReason:result.reason}));setDetailRevision(n=>n+1);onChanged();}}/>
        </VStack>}
      </Dialog.Body><Dialog.Footer borderTop="1px solid #e5ece9"><Button size="sm" variant="outline" disabled={busy} onClick={onClose}>Fechar</Button></Dialog.Footer>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}

const headers = ["Pacote", "Participantes", "Contratação", "Aulas contratadas", "Valor contratado", "Recebido líquido", "Em aberto", "Pagamento", "Situação", "Ações"];
const cell = { padding: "12px", verticalAlign: "top", textAlign: "left" };
export default function PrivateLessonsPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [selected, setSelected] = useState(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  /* EN: A failed or obsolete request never appears as an empty successful list.
     PT: Consulta com falha ou obsoleta nunca aparece como uma lista vazia bem-sucedida. */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setRows([]);
    service.list({ signal: controller.signal }).then(data => { if (!controller.signal.aborted) setRows(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || "Não foi possível carregar as contratações."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  const visible = useMemo(() => filterPackages(rows, filters), [rows, filters]);
  const summary = useMemo(() => summarizePackages(visible), [visible]);
  const financial = useMemo(() => { try { return {data:summarizeFinancialPackages(visible),error:""}; } catch(err) { return {data:null,error:err.message}; } }, [visible]);
  const periodOK = validPeriod(filters);
  const showSummary = !loading && !error && periodOK;
  const change = (key, value) => setFilters(old => ({ ...old, [key]: value }));
  const reload = () => { setLoading(true); setRefresh(n => n + 1); };
  const saved = (row, preview) => {
    setPurchaseOpen(false); setFilters(emptyFilters());
    const changed = preview && (row.amount !== preview.amount || row.lessonCount !== preview.lessonCount);
    setNotice(changed ? "Pacote contratado com o preço ou quantidade vigente no servidor, diferente da prévia. Confira os detalhes." : "Pacote contratado com sucesso.");
    reload();
  };
  return <VStack align="stretch" gap={3} w="100%" minW={0} bg="var(--app-background)" pb={7} pr={4}>
    <Flex justify="space-between" align={{base:"flex-start",md:"center"}} gap={3} wrap="wrap">
      <HStack gap={3}><Flex w="39px" h="39px" flexShrink={0} bg="#064e43" borderRadius="full" align="center" justify="center" color="white"><FiCalendar size={20}/></Flex>
        <Box><Heading fontSize={{base:"18px",md:"22px"}} color="#062f2b">Aulas particulares</Heading><Text fontSize="11px" color="#607873">Acompanhe os pacotes contratados e seus participantes</Text></Box></HStack>
      <Flex gap={2} wrap="wrap"><Button size="sm" variant="outline" onClick={reload} disabled={loading}><FiRefreshCw/> Atualizar</Button><Button size="sm" bg="#0b6b5b" color="white" disabled={loading || !!error} onClick={()=>{setNotice("");setPurchaseOpen(true);}}><FiPlus/> Novo pacote</Button></Flex>
    </Flex>
    {notice && <Text role="status" fontSize="12px" color="#315650">{notice}</Text>}
    <SimpleGrid columns={{base:2,xl:4}} gap={3}>
      <StatCard icon={FiLayers} title="Pacotes contratados" value={showSummary ? summary.count : "—"} caption="Todos os pacotes no filtro"/>
      <StatCard icon={FiCheckCircle} title="Pacotes ativos" value={showSummary ? summary.active : "—"} caption="Contratações em andamento"/>
      <StatCard icon={FiUsers} title="Participantes ativos" value={showSummary ? summary.participants : "—"} caption="Pessoas distintas em pacotes ativos"/>
      <StatCard icon={FiDollarSign} title="Valor contratado" value={showSummary ? money(summary.contractedAmount) : "—"} caption="Ativos e concluídos; não é valor recebido"/>
    </SimpleGrid>
    <SimpleGrid columns={{base:2,xl:3}} gap={3}>
      <StatCard icon={FiDollarSign} title="Recebido líquido" value={showSummary && financial.data ? money(financial.data.received) : "—"} caption="Recebimentos menos devoluções nos pacotes filtrados"/>
      <StatCard icon={FiDollarSign} title="Valor em aberto" value={showSummary && financial.data ? money(financial.data.outstanding) : "—"} caption="Pacotes ativos e concluídos"/>
      <StatCard icon={FiLayers} title="Pacotes com pendência" value={showSummary && financial.data ? financial.data.pendingCount : "—"} caption="Ativos e concluídos com saldo"/>
    </SimpleGrid>
    {showSummary && financial.error && <Text role="alert" color="#b4232b" fontSize="12px">{financial.error}</Text>}
    <Text fontSize="11px" color="#607873">O período filtra a contratação, não a data do recebimento. Para fluxo de caixa por data, consulte o Financeiro.</Text>
    <HStack gap={3} px={1} mt={2}><Flex w="38px" h="38px" flexShrink={0} bg="#e9f6f1" color="#075749" borderRadius="12px" align="center" justify="center"><FiLayers size={20}/></Flex><Box><Heading as="h2" fontSize={{base:"19px",md:"23px"}} color="#075749" fontWeight="800">Pacotes contratados</Heading><Text fontSize="12px" color="#607873">Os indicadores acompanham os filtros selecionados.</Text></Box></HStack>
    <Flex bg="white" border="1px solid #dbe6e2" borderRadius="10px" p={3} gap={3} align="end" wrap="wrap">
      <Box flex="1 1 200px" minW={0}><Text as="label" htmlFor="private-search" fontSize="11px" fontWeight="600" color="#315650">Buscar</Text><HStack px={2} border="1px solid #cfd9d7" borderRadius="8px" gap={2}><FiSearch color="#78918b"/><Input id="private-search" value={filters.search} onChange={e => change("search", e.target.value)} placeholder="Aluno, matrícula ou pacote" h="36px" border="none" px={0} fontSize="12px"/></HStack></Box>
      <Box flex="1 1 140px"><Text as="label" htmlFor="private-status" fontSize="11px" fontWeight="600" color="#315650">Situação</Text><Box as="select" id="private-status" display="block" w="100%" h="38px" px={2} border="1px solid #cfd9d7" borderRadius="8px" fontSize="12px" bg="white" value={filters.status} onChange={e => change("status", e.target.value)}><option value="all">Todas</option><option value="active">Ativos</option><option value="completed">Concluídos</option><option value="cancelled">Cancelados</option></Box></Box>
      {[["from","Contratação de"],["to","Contratação até"]].map(([key,label]) => <Box key={key} flex="1 1 140px"><Text as="label" htmlFor={`private-${key}`} fontSize="11px" color="#315650" fontWeight="600">{label}</Text><Input id={`private-${key}`} type="date" value={filters[key]} onChange={e => change(key,e.target.value)} h="38px" fontSize="12px" borderColor="#cfd9d7"/></Box>)}
      <Button size="sm" variant="outline" onClick={() => setFilters(emptyFilters())}>Limpar filtros</Button>
    </Flex>
    {!periodOK && <Text role="alert" fontSize="12px" color="#b4232b">A data inicial deve ser anterior ou igual à final.</Text>}
    <Box bg="white" border="1px solid #dbe6e2" borderRadius="12px" overflow="hidden" boxShadow="0 3px 12px rgba(7,63,51,0.04)">
      {loading ? <Flex align="center" justify="center" gap={2} p={8}><Spinner color="#075749"/><Text fontSize="12px">Carregando contratações...</Text></Flex> : error ? <VStack align="center" p={6}><Text role="alert" color="#b4232b" fontSize="13px" textAlign="center">{error}</Text><Button size="sm" variant="outline" onClick={reload}>Tentar novamente</Button></VStack> : !periodOK ? null : !visible.length ? <Box p={8} textAlign="center"><Text fontSize="13px" fontWeight="600" color="#315650">{rows.length ? "Nenhum pacote corresponde aos filtros." : "Nenhum pacote contratado."}</Text><Text mt={1} fontSize="12px" color="#607873">{rows.length ? "Altere os filtros para visualizar outras contratações." : "Os pacotes aparecerão aqui após a contratação."}</Text></Box> : <Box overflowX="auto"><Box as="table" w="100%" minW="1130px" fontSize="12px" style={{borderCollapse:"collapse"}}><thead><tr>{headers.map(title => <th scope="col" key={title} style={{...cell,background:"#f3f8f6",color:"#315650",fontWeight:700}}>{title}</th>)}</tr></thead><tbody>{visible.map(row => <tr key={row.id} style={{borderTop:"1px solid #e5ece9"}}><td style={cell}><Text color="#075749" fontWeight="700" overflowWrap="anywhere">{row.name}</Text><Text fontSize="10px" color="#607873">{row.planId ? "Padrão" : "Personalizado"}</Text></td><td style={cell}><Participants row={row}/></td><td style={cell}>{displayDate(row.contractedOn)}</td><td style={cell}>{row.lessonCount}</td><td style={cell}>{money(row.amount)}</td><td style={cell}>{financial.data ? money(row.financial.paidAmount) : "—"}</td><td style={cell}>{financial.data && row.status!=="cancelled" ? money(row.financial.outstandingAmount) : "—"}</td><td style={cell}>{financial.data ? (row.status==="cancelled"?"Encerrado":paymentStatusLabel(row.financial.paymentStatus)) : "—"}</td><td style={cell}><StatusBadge status={row.status}/></td><td style={cell}><Button variant="ghost" size="xs" aria-label={`Ver detalhes de ${row.name}`} onClick={() => setSelected(row.id)}><FiEye/> Detalhes</Button></td></tr>)}</tbody></Box></Box>}
    </Box>
    {showSummary && <Text fontSize="11px" color="#607873" role="status">{visible.length} de {rows.length} pacotes</Text>}
    {purchaseOpen && <PrivateLessonPurchaseDialog onClose={()=>setPurchaseOpen(false)} onSaved={saved} onUncertain={()=>{setPurchaseOpen(false);setNotice("Confira se a contratação foi gravada antes de tentar novamente.");setFilters(emptyFilters());reload();}}/>}
    {selected && <PackageDetails key={selected} id={selected} onClose={() => setSelected(null)} onChanged={reload}/>}
  </VStack>;
}
