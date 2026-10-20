/* Catálogo reativo: MongoDB é a fonte principal. Legado fica disponível apenas até carregar
   ou em caso de falha, evitando sumir opções durante a migração. */
import { useEffect, useState } from "react";
import { selectOptions as legacy } from "./legacySelectOptions.js";

export const selectOptions = Object.fromEntries(Object.entries(legacy).map(([k, v]) => [k, { ...v }]));
let catalog = {};
let pending = null;
let loadError = "";
let version = 0;
const subscribers = new Set();
const inform = () => { version += 1; subscribers.forEach(fn => fn(version)); };
const normalize = entry => ({
  value: String(entry.value), label: String(entry.label), order: Number(entry.order), active: entry.active !== false
});
const byOrder = (a, b) => a.order - b.order;
const legacyItems = key => Object.entries(legacy[key] || {}).map(([value, label], order) => ({
  value: String(value), label: String(label).replace(/^\d+\s*-\s*/, ""), order, active: true
}));

function applyCatalog(data) {
  catalog = Object.fromEntries(Object.entries(data || {}).map(([key, values]) => [key,
    Array.isArray(values) ? values.map(normalize).sort(byOrder) : []]));
  for (const [key, items] of Object.entries(catalog)) {
    // Mutação de objeto compartilhado mantém compatibilidade com listagens e relatórios antigos.
    selectOptions[key] = Object.fromEntries(items.map(o => [o.value, `${o.value} - ${o.label}`]));
  }
  loadError = "";
  inform();
}
export function getFieldOptionItems(key) { return catalog[key] || legacyItems(key); }
export function getSelectableFieldOptions(key, selected = []) {
  const keep = new Set((Array.isArray(selected) ? selected : [selected]).map(String));
  return getFieldOptionItems(key).filter(option => option.active || keep.has(option.value));
}
export function getOptionsError() { return loadError; }
export function getOptionsVersion() { return version; }
export function subscribeFieldOptions(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
export async function loadFieldOptions(force = false) {
  if (pending) return pending;
  if (version && !force && !loadError) return catalog;
  pending = (async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/field-options/catalog`);
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result?.body || "Falha ao carregar opções.");
      applyCatalog(result.body || {});
      return catalog;
    } catch (e) {
      loadError = String(e?.message || e);
      inform();
      return catalog;
    } finally { pending = null; }
  })();
  return pending;
}
export function useFieldOptions() {
  const [tick, setTick] = useState(version);
  useEffect(() => {
    const unsubscribe = subscribeFieldOptions(setTick);
    loadFieldOptions();
    return unsubscribe;
  }, []);
  return { version: tick, error: loadError, getItems: getFieldOptionItems };
}
