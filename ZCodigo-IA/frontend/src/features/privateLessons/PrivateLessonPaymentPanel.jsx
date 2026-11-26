import { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Heading, Input, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiCheck, FiRefreshCw } from "react-icons/fi";
import service from "../../services/privateLessonPackagesServices.js";
import accountsService from "../../services/financialAccountsServices.js";
import PrivateLessonPaymentHistory from "./PrivateLessonPaymentHistory.jsx";
import { money, displayDate } from "./privateLessonPackagesView.js";
import { activeAccounts, buildPaymentPayload, canReceive, emptyPayment, knownPaymentRejection, paymentJournal, paymentMatches, paymentToday, PAYMENT_METHODS } from "./privateLessonPaymentForm.js";

const field={h:"38px",fontSize:"13px",borderColor:"#cfd9d7"};
const labelStyle={display:"block",fontSize:"12px",fontWeight:700,color:"#315650",mb:1};
const statuses={pending:"Pendente",partial:"Parcial",paid:"Quitado"};
/* EN: Reusable payment panel; closing/reopening or a reload can recover an unresolved request in this tab.
   PT: Painel reutilizável; fechar, reabrir ou recarregar recupera uma operação incerta nesta aba. */
export default function PrivateLessonPaymentPanel({pkg,onBusy,onChanged,onFinancial,disabled=false}) {
  const [summary,setSummary]=useState(null),[allAccounts,setAllAccounts]=useState([]),[form,setForm]=useState(emptyPayment);
  const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(""),[accountError,setAccountError]=useState("");
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[saving,setSaving]=useState(false),[pending,setPending]=useState(null),[refresh,setRefresh]=useState(0);
  const running=useRef(false);
  const accounts=activeAccounts(allAccounts);
  useEffect(()=>{
    const ctrl=new AbortController(); setLoading(true);setLoadError("");setAccountError("");setSummary(null);setAllAccounts([]);
    let journal, saved;
    try {journal=paymentJournal(window.sessionStorage,pkg.id);saved=journal.read();setPending(saved);} catch {setLoadError("Não foi possível recuperar operações pendentes nesta aba. Não registre outro recebimento antes de conferir.");setLoading(false);return ()=>ctrl.abort();}
    const summaryRequest=service.getPayments(pkg.id,{signal:ctrl.signal}).then(data=>{
      if(ctrl.signal.aborted)return;
      const matched=saved && data.payments.find(p=>p.requestId===saved.requestId);
      if(matched){if(!paymentMatches(matched,saved))throw new Error("Operação pendente inconsistente. Necessária conciliação.");journal.clear();setPending(null);setNotice("Recebimento anterior localizado no histórico.");onChanged?.();}
      setSummary(data);onFinancial?.(data);
    }).catch(err=>{if(!ctrl.signal.aborted)setLoadError(err.message||"Não foi possível consultar os recebimentos.");});
    const accountRequest=accountsService.list({},{signal:ctrl.signal}).then(data=>{if(!ctrl.signal.aborted){activeAccounts(data);setAllAccounts(data);}}).catch(err=>{if(!ctrl.signal.aborted)setAccountError(err.message||"Não foi possível consultar as contas.");});
    Promise.all([summaryRequest,accountRequest]).finally(()=>{if(!ctrl.signal.aborted)setLoading(false);});
    return ()=>ctrl.abort();
  },[pkg.id,refresh]);
  const set=(key,value)=>setForm(old=>({...old,[key]:value}));
  const reload=()=>{setError("");setRefresh(n=>n+1);};
  const submit=async event=>{
    event.preventDefault();if(disabled||running.current||loading||loadError||!summary)return;
    setError("");setNotice("");let data,journal;
    const retry=!!pending;
    try {
      journal=paymentJournal(window.sessionStorage,pkg.id);
      const stored=journal.read();
      if(stored && !retry){setPending(stored);throw new Error("Há uma operação pendente. Confira ou reenvie a mesma operação.");}
      if(retry && (!stored||!paymentMatches(stored,pending)))throw new Error("Operação pendente alterada. Atualize e confira os recebimentos.");
      data=retry?pending:buildPaymentPayload(form,pkg,summary,accounts,globalThis.crypto.randomUUID());
      journal.save(data);
    } catch(err){setError(err.message||"Não foi possível preparar o recebimento.");return;}
    running.current=true;onBusy?.(true);setSaving(true);setPending(data);
    try {
      const result=await service.receivePayment(pkg.id,data);
      journal.clear();setPending(null);setForm(emptyPayment());setLoading(true);setNotice(result.replayed?"Recebimento anterior confirmado. Nenhuma duplicação.":"Recebimento registrado e integrado ao financeiro.");setRefresh(n=>n+1);onChanged?.();
    } catch(err){
      if(!retry && knownPaymentRejection(err)){
        try{journal.clear();setPending(null);setError(err.message);}catch{setError("Não foi possível limpar a operação. Confira antes de repetir.");}
      }else setError("Recebimento não confirmado. Confira o histórico ou reenvie exatamente a mesma operação. "+(err.message||""));
    } finally{running.current=false;onBusy?.(false);setSaving(false);}
  };
  const locked=disabled||saving||!!pending;
  const eligible=summary&&canReceive(pkg,summary);
  return <Box borderTop="1px solid #e5ece9" pt={3}>
    <Flex align="center" justify="space-between" gap={2}><Heading fontSize="15px" color="#075749">Recebimentos</Heading><Button type="button" size="xs" variant="ghost" onClick={reload} disabled={saving||loading}><FiRefreshCw/> Atualizar</Button></Flex>
    {notice&&<Text role="status" fontSize="12px" color="#08715c" mt={2}>{notice}</Text>}
    {loading?<Flex align="center" gap={2} py={3}><Spinner size="sm" color="#075749"/><Text fontSize="12px">Consultando financeiro...</Text></Flex>:loadError?<Text role="alert" fontSize="12px" color="#b4232b" mt={2}>{loadError}</Text>:summary&&<VStack align="stretch" gap={3} mt={3}>
      <SimpleGrid columns={{base:2,sm:3}} gap={2} bg="#f3f8f6" borderRadius="8px" p={3}>{[["Recebido",money(summary.paidAmount)],[pkg.status==="cancelled"?"Saldo dispensado":"Em aberto",money(summary.outstandingAmount)],["Situação",pkg.status==="cancelled"?"Encerrado":statuses[summary.paymentStatus]]].map(([label,value])=><Box key={label}><Text fontSize="11px" color="#607873">{label}</Text><Heading fontSize="16px" color="#075749">{value}</Heading></Box>)}</SimpleGrid>
      <PrivateLessonPaymentHistory summary={summary} accounts={allAccounts} accountError={accountError}/>
      {pending?<Box border="1px solid #e3bc79" borderRadius="8px" p={3}><Text fontSize="12px" fontWeight="700" color="#795318">Operação pendente de confirmação</Text><Text fontSize="12px">{money(pending.amount)} · {displayDate(pending.receivedAt)} · {pending.method} · {accounts.find(a=>a.id===pending.accountId)?.name||pending.accountId}</Text><Text fontSize="11px" color="#607873">Não registre outra operação. Reenvie a mesma chave ou atualize para conferir.</Text><Box as="form" onSubmit={submit} mt={2}><Button type="submit" size="sm" colorPalette="teal" loading={saving} disabled={saving||disabled}>Reenviar mesma operação</Button></Box></Box>:eligible?<Box as="form" onSubmit={submit}>
        <VStack align="stretch" gap={3}><SimpleGrid columns={{base:1,sm:2}} gap={3}><Box><Text as="label" htmlFor="lesson-payment-amount" {...labelStyle}>Valor (R$)</Text><Flex gap={1}><Input id="lesson-payment-amount" {...field} inputMode="decimal" value={form.amount} onChange={e=>set("amount",e.target.value)} disabled={locked}/><Button type="button" size="sm" variant="outline" onClick={()=>set("amount",String(summary.outstandingAmount))} disabled={locked}>Total</Button></Flex></Box><Box><Text as="label" htmlFor="lesson-payment-date" {...labelStyle}>Data do recebimento</Text><Input id="lesson-payment-date" {...field} type="date" min={pkg.contractedOn} max={paymentToday()} value={form.receivedAt} onChange={e=>set("receivedAt",e.target.value)} disabled={locked}/></Box></SimpleGrid>
        <SimpleGrid columns={{base:1,sm:2}} gap={3}><Box><Text as="label" htmlFor="lesson-payment-method" {...labelStyle}>Forma de pagamento</Text><Box as="select" id="lesson-payment-method" {...field} w="100%" px={2} border="1px solid #cfd9d7" borderRadius="8px" value={form.method} onChange={e=>set("method",e.target.value)} disabled={locked}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</Box></Box><Box><Text as="label" htmlFor="lesson-payment-account" {...labelStyle}>Conta financeira</Text><Box as="select" id="lesson-payment-account" {...field} w="100%" px={2} border="1px solid #cfd9d7" borderRadius="8px" value={form.accountId} onChange={e=>set("accountId",e.target.value)} disabled={locked||!!accountError}><option value="">Selecione...</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Box></Box></SimpleGrid>
        {accountError?<Text role="alert" color="#b4232b" fontSize="12px">{accountError}</Text>:!accounts.length?<Text color="#795318" fontSize="12px">Nenhuma conta financeira ativa disponível.</Text>:null}
        <Box><Text as="label" htmlFor="lesson-payment-notes" {...labelStyle}>Observações (opcional)</Text><Box as="textarea" id="lesson-payment-notes" w="100%" rows={2} border="1px solid #cfd9d7" borderRadius="8px" p={2} fontSize="13px" maxLength={500} value={form.notes} onChange={e=>set("notes",e.target.value)} disabled={locked}/></Box>
        <Text fontSize="11px" color="#607873">Registre apenas recebimentos efetivos ainda não lançados no financeiro. A operação gera um provento automaticamente.</Text><Button type="submit" alignSelf="end" size="sm" bg="#0b6b5b" color="white" disabled={locked||!!accountError||!accounts.length||!form.accountId}><FiCheck/> Registrar recebimento</Button></VStack>
      </Box>:<Text fontSize="12px" color="#607873">{pkg.status==="cancelled"?"Pacote cancelado não aceita recebimentos.":"Nenhum saldo em aberto."}</Text>}
      {error&&<Text role="alert" fontSize="12px" color="#b4232b">{error}</Text>}
    </VStack>}
  </Box>;
}
