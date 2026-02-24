import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { getCompanyConfig, getCompanyFromUrl } from "./company";

const REFRESH_MS = 15000;

const GRID_COLS = 5;
const GRID_ROWS = 13;
const GRID_SLOTS = GRID_COLS * GRID_ROWS; // 65

// ------------------------------
// A/B WEEK (TV-safe)
// ------------------------------
// Set this to a Sunday you KNOW begins an A week:
const ANCHOR_SUNDAY = "2026-02-15"; // <-- update to real anchor if you want

function parseYMDLocal(ymd) {
  // Safari/TV-safe: avoid Date("YYYY-MM-DD") parsing
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
  x.setDate(x.getDate() - day); // snap back to Sunday
  return x;
}

function getABWeekLabel(dateObj) {
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

function formatGeneratedAt(iso) {
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

function useRouteBoardData(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setError(
        "Missing routeboard API URL for this company. Check your .env.local or Netlify env vars.",
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer;

    async function load() {
      try {
        setError("");
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    load();
    timer = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url]);

  return { data, error, loading };
}

// ------------------------------
// Loader SVG (truck)
// ------------------------------
function wheel(cx, cy, r, spin) {
  return (
    <g className={`wheel ${spin ? "wheelSpin" : ""}`}>
      <circle cx={cx} cy={cy} r={r} fill="#111418"></circle>
      <circle cx={cx} cy={cy} r={r - 18} fill="url(#rimGrad)"></circle>
      <circle cx={cx} cy={cy} r="6" fill="#7d8794"></circle>
      <path
        d={`M${cx} ${cy - r + 6} V${cy + r - 6} M${cx - r + 6} ${cy} H${cx + r - 6}`}
        stroke="rgba(0,0,0,.25)"
        strokeWidth="2"
      ></path>
    </g>
  );
}

function LoadingMark({ variant, tagline }) {
  const isMhd = variant === "mhd";
  return (
    <main className="loaderStage">
      <svg
        className="loaderTruck"
        viewBox="0 0 900 260"
        role="img"
        aria-label="Loading"
      >
        <defs>
          <linearGradient id="green" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#7ad100" />
            <stop offset="1" stopColor="#57b100" />
          </linearGradient>

          <linearGradient id="darkMetal" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3a4047" />
            <stop offset="1" stopColor="#15181c" />
          </linearGradient>

          <linearGradient id="cabGray" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f7f9fb" />
            <stop offset="1" stopColor="#dfe4ea" />
          </linearGradient>

          <linearGradient id="engineGray" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6b7280" />
            <stop offset="1" stopColor="#3f444a" />
          </linearGradient>

          <linearGradient id="glass" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(120,180,195,.55)" />
            <stop offset="1" stopColor="rgba(44,124,138,.45)" />
          </linearGradient>

          <radialGradient id="rimGrad" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#f4f7fb" />
            <stop offset="55%" stopColor="#cfd6dd" />
            <stop offset="100%" stopColor="#8a939c" />
          </radialGradient>
        </defs>

        {/* shadow */}
        <ellipse cx="450" cy="210" rx="380" ry="18" fill="rgba(0,0,0,.15)" />

        {/* frame */}
        <rect
          x="170"
          y="175"
          width="540"
          height="16"
          rx="6"
          fill="url(#darkMetal)"
        />

        <g id="truck" className="truckBody">
          {/* REAR MODULE */}
          <g id="rear">
            <g id="body">
              <rect
                x="150"
                y="30"
                width="400"
                height="150"
                rx="5"
                fill="url(#green)"
                stroke="rgba(0,0,0,.2)"
                strokeWidth="2"
              />

              {isMhd ? (
                <image
                  href="/mhd-logo.png"
                  xlinkHref="/mhd-logo.png"
                  x="235"
                  y="40"
                  height="110"
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <image
                  href="/kcd-truck-logo.png"
                  xlinkHref="/kcd-truck-logo.png"
                  x="150"
                  y="55"
                  width="300"
                  height="150"
                  preserveAspectRatio="xMidYMid meet"
                />
              )}

              <path
                d="M150 30 L150 180 L135 180 C95 165, 95 45, 135 30 L150 30 Z"
                fill="url(#green)"
                stroke="rgba(0,0,0,.2)"
                strokeWidth="2"
              />
            </g>

            {/* arm rail + hoses */}
            <g id="arm">
              <rect
                x="440"
                y="35"
                width="22"
                height="180"
                rx="9"
                fill="url(#darkMetal)"
              />
              <circle cx="451" cy="30" r="18" fill="url(#darkMetal)" />

              <path
                d="M458 70 C500 95, 525 125, 525 165 C525 195, 495 210, 455 210"
                fill="none"
                stroke="url(#darkMetal)"
                strokeWidth="10"
                strokeLinecap="round"
              />

              <path
                d="M456 78 C490 105, 510 135, 510 168 C510 195, 485 210, 450 210"
                fill="none"
                stroke="#0b0e12"
                strokeWidth="7"
                strokeLinecap="round"
                opacity=".95"
              />
            </g>

            {/* rear wheels */}
            <g id="rearWheels">
              {wheel(260, 190, 34, true)}
              {wheel(345, 190, 34, true)}
            </g>
          </g>

          {/* FRONT MODULE */}
          <g id="front" transform="translate(50,0)">
            <g id="engine">
              <rect
                x="505"
                y="85"
                width="50"
                height="90"
                rx="5"
                fill="url(#engineGray)"
                stroke="rgba(0,0,0,.2)"
                strokeWidth="2"
              />
            </g>

            <g id="cab">
              <path
                d="M560 60 H640 Q650 60 655 68 L680 130 Q685 140 680 150 V190 Q680 200 670 200 H615 Q605 150 560 150 Z"
                fill="url(#cabGray)"
                stroke="rgba(0,0,0,.2)"
                strokeWidth="2"
              />

              {/* Truck number ALWAYS renders */}
              <text
                x="658"
                y="143"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="10"
                letterSpacing="1"
                fill="none"
                stroke="#000"
                strokeWidth=".8"
              >
                {isMhd ? "608" : "825"}
              </text>

              <>
                <text
                  x={isMhd ? "595" : "605"}
                  y="155"
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontSize="10"
                  letterSpacing="1"
                  fill="none"
                  stroke="#000"
                  strokeWidth=".8"
                >
                  {isMhd ? "Mountain High" : "KC Disposal"}
                </text>
                <text
                  x="613"
                  y="168"
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontSize="10"
                  letterSpacing="1"
                  fill="none"
                  stroke="#000"
                  strokeWidth=".8"
                >
                  {isMhd ? "Disposal" : null}
                </text>
                <text
                  x="613"
                  y={isMhd ? "180" : "165"}
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontSize="5.8"
                  letterSpacing="1"
                  fill="none"
                  stroke="#000"
                  strokeWidth=".8"
                >
                  {isMhd ? "(970) 834-1144" : "816-388-9739"}
                </text>
              </>

              <path
                d="M580 75 L645 75 L667 130 L580 130 Z"
                fill="url(#glass)"
                stroke="rgba(0,0,0,.18)"
                strokeWidth="2"
              />

              <rect
                x="670"
                y="168"
                width="20"
                height="22"
                rx="5"
                fill="url(#darkMetal)"
              />
            </g>

            <g id="frontWheel">{wheel(570, 190, 34, true)}</g>
          </g>
        </g>
      </svg>

      <div className="loaderTagline">{tagline}</div>
    </main>
  );
}

// ------------------------------
// Routes helpers
// ------------------------------
function buildCityGroupedItems(dispatchRows, rowsPerCol) {
  const items = [];
  let currentCity = null;

  for (const r of dispatchRows) {
    const city = (r.city || "").trim() || "—";

    if (city !== currentCity) {
      if (rowsPerCol && items.length % rowsPerCol === rowsPerCol - 1) {
        items.push({ type: "blank" });
      }
      currentCity = city;
      items.push({ type: "city", city });
    }

    items.push({ type: "route", ...r });
  }

  return items;
}

function toFixedSlots(items, slots) {
  const out = items.slice(0, slots);
  while (out.length < slots) out.push({ type: "blank" });
  return out;
}

function toColumns(items, cols, rows) {
  const columns = Array.from({ length: cols }, () => []);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      columns[c].push(items[c * rows + r]);
    }
  }
  return columns;
}

const normTruck = (v) => {
  const s = String(v ?? "").trim();
  // grab the first 3–4 digit number (802, 600, etc)
  const m = s.match(/\d{3,4}/);
  return m ? m[0] : "";
};

// IMPORTANT: width-only mobile detection (prevents weird portrait desktop triggers)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 900px)").matches;
  });

  useEffect(() => {
    const m = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(m.matches);

    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);

    setIsMobile(m.matches);

    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, []);

  return isMobile;
}

