import { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Heading, Input, NativeSelect, Table, Text, VStack } from "@chakra-ui/react";
import { FiCreditCard, FiSearch } from "react-icons/fi";
import financialServices from "../../../services/financialServices";
import { COLORS, money, formatDate, formatMonth, periodRange } from "./financialPeriod";

export default function FinancialReceipts({ period, refreshKey=0 }) {
  const {from,to}=periodRange(period);
  const [receipts,setReceipts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const [search,setSearch]=useState("");
  const [method,setMethod]=useState("");
  useEffect(()=>{
    let active=true;
    setLoading(true);setError("");setReceipts([]);
    financialServices.getReceipts({from,to}).then(rows=>{if(active) setReceipts(Array.isArray(rows)?rows:[]);})
      .catch(err=>{if(active) setError(err.message||"Falha ao carregar recebimentos.");})
      .finally(()=>{if(active) setLoading(false);});
    return ()=>{active=false;};
  },[from,to,refreshKey,retry]);
  const filtered=useMemo(()=>receipts.filter(item=>{
    const q=search.trim().toLocaleLowerCase("pt-BR");
    const haystack=`${item.student?.name||""} ${item.student?.mat||""} ${item.monthlyFee?.reference||""}`.toLocaleLowerCase("pt-BR");
    return (!q||haystack.includes(q))&&(!method||item.method===method);
  }),[receipts,search,method]);
  const total=filtered.reduce((sum,item)=>sum+Number(item.amount||0),0);
  const methods=[...new Set(receipts.map(item=>item.method).filter(Boolean))].sort();
  return <Box bg="white" border="1px solid #d7e2df" borderRadius="9px" overflow="hidden">
    <Flex align="center" justify="space-between" p={3} borderBottom="1px solid #e6ecea" gap={2} wrap="wrap">
      <Box><Heading fontSize="15px" color={COLORS.green}>Histórico de recebimentos</Heading><Text fontSize="11px" color={COLORS.gray}>{filtered.length} pagamento(s) • Total exibido: {money(total)}</Text></Box>
    </Flex>
    <Flex p={3} gap={2} wrap="wrap">
      <Input aria-label="Pesquisar recebimentos" size="sm" maxW={{base:"100%",md:"290px"}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar aluno, matrícula ou competência..."/>
      <NativeSelect.Root size="sm" width={{base:"100%",md:"185px"}}><NativeSelect.Field aria-label="Filtrar forma de pagamento" value={method} onChange={e=>setMethod(e.target.value)}><option value="">Todas as formas</option>{methods.map(m=><option key={m}>{m}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
    </Flex>
    {loading && <Text p={4} fontSize="12px" color={COLORS.gray}>Carregando recebimentos...</Text>}
    {error && <Box p={4}><Text fontSize="12px" color={COLORS.red}>{error}</Text><Button size="xs" mt={2} onClick={()=>setRetry(v=>v+1)}>Tentar novamente</Button></Box>}
    {!loading && !error && filtered.length===0 && <Box textAlign="center" p={9}><FiCreditCard color="#97aaa7" size={26} style={{margin:"0 auto 8px"}}/><Text fontSize="12px" color={COLORS.green} fontWeight="700">Nenhum recebimento encontrado</Text><Text fontSize="11px" color={COLORS.gray}>Confira os filtros ou selecione outro período.</Text></Box>}
    {!loading && !error && filtered.length>0 && <>
      <Box display={{base:"none",md:"block"}} overflowX="auto"><Table.Root size="sm" minW="720px"><Table.Header bg="#f4f8f7"><Table.Row>{["Pagamento", "Aluno", "Matrícula", "Mensalidade", "Forma", "Valor recebido"].map(label=><Table.ColumnHeader key={label} fontSize="11px" color={COLORS.green}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
      <Table.Body>{filtered.map(item=><Table.Row key={item.id}><Table.Cell fontSize="11px">{formatDate(item.paidAt)}</Table.Cell><Table.Cell fontWeight="600" fontSize="11px">{item.student?.name||"—"}</Table.Cell><Table.Cell fontSize="11px">{item.student?.mat||"—"}</Table.Cell><Table.Cell fontSize="11px">{formatMonth(item.monthlyFee?.reference)}</Table.Cell><Table.Cell fontSize="11px">{item.method}</Table.Cell><Table.Cell fontSize="11px" color="#147c3b" fontWeight="700">{money(item.amount)}</Table.Cell></Table.Row>)}</Table.Body></Table.Root></Box>
      <VStack p={3} gap={2} display={{base:"flex",md:"none"}} align="stretch">{filtered.map(item=><Box key={item.id} border="1px solid #d7e2df" borderRadius="8px" p={3}><Flex justify="space-between" gap={2}><Text fontSize="12px" fontWeight="700" color={COLORS.green}>{item.student?.name||"Aluno"}</Text><Text fontSize="12px" fontWeight="700" color="#147c3b">{money(item.amount)}</Text></Flex><Text mt={1} fontSize="11px" color={COLORS.gray}>{formatDate(item.paidAt)} • {item.method} • {formatMonth(item.monthlyFee?.reference)}</Text></Box>)}</VStack>
    </>}
  </Box>;
}
