import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Button, Dialog, Flex, Heading, Input, NativeSelect, Portal, SimpleGrid, Table, Text, Textarea, VStack } from "@chakra-ui/react";
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiEdit2, FiList, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import revenuesServices, { revenueCategories } from "../../../services/revenuesServices";
import { financialInitiators, initiatorLabel, auditInitiatorLabel } from "./financialInitiators";
import { COLORS, money, formatDate, nowReference, periodRange } from "./financialPeriod";

const green = COLORS.green;
const gray = COLORS.gray;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const blankRevenue = month => ({
  description: "", category: "Outros", amount: "", dueDate: month === today().slice(0, 7) ? today() : `${month}-01`,
  notes: "", initiatorKey: "", receivedNow: false, receivedAmount: "", receivedAt: today(), method: "Pix"
});
const blankReceipt = amount => ({ receivedAmount: amount || "", receivedAt: today(), method: "Pix", notes: "", initiatorKey: "" });
const paymentMethods = ["Pix", "Dinheiro", "Cartão", "Transferência", "Boleto", "Outro"];
const badges = {
  received: { label: "Recebido", bg: "#e1f5e8", color: "#147c3b" },
  pending: { label: "Pendente", bg: "#fff4d9", color: "#996500" },
  overdue: { label: "Atrasado", bg: "#ffe6e6", color: "#bd3030" },
  cancelled: { label: "Cancelado", bg: "#eef1f1", color: "#637673" }
};
const historyLabels = {
  created: "Cadastrado", edited: "Editado", received: "Recebimento registrado",
  received_corrected: "Recebimento corrigido", cancelled: "Cancelado"
};
const auditLabels = {
  description: "Descrição", category: "Categoria", amount: "Valor previsto", dueDate: "Data prevista",
  reference: "Competência", receivedAmount: "Valor recebido", receivedAt: "Data de recebimento",
  method: "Forma", notes: "Observações", status: "Situação", initiator: "Responsável"
};
const fieldStyle = { h: "38px", fontSize: "12px", borderColor: "#cedbd8", borderRadius: "7px" };
function Field({ label, children }) {
  return <Box minW={0}><Text mb={1} fontSize="11px" fontWeight="600" color="#315650">{label}</Text>{children}</Box>;
}
function StatusBadge({ status }) {
  const value = badges[status] || badges.pending;
  return <Badge bg={value.bg} color={value.color} borderRadius="full" px={2} py="3px" fontSize="10px">{value.label}</Badge>;
}
function ChangedFields({ entry }) {
  if (!entry.before || !entry.after) return null;
  const keys = Object.keys(entry.after).filter(key => JSON.stringify(entry.before[key] ?? null) !== JSON.stringify(entry.after[key] ?? null));
  return <VStack mt={2} gap={1} align="stretch">{keys.map(key => <Text key={key} fontSize="10px" color="#49645f">
    <b>{auditLabels[key] || key}:</b> {key === "amount" || key === "receivedAmount" ? money(entry.before[key]) : key === "initiator" ? auditInitiatorLabel(entry.before[key]) : String(entry.before[key] ?? "—")} → {key === "amount" || key === "receivedAmount" ? money(entry.after[key]) : key === "initiator" ? auditInitiatorLabel(entry.after[key]) : String(entry.after[key] ?? "—")}
  </Text>)}</VStack>;
}

