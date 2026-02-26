export const handler = async (event) => {
  try {
    const apiKey = process.env.FLEETIO_API_KEY;
    const accountToken = process.env.FLEETIO_ACCOUNT_TOKEN;

    if (!apiKey || !accountToken) {
      return json(500, { error: "Missing Fleetio env vars on server." });
    }

    const url = new URL(event.rawUrl);
    const date = url.searchParams.get("date"); // YYYY-MM-DD

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

    const byTruck = new Map();

    for (const f of forms) {
      const formTitle = String(f?.inspection_form?.title || "")
        .trim()
        .toLowerCase();
      const vehicleName = String(f?.vehicle?.name || "").trim(); // e.g. "802"
      const formDate = String(f?.date || "").trim(); // "YYYY-MM-DD"

      if (!vehicleName) continue;
      if (formDate !== date) continue;

      if (!byTruck.has(vehicleName)) {
        byTruck.set(vehicleName, { pretrip: false, posttrip: false });
      }

      const entry = byTruck.get(vehicleName);

      if (formTitle.includes("pre")) entry.pretrip = true;
      if (formTitle.includes("post")) entry.posttrip = true;
    }

    const out = {};
    for (const [truck, v] of byTruck.entries()) {
      const preOk = !!v.pretrip;
      const postOk = preOk ? !!v.posttrip : false; // ignore post if no pre

      out[truck] = {
        pretrip: preOk ? "ok" : "missing",
        posttrip: v.posttrip ? "ok" : "missing", // raw
        posttripEffective: postOk ? "ok" : "missing", // enforced
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
  // NOTE: You already discovered Fleetio rejects high per_page.
  // 50 works for your account.
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

    const json = await res.json();
    const page = Array.isArray(json) ? json : json.records || [];
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

    next = json?.next_cursor || null;
    if (!next) break;
  }

  return records;
}
