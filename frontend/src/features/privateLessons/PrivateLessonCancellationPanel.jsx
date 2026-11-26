import { useRef, useState } from "react";
import { Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import service from "../../services/privateLessonPackagesServices.js";
import { money } from "./privateLessonPackagesView.js";
import { displayLessonTime } from "./privateLessonSchedulingView.js";
import { scheduleJournal } from "./privateLessonSchedulingView.js";
import { paymentJournal } from "./privateLessonPaymentForm.js";
import { buildCancellationPayload } from "./privateLessonCancellationView.js";

/* EN: Preview before cancellation; on uncertain response retry the same request or reopen the package to verify.
   PT: Prévia antes do cancelamento; em resposta incerta, repete a operação ou reabre o pacote para conferir. */
export default function PrivateLessonCancellationPanel({pkg,disabled,onBusy,onCancelled}) {
  const [preview,setPreview]=useState(null),[reason,setReason]=useState(""),[error,setError]=useState(""),[pending,setPending]=useState(null),[busy,setBusy]=useState(false);
  const running=useRef(false);
  const checkJournals=()=>{if(paymentJournal(window.sessionStorage,pkg.id).read()||scheduleJournal(window.sessionStorage,pkg.id).read())throw new Error("Confira as operações pendentes de pagamento ou agenda antes de cancelar.");};
  const run=async fn=>{if(running.current||disabled)return;running.current=true;setBusy(true);onBusy?.(true);setError("");try{await fn();}catch(err){setError(err.message||"Não foi possível processar o cancelamento.");}finally{running.current=false;setBusy(false);onBusy?.(false);}};
  const open=()=>run(async()=>{checkJournals();setPreview(await service.previewCancellation(pkg.id));});
  const submit=e=>{e.preventDefault();return run(async()=>{checkJournals();const data=pending??buildCancellationPayload(preview,reason,globalThis.crypto.randomUUID());setPending(data);try{const result=await service.cancelPackage(pkg.id,data);setPending(null);setPreview(null);onCancelled(result);}catch(err){if(!pending&&[400,403,404,409,422].includes(err.status)){setPending(null);setPreview(null);throw err;}throw new Error("Cancelamento não confirmado. Confira os detalhes ou reenvie a mesma operação. "+(err.message||""));}});};
  if(pkg.status==="cancelled")return <Box borderTop="1px solid #e5ece9" pt={3}><Heading fontSize="15px" color="#a62e38">Pacote cancelado</Heading>{pkg.cancelledAt&&<Text fontSize="12px" mt={1}>{displayLessonTime(pkg.cancelledAt)}</Text>}<Text fontSize="12px" whiteSpace="pre-wrap" overflowWrap="anywhere">Motivo: {pkg.cancellationReason||"Não informado"}</Text><Text fontSize="11px" color="#607873">Recebimentos anteriores preservados. Créditos restantes indisponíveis.</Text></Box>;
  if(pkg.status!=="active")return null;
  return <Box borderTop="1px solid #e5ece9" pt={3}>
    {!preview?<Button size="sm" colorPalette="red" variant="outline" disabled={disabled||busy} loading={busy} onClick={open}>Cancelar pacote</Button>:<Box as="form" onSubmit={submit}><VStack align="stretch" gap={3} border="1px solid #e3bc79" borderRadius="8px" p={3}>
      <Heading fontSize="15px" color="#a62e38">Confirmar cancelamento</Heading><Text fontSize="12px">As {preview.scheduledCount} aula(s) agendada(s) serão canceladas. As {preview.completedCount} realizadas e todo o histórico serão preservados. O saldo em aberto deixa de ser cobrado.</Text>
      <SimpleGrid columns={2} gap={2}>{[["Valor recebido",preview.paidAmount],["Valor proporcional utilizado",preview.usedAmount],["Saldo a deixar de cobrar",preview.outstandingAmount],["Devolução sugerida",preview.suggestedRefund]].map(([label,value])=><Box key={label}><Text fontSize="11px" color="#607873">{label}</Text><Text fontSize="14px" fontWeight="700">{money(value)}</Text></Box>)}</SimpleGrid>
      <Text fontSize="12px" color="#795318">A devolução sugerida é apenas referência. Nenhum dinheiro será devolvido nesta operação. Não será possível reativar o pacote.</Text>
      <Text as="label" htmlFor="private-cancel-reason" fontSize="12px" fontWeight="700">Motivo do cancelamento</Text><Box as="textarea" id="private-cancel-reason" rows={3} maxLength={1000} border="1px solid #cfd9d7" borderRadius="8px" p={2} fontSize="13px" value={reason} onChange={e=>setReason(e.target.value)} disabled={disabled||busy||!!pending}/>
      <Flex gap={2} wrap="wrap" justify="end"><Button type="button" size="sm" variant="outline" disabled={busy||!!pending} onClick={()=>{setPreview(null);setError("");}}>Voltar</Button><Button type="submit" size="sm" colorPalette="red" loading={busy} disabled={disabled||busy||!reason.trim()}>{pending?"Reenviar mesma operação":"Confirmar cancelamento"}</Button></Flex>
    </VStack></Box>}
    {error&&<Text role="alert" fontSize="12px" color="#b4232b" mt={2}>{error}</Text>}
  </Box>;
}
