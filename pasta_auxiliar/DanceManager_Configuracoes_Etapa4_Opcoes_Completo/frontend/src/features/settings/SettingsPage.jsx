import { useEffect, useMemo, useState } from "react";
import {
  Badge, Box, Button, Dialog, Flex, Heading, Input, Textarea,
  Portal, SimpleGrid, Spinner, Text, VStack
} from "@chakra-ui/react";
import {
  FiCalendar, FiChevronRight, FiFileText, FiLayers,
  FiRefreshCw, FiSearch, FiSettings, FiUsers, FiX, FiEdit2, FiCheck, FiArrowUp, FiArrowDown, FiMove, FiFolder, FiMinus
} from "react-icons/fi";
import FieldOptionsPanel from "./FieldOptionsPanel.jsx";
import { useFieldOptions } from "../../utils/userSelectOptions.js";

/* Configurações, etapa 2: consulta e edição das propriedades permitidas.
   As seções são identificadas por fields.folder = menus.order (na mesma pageId).
   Menus sem campos NÃO aparecem. A ordem de cada campo é dada por field.order. */
const API = import.meta.env.VITE_API_URL;
const INPUT_TYPES = { 1: "Campo de entrada", 2: "Seleção única", 3: "Seleção múltipla", 4: "Texto longo" };
const MENU_FALLBACK = { cadastrais: "Dados cadastrais", funcionais: "Dados funcionais", contatos: "Contatos" };

const display = value => value === undefined || value === null || value === "" ? "—" : String(value);
const isAbort = error => error?.name === "AbortError";
const menuOrder = value => Number(value) === 0 ? Number.MAX_SAFE_INTEGER : Number(value) || Number.MAX_SAFE_INTEGER;

async function getApi(path, signal) {
  const response = await fetch(`${API}${path}`, { signal });
  const result = await response.json();
  if (!response.ok || result?.success === false || result?.ok === false) {
    const detail = result?.body?.message || result?.serverError || result?.message || result?.body;
    throw new Error(typeof detail === "string" ? detail : "Não foi possível carregar as informações.");
  }
  return result?.body ?? result;
}

function TabButton({ active, onClick, children, icon: Icon }) {
  return <Button type="button" size="sm" variant="ghost" aria-pressed={active} onClick={onClick}
    bg={active ? "#e7f4f0" : "transparent"} color={active ? "#076454" : "#607873"}
    fontWeight={active ? "700" : "500"} px={4} borderRadius="8px"
    _hover={{ bg: active ? "#e7f4f0" : "#f3f7f6" }}>
    {Icon && <Icon size={15}/>} {children}
  </Button>;
}

function Info({ name, value, mono = false }) {
  return <Box minW={0}>
    <Text fontSize="11px" fontWeight="600" color="#6a807a" mb={1}>{name}</Text>
    <Text fontSize="13px" color="#173c37" fontWeight="500" fontFamily={mono ? "mono" : "inherit"}
      overflowWrap="anywhere">{display(value)}</Text>
  </Box>;
}

function EditableProperty({ name, value, onChange, disabled = false, multi = false, type = "text" }) {
  return <Box>
    <Text fontSize="11px" fontWeight="700" color="#476d64" mb={1}>{name}</Text>
    {multi ? <Textarea value={value} onChange={event => onChange(event.target.value)} disabled={disabled}
      fontSize="13px" minH="110px" resize="vertical" borderColor="#cfdcd7" borderRadius="7px"/> :
      <Input type={type} value={value} onChange={event => onChange(event.target.value)} disabled={disabled}
        fontSize="13px" h="38px" borderColor="#cfdcd7" borderRadius="7px"/>}
  </Box>;
}

