const ANCHOR_SUNDAY = "2026-02-15";

function parseYMDLocal(ymd) {
  const [y, m, d] = String(ymd)
    .split("-")
    .map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function startOfWeekSunday(dateObj) {
  const x = new Date(dateObj.getTime());
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  x.setDate(x.getDate() - day);
  return x;
}

export function getABWeekLabel(dateObj) {
  const anchor = parseYMDLocal(ANCHOR_SUNDAY);
  if (!anchor || !dateObj || Number.isNaN(dateObj.getTime())) return "";

  const thisWeek = startOfWeekSunday(dateObj);
  const anchorWeek = startOfWeekSunday(anchor);

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.round(
    (thisWeek.getTime() - anchorWeek.getTime()) / msPerWeek,
  );

  return weeks % 2 === 0 ? "A Week" : "B Week";
}

export function ymdFromIso(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}
