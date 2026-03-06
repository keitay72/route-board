export function norm(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

export function normTruck(v) {
  const s = String(v ?? "").trim();
  const m = s.match(/\d{2,4}/);
  return m ? m[0] : "";
}
