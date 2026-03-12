const DRIVER_NAME_ALIASES = new Map([
  ["chris strouhal", "chris strohoul"],
  ["chris strohoul", "chris strohoul"],
]);

export function norm(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

export function normDriverName(v) {
  const normalized = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return DRIVER_NAME_ALIASES.get(normalized) || normalized;
}

export function normTruck(v) {
  const raw = String(v ?? "").trim().toLowerCase();
  const compact = raw.replace(/[^a-z0-9]/g, "");

  if (!compact) return "";
  if (/^\d+$/.test(compact)) return String(parseInt(compact, 10));

  return compact;
}
