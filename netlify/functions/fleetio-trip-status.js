const COMPANY_KCD = "kcd";
const COMPANY_MHD = "mhd";
const FLEETIO_FORMS_URL =
  "https://secure.fleetio.com/api/v1/submitted_inspection_forms";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FORM_TYPE_PRE = "pre";
const FORM_TYPE_POST = "post";
const STATUS_OK = "ok";
const STATUS_MISSING = "missing";
const STATUS_WARN = "warn";
const DRIVER_NAME_ALIASES = new Map([
  ["chris strouhal", "chris strohoul"],
  ["chris strohoul", "chris strohoul"],
]);

export async function handler(event) {
  try {
    const url = new URL(event.rawUrl);
    const company = normalizeCompany(url.searchParams.get("company"));
    const date = normalizeDate(url.searchParams.get("date"));
    const apiKey = process.env.FLEETIO_API_KEY;
    const accountToken = getAccountToken(company);

    if (!apiKey || !accountToken) {
      return json(500, { error: "Missing Fleetio env vars on server." });
    }

    if (!DATE_RE.test(date)) {
      return json(400, { error: "Missing/invalid date. Use YYYY-MM-DD." });
    }

    const headers = {
      Authorization: `Token ${apiKey}`,
      "Account-Token": accountToken,
      Accept: "application/json",
    };

    const forms = await fetchAllForDate({ headers, date });
    const trips = buildTrips(forms, date);

    return json(200, { date, trips });
  } catch (e) {
    return json(500, { error: String(e?.message || e) });
  }
}

function normalizeCompany(value) {
  return String(value || COMPANY_KCD).trim().toLowerCase();
}

function getAccountToken(company) {
  return company === COMPANY_MHD
    ? process.env.FLEETIO_ACCOUNT_TOKEN_MHD
    : process.env.FLEETIO_ACCOUNT_TOKEN_KCD;
}

function buildTripKey(driverKey, truckKey) {
  return `${driverKey}__${truckKey}`;
}

function normalizeDate(value) {
  return String(value || "").trim();
}

function normalizeDriverKey(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return DRIVER_NAME_ALIASES.get(normalized) || normalized;
}

function getDriverAliases(value) {
  const normalized = normalizeDriverKey(value);
  if (!normalized) return [];

  const aliases = new Set([normalized]);
  const [firstName] = normalized.split(" ");
  if (firstName) aliases.add(firstName);

  return [...aliases];
}

function normalizeTruckKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  const compact = raw.replace(/[^a-z0-9]/g, "");

  if (!compact) return "";
  if (/^\d+$/.test(compact)) return String(parseInt(compact, 10));

  return compact;
}

function getFormType(title) {
  const s = String(title || "")
    .trim()
    .toLowerCase();

  if (s.includes("pre trip") || s.includes("pre-trip") || /\bpre\b/.test(s)) {
    return FORM_TYPE_PRE;
  }

  if (
    s.includes("post trip") ||
    s.includes("post-trip") ||
    /\bpost\b/.test(s)
  ) {
    return FORM_TYPE_POST;
  }

  return null;
}

function getTimestampMs(form) {
  const raw =
    form?.submitted_at ||
    form?.started_at ||
    form?.created_at ||
    form?.updated_at ||
    form?.submittedAt ||
    form?.startedAt ||
    form?.createdAt ||
    form?.updatedAt ||
    null;

  const ms = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(ms) ? null : ms;
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(obj),
  };
}

function createTripEntry(form, driverName, driverKey, truckName, truckKey) {
  return {
    driver: {
      id: form?.user?.id ?? null,
      name: driverName,
      key: driverKey,
    },
    truck: {
      id: form?.vehicle?.id ?? null,
      name: truckName,
      key: truckKey,
    },
    preTimes: [],
    postTimes: [],
    preForms: [],
    postForms: [],
  };
}

function addFormToTrip(entry, form, formType) {
  const timestamp = getTimestampMs(form);

  if (formType === FORM_TYPE_PRE) {
    entry.preForms.push(form?.id ?? null);
    if (timestamp != null) entry.preTimes.push(timestamp);
  }

  if (formType === FORM_TYPE_POST) {
    entry.postForms.push(form?.id ?? null);
    if (timestamp != null) entry.postTimes.push(timestamp);
  }
}

