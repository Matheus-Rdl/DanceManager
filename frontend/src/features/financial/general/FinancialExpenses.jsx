import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Button, Dialog, Flex, Heading, HStack, Input, NativeSelect, Portal, SimpleGrid, Table, Text, Textarea, VStack } from "@chakra-ui/react";
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiEdit2, FiPlus, FiRepeat, FiX, FiTrash2, FiList } from "react-icons/fi";
import expensesServices, { expenseCategories } from "../../../services/expensesServices";
import { periodRange, nowReference } from "./financialPeriod";

const green = "#064e43";
const gray = "#607873";
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = value => BRL.format(Number(value) || 0);
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const formatDate = value => !value ? "—" : value.slice(0, 10).split("-").reverse().join("/");
const formatMonth = value => {
  if (!value) return "—";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1));
};
const blankExpense = (month = today().slice(0, 7)) => ({ description: "", category: "Outros", amount: "", dueDate: month === today().slice(0, 7) ? today() : `${month}-01`, notes: "", recurring: false, startMonth: month, dueDay: "10", effectiveFrom: today().slice(0, 7) });
const blankPayment = () => ({ paidAmount: "", paidAt: today(), method: "Pix", notes: "" });
const shiftMonth = (reference, offset) => {
  const [year, month] = reference.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
};
const longMonths = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const actionLabels = { cancel: "Cancelar despesa", zero: "Zerar despesa", delete: "Excluir definitivamente" };
const auditLabels = {
  created: "Cadastrada", generated: "Gerada automaticamente", edited: "Editada",
  paid: "Pagamento registrado", paid_corrected: "Despesa paga corrigida",
  cancelled: "Cancelada / estornada", zeroed: "Zerada",
  recurrence_updated: "Atualizada pela recorrência"
};
const auditFieldNames = {
  description: "Descrição", category: "Categoria", amount: "Valor previsto",
  dueDate: "Vencimento", reference: "Competência", status: "Situação",
  paidAmount: "Valor pago", paidAt: "Pagamento em", method: "Forma de pagamento", notes: "Observações"
};
function ChangedFields({ entry }) {
  if (!entry.before || !entry.after) return null;
  const keys = Object.keys(entry.after).filter(key => JSON.stringify(entry.before[key] ?? null) !== JSON.stringify(entry.after[key] ?? null));
  return <VStack mt={2} gap={1} align="stretch">
    {keys.map(key => <Text key={key} fontSize="10px" color="#49645f">
      <b>{auditFieldNames[key] || key}:</b> {key === "amount" || key === "paidAmount" ? money(entry.before[key]) : String(entry.before[key] ?? "—")} → {key === "amount" || key === "paidAmount" ? money(entry.after[key]) : String(entry.after[key] ?? "—")}
    </Text>)}
  </VStack>;
}
const badgeProps = {
  paid: { text: "Paga", bg: "#e1f5e8", color: "#147c3b" },
  pending: { text: "Pendente", bg: "#fff4d9", color: "#996500" },
  overdue: { text: "Em atraso", bg: "#ffe6e6", color: "#bd3030" },
  cancelled: { text: "Cancelada", bg: "#eef1f1", color: "#637673" },
  zeroed: { text: "Zerada", bg: "#eef1f1", color: "#637673" }
};
function ExpenseBadge({ status }) {
  const value = badgeProps[status] || badgeProps.pending;
  return <Badge bg={value.bg} color={value.color} borderRadius="full" px={2} py="3px" fontSize="10px">{value.text}</Badge>;
}
function StatCard({ icon: Icon, title, value, caption, tone = green }) {
  return <Box bg="white" border="1px solid #e1e9e7" borderRadius="10px" p={4} minW={0}>
    <HStack gap={2} mb={2}><Box color={tone}><Icon size={18}/></Box><Text fontSize="11px" color={gray}>{title}</Text></HStack>
    <Heading fontSize={{ base: "17px", md: "21px" }} color={tone} fontWeight="800">{value}</Heading>
    {caption && <Text mt={1} fontSize="10px" color={gray}>{caption}</Text>}
  </Box>;
}
function FormField({ label, children }) {
  return <Box minW={0}><Text mb={1} fontSize="11px" fontWeight="600" color="#315650">{label}</Text>{children}</Box>;
}
const inputStyle = { h: "38px", fontSize: "12px", borderColor: "#cedbd8", borderRadius: "7px" };

