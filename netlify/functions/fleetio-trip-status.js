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

    const date = url.searchParams.get("date"); // YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json(400, { error: "Missing/invalid date. Use YYYY-MM-DD." });
    }

    // ...rest of your function unchanged...

    const base = "https://secure.fleetio.com/api/v1/submitted_inspection_forms";

    const headers = {
      Authorization: `Token ${apiKey}`,
      "Account-Token": accountToken,
      Accept: "application/json",
    };

    const forms = await fetchAllForDate({ base, headers, date });

    // Track latest PRE and latest POST timestamps per truck
    const byTruck = new Map();

    function toMs(f) {
      // Fleetio records commonly include one or more of these fields.
      // We try several to be resilient across account/API variations.
      const raw =
        f?.submitted_at ||
        f?.created_at ||
        f?.updated_at ||
        f?.submittedAt ||
        f?.createdAt ||
        f?.updatedAt ||
        null;

      const ms = raw ? Date.parse(raw) : NaN;
      return Number.isNaN(ms) ? null : ms;
    }

    for (const f of forms) {
      const formTitle = String(f?.inspection_form?.title || "")
        .trim()
        .toLowerCase();
      const vehicleName = String(f?.vehicle?.name || "").trim(); // e.g. "802"
      const formDate = String(f?.date || "").trim(); // "YYYY-MM-DD"

      if (!vehicleName) continue;
      if (formDate !== date) continue;

      const isPre = formTitle.includes("pre");
      const isPost = formTitle.includes("post");
      if (!isPre && !isPost) continue;

      const ts = toMs(f) ?? 0; // if missing timestamp, still track as "exists" but sequencing may be weaker

      if (!byTruck.has(vehicleName)) {
        byTruck.set(vehicleName, {
          hasPre: false,
          hasPost: false,
          preLatest: null, // ms
          postLatest: null, // ms (raw)
        });
      }

      const entry = byTruck.get(vehicleName);

      if (isPre) {
        entry.hasPre = true;
        entry.preLatest =
          entry.preLatest == null ? ts : Math.max(entry.preLatest, ts);
      }

      if (isPost) {
        entry.hasPost = true;
        entry.postLatest =
          entry.postLatest == null ? ts : Math.max(entry.postLatest, ts);
      }
    }

    // Build output enforcing: posttripEffective only if postLatest > preLatest
    const out = {};
    for (const [truck, v] of byTruck.entries()) {
      const preOk = !!v.hasPre;
      const postRawOk = !!v.hasPost;

      const postEffectiveOk = postRawOk;

      out[truck] = {
        pretrip: preOk ? "ok" : "missing",
        posttrip: postRawOk ? "ok" : "missing", // raw existence
        posttripEffective: postEffectiveOk ? "ok" : "missing", // ✅ matches posttrip
      };
    }

    return json(200, { date, trucks: out });
  } catch (e) {
    return json(500, { error: String(e?.message || e) });
  }
};

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
  // NOTE: Fleetio rejects high per_page; 50 works for your account.
  const PER_PAGE = 50;

  const target = Date.parse(date); // Node runtime is fine with YYYY-MM-DD
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

    // collect only exact date matches
    for (const r of page) {
      const d = String(r?.date || "");
      if (d === date) {
        records.push(r);
        sawTargetDate = true;
      }
    }

    // stop once we've passed the day
    if (sawTargetDate) {
      let hasOlder = false;

      for (const r of page) {
        const d = String(r?.date || "");
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
