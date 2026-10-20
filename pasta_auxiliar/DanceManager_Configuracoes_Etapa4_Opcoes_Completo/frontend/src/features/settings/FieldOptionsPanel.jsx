import { useEffect, useState } from "react";
import { Badge, Box, Button, Flex, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { FiArrowDown, FiArrowUp, FiCheck, FiEdit2, FiPlus, FiRefreshCw, FiX } from "react-icons/fi";
import { loadFieldOptions } from "../../utils/userSelectOptions.js";

const API = import.meta.env.VITE_API_URL;
const SITUATIONS = {"1":"Ativo","2":"Afastado","3":"Cadastro pendente","4":"Inativo"};

/* Edição somente das opções explicitamente liberadas em fields.optionsEditable.
   Todos os códigos permanecem imutáveis, inclusive os desativados. */
export default function FieldOptionsPanel({ field, teachers = [], teachersLoading = false, teachersError = "" }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [renameCode, setRenameCode] = useState("");
  const [renameText, setRenameText] = useState("");
  const dynamic = field?.optionsSource === "dynamic" || field?.field === "activity_teachers";

  const load = async (signal) => {
    if (!field?._id || dynamic) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API}/field-options/${encodeURIComponent(field._id)}`, { signal });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.body || "Erro ao carregar as opções.");
      if (!signal?.aborted) setRecord(result.body);
    } catch (e) {
      if (!signal?.aborted) setError(String(e.message || e));
    } finally { if (!signal?.aborted) setLoading(false); }
  };
  useEffect(() => {
    setRecord(null); setRenameCode(""); setNewName("");
    const controller = new AbortController(); load(controller.signal);
    return () => controller.abort();
  }, [field?._id, dynamic]);

  const send = async (action, details = {}) => {
    if (!record || saving || !record.editable) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API}/field-options/${encodeURIComponent(field._id)}`, {
        method: "PATCH", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({action, revision:record.revision, ...details})
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.body || "Não foi possível salvar.");
      setRecord(result.body);
      setNewName(""); setRenameCode(""); setRenameText("");
      await loadFieldOptions(true);
    } catch (e) { setError(String(e.message || e)); }
    finally { setSaving(false); }
  };
  if (dynamic) return <VStack align="stretch" gap={2}>
    <Flex gap={2} align="center"><Badge bg="#e7f0fa" color="#235c98">Origem dinâmica</Badge><Text fontSize="12px" color="#627b75">Professores cadastrados em Gestão de Pessoas.</Text></Flex>
    {teachersLoading ? <Spinner size="sm"/> : teachersError ? <Text color="#a32f31" fontSize="12px">{teachersError}</Text> :
      !teachers.length ? <Text fontSize="12px" color="#718781">Nenhum professor encontrado.</Text> :
      teachers.map(teacher => <Flex key={String(teacher._id)} justify="space-between" gap={2} borderBottom="1px solid #e5ece9" py={2}>
        <Box><Text fontSize="12px" fontWeight="600">{teacher.user_name || "Professor"}</Text><Text fontSize="10px" color="#708680">{teacher.user_mat || teacher._id}</Text></Box>
        <Badge bg="#eef3f1" fontSize="10px">{SITUATIONS[String(teacher.user_situation)] || "Não informada"}</Badge>
      </Flex>)}
  </VStack>;

  return <VStack align="stretch" gap={3}>
    <Flex align="center" justify="space-between" gap={2}>
      <Box>
        <Text fontWeight="700" fontSize="13px" color="#163b37">Opções do campo</Text>
        <Text fontSize="11px" color="#768983">Chave: {field?.optionsKey || field?.field}</Text>
      </Box>
      <Flex align="center" gap={2}>
        <Badge bg={record?.editable ? "#dff5e6" : "#eef0f2"} color={record?.editable ? "#14833b" : "#637673"}>{record?.editable ? "Editável" : "Somente leitura"}</Badge>
        <Button size="xs" variant="outline" disabled={saving || loading} aria-label="Atualizar opções" onClick={() => load()}><FiRefreshCw/></Button>
      </Flex>
    </Flex>
    {loading && <Flex align="center" gap={2}><Spinner size="xs"/><Text fontSize="12px">Carregando opções...</Text></Flex>}
    {error && <Box p={2} role="alert" bg="#fff2f0" borderRadius="7px"><Text color="#a32f31" fontSize="12px">{error}</Text></Box>}
    {!loading && record?.options?.length === 0 && <Text fontSize="12px" color="#986b22">Não há opções no banco para este campo. Importe o JSON inicial na coleção fieldOptions.</Text>}
    {record?.options?.map((option, index) => <Flex key={option.value} align="center" gap={2} px={3} py={2} border="1px solid #e1eae7" borderRadius="8px" bg="white" flexWrap="wrap">
      <Text fontSize="11px" fontFamily="mono" color="#718781" w="28px">{option.value}</Text>
      {renameCode === option.value ? <Input flex="1" minW="150px" size="sm" value={renameText} onChange={e => setRenameText(e.target.value)} maxLength={100}/> :
        <Text fontSize="12px" flex="1" minW="100px" fontWeight="600" color="#234a44">{option.label}</Text>}
      <Badge bg={option.active ? "#e4f5e9" : "#edf0f1"} color={option.active ? "#14833b" : "#617371"}>{option.active ? "Ativa" : "Inativa"}</Badge>
      {record?.editable && <Flex gap={1} align="center">
        {renameCode === option.value ? <>
          <Button size="xs" variant="outline" disabled={saving || !renameText.trim()} onClick={() => send("rename", {value:option.value,label:renameText})} aria-label="Salvar novo nome"><FiCheck/></Button>
          <Button size="xs" variant="ghost" onClick={() => setRenameCode("")} aria-label="Cancelar nome"><FiX/></Button>
        </> : <>
          <Button size="xs" variant="outline" disabled={saving || index === 0} aria-label="Subir opção" onClick={() => {const values=record.options.map(o=>o.value);[values[index-1],values[index]]=[values[index],values[index-1]];send("reorder",{values});}}><FiArrowUp/></Button>
          <Button size="xs" variant="outline" disabled={saving || index === record.options.length - 1} aria-label="Descer opção" onClick={() => {const values=record.options.map(o=>o.value);[values[index+1],values[index]]=[values[index],values[index+1]];send("reorder",{values});}}><FiArrowDown/></Button>
          <Button size="xs" variant="ghost" disabled={saving} aria-label="Renomear opção" onClick={() => {setRenameCode(option.value);setRenameText(option.label);}}><FiEdit2/></Button>
          <Button size="xs" variant="outline" disabled={saving} onClick={() => send("toggle",{value:option.value})}>{option.active?"Desativar":"Reativar"}</Button>
        </>}
      </Flex>}
    </Flex>)}
    {record?.editable && <Flex gap={2} align="center" flexWrap="wrap" pt={2}>
      <Input flex="1" minW="160px" placeholder="Nome da nova opção" size="sm" value={newName} maxLength={100} onChange={e => setNewName(e.target.value)}/>
      <Button size="sm" bg="#0b6b5b" color="white" disabled={!newName.trim() || saving} loading={saving} onClick={() => send("add",{label:newName})}><FiPlus/> Adicionar</Button>
    </Flex>}
    <Text fontSize="11px" color="#6c827d">Códigos nunca são modificados nem reutilizados. Opções inativas permanecem nos cadastros anteriores.</Text>
  </VStack>;
}
