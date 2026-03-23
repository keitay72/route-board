import {
  getFleetioOperationalStatus,
  parseExtraOperationalSaturdays,
} from "../../src/utils/fleetioSchedule.js";

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
const RESPONSE_CACHE_TTL_SECONDS = 15 * 60;
const RESPONSE_CACHE_MAX_AGE_MS = RESPONSE_CACHE_TTL_SECONDS * 1000;
const FLEETIO_MAX_PER_PAGE = 100;
const EXTRA_OPERATIONAL_SATURDAYS = parseExtraOperationalSaturdays(
  process.env.FLEETIO_EXTRA_SATURDAYS,
);
const FLEETIO_TIME_ZONE = process.env.FLEETIO_TIME_ZONE || "America/Chicago";
const DRIVER_NAME_ALIASES = new Map([
  ["chris strouhal", "chris strohoul"],
  ["chris strohoul", "chris strohoul"],
]);
const responseCache = new Map();

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

    const cacheKey = `${company}:${date}`;
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return json(200, cached.body);
    }

    const operationalStatus = getFleetioOperationalStatus(new Date(), {
      extraOperationalSaturdays: EXTRA_OPERATIONAL_SATURDAYS,
      timeZone: FLEETIO_TIME_ZONE,
    });

    if (!operationalStatus.isOperational) {
      return json(200, {
        date,
        trips: {},
        skipped: true,
        reason: "Outside Fleetio operational hours.",
      });
    }

    const headers = {
      Authorization: `Token ${apiKey}`,
      "Account-Token": accountToken,
      Accept: "application/json",
    };

    const startedAt = Date.now();
    const { forms, stats } = await fetchAllForDate({ headers, date });
    const trips = buildTrips(forms, date);
    const body = { date, trips };

    responseCache.set(cacheKey, {
      body,
      expiresAt: Date.now() + RESPONSE_CACHE_MAX_AGE_MS,
    });

    console.log(
      JSON.stringify({
        msg: "fleetio_trip_status_fetch",
        company,
        date,
        durationMs: Date.now() - startedAt,
        trips: Object.keys(trips).length,
        ...stats,
      }),
    );

    return json(200, body);
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
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control":
        `public, durable, max-age=${RESPONSE_CACHE_TTL_SECONDS}, stale-while-revalidate=300`,
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
  const target = Date.parse(date);

  if (Number.isNaN(target)) {
    return {
      forms: [],
      stats: {
        strategy: "invalid-date",
        pagesScanned: 0,
        recordsScanned: 0,
        recordsMatched: 0,
      },
    };
  }

  try {
    return await fetchAllForDateFiltered({ headers, date });
  } catch (error) {
    if (!shouldFallbackToUnfiltered(error)) throw error;

    const fallback = await fetchAllForDateUnfiltered({ headers, date, target });
    fallback.stats.fallbackReason = error.message;
    return fallback;
  }
}

function nextDateYmd(date) {
  const [year, month, day] = String(date).split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextYear = next.getUTCFullYear();
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getUTCDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function shouldFallbackToUnfiltered(error) {
  const status = Number(error?.statusCode);

  if (!status) return true;
  if (status === 401 || status === 403) return false;
  return true;
}

async function fetchFleetioPage({ headers, next, dateFilterStart, dateFilterEnd }) {
  const u = new URL(FLEETIO_FORMS_URL);
  u.searchParams.set("per_page", String(FLEETIO_MAX_PER_PAGE));
  if (next) u.searchParams.set("start_cursor", next);
  if (dateFilterStart) {
    u.searchParams.set("q[submitted_at_gteq]", dateFilterStart);
  }
  if (dateFilterEnd) {
    u.searchParams.set("q[submitted_at_lt]", dateFilterEnd);
  }

  const res = await fetch(u.toString(), { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error = new Error(`Fleetio HTTP ${res.status} ${text}`.trim());
    error.statusCode = res.status;
    throw error;
  }

  const j = await res.json();
  const page = Array.isArray(j) ? j : j.records || [];

  return {
    page,
    next: j?.next_cursor || null,
    estimatedRemainingCount: j?.estimated_remaining_count ?? null,
  };
}

async function fetchAllForDateFiltered({ headers, date }) {
  const records = [];
  const stats = {
    strategy: "submitted_at-range",
    pagesScanned: 0,
    recordsScanned: 0,
    recordsMatched: 0,
    estimatedRemainingCount: null,
  };
  const nextDate = nextDateYmd(date);
  let next = null;

  for (let i = 0; i < 200; i++) {
    const result = await fetchFleetioPage({
      headers,
      next,
      dateFilterStart: date,
      dateFilterEnd: nextDate,
    });

    stats.pagesScanned += 1;
    stats.recordsScanned += result.page.length;
    stats.estimatedRemainingCount = result.estimatedRemainingCount;

    if (!result.page.length) break;

    for (const r of result.page) {
      if (normalizeDate(r?.date) === date) {
        records.push(r);
      }
    }

    next = result.next;
    if (!next) break;
  }

  stats.recordsMatched = records.length;
  return { forms: records, stats };
}

async function fetchAllForDateUnfiltered({ headers, date, target }) {

  const records = [];
  let next = null;
  let sawTargetDate = false;
  const stats = {
    strategy: "unfiltered-scan",
    pagesScanned: 0,
    recordsScanned: 0,
    recordsMatched: 0,
    estimatedRemainingCount: null,
  };

  for (let i = 0; i < 200; i++) {
    const result = await fetchFleetioPage({ headers, next });
    const page = result.page;

    stats.pagesScanned += 1;
    stats.recordsScanned += page.length;
    stats.estimatedRemainingCount = result.estimatedRemainingCount;
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

    next = result.next;
    if (!next) break;
  }

  stats.recordsMatched = records.length;
  return { forms: records, stats };
}