/* Organiza somente o campo selecionado. Os outros itens são referências para a posição. */
function MenuOrderPanel({ field, fields, menus, canReorder, canChangeMenu, lists, setLists, saving, saveError }) {
  const id = String(field?._id);
  const pageMenus = useMemo(() => menus.filter(menu => menu.pageId === field?.pageId)
    .sort((a,b) => menuOrder(a.order) - menuOrder(b.order) || String(a.name).localeCompare(String(b.name), "pt-BR")), [menus, field?.pageId]);
  const pageFields = useMemo(() => fields.filter(f => f.pageId === field?.pageId && f.collection === field?.collection), [fields, field?.pageId, field?.collection]);
  const fieldsMap = useMemo(() => new Map(pageFields.map(f => [String(f._id), f])), [pageFields]);
  const selectedMenu = pageMenus.find(m => (lists[m.id] || []).includes(id));
  const selectedIndex = selectedMenu ? lists[selectedMenu.id].indexOf(id) : -1;
  const place = (menuId, index) => {
    if (!canReorder || saving || !pageMenus.some(m => m.id === menuId) ||
        (selectedMenu?.id !== menuId && !canChangeMenu)) return;
    setLists(previous => {
      const next = Object.fromEntries(Object.entries(previous).map(([key, arr]) => [key, arr.filter(x => x !== id)]));
      const target = [...(next[menuId] || [])];
      target.splice(Math.max(0, Math.min(index, target.length)), 0, id);
      next[menuId] = target;
      return next;
    });
  };
  const dropOn = (e, menuId, index) => {
    e.preventDefault(); e.stopPropagation();
    const transferId = e.dataTransfer.getData("text/plain");
    if (transferId === id) {
      const destinationIndex = selectedMenu?.id === menuId && selectedIndex < index ? index - 1 : index;
      place(menuId, destinationIndex);
    }
  };
  return <VStack align="stretch" gap={3}>
    <Box border="1px solid #dae9e3" bg="#f6faf8" borderRadius="9px" p={3}>
      <Text fontWeight="700" color="#19473f" fontSize="12px" mb={2}>Mover campo selecionado</Text>
      <Text fontSize="11px" color="#607873" mb={3}>Os menus e campos vêm do MongoDB. Use as setas ou arraste o item verde. Em telas touch, use o menu de destino e as setas.</Text>
      <Flex gap={3} flexWrap="wrap" align="end">
        <Box flex="1" minW="190px">
          <Text as="label" htmlFor="move-field-menu" fontSize="11px" fontWeight="700" color="#476d64" mb={1} display="block">Menu de destino</Text>
          <Box as="select" id="move-field-menu" w="100%" h="38px" px={2} borderRadius="7px" bg="white" border="1px solid #cfdcd7"
            fontSize="12px" color="#19473f" disabled={!canReorder || !canChangeMenu || saving}
            value={selectedMenu?.id || ""} onChange={e => place(e.target.value, (lists[e.target.value] || []).length)}>
            {!selectedMenu && <option value="">Escolha um menu</option>}
            {pageMenus.map(menu => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
          </Box>
        </Box>
        <Flex gap={2}>
          <Button size="sm" variant="outline" disabled={!canReorder || saving || selectedIndex <= 0}
            onClick={() => place(selectedMenu.id, selectedIndex-1)}><FiArrowUp/> Subir</Button>
          <Button size="sm" variant="outline" disabled={!canReorder || saving || !selectedMenu || selectedIndex >= (lists[selectedMenu.id]||[]).length-1}
            onClick={() => place(selectedMenu.id, selectedIndex+1)}><FiArrowDown/> Descer</Button>
        </Flex>
      </Flex>
      {!canReorder && <Text mt={2} fontSize="11px" color="#986b22">Este campo está protegido contra movimentação.</Text>}
      {canReorder && !canChangeMenu && <Text mt={2} fontSize="11px" color="#986b22">Você pode mudar a posição, mas o banco ainda não autoriza mudar de menu.</Text>}
    </Box>
    <VStack align="stretch" gap={2}>
      {pageMenus.map(menu => {
        const items = lists[menu.id] || [];
        const acceptDrop = canReorder && (canChangeMenu || selectedMenu?.id === menu.id);
        return <Box key={String(menu._id || menu.id)} border="1px solid #dce7e2" borderRadius="9px" overflow="hidden"
          onDragOver={e => { if (acceptDrop) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
          onDrop={e => dropOn(e, menu.id, items.length)}>
          <Flex px={3} py={2.5} justify="space-between" align="center" bg="#f3f8f6" borderBottom="1px solid #e5eeea">
            <Flex align="center" gap={2}><FiFolder size={14} color="#557b6e"/><Text fontSize="12px" color="#19473f" fontWeight="700">{menu.name}</Text></Flex>
            <Text color="#7c928b" fontSize="11px">{items.length} {items.length===1?"campo":"campos"}</Text>
          </Flex>
          {items.length===0 ? <Box px={3} py={3} bg="white"><Text fontSize="11px" color="#93a49e">Menu vazio {acceptDrop ? "— solte o campo aqui" : ""}</Text></Box> :
            items.map((itemId, index) => {
              const item = fieldsMap.get(itemId);
              const selected = itemId === id;
              return <Flex key={itemId} align="center" gap={2} px={3} py={2.5}
                borderBottom={index===items.length-1?"none":"1px solid #edf2f0"}
                bg={selected?"#e0f5e8":"white"}
                draggable={selected && canReorder && !saving}
                cursor={selected && canReorder ? "grab" : "default"}
                onDragStart={e => { if (!selected || !canReorder) {e.preventDefault();return;} e.dataTransfer.setData("text/plain", id);e.dataTransfer.effectAllowed="move"; }}
                onDragOver={e => {if (acceptDrop) {e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="move";}}}
                onDrop={e => {const r=e.currentTarget.getBoundingClientRect(); const after=e.clientY>r.top+r.height/2; dropOn(e,menu.id,index+(after?1:0));}}>
                <Box color={selected?"#14833b":"#b2c2ba"}>{selected?<FiMove size={14}/>:<FiMinus size={12}/>}</Box>
                <Text fontSize="11px" color="#8aa198" minW="16px">{index+1}</Text>
                <Text flex="1" fontSize="12px" fontWeight={selected?"700":"500"} color={selected?"#14833b":"#294b44"}>{item?.title || item?.field || itemId}</Text>
                {selected && <Badge fontSize="10px" bg="#caebd5" color="#14833b">Selecionado</Badge>}
              </Flex>;
            })}
        </Box>;
      })}
    </VStack>
    {saveError && <Box role="alert" p={2} bg="#fff0f0" color="#a22d2d" fontSize="12px" borderRadius="7px">{saveError}</Box>}
  </VStack>;
}

function DetailsDialog({ field, fields, menus, onClose, onSaved, teachers, teachersLoading, teachersError }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title:"", helpText:"", order:"", width:"" });
  const [dialogTab, setDialogTab] = useState("info");
  const [lists, setLists] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const allowed = field?.settingsEditable === true && Array.isArray(field.editableProperties)
    ? field.editableProperties.filter(key => ["title", "helpText", "order", "width", "folder", "menuId"].includes(key)) : [];
  useEffect(() => {
    setEditing(false); setDialogTab("info"); setSaveError("");
  }, [field?._id]);
  useEffect(() => {
    setForm({title:field?.title || "",helpText:field?.helpText || "",order:String(field?.order ?? ""),width:field?.width || ""});
  }, [field?._id, field?.title, field?.helpText, field?.order, field?.width]);
  const pageMenus = useMemo(() => menus.filter(m => m.pageId === field?.pageId)
    .sort((a, b) => menuOrder(a.order) - menuOrder(b.order)), [menus, field?.pageId]);
  const pageFields = useMemo(() => fields.filter(f => f.pageId === field?.pageId && f.collection === field?.collection), [fields, field?.pageId, field?.collection]);
  const originalLists = useMemo(() => Object.fromEntries(pageMenus.map(menu => [menu.id,
    pageFields.filter(f => Number(f.folder) === Number(menu.order))
      .sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0) || String(a._id).localeCompare(String(b._id)))
      .map(f => String(f._id))])), [pageMenus,pageFields]);
  useEffect(() => { setLists(originalLists); }, [field?._id, originalLists]);
  const fieldId = String(field?._id);
  const originalMenu = pageMenus.find(m => (originalLists[m.id] || []).includes(fieldId));
  const selectedMenu = pageMenus.find(m => (lists[m.id] || []).includes(fieldId));
  const originalIndex = originalMenu ? originalLists[originalMenu.id].indexOf(fieldId) : -1;
  const selectedIndex = selectedMenu ? lists[selectedMenu.id].indexOf(fieldId) : -1;
  const placementDirty = Boolean(selectedMenu) && (selectedMenu.id !== originalMenu?.id || selectedIndex !== originalIndex);
  const canReorder = allowed.includes("order");
  const canEditInfo = allowed.some(key => ["title", "helpText", "width"].includes(key));
  const canChangeMenu = canReorder && allowed.includes("menuId") && allowed.includes("folder");
  const savePlacement = async () => {
    if (!field || !canReorder || !placementDirty || saving) return;
    setSaving(true);setSaveError("");
    try {
      const response = await fetch(`${API}/fields/${encodeURIComponent(field._id)}/placement`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({menuId:selectedMenu.id,position:selectedIndex})
      });
      const result = await response.json();
      if (!response.ok || result.success === false)
        throw new Error(typeof result.body === "string" ? result.body : result?.body?.message || result.message || "Não foi possível reorganizar o campo.");
      onSaved(result.body.field);
    } catch (e) { setSaveError(e.message || "Erro ao salvar posição."); }
    finally {setSaving(false);}
  };
  const setProp = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async () => {
    if (!field || saving) return;
    const payload = {};
    for (const key of allowed.filter(key => ["title", "helpText", "width"].includes(key))) {
      const original = String(field[key] ?? "");
      if (form[key] !== original) payload[key] = form[key];
    }
    if (!Object.keys(payload).length) { setEditing(false); return; }
    setSaving(true); setSaveError("");
    try {
      const response = await fetch(`${API}/fields/${encodeURIComponent(field._id)}/settings`, {
        method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(typeof result.body === "string" ? result.body : result.message || "Não foi possível salvar o campo.");
      onSaved(result.body);
      setEditing(false);
    } catch (error) { setSaveError(error.message || "Erro ao salvar campo."); }
    finally { setSaving(false); }
  };

  const input = Number(field?.input);
  const hasOptions = input === 2 || input === 3;
  const dynamic = field?.field === "activity_teachers";
  return <Dialog.Root open={Boolean(field)} onOpenChange={event => { if (!event.open) onClose(); }} size="lg" placement="center">
    <Portal><Dialog.Backdrop/><Dialog.Positioner>
      <Dialog.Content mx={3} maxW="700px" maxH="90dvh" borderRadius="12px" overflow="hidden">
        <Dialog.Header borderBottom="1px solid #e5ece9" pr={12}>
          <Box>
            <Dialog.Title color="#103c35" fontSize="17px">{field?.title || field?.field || "Detalhes do campo"}</Dialog.Title>
            <Text mt={1} fontSize="11px" fontFamily="mono" color="#718781">{display(field?.field)}</Text>
          </Box>
        </Dialog.Header>
        <Flex px={4} pt={3} gap={1} borderBottom="1px solid #e5ece9" wrap="wrap">
          <TabButton active={dialogTab === "info"} onClick={() => { setDialogTab("info");setSaveError(""); }}>Informações do campo</TabButton>
          <TabButton active={dialogTab === "order"} onClick={() => {setEditing(false);setDialogTab("order");setSaveError("");}}>Menus e ordem</TabButton>
          {hasOptions && <TabButton active={dialogTab === "options"} onClick={() => {setEditing(false);setDialogTab("options");setSaveError("");}}>Opções</TabButton>}
        </Flex>
        <Dialog.Body py={4} overflowY="auto">
          {field && dialogTab === "options" && hasOptions && <FieldOptionsPanel field={field} teachers={teachers} teachersLoading={teachersLoading} teachersError={teachersError}/>}
          {field && dialogTab === "order" ? <MenuOrderPanel field={field} fields={fields} menus={menus}
            canReorder={canReorder} canChangeMenu={canChangeMenu} lists={lists} setLists={setLists} saving={saving} saveError={saveError}/> : null}
          {field && dialogTab === "info" && <VStack align="stretch" gap={4}>
            <SimpleGrid columns={{base:2,sm:3}} gap={4} p={3} borderRadius="8px" bg="#f7faf9" border="1px solid #e9efec">
              <Info name="Código" value={field.field} mono/>
              <Info name="Ordem no menu" value={field.order}/>
              <Info name="Seção (folder)" value={field.folder}/>
              <Info name="Tipo de campo" value={`Tipo ${input} — ${INPUT_TYPES[input] || "Não identificado"}`}/>
              <Info name="Tipo de dado" value={field.type || (input === 2 ? "select" : input === 3 ? "multiselect" : input === 4 ? "textarea" : "—")}/>
              <Info name="Obrigatório" value={field.required === true ? "Sim" : "Não"}/>
              <Info name="Tamanho mínimo" value={field.minLength}/>
              <Info name="Tamanho máximo" value={field.maxLength}/>
              <Info name="Largura" value={field.width}/>
              <Info name="Modo" value={field.mode}/>
              <Info name="Menu" value={field.menuId}/>
              <Info name="Página" value={field.pageId}/>
            </SimpleGrid>
            <Flex gap={2} align="center" flexWrap="wrap">
              <Badge borderRadius="full" bg="#eef3f1" color="#4d6c62" fontSize="10px">
                {field.origin === "custom" ? "Personalizado" : "Sistema"}
              </Badge>
              <Badge borderRadius="full" fontSize="10px" bg={allowed.length ? "#dff5e6" : "#eef0f2"}
                color={allowed.length ? "#14833b" : "#637673"}>
                {allowed.length ? "Edição permitida" : "Protegido"}
              </Badge>
            </Flex>
            {editing && <Box border="1px solid #d5e7e0" borderRadius="9px" bg="#f8fbf9" p={3}>
              <Text fontSize="12px" fontWeight="700" color="#0b6b5b" mb={3}>Editar campo</Text>
              <VStack align="stretch" gap={3}>
                {allowed.includes("title") && <EditableProperty name="Título" value={form.title} onChange={value => setProp("title", value)}/>}
                {allowed.includes("helpText") && <EditableProperty name="Informação de ajuda (helpText)" value={form.helpText} onChange={value => setProp("helpText", value)} multi/>}
                {allowed.includes("width") && <EditableProperty name="Largura (ex.: 220px)" value={form.width} onChange={value => setProp("width", value)}/>}
                {/* A ordem e o menu são editados exclusivamente na aba Menus e ordem. */}
              </VStack>
            </Box>}
            {saveError && <Box role="alert" bg="#fff0f0" color="#a22d2d" fontSize="12px" borderRadius="6px" p={2}>{saveError}</Box>}
            {field.helpText && !editing && <Box px={3} py={2} bg="#f1f7f5" borderRadius="7px">
              <Text fontSize="11px" fontWeight="700" color="#416b61" mb={1}>Informação do campo</Text>
              <Text fontSize="12px" color="#345e55">{field.helpText}</Text>
            </Box>}
          </VStack>}
        </Dialog.Body>
        <Dialog.Footer borderTop="1px solid #e5ece9">
          {dialogTab === "options" ? <Button size="sm" variant="outline" onClick={onClose}>Fechar</Button> : dialogTab === "order" ? <>
            <Button size="sm" variant="outline" disabled={saving} onClick={() => setLists(originalLists)}>Desfazer</Button>
            <Button size="sm" bg="#0b6b5b" color="white" loading={saving} disabled={!placementDirty || !canReorder} onClick={savePlacement}><FiCheck/> Salvar posição</Button>
          </> : editing ? <>
            <Button size="sm" variant="outline" disabled={saving} onClick={() => { setEditing(false); setSaveError(""); }}>Cancelar</Button>
            <Button size="sm" bg="#0b6b5b" color="white" loading={saving} onClick={submit}><FiCheck/> Salvar</Button>
          </> : <>
            <Button size="sm" variant="outline" onClick={onClose}>Fechar</Button>
            {canEditInfo && <Button size="sm" bg="#0b6b5b" color="white" onClick={() => {setSaveError("");setEditing(true);}}><FiEdit2/> Editar</Button>}
          </>}
        </Dialog.Footer>
        <Dialog.CloseTrigger asChild><Button size="sm" variant="ghost" aria-label="Fechar detalhes"
          position="absolute" right="10px" top="10px" onClick={onClose}><FiX/></Button></Dialog.CloseTrigger>
      </Dialog.Content>
    </Dialog.Positioner></Portal>
  </Dialog.Root>;
}

export default function SettingsPage() {
  useFieldOptions();
  const [mainTab, setMainTab] = useState("fields");
  const [collection, setCollection] = useState("activities");
  const [search, setSearch] = useState("");
  const [fields, setFields] = useState([]);
  const [menus, setMenus] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    Promise.all([
      getApi("/fields", controller.signal),
      getApi("/menus", controller.signal).catch(err => { if (!isAbort(err)) return []; throw err; })
    ]).then(([fieldRows, menuRows]) => {
      if (controller.signal.aborted) return;
      setFields(Array.isArray(fieldRows) ? fieldRows : []);
      setMenus(Array.isArray(menuRows) ? menuRows : []);
    }).catch(err => {
      if (controller.signal.aborted) return;
      setFields([]); setMenus([]); setError(err.message || "Não foi possível carregar campos.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (selectedField?.field !== "activity_teachers") return;
    const controller = new AbortController();
    setTeachersLoading(true); setTeachersError("");
    getApi("/activities/teachers", controller.signal)
      .then(rows => { if (!controller.signal.aborted) setTeachers(Array.isArray(rows) ? rows : []); })
      .catch(err => { if (!controller.signal.aborted) { setTeachers([]); setTeachersError(err.message || "Não foi possível carregar professores."); } })
      .finally(() => { if (!controller.signal.aborted) setTeachersLoading(false); });
    return () => controller.abort();
  }, [selectedField?.field, refresh]);

  const currentPage = collection === "activities" ? "activitiesManagement" : "peopleManagement";
  const groups = useMemo(() => {
    const target = search.trim().toLocaleLowerCase("pt-BR");
    const filtered = fields.filter(field => field.collection === collection &&
      (!target || `${field.title || ""} ${field.field || ""}`.toLocaleLowerCase("pt-BR").includes(target)));
    const groupMap = new Map();
    for (const field of filtered) {
      const folder = Number(field.folder) || 0;
      if (!groupMap.has(folder)) groupMap.set(folder, []);
      groupMap.get(folder).push(field);
    }
    const pageMenus = menus.filter(menu => menu.pageId === currentPage);
    return [...groupMap.entries()]
      .sort((a, b) => menuOrder(a[0]) - menuOrder(b[0]))
      .map(([folder, items]) => {
        const menu = pageMenus.find(candidate => Number(candidate.order) === folder);
        const fallback = MENU_FALLBACK[items[0]?.menuId] || (items[0]?.menuId ? String(items[0].menuId).replace(/_/g, " ") : `Seção ${folder}`);
        return {
          folder,
          title: menu?.name || fallback,
          items: [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.title || a.field).localeCompare(String(b.title || b.field), "pt-BR"))
        };
      });
  }, [fields, menus, collection, currentPage, search]);
  const count = key => fields.filter(field => field.collection === key).length;
  const total = groups.reduce((acc, group) => acc + group.items.length, 0);

  return <Box width="100%" bg="#f8faf9" pb={7}>
    <Flex align="center" justify="space-between" gap={3} wrap="wrap" mb={4}>
      <Flex align="center" gap={3}>
        <Flex bg="#e3f3ef" color="#0b6b5b" align="center" justify="center" borderRadius="11px" w="44px" h="44px"><FiSettings size={22}/></Flex>
        <Box>
          <Heading fontSize={{base:"22px",md:"26px"}} color="#062f2b" fontWeight="800">Configurações</Heading>
          <Text fontSize="12px" color="#607873" mt={1}>Consulta e edição controlada dos campos</Text>
        </Box>
      </Flex>
      {mainTab === "fields" && <Button onClick={() => setRefresh(current => current + 1)} size="sm" variant="outline"
        color="#0b6b5b" borderColor="#d6e3df" disabled={loading}><FiRefreshCw/> Atualizar</Button>}
    </Flex>

    <Flex gap={1} bg="white" border="1px solid #dbe6e2" borderRadius="10px" p={1} w="fit-content" maxW="100%" mb={4}>
      <TabButton active={mainTab === "fields"} onClick={() => setMainTab("fields")} icon={FiFileText}>Campos</TabButton>
      <TabButton active={mainTab === "plans"} onClick={() => setMainTab("plans")} icon={FiLayers}>Planos</TabButton>
    </Flex>

    {mainTab === "plans" ? <Box bg="white" border="1px solid #dbe6e2" borderRadius="10px" p={{base:5,md:8}}>
      <Flex align="center" gap={2} mb={2} color="#0b6b5b"><FiLayers size={20}/><Heading fontSize="16px" color="#103c35">Planos</Heading></Flex>
      <Text fontSize="13px" color="#607873">Aba reservada para uma próxima etapa. Nenhuma configuração de planos está disponível nesta versão.</Text>
    </Box> : <>
      <Box bg="white" border="1px solid #dbe6e2" borderRadius="10px" p={3} mb={4}>
        <Flex direction={{base:"column",md:"row"}} justify="space-between" gap={2} align={{base:"stretch",md:"center"}}>
          <Flex gap={1} flexWrap="wrap">
            <TabButton active={collection === "activities"} icon={FiCalendar} onClick={() => {setCollection("activities");setSearch("");setSelectedField(null);}}>Atividades ({count("activities")})</TabButton>
            <TabButton active={collection === "users"} icon={FiUsers} onClick={() => {setCollection("users");setSearch("");setSelectedField(null);}}>Usuários ({count("users")})</TabButton>
          </Flex>
          <Flex align="center" gap={2} px={3} border="1px solid #dce6e3" borderRadius="8px" bg="white" h="36px" w={{base:"100%",md:"270px"}}>
            <FiSearch size={15} color="#78918b"/>
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar campo..."
              border="none" outline="none" _focus={{boxShadow:"none"}} fontSize="12px" px={0} h="32px"/>
          </Flex>
        </Flex>
      </Box>
      {error && <Box bg="#fff3f3" border="1px solid #efc6c6" p={3} borderRadius="8px" mb={3}><Text color="#a32f31" fontSize="12px">{error}</Text></Box>}
      {loading ? <Flex justify="center" gap={2} py={10}><Spinner color="#0b6b5b"/><Text fontSize="12px" color="#607873">Carregando campos...</Text></Flex> :
        total === 0 ? <Box bg="white" p={6} borderRadius="10px" border="1px solid #dbe6e2"><Text fontSize="12px" color="#718781">Nenhum campo encontrado.</Text></Box> :
        <VStack align="stretch" gap={3}>
          {groups.map(group => <Box key={group.folder} border="1px solid #dbe6e2" bg="white" borderRadius="10px" overflow="hidden">
            <Flex px={4} py={3} bg="#f3f8f6" borderBottom="1px solid #e5eeea" align="center" justify="space-between">
              <Heading as="h3" color="#19473f" fontSize="13px">{group.title}</Heading>
              <Text fontSize="11px" color="#81938e">{group.items.length} {group.items.length === 1 ? "campo" : "campos"}</Text>
            </Flex>
            {group.items.map((field, index) => <Box key={String(field._id || field.field)} borderBottom={index === group.items.length - 1 ? "none" : "1px solid #edf2f0"}>
              <Button type="button" w="100%" justifyContent="space-between" variant="ghost" borderRadius="0"
                h="auto" minH="45px" textAlign="left" px={4} py={2.5} color="#214d46" fontWeight="500" fontSize="13px"
                _hover={{bg:"#f5faf8"}} onClick={() => setSelectedField(field)}>
                <Text textAlign="left">{field.title || field.field}</Text>
                <FiChevronRight color="#93a9a2" size={15}/>
              </Button>
            </Box>)}
          </Box>)}
        </VStack>}
    </>}
    <DetailsDialog field={selectedField} onClose={() => setSelectedField(null)}
      fields={fields} menus={menus} onSaved={updated => {
        if (!updated) return;
        setFields(current => current.map(item => String(item._id) === String(updated._id) ? updated : item));
        setSelectedField(updated);
        setRefresh(current => current + 1);
      }} teachers={teachers} teachersLoading={teachersLoading} teachersError={teachersError}/>
  </Box>;
}