// ------------------------------
// Mobile Board
// ------------------------------
function MobileBoard({
  cfg,
  data,
  loading,
  error,
  items,
  unavailableSorted,
  groupedTrucks,
  availableTrucks,
  availableDrivers,
  message,
}) {
  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  const mobileItems = useMemo(
    () => items.filter((x) => x.type !== "blank"),
    [items],
  );

  return (
    <div className="mobileRoot">
      {/* ================= HEADER (LOCKED) ================= */}
      <header className="mHeader">
        <div className="mLogoRow">
          <img
            src={cfg.logoSrc}
            alt={cfg.logoAlt}
            className="logo"
            draggable="false"
          />
        </div>

        {/* WEEK + DATE ONLY (NO TIME) */}
        <div className="mTimestamp">
          {(() => {
            const s = formatGeneratedAt(data?.generatedAt);
            return s.replace(/ • \d{1,2}:\d{2}.*$/, "");
          })()}
        </div>
      </header>

      {/* ================= SCROLLING CONTENT ================= */}
      <div className="mScroll">
        <div className="mLayout">
          {/* MESSAGE */}
          {message ? (
            <div className="card mMessageCard">
              <div className="mMessageText">{message}</div>
            </div>
          ) : null}

          {/* ROUTES */}
          <section className="card mCard">
            <div className="cardTitleRow">
              <div className="cardTitle">Routes</div>
              <div className="count">{(data?.dispatch || []).length}</div>
            </div>

            {loading && !data && <div className="mInlineNotice">Loading…</div>}
            {error && (
              <div className="mInlineNotice mError">Error: {error}</div>
            )}

            <div className="mRoutesList">
              {items
                .filter((x) => x.type !== "blank")
                .map((item, idx) => {
                  if (item.type === "city") {
                    return (
                      <div className="tile cityTile mCity" key={`mcity-${idx}`}>
                        {item.city}
                      </div>
                    );
                  }

                  const isComplete =
                    String(item.status).toLowerCase() === "complete";

                  const missingDriver =
                    !item.driver ||
                    String(item.driver).toLowerCase() === "open";

                  const missingTruck =
                    !item.truck || String(item.truck).toLowerCase() === "open";

                  const alertClass =
                    !isComplete && (missingDriver || missingTruck)
                      ? "routeAlert"
                      : "";

                  const completeClass = isComplete ? "routeComplete" : "";

                  return (
                    <div
                      className={`tile routeTile mRouteRow ${alertClass} ${completeClass}`}
                      key={`mroute-${idx}`}
                    >
                      <div className="routeCode">{item.route}</div>
                      <div className="driverName">{item.driver}</div>
                      <div className="truckNum">{item.truck}</div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* TRUCKS */}
          <section className="card mCard">
            <div className="cardTitleRow">
              <div className="cardTitle">Trucks Not Available</div>
              <div className="count">{unavailableSorted.length}</div>
            </div>

            <div className="mSectionBody">
              {unavailableSorted.length === 0 ? (
                <div className="empty">All trucks available ✅</div>
              ) : (
                groupedTrucks.map(([label, trucks]) => (
                  <section className="truckGroup" key={label}>
                    <div className={`truckGroupTitle ${label.toLowerCase()}`}>
                      <span>{label}</span>
                      <span className="truckGroupCount">{trucks.length}</span>
                    </div>
                    <div className="truckGroupList">{trucks.join(", ")}</div>
                  </section>
                ))
              )}
            </div>
          </section>

          <section className="card mCard">
            <div className="cardTitleRow">
              <div className="cardTitle">Trucks Available</div>
              <div className="count">{availableTrucks.length}</div>
            </div>

            <div className="mSectionBody">
              {(() => {
                const res = availableTrucks
                  .filter((t) => String(t.type).trim() === "Residential ASL")
                  .map((t) => t.truck);

                const com = availableTrucks
                  .filter((t) => String(t.type).trim() === "Commercial FEL")
                  .map((t) => t.truck);

                if (res.length === 0 && com.length === 0) {
                  return <div className="empty">No available trucks ✅</div>;
                }

                return (
                  <>
                    <section className="truckGroup">
                      <div className="truckGroupTitle">
                        <span>Residential</span>
                        <span className="truckGroupCount">{res.length}</span>
                      </div>
                      <div className="truckGroupList">
                        {res.length ? res.join(", ") : "—"}
                      </div>
                    </section>

                    <section className="truckGroup">
                      <div className="truckGroupTitle">
                        <span>Commercial</span>
                        <span className="truckGroupCount">{com.length}</span>
                      </div>
                      <div className="truckGroupList">
                        {com.length ? com.join(", ") : "—"}
                      </div>
                    </section>
                  </>
                );
              })()}
            </div>
          </section>

          {/* DRIVERS */}
          <section className="card mCard">
            <div className="cardTitleRow">
              <div className="cardTitle">Available Drivers</div>
              <div className="count">{availableDrivers.length}</div>
            </div>

            <div className="mDriversGrid">
              {availableDrivers.length === 0 ? (
                <div className="empty">No available drivers</div>
              ) : (
                availableDrivers.map((d, i) => (
                  <div key={`${d}-${i}`} className="driverChip">
                    {d}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* COPYRIGHT */}
          <div className="mCopyright">
            Copyright © {new Date().getFullYear()} {cfg.copyright}. All rights
            reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();

  const company = useMemo(() => getCompanyFromUrl(), []);
  const cfg = useMemo(() => getCompanyConfig(company), [company]);

  const { data, error, loading } = useRouteBoardData(cfg.apiUrl);

  // Flip: show loader until first successful data load (TV/Desktop only)
  const [revealBoard, setRevealBoard] = useState(false);
  useEffect(() => {
    if (!revealBoard && data) setRevealBoard(true);
  }, [data, revealBoard]);

  const dispatch = useMemo(() => data?.dispatch || [], [data]);
  const unavailable = useMemo(() => data?.unavailableTrucks || [], [data]);
  const message = useMemo(() => (data?.message || "").trim(), [data]);
  const availableDrivers = useMemo(() => data?.availableDrivers || [], [data]);

  const unavailableSorted = useMemo(() => {
    const rank = (s) => (s === "Down" ? 0 : s === "Unavailable" ? 1 : 2);
    return [...unavailable].sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return String(a.truck).localeCompare(String(b.truck), undefined, {
        numeric: true,
      });
    });
  }, [unavailable]);

  const residentialPrefix = company === "mhd" ? "6" : "8";

  const unavailableSet = useMemo(() => {
    return new Set(unavailableSorted.map((t) => String(t.truck ?? "").trim()));
  }, [unavailableSorted]);

  const availableResidentialTrucks = useMemo(() => {
    const seen = new Set();
    const out = [];

    for (const r of dispatch) {
      const t = String(r?.truck ?? "").trim();
      if (!t) continue;

      const tl = t.toLowerCase();
      if (tl === "open") continue;
      if (!t.startsWith(residentialPrefix)) continue;
      if (unavailableSet.has(t)) continue;

      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }

    out.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true }),
    );
    return out;
  }, [dispatch, unavailableSet, residentialPrefix]);

  const groupedTrucks = useMemo(() => {
    const cleanLabel = (s) => {
      const raw = String(s ?? "").trim();
      return raw ? raw : "Unknown";
    };

    const groups = new Map();
    for (const t of unavailableSorted) {
      const label = cleanLabel(t.status);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(t.truck);
    }

    const sortNums = (a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true });

    for (const [label, arr] of groups.entries()) {
      arr.sort(sortNums);
      groups.set(label, arr);
    }

    const priority = (label) => {
      const l = label.toLowerCase();
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
  }, [unavailableSorted]);

  const items = useMemo(
    () => buildCityGroupedItems(dispatch, GRID_ROWS),
    [dispatch],
  );
  const slots = useMemo(() => toFixedSlots(items, GRID_SLOTS), [items]);
  const columns = useMemo(
    () => toColumns(slots, GRID_COLS, GRID_ROWS),
    [slots],
  );

  const shopTrucks = useMemo(() => data?.shopTrucks || [], [data]);

  const assignedTruckSet = useMemo(() => {
    const set = new Set();
    for (const r of dispatch) {
      const t = normTruck(r?.truck);
      if (!t) continue;
      if (
        String(r?.truck ?? "")
          .trim()
          .toLowerCase() === "open"
      )
        continue;
      set.add(t);
    }
    return set;
  }, [dispatch]);

  const prefix = company === "mhd" ? "6" : "8";
  const trackedTypes = useMemo(
    () => new Set(["Residential ASL", "Commercial FEL"]),
    [],
  );

  const availableTrucks = useMemo(() => {
    const out = [];

    for (const row of shopTrucks) {
      const truck = normTruck(row?.truck);
      const status = String(row?.status ?? "")
        .trim()
        .toLowerCase();
      const type = String(row?.type ?? "").trim();

      if (!truck) continue;
      if (!truck.startsWith(prefix)) continue;
      if (status !== "available") continue;
      if (!trackedTypes.has(type)) continue;

      // ✅ key line: don't list if assigned
      if (assignedTruckSet.has(truck)) continue;

      out.push({ truck, type });
    }

    out.sort((a, b) =>
      a.truck.localeCompare(b.truck, undefined, { numeric: true }),
    );

    return out;
  }, [shopTrucks, prefix, trackedTypes, assignedTruckSet]);

  console.log("ASSIGNED", Array.from(assignedTruckSet).slice(0, 30));
  console.log("SHOP", shopTrucks.slice(0, 10));
  console.log("AVAILABLE", availableTrucks.slice(0, 30));

  // Drivers: auto switch 1 -> 2 columns when it won't fit (TV/Desktop only)
  const driversBodyRef = useRef(null);
  const [driversCols, setDriversCols] = useState(1);

  const driversDensity = useMemo(() => {
    const n = availableDrivers.length;
    if (n >= 22) return "dense";
    if (n >= 14) return "mid";
    return "";
  }, [availableDrivers.length]);

  const driversColsClass = driversCols === 2 ? "twoCol" : "oneCol";

  useLayoutEffect(() => {
    const el = driversBodyRef.current;
    if (!el) return;

    if (typeof ResizeObserver === "undefined") {
      setDriversCols(1);
      return;
    }

    const compute = () => {
      const rect = el.getBoundingClientRect();
      const height = Math.max(1, rect.height);

      const gap =
        driversDensity === "dense" ? 3 : driversDensity === "mid" ? 4 : 5;
      const rowH =
        driversDensity === "dense" ? 16 : driversDensity === "mid" ? 17 : 18;

      const rowsThatFit = Math.max(
        1,
        Math.floor((height + gap) / (rowH + gap)),
      );

      setDriversCols(availableDrivers.length > rowsThatFit ? 2 : 1);
    };

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    });

    ro.observe(el);
    compute();
    window.addEventListener("resize", compute);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
      cancelAnimationFrame(raf);
    };
  }, [availableDrivers.length, driversDensity]);

  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  // =========================
  // MOBILE: flip animation version
  // =========================
  if (isMobile) {
    return (
      <div className="flipStage" style={{ "--watermark": cfg.watermark }}>
        <div className={`flipCard ${revealBoard ? "isRevealed" : ""}`}>
          {/* FRONT: Loader */}
          <div className="flipFace flipFront">
            <div className="loaderScreen">
              <LoadingMark
                variant={cfg.loaderVariant}
                tagline={cfg.loaderTagline}
              />
            </div>
          </div>

          {/* BACK: Mobile board */}
          <div className="flipFace flipBack">
            <MobileBoard
              cfg={cfg}
              data={data}
              loading={loading}
              error={error}
              items={items}
              unavailableSorted={unavailableSorted}
              groupedTrucks={groupedTrucks}
              availableTrucks={availableTrucks}
              availableDrivers={availableDrivers}
              message={message}
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // TV/DESKTOP: Keep flip system exactly as-is
  // =========================
  return (
    <div className="flipStage" style={{ "--watermark": cfg.watermark }}>
      <div className={`flipCard ${revealBoard ? "isRevealed" : ""}`}>
        {/* FRONT: Loader */}
        <div className="flipFace flipFront">
          <div className="loaderScreen">
            <LoadingMark
              variant={cfg.loaderVariant}
              tagline={cfg.loaderTagline}
            />
          </div>
        </div>

        {/* BACK: App */}
        <div className="flipFace flipBack">
          <div className="layout">
            {/* HEADER */}
            <header className="header">
              <div className="logoWrap">
                <img
                  src={cfg.logoSrc}
                  alt={cfg.logoAlt}
                  className="logo"
                  draggable="false"
                />
              </div>

              <div className="timestamp">
                {formatGeneratedAt(data?.generatedAt)}
              </div>
            </header>

            {/* MAIN (Routes) */}
            <main className="main">
              <div className="card routesCard">
                <div className="routesBody">
                  <div className="routesGrid">
                    {columns.map((col, cIdx) => (
                      <div className="routesCol" key={`col-${cIdx}`}>
                        {col.map((item, rIdx) => {
                          if (item.type === "blank") {
                            return (
                              <div
                                className="tile blankTile"
                                key={`b-${cIdx}-${rIdx}`}
                              />
                            );
                          }

                          if (item.type === "city") {
                            return (
                              <div
                                className="tile cityTile"
                                key={`city-${cIdx}-${rIdx}`}
                              >
                                {item.city}
                              </div>
                            );
                          }

                          const isComplete = norm(item.status) === "complete";
                          const missingDriver =
                            !norm(item.driver) || norm(item.driver) === "open";
                          const missingTruck =
                            !norm(item.truck) || norm(item.truck) === "open";

                          const alertClass =
                            !isComplete && (missingDriver || missingTruck)
                              ? "routeAlert"
                              : "";
                          const completeClass = isComplete
                            ? "routeComplete"
                            : "";

                          return (
                            <div
                              className={`tile routeTile ${alertClass} ${completeClass}`}
                              key={`r-${cIdx}-${rIdx}`}
                              title={isComplete ? "Complete" : ""}
                            >
                              <div className="routeCode">{item.route}</div>
                              <div className="driverName">{item.driver}</div>
                              <div className="truckNum">{item.truck}</div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {loading && !data && (
                  <div className="loadingOverlay">Loading…</div>
                )}
                {error && <div className="errorOverlay">Error: {error}</div>}
              </div>
            </main>

            {/* SIDEBAR */}
            <aside className="sidebar">
              <div className="card trucksCard">
                <div className="cardTitleRow">
                  <div className="cardTitle small">Trucks Not Available</div>
                  <div className="count">{unavailableSorted.length}</div>
                </div>

                <div className="trucksBody">
                  {unavailableSorted.length === 0 ? (
                    <div className="empty">All trucks available ✅</div>
                  ) : (
                    groupedTrucks.map(([label, trucks]) => (
                      <section className="truckGroup" key={label}>
                        <div
                          className={`truckGroupTitle ${label.toLowerCase()}`}
                        >
                          <span>{label}</span>
                          <span className="truckGroupCount">
                            {trucks.length}
                          </span>
                        </div>

                        <div className="truckGroupList">
                          {trucks.map((n, i) => (
                            <span key={`${label}-${n}-${i}`}>
                              {n}
                              {i < trucks.length - 1 && (
                                <>
                                  {", "}
                                  <wbr />
                                </>
                              )}
                            </span>
                          ))}
                        </div>
                      </section>
                    ))
                  )}
                </div>
              </div>

              <div className="card availTrucksCard">
                <div className="cardTitleRow">
                  <div className="cardTitle small">Trucks Available</div>
                  <div className="count">{availableTrucks.length}</div>
                </div>

                <div className="availTrucksBody">
                  {(() => {
                    const res = availableTrucks
                      .filter(
                        (t) => String(t.type).trim() === "Residential ASL",
                      )
                      .map((t) => t.truck);

                    const com = availableTrucks
                      .filter((t) => String(t.type).trim() === "Commercial FEL")
                      .map((t) => t.truck);

                    if (res.length === 0 && com.length === 0) {
                      return (
                        <div className="empty">No available trucks ✅</div>
                      );
                    }

                    return (
                      <>
                        <section className="truckGroup">
                          <div className="truckGroupTitle">
                            <span>Residential</span>
                            <span className="truckGroupCount">
                              {res.length}
                            </span>
                          </div>
                          <div className="truckGroupList">
                            {res.map((n, i) => (
                              <span key={`avail-res-${n}-${i}`}>
                                {n}
                                {i < res.length - 1 && (
                                  <>
                                    {", "}
                                    <wbr />
                                  </>
                                )}
                              </span>
                            ))}
                            {res.length === 0 ? "—" : null}
                          </div>
                        </section>

                        <section className="truckGroup">
                          <div className="truckGroupTitle">
                            <span>Commercial</span>
                            <span className="truckGroupCount">
                              {com.length}
                            </span>
                          </div>
                          <div className="truckGroupList">
                            {com.map((n, i) => (
                              <span key={`avail-com-${n}-${i}`}>
                                {n}
                                {i < com.length - 1 && (
                                  <>
                                    {", "}
                                    <wbr />
                                  </>
                                )}
                              </span>
                            ))}
                            {com.length === 0 ? "—" : null}
                          </div>
                        </section>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="card driversCard">
                <div className="cardTitleRow">
                  <div className="cardTitle small">Available Drivers</div>
                  <div className="count">{availableDrivers.length}</div>
                </div>

                <div className="driversBody" ref={driversBodyRef}>
                  <div
                    className={`driversListCompact ${driversDensity} ${driversColsClass}`}
                  >
                    {availableDrivers.length === 0 ? (
                      <div className="empty">No available drivers</div>
                    ) : (
                      availableDrivers.map((d, i) => (
                        <div key={`${d}-${i}`} className="driverChip" title={d}>
                          {d}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* FOOTER */}
            <footer className="footer">
              <div className="messageCard">
                <div className="messageTextScroll">{message || ""}</div>
              </div>

              <div className="copyright">
                Copyright © {new Date().getFullYear()} {cfg.copyright}. All
                rights reserved.
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
