import { getABWeekLabel } from "./dates";

export function formatGeneratedAt(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";

    const week = getABWeekLabel(d);
    const date = d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    return week ? `${week} • ${date} • ${time}` : `${date} • ${time}`;
  } catch {
    return "—";
  }
}

export function formatGeneratedAtNoTime(iso) {
  const s = formatGeneratedAt(iso);
  return s.replace(/ • \d{1,2}:\d{2}.*$/, "");
}