function hasValidPosttrip(preTimes, postTimes) {
  if (!preTimes.length || !postTimes.length) return false;
  return postTimes.some((postTs) => preTimes.some((preTs) => postTs > preTs));
}

function getPosttripStatus(preTimes, postTimes) {
  if (!postTimes.length) {
    return {
      posttrip: STATUS_MISSING,
      posttripEffective: STATUS_MISSING,
      posttripWarning: STATUS_MISSING,
    };
  }

  if (!preTimes.length) {
    return {
      posttrip: STATUS_MISSING,
      posttripEffective: STATUS_MISSING,
      posttripWarning: STATUS_WARN,
    };
  }

  const latestPreTime = preTimes[preTimes.length - 1];
  const hasPostAfterLatestPre = postTimes.some(
    (postTs) => postTs > latestPreTime,
  );

  return {
    posttrip: hasPostAfterLatestPre ? STATUS_OK : STATUS_MISSING,
    posttripEffective: hasValidPosttrip(preTimes, postTimes)
      ? STATUS_OK
      : STATUS_MISSING,
    posttripWarning: STATUS_MISSING,
  };
}

function buildTrips(forms, date) {
  const groupedTrips = new Map();

  for (const form of forms) {
    if (normalizeDate(form?.date) !== date) continue;

    const formType = getFormType(form?.inspection_form?.title);
    if (!formType) continue;

    const driverName = String(form?.user?.name || "").trim();
    const truckName = String(form?.vehicle?.name || "").trim();
    const driverKey = normalizeDriverKey(driverName);
    const truckKey = normalizeTruckKey(truckName);

    if (!driverKey || !truckKey) continue;

    const tripKey = buildTripKey(driverKey, truckKey);
    let entry = groupedTrips.get(tripKey);

    if (!entry) {
      entry = createTripEntry(form, driverName, driverKey, truckName, truckKey);
      groupedTrips.set(tripKey, entry);
    }

    addFormToTrip(entry, form, formType);
  }

  const trips = {};

  for (const [tripKey, entry] of groupedTrips.entries()) {
    const preTimes = entry.preTimes.slice().sort((a, b) => a - b);
    const postTimes = entry.postTimes.slice().sort((a, b) => a - b);
    const posttripStatus = getPosttripStatus(preTimes, postTimes);
    const trip = {
      driver: entry.driver,
      truck: entry.truck,
      pretrip: entry.preForms.length ? STATUS_OK : STATUS_MISSING,
      posttrip: posttripStatus.posttrip,
      posttripEffective: posttripStatus.posttripEffective,
      posttripWarning: posttripStatus.posttripWarning,
    };

    trips[tripKey] = trip;

    for (const driverAlias of getDriverAliases(entry.driver.name)) {
      const aliasKey = buildTripKey(driverAlias, entry.truck.key);
      if (!trips[aliasKey]) {
        trips[aliasKey] = trip;
      }
    }
  }

  return trips;
}

async function fetchAllForDate({ headers, date }) {
  const PER_PAGE = 50;
  const target = Date.parse(date);

  if (Number.isNaN(target)) return [];

  const records = [];
  let next = null;
  let sawTargetDate = false;

  for (let i = 0; i < 200; i++) {
    const u = new URL(FLEETIO_FORMS_URL);
    u.searchParams.set("per_page", String(PER_PAGE));
    if (next) u.searchParams.set("start_cursor", next);

    const res = await fetch(u.toString(), { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Fleetio HTTP ${res.status} ${text}`.trim());
    }

    const j = await res.json();
    const page = Array.isArray(j) ? j : j.records || [];
    if (!page.length) break;

    for (const r of page) {
      const d = normalizeDate(r?.date);
      if (d === date) {
        records.push(r);
        sawTargetDate = true;
      }
    }

    if (sawTargetDate) {
      let hasOlder = false;

      for (const r of page) {
        const d = normalizeDate(r?.date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;

        const ms = Date.parse(d);
        if (!Number.isNaN(ms) && ms < target) {
          hasOlder = true;
          break;
        }
      }

      if (hasOlder) break;
    }

    next = j?.next_cursor || null;
    if (!next) break;
  }

  return records;
}
