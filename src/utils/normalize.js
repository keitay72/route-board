export function norm(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

export function normTruck(v) {
  const raw = String(v ?? "").trim().toLowerCase();
  const compact = raw.replace(/[^a-z0-9]/g, "");

  if (!compact) return "";
  if (/^\d+$/.test(compact)) return String(parseInt(compact, 10));

  return compact;
}
