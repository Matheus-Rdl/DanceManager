import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { displayDate, money } from "./privateLessonPackagesView.js";
import { orderedPayments, paymentAccountLabel } from "./privateLessonFinancialView.js";

/* EN: Read-only receipt journal; inactive accounts remain visible, with no edit or refund actions yet.
   PT: Histórico somente leitura; contas inativas continuam visíveis, ainda sem edição ou estorno. */
export default function PrivateLessonPaymentHistory({summary,accounts,accountError}) {
  const rows=orderedPayments(summary);
  return <VStack align="stretch" gap={2} border="1px solid #dbe6e2" borderRadius="8px" p={3}>
    <Heading fontSize="14px" color="#075749">Histórico de recebimentos</Heading>
    <Text fontSize="11px" color="#607873">{rows.length} recebimento(s) · total {money(summary.grossPaidAmount??summary.paidAmount)}</Text>
    {accountError&&<Text fontSize="11px" color="#795318">Não foi possível consultar os nomes das contas. Os identificadores permanecem visíveis.</Text>}
    {!rows.length?<Text fontSize="12px" color="#607873">Nenhum recebimento registrado.</Text>:<Box overflowX="auto"><Box as="table" w="100%" minW="430px" fontSize="12px" style={{borderCollapse:"collapse"}}>
      <thead><tr>{["Data","Forma / conta","Valor"].map((h,i)=><th key={h} scope="col" style={{padding:"8px",textAlign:i===2?"right":"left",background:"#f3f8f6",color:"#315650"}}>{h}</th>)}</tr></thead>
      <tbody>{rows.map(p=><tr key={p.id} style={{borderTop:"1px solid #e5ece9"}}><td style={{padding:"8px",verticalAlign:"top"}}>{displayDate(p.receivedAt)}</td><td style={{padding:"8px",verticalAlign:"top",overflowWrap:"anywhere"}}><Text fontWeight="600">{p.method}</Text><Text color="#607873" fontSize="11px">{paymentAccountLabel(accounts,p.accountId)}</Text>{p.notes&&<Text whiteSpace="pre-wrap" fontSize="11px">{p.notes}</Text>}</td><td style={{padding:"8px",verticalAlign:"top",textAlign:"right",whiteSpace:"nowrap",color:"#08715c",fontWeight:700}}>{money(p.amount)}</td></tr>)}</tbody>
    </Box></Box>}
    {!!summary.refunds?.length&&<><Heading fontSize="13px" color="#a62e38">Histórico de devoluções · {money(summary.refundedAmount)}</Heading>{[...summary.refunds].sort((a,b)=>b.refundedAt.localeCompare(a.refundedAt)||b.createdAt.localeCompare(a.createdAt)).map(r=><Box key={r.id} borderTop="1px solid #e5ece9" pt={2}><Text fontSize="12px" fontWeight="700">{displayDate(r.refundedAt)} · − {money(r.amount)}</Text><Text fontSize="11px">{r.method} · {paymentAccountLabel(accounts,r.accountId)} · Recebimento {r.paymentId.slice(0,8)}</Text><Text fontSize="11px" whiteSpace="pre-wrap">{r.reason}</Text></Box>)}</>}
    <Text fontSize="10px" color="#607873">Contas exibidas pelo nome atual. Recebimentos originais preservados.</Text>
  </VStack>;
}
