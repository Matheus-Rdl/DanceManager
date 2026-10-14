import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge, Box, Button, Dialog, Flex, Heading, HStack, Input, NativeSelect,
  Portal, SimpleGrid, Table, Text, VStack
} from "@chakra-ui/react";
import {
  FiActivity, FiAlertCircle, FiCalendar, FiCheckCircle, FiClock,
  FiCreditCard, FiDollarSign, FiEdit2, FiPlus, FiRefreshCw,
  FiRepeat, FiTrendingUp, FiPieChart, FiX
} from "react-icons/fi";
import expensesServices, { expenseCategories } from "../../../services/expensesServices";
import financialServices from "../../../services/financialServices";

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
const badgeProps = {
  paid: { text: "Paga", bg: "#e1f5e8", color: "#147c3b" },
  pending: { text: "Pendente", bg: "#fff4d9", color: "#996500" },
  overdue: { text: "Em atraso", bg: "#ffe6e6", color: "#bd3030" },
  cancelled: { text: "Cancelada", bg: "#eef1f1", color: "#637673" }
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

export default function FinancialGeneral() {
  const [tab, setTab] = useState("overview");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [summary, setSummary] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [recurrences, setRecurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankExpense);
  const [payment, setPayment] = useState(blankPayment);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [general, received, charges, recurringRules] = await Promise.all([
        financialServices.getSummary(month), financialServices.getReceipts(month),
        expensesServices.list(month), expensesServices.listRecurrences()
      ]);
      setSummary(general);
      setReceipts(received);
      setExpenses(charges);
      setRecurrences(recurringRules);
    } catch (err) { setError(err.message || "Erro ao carregar o financeiro."); }
    finally { setLoading(false); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const filteredExpenses = useMemo(() => expenses.filter(item =>
    (!categoryFilter || item.category === categoryFilter) &&
    (!statusFilter || item.displayStatus === statusFilter) &&
    (!search || `${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase()))
  ), [expenses, categoryFilter, statusFilter, search]);
  const recurrenceById = useMemo(() => new Map(recurrences.map(r => [r.id, r])), [recurrences]);
  const openCreate = () => { setEditing(null); setForm(blankExpense(month)); setActionError(""); setDialog("expense"); };
  const openEdit = item => {
    setEditing(item);
    setForm({ ...blankExpense(), ...item, amount: String(item.amount), recurring: false });
    setActionError(""); setDialog("expense");
  };
  const openEditRecurrence = item => {
    const rule = recurrenceById.get(item.recurrenceId);
    if (!rule?.active) return;
    setEditing(rule);
    setForm({ ...blankExpense(), ...rule, amount: String(rule.amount), dueDay: String(rule.dueDay), effectiveFrom: item.reference < today().slice(0, 7) ? today().slice(0, 7) : item.reference });
    setActionError(""); setDialog("recurrence");
  };
  const openPay = item => {
    setEditing(item);
    setPayment({ ...blankPayment(), paidAmount: String(item.amount) });
    setActionError(""); setDialog("pay");
  };
  const closeDialog = () => { if (!saving) { setDialog(""); setEditing(null); setActionError(""); } };
  const mutate = async fn => {
    if (saving) return;
    setSaving(true); setActionError("");
    try { await fn(); setDialog(""); setEditing(null); await load(); }
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
        dueDate: form.dueDate, notes: form.notes
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
  const cancelExpense = item => {
    if (!window.confirm(`Cancelar a despesa “${item.description}” de ${formatMonth(item.reference)}?`)) return;
    mutate(() => expensesServices.cancel(item.id));
  };
  const stopRecurrence = item => {
    if (!window.confirm(`Encerrar a recorrência “${item.description}”? As cobranças futuras não pagas serão canceladas.`)) return;
    mutate(() => expensesServices.stopRecurrence(item.recurrenceId));
  };
  const actions = item => {
    if (item.status !== "pending") return <Text fontSize="10px" color={gray}>—</Text>;
    const activeRule = item.recurrenceId && recurrenceById.get(item.recurrenceId)?.active;
    return <Flex gap={1} wrap="wrap">
      <Button size="xs" bg={green} color="white" onClick={() => openPay(item)}><FiCheckCircle/> Pagar</Button>
      <Button size="xs" variant="outline" onClick={() => openEdit(item)}><FiEdit2/> Editar</Button>
      <Button size="xs" variant="outline" color="#ba3b3b" onClick={() => cancelExpense(item)}><FiX/> Cancelar</Button>
      {activeRule && <Button size="xs" variant="ghost" color={green} onClick={() => openEditRecurrence(item)}><FiRepeat/> Editar regra</Button>}
      {activeRule && <Button size="xs" variant="ghost" color="#ba3b3b" onClick={() => stopRecurrence(item)}>Encerrar regra</Button>}
    </Flex>;
  };
  const changeForm = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const changePayment = (key, value) => setPayment(current => ({ ...current, [key]: value }));

  return <VStack gap={4} align="stretch" w="100%" minW={0} bg="#f8faf9" pb={7}>
    <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
      <Flex align="center" gap={3}>
        <Flex w="39px" h="39px" bg={green} borderRadius="full" align="center" justify="center" color="white"><FiPieChart size={20}/></Flex>
        <Box><Heading fontSize={{ base: "18px", md: "22px" }} color="#062f2b">Financeiro Geral</Heading><Text fontSize="11px" color={gray}>Recebimentos, despesas e resultado da escola</Text></Box>
      </Flex>
      <HStack gap={2}>
        <Input type="month" aria-label="Competência financeira" {...inputStyle} w="165px" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }}/>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}><FiRefreshCw/> Atualizar</Button>
      </HStack>
    </Flex>
    <Flex bg="white" border="1px solid #d7e2df" borderRadius="9px" p={1} gap={1} wrap="wrap">
      {[{ id: "overview", name: "Visão Geral", icon: FiActivity }, { id: "receipts", name: "Recebimentos", icon: FiCreditCard }, { id: "expenses", name: "Despesas", icon: FiDollarSign }].map(item => {
        const Icon = item.icon;
        return <Button key={item.id} size="sm" flex={{ base: "1 1 auto", md: "unset" }} bg={tab === item.id ? green : "transparent"} color={tab === item.id ? "white" : green} onClick={() => setTab(item.id)} borderRadius="6px" fontSize="12px"><Icon/>{item.name}</Button>;
      })}
    </Flex>
    {actionError && !dialog && <Box bg="#fff1f1" border="1px solid #f4bdbd" p={3} borderRadius="8px"><Text fontSize="12px" color="#a42929">{actionError}</Text></Box>}
    {error && <Box bg="#fff1f1" border="1px solid #f4bdbd" p={3} borderRadius="8px"><Text fontSize="12px" color="#a42929">{error}</Text><Button mt={2} size="xs" onClick={load}>Tentar novamente</Button></Box>}
    {loading && <Text color={gray} fontSize="12px">Carregando informações financeiras...</Text>}
    {tab === "overview" && <VStack gap={3} align="stretch">
      <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3}>
        <StatCard icon={FiCreditCard} title="Recebimentos realizados" value={money(summary?.received)} caption="Por data de pagamento" tone="#147c3b"/>
        <StatCard icon={FiDollarSign} title="Despesas pagas" value={money(summary?.expensesPaid)} caption="Por data de pagamento" tone="#bb573f"/>
        <StatCard icon={FiTrendingUp} title="Resultado realizado" value={money(summary?.result)} caption="Recebido − despesas pagas" tone={Number(summary?.result || 0) >= 0 ? green : "#bb3030"}/>
        <StatCard icon={FiAlertCircle} title="Mensalidades em atraso" value={summary?.overdueFeesCount ?? 0} caption={money(summary?.overdueFeesValue)} tone="#b83a3a"/>
      </SimpleGrid>
      <SimpleGrid columns={{ base: 2, lg: 3 }} gap={3}>
        <StatCard icon={FiCalendar} title="Mensalidades previstas" value={money(summary?.expectedFees)} caption="Cobranças da competência"/>
        <StatCard icon={FiClock} title="Mensalidades em aberto" value={money(summary?.openFees)} caption="Valor ainda não pago" tone="#996500"/>
        <StatCard icon={FiRepeat} title="Despesas pendentes" value={summary?.pendingExpensesCount ?? 0} caption={money(summary?.pendingExpensesValue)} tone="#996500"/>
      </SimpleGrid>
      <Box bg="white" border="1px solid #e1e9e7" borderRadius="9px" p={4}>
        <Heading fontSize="15px" color={green} mb={1}>Evolução dos últimos 6 meses</Heading>
        <Text fontSize="10px" color={gray} mb={4}>Comparação entre dinheiro recebido e despesas efetivamente pagas.</Text>
        <VStack align="stretch" gap={3}>
          {(summary?.timeline || []).map(point => {
            const max = Math.max(...(summary?.timeline || []).flatMap(p => [p.received, p.expensesPaid]), 1);
            return <Flex key={point.reference} align="center" gap={3}>
              <Text fontSize="10px" w="55px" flexShrink={0} color={gray}>{formatMonth(point.reference)}</Text>
              <Box flex="1" minW={0}>
                <Box h="9px" w={`${Math.max(0, point.received / max * 100)}%`} bg="#16845a" borderRadius="3px" mb="3px"/>
                <Box h="9px" w={`${Math.max(0, point.expensesPaid / max * 100)}%`} bg="#da8861" borderRadius="3px"/>
              </Box>
              <Text fontSize="10px" w="92px" color={gray} textAlign="right">{money(point.result)}</Text>
            </Flex>;
          })}
          {!summary?.timeline?.length && <Text fontSize="12px" color={gray}>Sem dados para o período.</Text>}
        </VStack>
        <HStack mt={4} gap={4}><HStack gap={1}><Box w="9px" h="9px" bg="#16845a"/><Text fontSize="10px" color={gray}>Recebimentos</Text></HStack><HStack gap={1}><Box w="9px" h="9px" bg="#da8861"/><Text fontSize="10px" color={gray}>Despesas pagas</Text></HStack></HStack>
      </Box>
      <Text fontSize="11px" color={gray}>O resultado realizado não representa o saldo bancário. Mensalidades emitidas e despesas previstas aparecem separadamente.</Text>
    </VStack>}
    {tab === "receipts" && <Box bg="white" border="1px solid #d7e2df" borderRadius="9px" overflow="hidden">
      <Flex align="center" justify="space-between" px={4} py={3} borderBottom="1px solid #e6ecea" wrap="wrap" gap={2}>
        <Heading fontSize="15px" color={green}>Histórico de recebimentos</Heading>
        <Text fontSize="11px" color={gray}>{receipts.length} pagamento(s) no período</Text>
      </Flex>
      {!loading && receipts.length === 0 ? <Box p={9} textAlign="center"><FiCreditCard style={{ margin: "0 auto 8px" }} size={26} color="#97aaa7"/><Text fontWeight="600" color={green}>Nenhum recebimento registrado</Text><Text mt={1} fontSize="12px" color={gray}>Os pagamentos das mensalidades aparecerão automaticamente aqui.</Text></Box> : <>
        <Box display={{ base: "none", md: "block" }} overflowX="auto"><Table.Root size="sm" minW="720px">
          <Table.Header bg="#f4f8f7"><Table.Row>{["Data", "Aluno", "Matrícula", "Mensalidade", "Forma", "Valor recebido"].map(name => <Table.ColumnHeader key={name} fontSize="11px" color={green}>{name}</Table.ColumnHeader>)}</Table.Row></Table.Header>
          <Table.Body>{receipts.map(item => <Table.Row key={item.id}><Table.Cell fontSize="11px">{formatDate(item.paidAt)}</Table.Cell><Table.Cell fontSize="11px" fontWeight="600">{item.student?.name || "—"}</Table.Cell><Table.Cell fontSize="11px">{item.student?.mat || "—"}</Table.Cell><Table.Cell fontSize="11px">{formatMonth(item.monthlyFee?.reference)}</Table.Cell><Table.Cell fontSize="11px">{item.method}</Table.Cell><Table.Cell fontSize="11px" color="#147c3b" fontWeight="700">{money(item.amount)}</Table.Cell></Table.Row>)}</Table.Body>
        </Table.Root></Box>
        <VStack p={3} gap={2} align="stretch" display={{ base: "flex", md: "none" }}>{receipts.map(item => <Box key={item.id} border="1px solid #d7e2df" borderRadius="8px" p={3}><Flex justify="space-between" gap={2}><Text fontSize="12px" fontWeight="700" color={green}>{item.student?.name || "Aluno"}</Text><Text fontSize="12px" fontWeight="700" color="#147c3b">{money(item.amount)}</Text></Flex><Text mt={1} fontSize="11px" color={gray}>{formatDate(item.paidAt)} • {item.method} • {formatMonth(item.monthlyFee?.reference)}</Text></Box>)}</VStack>
      </>}
    </Box>}
    {tab === "expenses" && <Box bg="white" border="1px solid #d7e2df" borderRadius="9px" overflow="hidden">
      <Flex justify="space-between" align="center" p={3} gap={2} wrap="wrap" borderBottom="1px solid #e6ecea">
        <Box><Heading fontSize="15px" color={green}>Despesas</Heading><Text fontSize="10px" color={gray}>{filteredExpenses.length} registro(s) na competência</Text></Box>
        <Button size="sm" bg={green} color="white" fontSize="12px" onClick={openCreate}><FiPlus/> Nova despesa</Button>
      </Flex>
      <Flex p={3} gap={2} wrap="wrap">
        <Input size="sm" placeholder="Buscar despesa..." value={search} onChange={e => setSearch(e.target.value)} maxW={{ base: "100%", md: "230px" }}/>
        <NativeSelect.Root size="sm" w={{ base: "calc(50% - 4px)", md: "170px" }}><NativeSelect.Field value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="">Todas categorias</option>{expenseCategories.map(c => <option key={c}>{c}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
        <NativeSelect.Root size="sm" w={{ base: "calc(50% - 4px)", md: "160px" }}><NativeSelect.Field value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos os status</option><option value="pending">Pendentes</option><option value="overdue">Em atraso</option><option value="paid">Pagas</option><option value="cancelled">Canceladas</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
      </Flex>
      {!loading && filteredExpenses.length === 0 ? <Box py={12} px={4} textAlign="center"><FiCalendar size={28} style={{ margin: "0 auto 10px" }} color="#9aaead"/><Text fontWeight="700" color={green}>Nenhuma despesa encontrada</Text><Text mt={1} fontSize="12px" color={gray}>Cadastre uma despesa ou ajuste os filtros para visualizar os lançamentos.</Text></Box> : <>
        <Box display={{ base: "none", md: "block" }} overflowX="auto"><Table.Root minW="900px" size="sm">
          <Table.Header bg="#f4f8f7"><Table.Row>{["Descrição", "Categoria", "Vencimento", "Valor", "Situação", "Ações"].map(c => <Table.ColumnHeader key={c} color={green} fontSize="11px">{c}</Table.ColumnHeader>)}</Table.Row></Table.Header>
          <Table.Body>{filteredExpenses.map(item => <Table.Row key={item.id} _hover={{ bg: "#f7faf9" }}><Table.Cell><Text fontWeight="700" fontSize="11px" color={green}>{item.description}</Text>{item.recurrenceId && <Text color={gray} fontSize="10px">Recorrente</Text>}</Table.Cell><Table.Cell fontSize="11px">{item.category}</Table.Cell><Table.Cell fontSize="11px">{formatDate(item.dueDate)}</Table.Cell><Table.Cell fontSize="11px" fontWeight="700">{money(item.amount)}</Table.Cell><Table.Cell><ExpenseBadge status={item.displayStatus}/>{item.status === "paid" && <Text fontSize="10px" color={gray}>{formatDate(item.paidAt)} · {money(item.paidAmount)}</Text>}</Table.Cell><Table.Cell>{actions(item)}</Table.Cell></Table.Row>)}</Table.Body>
        </Table.Root></Box>
        <VStack display={{ base: "flex", md: "none" }} gap={3} p={3} align="stretch">{filteredExpenses.map(item => <Box key={item.id} p={3} border="1px solid #d7e2df" borderRadius="8px"><Flex align="start" justify="space-between" gap={3}><Box minW={0}><Text fontSize="13px" fontWeight="700" color={green}>{item.description}</Text><Text fontSize="10px" color={gray}>{item.category} · {formatDate(item.dueDate)} {item.recurrenceId ? "· Recorrente" : ""}</Text></Box><Text fontWeight="700" fontSize="13px">{money(item.amount)}</Text></Flex><Flex align="center" gap={2} mt={2}><ExpenseBadge status={item.displayStatus}/>{item.status === "paid" && <Text fontSize="10px" color={gray}>Pago em {formatDate(item.paidAt)}</Text>}</Flex><Box mt={3}>{actions(item)}</Box></Box>)}</VStack>
      </>}
      <Text p={3} fontSize="10px" color={gray}>Despesas recorrentes são geradas automaticamente para o mês atual e os dois meses seguintes. Um lançamento pago nunca é reescrito pela edição da regra.</Text>
    </Box>}

    <Dialog.Root open={Boolean(dialog)} onOpenChange={change => { if (!change.open) closeDialog(); }} size="lg">
      <Portal><Dialog.Backdrop/><Dialog.Positioner><Dialog.Content maxW="520px" mx={3} borderRadius="11px">
        <Dialog.Header><Dialog.Title color={green} fontSize="17px">{dialog === "pay" ? "Registrar pagamento da despesa" : dialog === "recurrence" ? "Editar recorrência" : editing ? "Editar despesa" : "Nova despesa"}</Dialog.Title></Dialog.Header>
        <Dialog.Body><VStack align="stretch" gap={3}>
          {dialog === "pay" ? <>
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
          </>}
          {actionError && <Text fontSize="12px" color="#bd3030"><FiAlertCircle style={{ display: "inline" }}/> {actionError}</Text>}
        </VStack></Dialog.Body>
        <Dialog.Footer><Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button><Button bg={green} color="white" loading={saving} onClick={dialog === "pay" ? payExpense : saveExpense}>{dialog === "pay" ? "Confirmar pagamento" : dialog === "recurrence" ? "Salvar nova regra" : editing ? "Salvar alterações" : "Cadastrar despesa"}</Button></Dialog.Footer>
        <Dialog.CloseTrigger asChild><Button size="sm" variant="ghost" position="absolute" right="9px" top="9px" onClick={closeDialog}><FiX/></Button></Dialog.CloseTrigger>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  </VStack>;
}
