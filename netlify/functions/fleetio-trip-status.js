// netlify/functions/fleetio-trip-status.js

// netlify/functions/fleetio-trip-status.js

export const handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);

    const company = (url.searchParams.get("company") || "kcd")
      .trim()
      .toLowerCase();

    const apiKey = process.env.FLEETIO_API_KEY;
    const accountToken =
      company === "mhd"
        ? process.env.FLEETIO_ACCOUNT_TOKEN_MHD
        : process.env.FLEETIO_ACCOUNT_TOKEN_KCD;

    if (!apiKey || !accountToken) {
      return json(500, { error: "Missing Fleetio env vars on server." });
    }

    const date = url.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json(400, { error: "Missing/invalid date. Use YYYY-MM-DD." });
    }

    const base = "https://secure.fleetio.com/api/v1/submitted_inspection_forms";

    const headers = {
      Authorization: `Token ${apiKey}`,
      "Account-Token": accountToken,
      Accept: "application/json",
    };

    const forms = await fetchAllForDate({ base, headers, date });

    // Group by exact full driver name + exact truck for exact date
    const byDriverTruck = new Map();

    for (const [key, entry] of byDriverTruck.entries()) {
      if (key.includes("benny")) {
        console.log(
          "BENNY GROUPED ENTRY",
          JSON.stringify(
            {
              key,
              driver: entry.driver,
              truck: entry.truck,
              preTimes: entry.preTimes,
              postTimes: entry.postTimes,
              preForms: entry.preForms,
              postForms: entry.postForms,
            },
            null,
            2,
          ),
        );
      }
    }

    for (const f of forms) {
      const formDate = normalizeDate(f?.date);
      if (formDate !== date) continue;

      const formType = getFormType(f?.inspection_form?.title);
      if (!formType) continue;

      const driverName = String(f?.user?.name || "").trim();
      const driverKey = normalizeDriverKey(driverName);

      const truckName = String(f?.vehicle?.name || "").trim();
      const truckKey = normalizeTruckKey(truckName);

      if (!driverKey || !truckKey) continue;

      const key = buildTripKey(driverKey, truckKey);
      const ts = getTimestampMs(f);

      if (!byDriverTruck.has(key)) {
        byDriverTruck.set(key, {
          driver: {
            id: f?.user?.id ?? null,
            name: driverName,
            key: driverKey,
          },
          truck: {
            id: f?.vehicle?.id ?? null,
            name: truckName,
            key: truckKey,
          },
          preTimes: [],
          postTimes: [],
          preForms: [],
          postForms: [],
        });
      }

      const entry = byDriverTruck.get(key);

      if (formType === "pre") {
        entry.preForms.push(f?.id ?? null);
        if (ts != null) entry.preTimes.push(ts);
      }

      if (formType === "post") {
        entry.postForms.push(f?.id ?? null);
        if (ts != null) entry.postTimes.push(ts);
      }
    }

    const trips = {};

    for (const [key, entry] of byDriverTruck.entries()) {
      const preTimes = entry.preTimes.slice().sort((a, b) => a - b);
      const postTimes = entry.postTimes.slice().sort((a, b) => a - b);

      const hasPre = entry.preForms.length > 0;
      const hasPost = entry.postForms.length > 0;

      // A post is valid only if some post timestamp is later than some pre timestamp
      let hasValidPost = false;

      if (preTimes.length && postTimes.length) {
        for (const postTs of postTimes) {
          for (const preTs of preTimes) {
            if (postTs > preTs) {
              hasValidPost = true;
              break;
            }
          }
          if (hasValidPost) break;
        }
      }

      trips[key] = {
        driver: entry.driver,
        truck: entry.truck,
        pretrip: hasPre ? "ok" : "missing",
        posttrip: hasPost ? "ok" : "missing",
        posttripEffective: hasValidPost ? "ok" : "missing",
      };
    }

    return json(200, {
      date,
      trips,
    });
  } catch (e) {
    return json(500, { error: String(e?.message || e) });
  }
};

function buildTripKey(driverKey, truckKey) {
  return `${driverKey}__${truckKey}`;
}

function normalizeDate(value) {
  return String(value || "").trim();
}

function normalizeDriverKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeTruckKey(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (digits) {
    return String(parseInt(digits, 10)); // "0846" -> "846"
  }

  return raw.toLowerCase();
}

function getFormType(title) {
  const s = String(title || "")
    .trim()
    .toLowerCase();

  if (s.includes("pre trip") || s.includes("pre-trip") || /\bpre\b/.test(s)) {
    return "pre";
  }

  if (
    s.includes("post trip") ||
    s.includes("post-trip") ||
    /\bpost\b/.test(s)
  ) {
    return "post";
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

async function fetchAllForDate({ base, headers, date }) {
  const PER_PAGE = 50;
  const target = Date.parse(date);

  if (Number.isNaN(target)) return [];

  let records = [];
  let next = null;
  let sawTargetDate = false;

  for (let i = 0; i < 200; i++) {
    const u = new URL(base);
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

  const counts = { pre: 0, post: 0, other: 0 };

  for (const f of forms) {
    const t = getFormType(f?.inspection_form?.title);
    if (t === "pre") counts.pre++;
    else if (t === "post") counts.post++;
    else counts.other++;
  }

  console.log("INSPECTION BREAKDOWN", counts);

  console.log("FLEETIO FINAL COUNT", {
    date,
    totalRecordsCollected: records.length,
  });

  return records;
}
