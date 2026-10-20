/* Planejamento puro de movimentação. menu.order é o folder consumido nos formulários.
   A posição enviada é zero-based no menu de destino, após remover o campo da origem. */
export const sortFieldPositions = (a, b) =>
  (Number(a.order) || 0) - (Number(b.order) || 0) ||
  String(a._id).localeCompare(String(b._id));

export function planFieldPlacement(pageFields, selectedId, sourceFolder, destinationFolder, position, destinationMenuId) {
  const id = String(selectedId);
  const selected = pageFields.find(f => String(f._id) === id);
  if (!selected) throw new Error('Campo selecionado não pertence à página.');
  const from = Number(sourceFolder);
  const to = Number(destinationFolder);
  const source = pageFields.filter(f => Number(f.folder) === from && String(f._id) !== id).sort(sortFieldPositions);
  const destination = from === to ? source : pageFields.filter(f => Number(f.folder) === to && String(f._id) !== id).sort(sortFieldPositions);
  if (!Number.isInteger(position) || position < 0 || position > destination.length)
    throw new Error('Posição de destino inválida.');
  destination.splice(position, 0, selected);
  const changes = new Map();
  const apply = (items, folder, includeSelected) => items.forEach((item, i) => {
    const update = { order: i + 1 };
    if (includeSelected && String(item._id) === id) {
      update.folder = folder;
      update.menuId = destinationMenuId;
    }
    if (Number(item.order) !== update.order || (includeSelected && String(item._id) === id &&
        (Number(item.folder) !== folder || item.menuId !== destinationMenuId))) {
      changes.set(String(item._id), update);
    }
  });
  if (from !== to) apply(source, from, false);
  apply(destination, to, true);
  return { changes: [...changes.entries()].map(([fieldId, update]) => ({ fieldId, update })),
    selectedPosition: position + 1 };
}
