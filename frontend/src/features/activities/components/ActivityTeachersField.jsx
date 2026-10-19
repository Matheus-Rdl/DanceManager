import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { Badge, Box, Field, Text, Wrap } from "@chakra-ui/react";

const API = `${import.meta.env.VITE_API_URL}/activities/teachers`;

/* Seleção múltipla de usuários professores (user_type = 3), salvando apenas os _id. */
export default function ActivityTeachersField({ field, value, details = [], mode, onChange, error }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const values = useMemo(() => Array.isArray(value) ? value.map(String) : value ? [String(value)] : [], [value]);
  const names = useMemo(() => new Map((details || []).map(item => [String(item.id), item.name])), [details]);

  useEffect(() => {
    if (mode === "V") return;
    let alive = true;
    setLoading(true);
    fetch(API).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result?.body || "Não foi possível carregar professores.");
      const situation = { "1": "", "2": " (AFASTADO)", "3": " (CADASTRO PENDENTE)", "4": " (INATIVO)" };
      if (alive) setOptions((result.body || []).map(user => ({
        value: String(user._id),
        label: `${user.user_name || user.user_mat || "Professor"}${situation[String(user.user_situation)] ?? ""}`
      })));
    }).catch(err => { if (alive) setRequestError(String(err.message || err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [mode]);

  const byId = new Map(options.map(option => [option.value, option.label]));
  const selected = values.map(id => ({ value: id, label: byId.get(id) || names.get(id) || "Professor anteriormente vinculado" }));
  const allOptions = [...options, ...selected.filter(option => !byId.has(option.value))];
  const editable = mode === "E" || mode === "A";
  return <Field.Root invalid={Boolean(error)} width={{ base: "100%", md: "min(520px, 100%)" }}>
    <Field.Label fontWeight="bold" color="#163b37">{field.title || "Professores"}{field.required && <Text as="span" color="#d14343" ml={1}>*</Text>}</Field.Label>
    {mode === "V" ? <Wrap gap={2}>{selected.length ? selected.map(option => <Badge key={option.value} bg="#dff5e6" color="#14833b" px={2} py={1}>{option.label}</Badge>) : <Text color="#71858a" fontSize="12px">Não informado</Text>}</Wrap> :
      <Select isMulti isClearable isLoading={loading} isDisabled={!editable} options={allOptions} value={selected}
        onChange={choices => onChange({ target: { name: "activity_teachers", value: (choices || []).map(item => item.value) } })}
        placeholder="Selecione um ou mais professores..." noOptionsMessage={() => "Nenhum professor ativo cadastrado"}
        styles={{ control: base => ({ ...base, minHeight: 38, borderColor: error ? "#c53030" : "#cfd9d7", borderRadius: 6 }), menu: base => ({ ...base, zIndex: 15 }) }} />}
    {requestError && <Text fontSize="11px" color="#c53030">{requestError}</Text>}
    {error && <Field.ErrorText fontSize="11px">{error}</Field.ErrorText>}
    <Text mt={1} fontSize="10px" color="#60777c">A lista inclui usuários do tipo PROFESSOR(A), indicando também situações como afastado ou inativo.</Text>
  </Field.Root>;
}