export default function FinancialRevenues({ period, refreshKey = 0, onDataChanged, focusId = null }) {
  const { from, to } = periodRange(period);
  const defaultMonth = period.mode === "month" ? period.reference : nowReference();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [initiatorFilter, setInitiatorFilter] = useState("");
  const [status, setStatus] = useState("");
  const [dialog, setDialog] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => blankRevenue(nowReference()));
  const [receipt, setReceipt] = useState(() => blankReceipt());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const openedFromStatement = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setItems([]);
    revenuesServices.list({ from, to }).then(data => { if (active) setItems(Array.isArray(data) ? data : []); })
      .catch(err => { if (active) setError(err.message || "Não foi possível carregar os proventos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, refreshKey, retry]);

  /* Opening from the statement shows the original record without creating a copy.
     A consulta abre o registro de origem, sem criar outra movimentação. */
  useEffect(() => {
    if (!focusId || loading || error || openedFromStatement.current === focusId) return;
    const item = items.find(entry => entry.id === focusId);
    if (!item) return;
    openedFromStatement.current = focusId;
    setEditing(item); setActionError(""); setDialog("history");
  }, [focusId, loading, error, items]);

  const filtered = useMemo(() => items.filter(item =>
    (!category || item.category === category) && (!initiatorFilter || item.initiator?.key === initiatorFilter) && (!status || item.displayStatus === status) &&
    (!search.trim() || `${item.description} ${item.category} ${initiatorLabel(item)}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))
  ), [items, category, initiatorFilter, status, search]);
  const received = filtered.filter(item => item.status === "received").reduce((sum, item) => sum + Number(item.receivedAmount || 0), 0);
  const pending = filtered.filter(item => item.status === "pending").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const changeReceipt = (field, value) => setReceipt(current => ({ ...current, [field]: value }));
  const close = () => { if (!saving) { setDialog(""); setEditing(null); setReason(""); setActionError(""); } };
  const openCreate = () => { setEditing(null); setForm(blankRevenue(defaultMonth)); setReason(""); setActionError(""); setDialog("form"); };
  const openEdit = item => {
    setEditing(item); setForm({ ...blankRevenue(defaultMonth), ...item, amount: String(item.amount), receivedAmount: item.receivedAmount == null ? "" : String(item.receivedAmount), initiatorKey: item.initiator?.key || "" });
    setReason(""); setActionError(""); setDialog("form");
  };
  const openReceive = item => {
    setEditing(item); setReceipt({ ...blankReceipt(String(item.amount)), initiatorKey: item.initiator?.key || "" }); setReason(""); setActionError(""); setDialog("receive");
  };
  const openCancel = item => { setEditing(item); setReason(""); setActionError(""); setDialog("cancel"); };
  const openRemove = item => { setEditing(item); setActionError(""); setDialog("delete"); };
  const openHistory = item => { setEditing(item); setActionError(""); setDialog("history"); };
  const mutate = async action => {
    if (saving) return;
    setSaving(true); setActionError(""); setSuccess("");
    try {
      await action();
      setDialog(""); setEditing(null); setReason(""); setSuccess("Provento atualizado com sucesso.");
      onDataChanged?.();
    } catch (err) { setActionError(err.message || "Não foi possível concluir a operação."); }
    finally { setSaving(false); }
  };
  const fields = () => ({ description: form.description, category: form.category, amount: Number(form.amount), dueDate: form.dueDate, notes: form.notes, initiatorKey: form.initiatorKey });
  const formReceipt = () => ({ receivedAmount: Number(form.receivedAmount), receivedAt: form.receivedAt, method: form.method });
  const save = () => mutate(() => editing ? revenuesServices.update(editing.id, {
    ...fields(), ...(editing.status === "received" ? { ...formReceipt(), reason } : {})
  }) : revenuesServices.create({
    ...fields(), receivedNow: form.receivedNow,
    ...(form.receivedNow ? formReceipt() : {})
  }));
  const registerReceipt = () => mutate(() => revenuesServices.receive(editing.id, { ...receipt, receivedAmount: Number(receipt.receivedAmount) }));
  const cancel = () => mutate(() => revenuesServices.cancel(editing.id, reason));
  const remove = () => mutate(() => revenuesServices.remove(editing.id));
  const canDelete = item => item.sourceType === "manual" && item.status === "pending" && !item.receivedAt && item.receivedAmount == null &&
    !(item.history || []).some(entry => entry.action !== "created");
  const actions = item => <Flex gap={1} wrap="wrap">
    {item.status === "pending" && item.sourceType === "manual" && <Button size="xs" bg={green} color="white" onClick={() => openReceive(item)}><FiCheckCircle/> Receber</Button>}
    {!["cancelled"].includes(item.status) && item.sourceType === "manual" && <Button size="xs" variant="outline" onClick={() => openEdit(item)}><FiEdit2/> {item.status === "received" ? "Corrigir" : "Editar"}</Button>}
    {!["cancelled"].includes(item.status) && item.sourceType === "manual" && <Button size="xs" variant="outline" color="#ba3b3b" onClick={() => openCancel(item)}><FiX/> Cancelar</Button>}
    {canDelete(item) && <Button size="xs" variant="ghost" color="#ba3b3b" onClick={() => openRemove(item)}><FiTrash2/> Excluir</Button>}
    {(item.history || []).length > 0 && <Button size="xs" variant="ghost" onClick={() => openHistory(item)}><FiList/> Histórico</Button>}
  </Flex>;

  return <VStack align="stretch" gap={3} minW={0}>
    {success && !dialog && <Box bg="#f1fbf6" border="1px solid #c5e8d5" p={2} borderRadius="8px"><Text fontSize="12px" color="#147c3b">{success}</Text></Box>}
    {error && <Box bg="#fff1f1" p={3} borderRadius="8px"><Text fontSize="12px" color="#bd3030">{error}</Text><Button mt={2} size="xs" onClick={() => setRetry(v => v + 1)}>Tentar novamente</Button></Box>}
    <Box bg="white" border="1px solid #d7e2df" borderRadius="9px" overflow="hidden">
      <Flex p={3} borderBottom="1px solid #e6ecea" justify="space-between" align="center" wrap="wrap" gap={2}>
        <Box><Heading fontSize="15px" color={green}>Proventos</Heading><Text fontSize="10px" color={gray}>{filtered.length} lançamento(s) no período</Text></Box>
        <Button size="sm" bg={green} color="white" fontSize="12px" onClick={openCreate}><FiPlus/> Novo provento</Button>
      </Flex>
      <Flex p={3} gap={2} wrap="wrap">
        <Input aria-label="Pesquisar provento" size="sm" maxW={{ base: "100%", md: "240px" }} placeholder="Buscar provento..." value={search} onChange={e => setSearch(e.target.value)}/>
        <NativeSelect.Root size="sm" width={{ base: "calc(50% - 4px)", md: "180px" }}><NativeSelect.Field aria-label="Filtrar categoria" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas categorias</option>{revenueCategories.map(value => <option key={value}>{value}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
        <NativeSelect.Root size="sm" width={{ base: "calc(50% - 4px)", md: "165px" }}><NativeSelect.Field aria-label="Filtrar situação" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos os status</option><option value="received">Recebidos</option><option value="pending">Pendentes</option><option value="overdue">Atrasados</option><option value="cancelled">Cancelados</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
        <NativeSelect.Root size="sm" width={{ base: "calc(50% - 4px)", md: "170px" }}><NativeSelect.Field aria-label="Filtrar responsável" value={initiatorFilter} onChange={e => setInitiatorFilter(e.target.value)}><option value="">Todos responsáveis</option>{financialInitiators.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
      </Flex>
      {!loading && !error && filtered.length > 0 && <Flex mx={3} mb={3} gap={3} wrap="wrap" fontSize="11px" color={gray}><Text>Recebidos: <b style={{ color: "#147c3b" }}>{money(received)}</b></Text><Text>Pendentes (inclui atrasados): <b>{money(pending)}</b></Text></Flex>}
      {loading && <Text p={4} fontSize="12px" color={gray}>Carregando proventos...</Text>}
      {!loading && !error && filtered.length === 0 && <Box p={9} textAlign="center"><FiCalendar size={28} color="#9aaead" style={{ margin: "0 auto 8px" }}/><Text fontWeight="700" fontSize="13px" color={green}>Nenhum provento encontrado</Text><Text fontSize="11px" color={gray}>Cadastre um provento ou altere os filtros.</Text></Box>}
      {!loading && !error && filtered.length > 0 && <>
        <Box display={{ base: "none", md: "block" }} overflowX="auto"><Table.Root size="sm" minW="900px"><Table.Header bg="#f4f8f7"><Table.Row>{["Descrição", "Categoria", "Responsável", "Data prevista", "Valor previsto", "Situação", "Ações"].map(label => <Table.ColumnHeader key={label} color={green} fontSize="11px">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header><Table.Body>
          {filtered.map(item => <Table.Row key={item.id} _hover={{ bg: "#f7faf9" }}><Table.Cell><Text fontSize="11px" fontWeight="700" color={green}>{item.description}</Text>{item.sourceType !== "manual" && <Text fontSize="10px" color={gray}>Integração: {item.sourceType}</Text>}</Table.Cell><Table.Cell fontSize="11px">{item.category}</Table.Cell><Table.Cell fontSize="11px">{initiatorLabel(item)}</Table.Cell><Table.Cell fontSize="11px">{formatDate(item.dueDate)}</Table.Cell><Table.Cell fontSize="11px" fontWeight="700">{money(item.amount)}</Table.Cell><Table.Cell><StatusBadge status={item.displayStatus}/>{item.status === "received" && <Text color={gray} fontSize="10px">{formatDate(item.receivedAt)} · {money(item.receivedAmount)}</Text>}</Table.Cell><Table.Cell>{actions(item)}</Table.Cell></Table.Row>)}
        </Table.Body></Table.Root></Box>
        <VStack display={{ base: "flex", md: "none" }} gap={2} p={3} align="stretch">{filtered.map(item => <Box key={item.id} p={3} border="1px solid #d7e2df" borderRadius="8px"><Flex align="start" justify="space-between" gap={2}><Box minW={0}><Text fontSize="12px" fontWeight="700" color={green}>{item.description}</Text><Text color={gray} fontSize="10px">{item.category} · {formatDate(item.dueDate)} · {initiatorLabel(item)}</Text></Box><Text fontSize="12px" fontWeight="700">{money(item.amount)}</Text></Flex><Flex mt={2} gap={2} align="center"><StatusBadge status={item.displayStatus}/>{item.status === "received" && <Text fontSize="10px" color={gray}>{formatDate(item.receivedAt)} · {money(item.receivedAmount)}</Text>}</Flex><Box mt={3}>{actions(item)}</Box></Box>)}</VStack>
      </>}
      <Text p={3} color={gray} fontSize="10px">Esta lista usa a competência da data prevista. O Financeiro Geral soma apenas recebimentos efetivos no mês em que aconteceram. Mensalidades permanecem na aba própria e não devem ser cadastradas novamente aqui.</Text>
    </Box>
    <Dialog.Root open={Boolean(dialog)} onOpenChange={change => { if (!change.open) close(); }} size="lg"><Portal><Dialog.Backdrop/><Dialog.Positioner><Dialog.Content mx={3} maxW="540px" borderRadius="11px">
      <Dialog.Header><Dialog.Title fontSize="17px" color={green}>{dialog === "history" ? "Histórico do provento" : dialog === "receive" ? "Registrar recebimento" : dialog === "cancel" ? "Cancelar provento" : dialog === "delete" ? "Excluir provento" : editing ? (editing.status === "received" ? "Corrigir provento recebido" : "Editar provento") : "Novo provento"}</Dialog.Title></Dialog.Header>
      <Dialog.Body><VStack align="stretch" gap={3}>
        {dialog === "history" ? <VStack align="stretch" gap={2} maxH="420px" overflowY="auto">{[...(editing?.history || [])].reverse().map((entry, index) => <Box key={`${entry.at}-${index}`} p={3} border="1px solid #e1e9e7" borderRadius="8px"><Flex justify="space-between" gap={2}><Text fontSize="12px" color={green} fontWeight="700">{historyLabels[entry.action] || entry.action}</Text><Text fontSize="10px" color={gray}>{entry.at ? new Date(entry.at).toLocaleString("pt-BR") : "—"}</Text></Flex>{entry.details && <Text fontSize="11px" color={gray}>{entry.details}</Text>}{entry.reason && <Text fontSize="11px" color="#80551f">Justificativa: {entry.reason}</Text>}<ChangedFields entry={entry}/></Box>)}</VStack> :
        dialog === "cancel" || dialog === "delete" ? <>
          <Text fontSize="12px" color={gray}><b>{editing?.description}</b> · {money(editing?.amount)}</Text>
          <Text fontSize="12px" color={dialog === "delete" ? "#b32f32" : gray}>{dialog === "delete" ? "Exclusão definitiva permitida apenas para provento pendente sem alterações. Esta operação não pode ser desfeita." : editing?.status === "received" ? "O lançamento deixará de contar nos resultados. Cancele apenas se o recebimento foi lançado indevidamente ou o valor foi efetivamente estornado." : "O lançamento deixará de compor as receitas previstas."}</Text>
          {dialog === "cancel" && <Field label="Justificativa obrigatória"><Textarea fontSize="12px" minH="80px" maxLength={500} placeholder="Informe o motivo do cancelamento" value={reason} onChange={e => setReason(e.target.value)}/></Field>}
        </> : dialog === "receive" ? <>
          <Text fontSize="12px" fontWeight="700" color={green}>{editing?.description} · previsto {money(editing?.amount)}</Text>
          <SimpleGrid columns={2} gap={3}><Field label="Valor recebido (R$)"><Input {...fieldStyle} type="number" min="0.01" step="0.01" value={receipt.receivedAmount} onChange={e => changeReceipt("receivedAmount", e.target.value)}/></Field><Field label="Data do recebimento"><Input {...fieldStyle} type="date" max={today()} value={receipt.receivedAt} onChange={e => changeReceipt("receivedAt", e.target.value)}/></Field></SimpleGrid>
          <Field label="Responsável pelo recebimento"><NativeSelect.Root size="sm"><NativeSelect.Field aria-label="Responsável pelo recebimento" required value={receipt.initiatorKey} onChange={e => changeReceipt("initiatorKey", e.target.value)}><option value="">Selecione...</option>{financialInitiators.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Field>
          <Field label="Forma de recebimento"><NativeSelect.Root size="sm"><NativeSelect.Field value={receipt.method} onChange={e => changeReceipt("method", e.target.value)}>{paymentMethods.map(value => <option key={value}>{value}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Field>
          <Field label="Observações (opcional)"><Input {...fieldStyle} maxLength={500} value={receipt.notes} onChange={e => changeReceipt("notes", e.target.value)}/></Field>
        </> : dialog === "form" ? <>
          <Field label="Descrição"><Input {...fieldStyle} maxLength={180} placeholder="Ex.: Venda de camisetas" value={form.description} onChange={e => change("description", e.target.value)}/></Field>
          <SimpleGrid columns={2} gap={3}><Field label="Categoria"><NativeSelect.Root size="sm"><NativeSelect.Field value={form.category} onChange={e => change("category", e.target.value)}>{revenueCategories.map(value => <option key={value}>{value}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Field><Field label="Valor previsto (R$)"><Input {...fieldStyle} type="number" step="0.01" min="0.01" value={form.amount} onChange={e => change("amount", e.target.value)}/></Field></SimpleGrid>
          <Field label="Responsável"><NativeSelect.Root size="sm"><NativeSelect.Field aria-label="Responsável pelo provento" required value={form.initiatorKey} onChange={e => change("initiatorKey", e.target.value)}><option value="">Selecione...</option>{financialInitiators.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Field>
          <Field label="Data prevista para recebimento"><Input {...fieldStyle} type="date" value={form.dueDate} onChange={e => change("dueDate", e.target.value)}/></Field>
          {!editing && <Flex gap={2} align="center" p={3} bg="#f4f8f7" borderRadius="8px"><input id="revenue-received-now" type="checkbox" checked={form.receivedNow} onChange={e => setForm(current => ({ ...current, receivedNow: e.target.checked, receivedAmount: e.target.checked && !current.receivedAmount ? String(current.amount) : current.receivedAmount }))}/><label htmlFor="revenue-received-now" style={{ fontSize: "12px", color: green, cursor: "pointer" }}>Este valor já foi recebido</label></Flex>}
          {((form.receivedNow && !editing) || editing?.status === "received") && <>
            <SimpleGrid columns={2} gap={3}><Field label="Valor efetivamente recebido"><Input {...fieldStyle} type="number" min="0.01" step="0.01" value={form.receivedAmount} onChange={e => change("receivedAmount", e.target.value)}/></Field><Field label="Data do recebimento"><Input {...fieldStyle} type="date" max={today()} value={form.receivedAt || today()} onChange={e => change("receivedAt", e.target.value)}/></Field></SimpleGrid>
            <Field label="Forma de recebimento"><NativeSelect.Root size="sm"><NativeSelect.Field value={form.method || "Pix"} onChange={e => change("method", e.target.value)}>{paymentMethods.map(value => <option key={value}>{value}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Field>
          </>}
          <Field label="Observações (opcional)"><Input {...fieldStyle} maxLength={500} value={form.notes} onChange={e => change("notes", e.target.value)}/></Field>
          {editing?.status === "received" && <><Field label="Justificativa obrigatória para correção"><Textarea fontSize="12px" minH="80px" maxLength={500} placeholder="Explique a alteração" value={reason} onChange={e => setReason(e.target.value)}/></Field><Text fontSize="11px" color={gray}>O histórico preserva os valores anteriores e o resultado financeiro será recalculado.</Text></>}
        </> : null}
        {actionError && <Text color="#bd3030" fontSize="12px"><FiAlertCircle style={{ display: "inline" }}/> {actionError}</Text>}
      </VStack></Dialog.Body>
      <Dialog.Footer><Button variant="outline" onClick={close} disabled={saving}>{dialog === "history" ? "Fechar" : "Voltar"}</Button>{dialog !== "history" && <Button bg={dialog === "delete" ? "#b32f32" : green} color="white" loading={saving} disabled={((dialog === "cancel" || (dialog === "form" && editing?.status === "received")) && !reason.trim()) || (dialog === "form" && !form.initiatorKey) || (dialog === "receive" && !receipt.initiatorKey)} onClick={dialog === "receive" ? registerReceipt : dialog === "cancel" ? cancel : dialog === "delete" ? remove : save}>{dialog === "receive" ? "Confirmar recebimento" : dialog === "cancel" ? "Cancelar provento" : dialog === "delete" ? "Excluir definitivamente" : editing ? "Salvar alterações" : "Cadastrar provento"}</Button>}</Dialog.Footer>
      <Dialog.CloseTrigger asChild><Button size="sm" variant="ghost" position="absolute" right="9px" top="9px" onClick={close}><FiX/></Button></Dialog.CloseTrigger>
    </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
  </VStack>;
}
