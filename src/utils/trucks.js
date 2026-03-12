import { norm, normTruck } from "./normalize";

function sortNums(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function computeAssignedTruckSet(dispatch) {
  const set = new Set();

  for (const r of dispatch || []) {
    const t = normTruck(r?.truck);
    if (!t) continue;
    if (norm(r?.truck) === "open") continue;
    set.add(t);
  }

  return set;
}

export function buildAvailableTrucks({
  shopTrucks,
  company,
  assignedTruckSet,
}) {
  const out = [];
  const trackedTypes = new Set(["Residential ASL", "Commercial FEL"]);
  const prefix = company === "mhd" ? "6" : "8";

  for (const row of shopTrucks || []) {
    const truck = normTruck(row?.truck);
    if (!truck) continue;

    if (assignedTruckSet?.has(truck)) continue;
    if (norm(row?.status) !== "available") continue;

    if (company === "mhd") {
      const location = String(row?.location ?? "").trim();
      out.push({ truck, location });
      continue;
    }

    if (!truck.startsWith(prefix)) continue;

    const type = String(row?.type ?? "").trim();
    if (!trackedTypes.has(type)) continue;

    out.push({ truck, type });
  }

  out.sort((a, b) => sortNums(a.truck, b.truck));
  return out;
}

export function splitAvailableTrucksByType(availableTrucks) {
  const residential = [];
  const commercial = [];

  for (const t of availableTrucks || []) {
    const type = String(t?.type ?? "").trim();
    const truck = String(t?.truck ?? "").trim();
    if (!truck) continue;

    if (type === "Residential ASL") residential.push(truck);
    else if (type === "Commercial FEL") commercial.push(truck);
  }

  residential.sort(sortNums);
  commercial.sort(sortNums);

  return { residential, commercial };
}

export function groupAvailableTrucksByLocation(availableTrucks) {
  const groups = new Map();

  for (const t of availableTrucks || []) {
    const truck = String(t?.truck ?? "").trim();
    if (!truck) continue;

    const label = String(t?.location ?? "").trim() || "Unassigned";

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(truck);
  }

  for (const [label, arr] of groups.entries()) {
    arr.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true }),
    );
    groups.set(label, arr);
  }

  return [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], undefined, { sensitivity: "base" }),
  );
}

export function sortUnavailableTrucks(unavailable) {
  const rank = (s) => (s === "Down" ? 0 : s === "Unavailable" ? 1 : 2);

  return [...(unavailable || [])].sort((a, b) => {
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;

    return String(a.truck).localeCompare(String(b.truck), undefined, {
      numeric: true,
    });
  });
}

export function groupUnavailableTrucks(unavailableSorted) {
  const cleanLabel = (s) => String(s ?? "").trim() || "Unknown";
  const groups = new Map();

  for (const t of unavailableSorted || []) {
    const label = cleanLabel(t.status);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(t.truck);
  }

  for (const [label, arr] of groups.entries()) {
    arr.sort(sortNums);
    groups.set(label, arr);
  }

  const priority = (label) => {
    const l = String(label).toLowerCase();
    if (l === "down") return 0;
    if (l === "unavailable") return 1;
    return 2;
  };

  return [...groups.entries()].sort((a, b) => {
    const pa = priority(a[0]);
    const pb = priority(b[0]);
    if (pa !== pb) return pa - pb;

    return a[0].localeCompare(b[0], undefined, { sensitivity: "base" });
  });
}
