import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Dialog, Flex, Heading, Input, Portal, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";
import service from "../../services/privateLessonPackagesServices.js";
import plansService from "../../services/privateLessonPlansServices.js";
import { money } from "./privateLessonPackagesView.js";
import { buildPurchasePayload, emptyPurchase, filterParticipants, purchasePreview, uncertainPurchase } from "./privateLessonPurchaseForm.js";

const inputProps = { h:"38px", fontSize:"13px", borderColor:"#cfd9d7" };
function Label({ id, children }) { return <Text as="label" htmlFor={id} display="block" fontSize="12px" fontWeight="700" color="#315650" mb={1}>{children}</Text>; }
const person = u => `${u?.name || "Usuário sem nome"}${u?.registration ? ` · ${u.registration}` : ""}`;

/* EN: Shared purchase form, no payment or scheduling side effects.
   PT: Formulário de contratação reutilizável, sem efeitos financeiros ou de agenda. */
export default function PrivateLessonPurchaseDialog({ onClose, onSaved, onUncertain }) {
  const [form,setForm] = useState(emptyPurchase);
  const [users,setUsers] = useState([]), [plans,setPlans] = useState([]);
  const [search,setSearch] = useState(""), [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState(""), [error,setError] = useState("");
  const [saving,setSaving] = useState(false), [uncertain,setUncertain] = useState(false), [refresh,setRefresh] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError("");
    Promise.all([service.listParticipants({signal:controller.signal}),plansService.list({active:true,signal:controller.signal})])
      .then(([people,models]) => { if (!controller.signal.aborted) { setUsers(people); setPlans(models.filter(p=>p.active===true)); } })
      .catch(err=>{if(!controller.signal.aborted) setLoadError(err.message || "Não foi possível carregar os dados.");})
      .finally(()=>{if(!controller.signal.aborted) setLoading(false);});
    return ()=>controller.abort();
  },[refresh]);
  const set = (key,value) => setForm(old=>({...old,[key]:value}));
  const candidates = useMemo(()=>filterParticipants(users,search,form.participantIds),[users,search,form.participantIds]);
  const preview = purchasePreview(form,plans);
  const locked = saving || uncertain;
  const close = () => { if (!pending.current) { if (uncertain) onUncertain(); else onClose(); } };
  const submit = async event => {
    event.preventDefault();
    if (pending.current || uncertain || loading || loadError) return;
    setError("");
    let data;
    try { data = buildPurchasePayload(form,plans,users); } catch(err) { setError(err.message); return; }
    pending.current = true; setSaving(true);
    try {
      const row = await service.create(data);
      onSaved(row, preview);
    } catch(err) {
      const unknown = uncertainPurchase(err);
      setUncertain(unknown);
      setError(unknown ? "Não foi possível confirmar a gravação. Feche e confira a lista antes de tentar novamente, para evitar duplicação." : err.message);
    } finally { pending.current = false; setSaving(false); }
  };
  return <Dialog.Root open onOpenChange={e=>{if(!e.open)close();}} placement="center" size="lg" closeOnEscape={!saving} closeOnInteractOutside={!saving}>
    <Portal><Dialog.Backdrop/><Dialog.Positioner><Dialog.Content mx={3} maxH="90dvh" borderRadius="12px" overflow="hidden">
      <Dialog.Header borderBottom="1px solid #e5ece9"><Dialog.Title fontSize="17px" color="#103c35">Nova contratação de aulas particulares</Dialog.Title></Dialog.Header>
      <Box as="form" onSubmit={submit} display="flex" flexDirection="column" minH={0}>
        <Dialog.Body overflowY="auto" py={4}>
          {loading ? <Flex align="center" gap={2}><Spinner color="#075749"/><Text fontSize="13px">Carregando participantes e modelos...</Text></Flex> : loadError ? <VStack align="start"><Text role="alert" color="#b4232b" fontSize="13px">{loadError}</Text><Button type="button" size="sm" variant="outline" onClick={()=>setRefresh(n=>n+1)}>Tentar novamente</Button></VStack> : <VStack align="stretch" gap={4}>
            <Box><Label id="purchase-search">Participantes cadastrados</Label><Input {...inputProps} id="purchase-search" placeholder="Buscar por nome ou matrícula" value={search} onChange={e=>setSearch(e.target.value)} disabled={locked}/>
              <Text fontSize="11px" color="#607873" my={2}>{form.participantIds.length} selecionado(s). O valor é único para todos.</Text>
              {form.participantIds.map(id=><Flex key={id} align="center" justify="space-between" border="1px solid #dbe6e2" borderRadius="8px" p={2} mb={1}><Text fontSize="12px" overflowWrap="anywhere">{person(users.find(u=>u.id===id))}</Text><Button type="button" variant="ghost" size="xs" disabled={locked} aria-label={`Remover ${person(users.find(u=>u.id===id))}`} onClick={()=>setForm(old=>({...old,participantIds:old.participantIds.filter(v=>v!==id)}))}><FiX/></Button></Flex>)}
              <Box maxH="150px" overflowY="auto" border="1px solid #dbe6e2" borderRadius="8px" p={1}>
                {!candidates.length ? <Text p={2} fontSize="12px" color="#607873">Nenhum usuário disponível para esta busca.</Text> : candidates.map(u=><Button key={u.id} type="button" variant="ghost" size="sm" justifyContent="space-between" w="100%" whiteSpace="normal" h="auto" py={2} disabled={locked} onClick={()=>setForm(old=>old.participantIds.includes(u.id)?old:{...old,participantIds:[...old.participantIds,u.id]})}><Text textAlign="left" fontSize="12px">{person(u)}</Text><FiPlus/></Button>)}
              </Box>
            </Box>
            <Box><Label id="purchase-plan">Modelo de pacote</Label><Box as="select" id="purchase-plan" display="block" w="100%" px={2} border="1px solid #cfd9d7" borderRadius="8px" {...inputProps} bg="white" value={form.planId} onChange={e=>set("planId",e.target.value)} disabled={locked}><option value="">Selecione...</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name} — {p.lessonCount} aula(s) — {money(p.amount)}</option>)}<option value="custom">Personalizado</option></Box></Box>
            {form.planId==="custom" && <><Box><Label id="purchase-name">Nome do pacote</Label><Input {...inputProps} id="purchase-name" maxLength={70} value={form.name} onChange={e=>set("name",e.target.value)} disabled={locked}/></Box><SimpleGrid columns={{base:1,sm:2}} gap={3}><Box><Label id="purchase-count">Quantidade de aulas</Label><Input {...inputProps} id="purchase-count" inputMode="numeric" value={form.lessonCount} onChange={e=>set("lessonCount",e.target.value)} disabled={locked}/></Box><Box><Label id="purchase-amount">Valor total (R$)</Label><Input {...inputProps} id="purchase-amount" inputMode="decimal" value={form.amount} onChange={e=>set("amount",e.target.value)} disabled={locked}/></Box></SimpleGrid></>}
            <SimpleGrid columns={2} gap={3} bg="#f3f8f6" p={3} border="1px solid #dbe6e2" borderRadius="10px"><Box><Text fontSize="12px" color="#607873">Valor contratado</Text><Heading fontSize="20px" color="#075749">{preview?money(preview.amount):"—"}</Heading></Box><Box><Text fontSize="12px" color="#607873">Valor por aula</Text><Heading fontSize="20px" color="#075749">{preview?money(preview.amount/preview.lessonCount):"—"}</Heading></Box></SimpleGrid>
            <Box><Label id="purchase-date">Data da contratação</Label><Input {...inputProps} id="purchase-date" type="date" min="1900-01-01" max="2200-12-31" value={form.contractedOn} onChange={e=>set("contractedOn",e.target.value)} disabled={locked}/></Box>
            <Box><Label id="purchase-notes">Observações (opcional)</Label><Box as="textarea" id="purchase-notes" w="100%" rows={3} border="1px solid #cfd9d7" borderRadius="8px" p={2} fontSize="13px" maxLength={1000} value={form.notes} onChange={e=>set("notes",e.target.value)} disabled={locked}/></Box>
            <Text fontSize="11px" color="#607873">Sem validade. Nenhum pagamento ou agendamento será gerado neste cadastro. Nos modelos padrões, vale o preço vigente no servidor.</Text>
            {error && <Text role="alert" fontSize="12px" color="#b4232b">{error}</Text>}
          </VStack>}
        </Dialog.Body><Dialog.Footer borderTop="1px solid #e5ece9"><Button type="button" variant="outline" size="sm" onClick={close} disabled={saving}>{uncertain?"Fechar e conferir":"Cancelar"}</Button><Button type="submit" size="sm" bg="#0b6b5b" color="white" loading={saving} disabled={locked||loading||!!loadError}><FiCheck/> Contratar pacote</Button></Dialog.Footer>
      </Box>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}
