import { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Heading, Input, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiCalendar, FiRefreshCw } from "react-icons/fi";
import service from "../../services/privateLessonPackagesServices.js";
import { buildSchedulePayload, conflictDetails, defaultEnd, displayLessonTime, lessonActions, lessonLabels, scheduleJournal, schoolLocal } from "./privateLessonSchedulingView.js";

const field={h:"38px",fontSize:"13px",borderColor:"#cfd9d7"};
const label={display:"block",fontSize:"12px",fontWeight:700,color:"#315650",mb:1};
const actionLabels={completed:"Confirmar realização",absent:"Registrar falta",cancelled:"Cancelar aula",reschedule:"Reagendar"};
const colors={scheduled:"#285e9b",completed:"#08715c",absent:"#795318",cancelled:"#a62e38"};
const emptyForm=()=>({start:"",end:"",count:"1",notes:""});
/* EN: Keep booking and lifecycle controls reusable for the future student profile.
   PT: Mantém controles de agendamento e situação reutilizáveis no futuro perfil do aluno. */
export default function PrivateLessonSchedulePanel({pkg,onBusy,onChanged,onStatus,disabled=false}) {
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(""),[refresh,setRefresh]=useState(0);
  const [form,setForm]=useState(emptyForm),[editing,setEditing]=useState(false),[target,setTarget]=useState(null),[confirm,setConfirm]=useState(null);
  const [pending,setPending]=useState(null),[conflicts,setConflicts]=useState([]),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const running=useRef(false);
  useEffect(()=>{
    const ctrl=new AbortController();setLoading(true);setLoadError("");setData(null);
    try {setPending(scheduleJournal(window.sessionStorage,pkg.id).read());} catch(err){setLoadError(err.message||"Não foi possível recuperar a agenda pendente.");setLoading(false);return ()=>ctrl.abort();}
    service.getLessons(pkg.id,{signal:ctrl.signal}).then(result=>{if(!ctrl.signal.aborted){setData(result);onStatus?.(result.packageStatus);}})
      .catch(err=>{if(!ctrl.signal.aborted)setLoadError(err.message||"Não foi possível consultar as aulas.");})
      .finally(()=>{if(!ctrl.signal.aborted)setLoading(false);});
    return ()=>ctrl.abort();
  },[pkg.id,refresh]);
  const reload=()=>{setConflicts([]);setError("");setRefresh(n=>n+1);};
  const closeForm=()=>{setEditing(false);setTarget(null);setForm(emptyForm());setConfirm(null);};
  const locked=disabled||saving||!!pending||loading;
  const startForm=(lesson=null)=>{setError("");setNotice("");setConfirm(null);setTarget(lesson);setForm(lesson?{start:schoolLocal(lesson.startsAt),end:schoolLocal(lesson.endsAt),count:"1",notes:lesson.notes??""}:emptyForm());setEditing(true);};
  const changeStart=value=>setForm(old=>({...old,start:value,end:defaultEnd(value,target?(Date.parse(target.endsAt)-Date.parse(target.startsAt))/60000:60)}));
  const submit=async(op,retry=false)=>{
    if(running.current||disabled||loading||!data)return;
    setError("");setNotice("");setConflicts([]);
    let journal;
    try {journal=scheduleJournal(window.sessionStorage,pkg.id);journal.save(op);}catch(err){setError("Não foi possível guardar a operação antes do envio. "+err.message);return;}
    running.current=true;setSaving(true);onBusy?.(true);setPending(op);
    try {
      const result=await service.mutateLesson(pkg.id,op);
      journal.clear();setPending(null);closeForm();setNotice(result.replayed?"Operação anterior confirmada sem duplicação.":"Agenda atualizada com sucesso.");
      if(result.packageStatus)onStatus?.(result.packageStatus);
      setLoading(true);setRefresh(n=>n+1);onChanged?.();
    } catch(err){
      const found=conflictDetails(err);
      if(found.length&&!op.data.allowConflicts){setConflicts(found);setError("Revise os conflitos antes de confirmar.");}
      else if(!retry&&[400,403,404,409,422].includes(err.status)){
        try{journal.clear();setPending(null);setError(err.message);setConfirm(null);}catch{setError("Não foi possível limpar a operação. Confira a agenda antes de prosseguir.");}
      }else setError("Operação não confirmada. Consulte a agenda e reenvie a mesma operação, sem criar outra. "+(err.message||""));
    } finally{running.current=false;setSaving(false);onBusy?.(false);}
  };
  const saveForm=e=>{e.preventDefault();if(locked)return;try{const payload=buildSchedulePayload(form,pkg,data,target,globalThis.crypto.randomUUID());submit({kind:target?"reschedule":payload.count?"recurring":"single",...(target?{lessonId:target.id}:{}),data:payload});}catch(err){setError(err.message);}};
  const rejectConflicts=()=>{try{scheduleJournal(window.sessionStorage,pkg.id).clear();setPending(null);setConflicts([]);setError("");}catch(err){setError(err.message);}};
  const action=(lesson,status)=>{if(status==="reschedule")startForm(lesson);else{closeForm();setConfirm({lesson,status});setError("");setNotice("");}};
  return <Box borderTop="1px solid #e5ece9" pt={3}>
    <Flex align="center" justify="space-between" wrap="wrap" gap={2}><Heading fontSize="15px" color="#075749">Aulas e agendamentos</Heading><Button type="button" size="xs" variant="ghost" disabled={loading||saving||disabled} onClick={reload}><FiRefreshCw/> Atualizar</Button></Flex>
    {notice&&<Text role="status" fontSize="12px" color="#08715c" mt={2}>{notice}</Text>}
    {loading?<Flex align="center" gap={2} py={3}><Spinner size="sm" color="#075749"/><Text fontSize="12px">Consultando aulas...</Text></Flex>:loadError?<Text role="alert" fontSize="12px" color="#b4232b" mt={2}>{loadError}</Text>:data&&<VStack align="stretch" gap={3} mt={3}>
      <SimpleGrid columns={{base:2,sm:4}} gap={2} bg="#f3f8f6" borderRadius="8px" p={3}>{[["Contratadas",data.lessonCount],["Realizadas",data.completedCount],["Agendadas",data.scheduledCount],["Livres para agendar",data.availableToSchedule]].map(([title,value])=><Box key={title}><Text fontSize="11px" color="#607873">{title}</Text><Heading fontSize="18px" color="#075749">{value}</Heading></Box>)}</SimpleGrid>
      <Box h="7px" bg="#e5ece9" borderRadius="full" overflow="hidden"><Flex h="100%"><Box bg="#09695b" w={`${data.completedCount/data.lessonCount*100}%`}/><Box bg="#397dba" w={`${data.scheduledCount/data.lessonCount*100}%`}/></Flex></Box>
      <Text fontSize="11px" color="#607873">{data.remainingCount} aula(s) não realizadas · {data.absentCount} falta(s) · {data.cancelledCount} cancelamento(s). Horários de São Paulo.</Text>
      {pkg.financial?.outstandingAmount>0&&<Text color="#795318" fontSize="12px">Existe saldo financeiro em aberto. Isso não impede as aulas.</Text>}
      {data.packageStatus==="active"&&data.availableToSchedule>0&&!editing&&!confirm&&!pending&&<Button size="sm" alignSelf="start" bg="#0b6b5b" color="white" disabled={locked} onClick={()=>startForm()}><FiCalendar/> Agendar aula</Button>}
      {pending?<Box border="1px solid #e3bc79" borderRadius="8px" p={3}>
        <Text fontSize="12px" fontWeight="700" color="#795318">{conflicts.length?"Conflito de horários":"Operação pendente de confirmação"}</Text>
        {pending.kind==="status"?<Text fontSize="12px">{actionLabels[pending.data.status]} · aula {pending.lessonId}</Text>:<Text fontSize="12px">{displayLessonTime(pending.data.startsAt)} – {displayLessonTime(pending.data.endsAt)} · {pending.data.count??1} aula(s)</Text>}
        {conflicts.length?<><VStack align="stretch" gap={2} my={2} maxH="200px" overflowY="auto">{conflicts.map((c,i)=><Box key={i} border="1px solid #e3bc79" p={2} borderRadius="6px"><Text fontSize="12px">Novo: {displayLessonTime(c.requestedStartsAt)} – {displayLessonTime(c.requestedEndsAt)}</Text><Text fontSize="12px">Existente: {displayLessonTime(c.startsAt)} – {displayLessonTime(c.endsAt)}</Text></Box>)}</VStack><Flex gap={2} wrap="wrap"><Button size="sm" variant="outline" disabled={saving||disabled} onClick={rejectConflicts}>Revisar horários</Button><Button size="sm" colorPalette="teal" disabled={saving||disabled} onClick={()=>submit({...pending,data:{...pending.data,allowConflicts:true}},true)}>Agendar mesmo assim</Button></Flex></>:<><Text fontSize="11px" color="#607873">Confira a agenda. Reenvie a mesma operação para evitar duplicação. Não crie outro agendamento para substituí-la.</Text><Button mt={2} size="sm" colorPalette="teal" disabled={saving||disabled} onClick={()=>submit(pending,true)}>Reenviar mesma operação</Button></>}
      </Box>:editing?<Box as="form" onSubmit={saveForm} border="1px solid #dbe6e2" borderRadius="8px" p={3}><VStack align="stretch" gap={3}>
        <Heading fontSize="14px" color="#075749">{target?"Reagendar aula":"Novo agendamento"}</Heading>
        <SimpleGrid columns={{base:1,sm:2}} gap={3}><Box><Text as="label" htmlFor="lesson-start" {...label}>Início</Text><Input id="lesson-start" type="datetime-local" {...field} value={form.start} min={`${pkg.contractedOn}T00:00`} onChange={e=>changeStart(e.target.value)} disabled={locked} required/></Box><Box><Text as="label" htmlFor="lesson-end" {...label}>Término</Text><Input id="lesson-end" type="datetime-local" {...field} value={form.end} onChange={e=>setForm(old=>({...old,end:e.target.value}))} disabled={locked} required/></Box></SimpleGrid>
        {!target&&<Box><Text as="label" htmlFor="lesson-count" {...label}>Quantidade de aulas (repetição semanal)</Text><Input id="lesson-count" type="number" min={1} max={Math.min(100,data.availableToSchedule)} step={1} {...field} value={form.count} onChange={e=>setForm(old=>({...old,count:e.target.value}))} disabled={locked} required/><Text fontSize="11px" color="#607873">1 = agendamento individual. Acima de 1, repete a cada sete dias.</Text></Box>}
        <Box><Text as="label" htmlFor="lesson-notes" {...label}>Observações</Text><Box as="textarea" id="lesson-notes" rows={2} w="100%" p={2} border="1px solid #cfd9d7" borderRadius="8px" fontSize="13px" maxLength={1000} value={form.notes} onChange={e=>setForm(old=>({...old,notes:e.target.value}))} disabled={locked}/></Box>
        <Flex justify="end" gap={2}><Button type="button" size="sm" variant="outline" disabled={locked} onClick={closeForm}>Cancelar</Button><Button type="submit" size="sm" bg="#0b6b5b" color="white" disabled={locked}>{target?"Reagendar":"Agendar"}</Button></Flex>
      </VStack></Box>:confirm?<Box border="1px solid #dbe6e2" borderRadius="8px" p={3}><Text fontSize="13px" fontWeight="700">{actionLabels[confirm.status]}?</Text><Text fontSize="12px">{displayLessonTime(confirm.lesson.startsAt)}. {confirm.status==="completed"?"Consome uma aula e não pode ser revertida diretamente.":"Não consome crédito do pacote."}</Text><Flex mt={2} gap={2} wrap="wrap"><Button size="sm" variant="outline" disabled={locked} onClick={()=>setConfirm(null)}>Voltar</Button><Button size="sm" colorPalette={confirm.status==="cancelled"?"red":"teal"} disabled={locked} onClick={()=>submit({kind:"status",lessonId:confirm.lesson.id,data:{status:confirm.status}})}>Confirmar</Button></Flex></Box>:null}
      {error&&<Text role="alert" color="#b4232b" fontSize="12px">{error}</Text>}
      <Heading fontSize="13px" color="#315650">Histórico de aulas</Heading>
      {!data.lessons.length?<Text fontSize="12px" color="#607873">Nenhuma aula registrada.</Text>:data.lessons.map(l=>{const replacement=data.lessons.find(x=>x.rescheduledFromId===l.id);const original=data.lessons.find(x=>x.id===l.rescheduledFromId);return <Box key={l.id} border="1px solid #dbe6e2" borderRadius="8px" p={3}><Flex justify="space-between" gap={2} wrap="wrap"><Text fontSize="13px" fontWeight="600" color="#173c37">{displayLessonTime(l.startsAt)} – {displayLessonTime(l.endsAt)}</Text><Text fontSize="12px" color={colors[l.status]} fontWeight="600">{lessonLabels[l.status]}</Text></Flex>{l.seriesCount&&<Text fontSize="11px" color="#607873">Recorrência {l.seriesIndex+1}/{l.seriesCount}</Text>}{replacement&&<Text fontSize="11px" color="#607873">Reagendada para {displayLessonTime(replacement.startsAt)}</Text>}{original&&<Text fontSize="11px" color="#607873">Reposição de {displayLessonTime(original.startsAt)}</Text>}{l.notes&&<Text fontSize="12px" whiteSpace="pre-wrap" overflowWrap="anywhere">{l.notes}</Text>}<Flex mt={2} gap={1} wrap="wrap">{lessonActions(l,data).map(a=><Button key={a} type="button" size="xs" variant="outline" disabled={locked||editing||!!confirm} onClick={()=>action(l,a)}>{actionLabels[a]}</Button>)}</Flex></Box>;})}
    </VStack>}
  </Box>;
}
