export function buildCityGroupedItems(dispatchRows, rowsPerCol) {
  const items = [];
  let currentCity = null;

  for (const r of dispatchRows) {
    const city = (r.city || "").trim() || "—";

    if (city !== currentCity) {
      if (rowsPerCol && items.length % rowsPerCol === rowsPerCol - 1) {
        items.push({ type: "blank" });
      }
      currentCity = city;
      items.push({ type: "city", city });
    }

    items.push({ type: "route", ...r });
  }

  return items;
}

export function toFixedSlots(items, slots) {
  const out = items.slice(0, slots);
  while (out.length < slots) out.push({ type: "blank" });
  return out;
}

export function toColumns(items, cols, rows) {
  const columns = Array.from({ length: cols }, () => []);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      columns[c].push(items[c * rows + r]);
    }
  }
  return columns;
}