export default function FinancialExpenses({period, refreshKey=0, onDataChanged}) {
  const {from,to} = periodRange(period);
  const month = period.mode === "month" ? period.reference : nowReference();
  const [expenses,setExpenses] = useState([]);
  const [recurrences,setRecurrences] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(0);
  const [categoryFilter,setCategoryFilter] = useState("");
  const [statusFilter,setStatusFilter] = useState("");
  const [search,setSearch] = useState("");
  const [dialog,setDialog] = useState("");
  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState(blankExpense);
  const [payment,setPayment] = useState(blankPayment);
  const [reason,setReason] = useState("");
  const [operation,setOperation] = useState("");
  const [success,setSuccess] = useState("");
  const [actionError,setActionError] = useState("");
  const [saving,setSaving] = useState(false);
  const requestVersion = useRef(0);

  const load=useCallback(async()=>{
    const version = ++requestVersion.current;
    setLoading(true); setError(""); setExpenses([]);
    try {
      const [list,rules] = await Promise.all([
        expensesServices.list({from,to}), expensesServices.listRecurrences()
      ]);
      if (version !== requestVersion.current) return;
      setExpenses(Array.isArray(list)?list:[]);
      setRecurrences(Array.isArray(rules)?rules:[]);
    } catch(err) {
      if (version === requestVersion.current) setError(err.message||"Não foi possível carregar as despesas.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  },[from,to]);
  useEffect(()=>{
    load();
    return ()=>{requestVersion.current++;};
  },[load,refreshKey,retry]);

  const filteredExpenses = useMemo(() => expenses.filter(item =>
    (!categoryFilter || item.category === categoryFilter) &&
    (!statusFilter || item.displayStatus === statusFilter) &&
    (!search || `${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase()))
  ), [expenses, categoryFilter, statusFilter, search]);
  const recurrenceById = useMemo(() => new Map(recurrences.map(r => [r.id, r])), [recurrences]);
  const openCreate = () => { setEditing(null); setForm(blankExpense(month)); setReason(""); setActionError(""); setDialog("expense"); };
  const openEdit = item => {
    setEditing(item);
    setForm({ ...blankExpense(), ...item, amount: String(item.amount), recurring: false });
    setReason(""); setActionError(""); setDialog("expense");
  };
  const openEditRecurrence = item => {
    const rule = recurrenceById.get(item.recurrenceId);
    if (!rule?.active) return;
    setEditing(rule);
    setForm({ ...blankExpense(), ...rule, amount: String(rule.amount), dueDay: String(rule.dueDay), effectiveFrom: item.reference < today().slice(0, 7) ? today().slice(0, 7) : item.reference });
    setReason(""); setActionError(""); setDialog("recurrence");
  };
  const openPay = item => {
    setEditing(item);
    setPayment({ ...blankPayment(), paidAmount: String(item.amount) });
    setReason(""); setActionError(""); setDialog("pay");
  };
  const openOperation = (item, action) => {
    setEditing(item); setOperation(action); setReason(""); setActionError(""); setDialog("operation");
  };
  const openHistory = item => { setEditing(item); setActionError(""); setDialog("history"); };
  const closeDialog = () => { if (!saving) { setDialog(""); setEditing(null); setActionError(""); setReason(""); setOperation(""); } };
  const mutate = async fn => {
    if (saving) return;
    setSaving(true); setSuccess(""); setActionError("");
    try { await fn(); setDialog(""); setEditing(null); setReason(""); setOperation(""); onDataChanged?.(); setSuccess("Alteração realizada com sucesso."); }
    catch (err) { setActionError(err.message || "Não foi possível concluir a operação."); }
    finally { setSaving(false); }
  };
  const saveExpense = () => mutate(async () => {
    if (dialog === "recurrence") {
      return expensesServices.updateRecurrence(editing.id, {
        description: form.description, category: form.category, amount: Number(form.amount),
        dueDay: Number(form.dueDay), effectiveFrom: form.effectiveFrom
      });
    }
    if (editing) {
      return expensesServices.update(editing.id, {
        description: form.description, category: form.category, amount: Number(form.amount),
        dueDate: form.dueDate, notes: form.notes,
        ...(editing.status === "paid" ? {
          paidAmount: Number(form.paidAmount), paidAt: form.paidAt,
          method: form.method, reason
        } : { reason: reason.trim() })
      });
    }
    if (form.recurring) {
      return expensesServices.createRecurrence({
        description: form.description, category: form.category, amount: Number(form.amount),
        startMonth: form.startMonth, dueDay: Number(form.dueDay)
      });
    }
    return expensesServices.create({
      description: form.description, category: form.category, amount: Number(form.amount),
      dueDate: form.dueDate, notes: form.notes
    });
  });
  const payExpense = () => mutate(() => expensesServices.pay(editing.id, { ...payment, paidAmount: Number(payment.paidAmount) }));
  const performOperation = () => mutate(async () => {
    if (!editing || !operation) throw new Error("Selecione uma operação.");
    if (operation !== "delete" && !reason.trim()) throw new Error("Informe a justificativa da alteração.");
    if (operation === "zero") return expensesServices.zero(editing.id, reason.trim());
    if (operation === "cancel") return expensesServices.cancel(editing.id, reason.trim());
    if (operation === "delete") return expensesServices.remove(editing.id);
  });
  const stopRecurrence = item => {
    if (!window.confirm(`Encerrar a recorrência “${item.description}”? As cobranças futuras não pagas serão canceladas.`)) return;
    mutate(() => expensesServices.stopRecurrence(item.recurrenceId));
  };
  const actions = item => {
    const activeRule = item.recurrenceId && recurrenceById.get(item.recurrenceId)?.active;
    const editable = item.status === "pending" || item.status === "paid";
    const deletable = item.status === "pending" && !item.recurrenceId &&
      !(item.history || []).some(event => event.action !== "created") && !item.paidAt && item.paidAmount == null;
    return <Flex gap={1} wrap="wrap">
      {item.status === "pending" && <Button size="xs" bg={green} color="white" onClick={() => openPay(item)}><FiCheckCircle/> Pagar</Button>}
      {editable && <Button size="xs" variant="outline" onClick={() => openEdit(item)}><FiEdit2/> {item.status === "paid" ? "Corrigir" : "Editar"}</Button>}
      {editable && <Button size="xs" variant="outline" onClick={() => openOperation(item, "zero")}>Zerar</Button>}
      {editable && <Button size="xs" variant="outline" color="#ba3b3b" onClick={() => openOperation(item, "cancel")}><FiX/> Cancelar</Button>}
      {deletable && <Button size="xs" variant="ghost" color="#ba3b3b" onClick={() => openOperation(item, "delete")}><FiTrash2/> Excluir</Button>}
      {(item.history || []).length > 0 && <Button size="xs" variant="ghost" onClick={() => openHistory(item)}><FiList/> Histórico</Button>}
      {item.status === "pending" && activeRule && <Button size="xs" variant="ghost" color={green} onClick={() => openEditRecurrence(item)}><FiRepeat/> Editar regra</Button>}
      {activeRule && <Button size="xs" variant="ghost" color="#ba3b3b" onClick={() => stopRecurrence(item)}>Encerrar regra</Button>}
    </Flex>;
  };
  const changeForm = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const changePayment = (key, value) => setPayment(current => ({ ...current, [key]: value }));

  return <VStack gap={3} align="stretch" minW={0}>
    {success && !dialog && <Box bg="#f1fbf6" border="1px solid #c5e8d5" borderRadius="8px" p={2}><Text color="#147c3b" fontSize="12px">{success}</Text></Box>}
    {error && <Box bg="#fff1f1" borderRadius="8px" p={3}><Text fontSize="12px" color="#bd3030">{error}</Text><Button mt={2} size="xs" onClick={()=>setRetry(v=>v+1)}>Tentar novamente</Button></Box>}
    {loading && <Text color={gray} fontSize="12px">Carregando despesas...</Text>}
    <Box bg="white" border="1px solid #d7e2df" borderRadius="9px" overflow="hidden">
      <Flex justify="space-between" align="center" p={3} gap={2} wrap="wrap" borderBottom="1px solid #e6ecea">
        <Box><Heading fontSize="15px" color={green}>Despesas</Heading><Text fontSize="10px" color={gray}>{filteredExpenses.length} registro(s) no período</Text></Box>
        <Button size="sm" bg={green} color="white" fontSize="12px" onClick={openCreate}><FiPlus/> Nova despesa</Button>
      </Flex>
      <Flex p={3} gap={2} wrap="wrap">
        <Input size="sm" placeholder="Buscar despesa..." value={search} onChange={e => setSearch(e.target.value)} maxW={{ base: "100%", md: "230px" }}/>
        <NativeSelect.Root size="sm" w={{ base: "calc(50% - 4px)", md: "170px" }}><NativeSelect.Field value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="">Todas categorias</option>{expenseCategories.map(c => <option key={c}>{c}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
        <NativeSelect.Root size="sm" w={{ base: "calc(50% - 4px)", md: "160px" }}><NativeSelect.Field value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos os status</option><option value="pending">Pendentes</option><option value="overdue">Em atraso</option><option value="paid">Pagas</option><option value="cancelled">Canceladas</option><option value="zeroed">Zeradas</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
      </Flex>
      {!loading && !error && filteredExpenses.length === 0 ? <Box py={12} px={4} textAlign="center"><FiCalendar size={28} style={{ margin: "0 auto 10px" }} color="#9aaead"/><Text fontWeight="700" color={green}>Nenhuma despesa encontrada</Text><Text mt={1} fontSize="12px" color={gray}>Cadastre uma despesa ou ajuste os filtros para visualizar os lançamentos.</Text></Box> : !loading && !error ? <>
        <Box display={{ base: "none", md: "block" }} overflowX="auto"><Table.Root minW="900px" size="sm">
          <Table.Header bg="#f4f8f7"><Table.Row>{["Descrição", "Categoria", "Vencimento", "Valor", "Situação", "Ações"].map(c => <Table.ColumnHeader key={c} color={green} fontSize="11px">{c}</Table.ColumnHeader>)}</Table.Row></Table.Header>
          <Table.Body>{filteredExpenses.map(item => <Table.Row key={item.id} _hover={{ bg: "#f7faf9" }}><Table.Cell><Text fontWeight="700" fontSize="11px" color={green}>{item.description}</Text>{item.recurrenceId && <Text color={gray} fontSize="10px">Recorrente</Text>}</Table.Cell><Table.Cell fontSize="11px">{item.category}</Table.Cell><Table.Cell fontSize="11px">{formatDate(item.dueDate)}</Table.Cell><Table.Cell fontSize="11px" fontWeight="700">{money(item.amount)}</Table.Cell><Table.Cell><ExpenseBadge status={item.displayStatus}/>{item.status === "paid" && <Text fontSize="10px" color={gray}>{formatDate(item.paidAt)} · {money(item.paidAmount)}</Text>}</Table.Cell><Table.Cell>{actions(item)}</Table.Cell></Table.Row>)}</Table.Body>
        </Table.Root></Box>
        <VStack display={{ base: "flex", md: "none" }} gap={3} p={3} align="stretch">{filteredExpenses.map(item => <Box key={item.id} p={3} border="1px solid #d7e2df" borderRadius="8px"><Flex align="start" justify="space-between" gap={3}><Box minW={0}><Text fontSize="13px" fontWeight="700" color={green}>{item.description}</Text><Text fontSize="10px" color={gray}>{item.category} · {formatDate(item.dueDate)} {item.recurrenceId ? "· Recorrente" : ""}</Text></Box><Text fontWeight="700" fontSize="13px">{money(item.amount)}</Text></Flex><Flex align="center" gap={2} mt={2}><ExpenseBadge status={item.displayStatus}/>{item.status === "paid" && <Text fontSize="10px" color={gray}>Pago em {formatDate(item.paidAt)}</Text>}</Flex><Box mt={3}>{actions(item)}</Box></Box>)}</VStack>
      </> : null}
      <Text p={3} fontSize="10px" color={gray}>Despesas recorrentes são geradas automaticamente para o mês atual e os dois meses seguintes. Um lançamento pago nunca é reescrito pela edição da regra.</Text>
    </Box>
    <Dialog.Root open={Boolean(dialog)} onOpenChange={change => { if (!change.open) closeDialog(); }} size="lg">
      <Portal><Dialog.Backdrop/><Dialog.Positioner><Dialog.Content maxW="520px" mx={3} borderRadius="11px">
        <Dialog.Header><Dialog.Title color={green} fontSize="17px">
          {dialog === "pay" ? "Registrar pagamento da despesa" : dialog === "recurrence" ? "Editar recorrência" : dialog === "operation" ? actionLabels[operation] : dialog === "history" ? "Histórico da despesa" : editing?.status === "paid" ? "Corrigir despesa paga" : editing ? "Editar despesa" : "Nova despesa"}
        </Dialog.Title></Dialog.Header>
        <Dialog.Body><VStack align="stretch" gap={3}>
          {dialog === "history" ? <>
            <Box bg="#f4f8f7" borderRadius="8px" p={3}><Text fontWeight="700" color={green}>{editing?.description}</Text><Text fontSize="11px" color={gray}>Histórico de alterações registrado no banco</Text></Box>
            <VStack align="stretch" gap={2} maxH="400px" overflowY="auto">
              {[...(editing?.history || [])].reverse().map((entry, index) => <Box key={`${entry.at}-${index}`} border="1px solid #e1e9e7" p={3} borderRadius="8px">
                <Flex justify="space-between" gap={2} wrap="wrap"><Text fontSize="12px" fontWeight="700" color={green}>{auditLabels[entry.action] || entry.action}</Text><Text fontSize="10px" color={gray}>{entry.at ? new Date(entry.at).toLocaleString("pt-BR") : "—"}</Text></Flex>
                {entry.details && <Text mt={1} fontSize="11px" color={gray}>{entry.details}</Text>}
                {entry.reason && <Text mt={1} fontSize="11px" color="#7b461c">Justificativa: {entry.reason}</Text>}
                <ChangedFields entry={entry}/>
              </Box>)}
            </VStack>
          </> : dialog === "operation" ? <>
            <Box bg="#f4f8f7" borderRadius="8px" p={3}><Text fontWeight="700" fontSize="12px" color={green}>{editing?.description}</Text><Text fontSize="11px" color={gray}>Valor atual: {money(editing?.amount)} · {editing?.status === "paid" ? "Paga" : "Pendente"}</Text></Box>
            <Text fontSize="12px" color={operation === "delete" ? "#b32f32" : gray}>
              {operation === "delete" ? "Exclusão permanente: esta despesa avulsa não possui quitação nem alterações relevantes. Esta ação não poderá ser desfeita." : operation === "zero" ? "O valor será R$ 0,00; se houver quitação, será retirada dos indicadores. O histórico da correção será preservado." : "A despesa será cancelada e deixará de compor os totais. Pagamentos anteriores permanecerão registrados no histórico."}
            </Text>
            {operation !== "delete" && <FormField label="Justificativa obrigatória"><Textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} placeholder="Explique por que esta correção é necessária" minH="85px" fontSize="12px"/></FormField>}
          </> : dialog === "pay" ? <>
            <Box bg="#f3f7f6" p={3} borderRadius="8px"><Text fontSize="12px" fontWeight="700" color={green}>{editing?.description}</Text><Text fontSize="11px" color={gray}>Valor previsto: {money(editing?.amount)}</Text></Box>
            <SimpleGrid columns={2} gap={3}>
              <FormField label="Valor efetivamente pago"><Input {...inputStyle} type="number" min="0.01" step="0.01" value={payment.paidAmount} onChange={e => changePayment("paidAmount", e.target.value)}/></FormField>
              <FormField label="Data do pagamento"><Input {...inputStyle} type="date" max={today()} value={payment.paidAt} onChange={e => changePayment("paidAt", e.target.value)}/></FormField>
            </SimpleGrid>
            <FormField label="Forma de pagamento"><NativeSelect.Root size="sm"><NativeSelect.Field value={payment.method} onChange={e => changePayment("method", e.target.value)}><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option><option>Boleto</option><option>Outro</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></FormField>
            <FormField label="Observações (opcional)"><Input {...inputStyle} value={payment.notes} onChange={e => changePayment("notes", e.target.value)}/></FormField>
          </> : <>
            <FormField label="Descrição"><Input {...inputStyle} value={form.description} onChange={e => changeForm("description", e.target.value)} placeholder="Ex.: Aluguel da escola"/></FormField>
            <SimpleGrid columns={2} gap={3}>
              <FormField label="Categoria"><NativeSelect.Root size="sm"><NativeSelect.Field value={form.category} onChange={e => changeForm("category", e.target.value)}>{expenseCategories.map(c => <option key={c}>{c}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></FormField>
              <FormField label="Valor previsto (R$)"><Input {...inputStyle} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => changeForm("amount", e.target.value)}/></FormField>
            </SimpleGrid>
            {!editing && <Flex align="center" gap={2} bg="#f4f8f7" borderRadius="8px" p={3}><input type="checkbox" id="recurring-expense" checked={form.recurring} onChange={e => changeForm("recurring", e.target.checked)}/><label htmlFor="recurring-expense" style={{ fontSize: "12px", color: green, cursor: "pointer" }}>Repetir automaticamente todos os meses</label></Flex>}
            {(dialog === "recurrence" || (!editing && form.recurring)) ? <>
              <SimpleGrid columns={2} gap={3}>
                <FormField label={dialog === "recurrence" ? "Alterar a partir de" : "Competência inicial"}><Input {...inputStyle} type="month" value={dialog === "recurrence" ? form.effectiveFrom : form.startMonth} min={dialog === "recurrence" ? today().slice(0, 7) : undefined} max={dialog === "recurrence" ? (() => { const d = new Date(); d.setMonth(d.getMonth() + 2); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })() : undefined} onChange={e => changeForm(dialog === "recurrence" ? "effectiveFrom" : "startMonth", e.target.value)}/></FormField>
                <FormField label="Dia de vencimento"><Input {...inputStyle} type="number" min="1" max="31" value={form.dueDay} onChange={e => changeForm("dueDay", e.target.value)}/></FormField>
              </SimpleGrid>
              <Text fontSize="11px" color={gray}>O vencimento será ajustado ao último dia quando o mês tiver menos dias. Alterações de recorrência não modificam despesas pagas.</Text>
            </> : <FormField label="Data de vencimento"><Input {...inputStyle} type="date" value={form.dueDate} onChange={e => changeForm("dueDate", e.target.value)}/></FormField>}
            {dialog !== "recurrence" && <FormField label="Observações (opcional)"><Input {...inputStyle} value={form.notes} onChange={e => changeForm("notes", e.target.value)}/></FormField>}
            {dialog === "expense" && editing?.status === "paid" && <>
              <Box pt={2} borderTop="1px solid #e1e9e7"><Text fontWeight="700" fontSize="12px" color={green}>Corrigir informações da quitação</Text></Box>
              <SimpleGrid columns={2} gap={3}>
                <FormField label="Valor efetivamente pago"><Input {...inputStyle} type="number" min="0.01" step="0.01" value={form.paidAmount ?? ""} onChange={e => changeForm("paidAmount", e.target.value)}/></FormField>
                <FormField label="Data do pagamento"><Input {...inputStyle} type="date" max={today()} value={form.paidAt || ""} onChange={e => changeForm("paidAt", e.target.value)}/></FormField>
              </SimpleGrid>
              <FormField label="Forma de pagamento"><NativeSelect.Root size="sm"><NativeSelect.Field value={form.method || "Pix"} onChange={e => changeForm("method", e.target.value)}>{["Pix","Dinheiro","Cartão","Transferência","Boleto","Outro"].map(method => <option key={method}>{method}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></FormField>
              <FormField label="Justificativa obrigatória"><Textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} minH="80px" fontSize="12px" placeholder="Ex.: Data digitada incorretamente"/></FormField>
              <Text fontSize="11px" color={gray}>A correção ficará no histórico e atualizará o resultado do mês do pagamento efetivo.</Text>
            </>}
          </>}
          {actionError && <Text fontSize="12px" color="#bd3030"><FiAlertCircle style={{ display: "inline" }}/> {actionError}</Text>}
        </VStack></Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closeDialog} disabled={saving}>{dialog === "history" ? "Fechar" : "Voltar"}</Button>
          {dialog !== "history" && <Button bg={operation === "delete" ? "#b32f32" : green} color="white" loading={saving}
            disabled={dialog === "operation" && operation !== "delete" && !reason.trim()}
            onClick={dialog === "pay" ? payExpense : dialog === "operation" ? performOperation : saveExpense}>
            {dialog === "pay" ? "Confirmar pagamento" : dialog === "operation" ? actionLabels[operation] : dialog === "recurrence" ? "Salvar nova regra" : editing ? "Salvar alterações" : "Cadastrar despesa"}
          </Button>}
        </Dialog.Footer>
        <Dialog.CloseTrigger asChild><Button size="sm" variant="ghost" position="absolute" right="9px" top="9px" onClick={closeDialog}><FiX/></Button></Dialog.CloseTrigger>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  </VStack>;
}
