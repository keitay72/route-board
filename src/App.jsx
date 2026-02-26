import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { getCompanyConfig, getCompanyFromUrl } from "./company";
import LoadingMark from "./LoadingMark";

const REFRESH_MS = 15000;
const SIDEBAR_FLIP_MS = 5000;

const GRID_COLS = 5;
const GRID_ROWS = 13;
const GRID_SLOTS = GRID_COLS * GRID_ROWS; // 65

// ------------------------------
// A/B WEEK (TV-safe)
// ------------------------------
const ANCHOR_SUNDAY = "2026-02-15"; // set to a Sunday that starts an A week

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

function formatGeneratedAtNoTime(iso) {
  const s = formatGeneratedAt(iso);
  return s.replace(/ • \d{1,2}:\d{2}.*$/, "");
}

// Route board date as YYYY-MM-DD from generatedAt
function ymdFromIso(iso) {
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

// Fleetio trip status from Netlify function (server-side secrets)
function useFleetioTripStatus(dateYmd) {
  const [trucks, setTrucks] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dateYmd) return;

    let cancelled = false;
    let timer;

    async function load() {
      try {
        setError("");
        const res = await fetch(
          `/.netlify/functions/fleetio-trip-status?date=${encodeURIComponent(
            dateYmd,
          )}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Fleetio fn HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setTrucks(json?.trucks || {});
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    }

    load();
    timer = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [dateYmd]);

  return { trucks, error };
}

// ------------------------------
// Helpers
// ------------------------------
function norm(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function normTruck(v) {
  const s = String(v ?? "").trim();
  const m = s.match(/\d{2,4}/);
  return m ? m[0] : "";
}

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

// IMPORTANT: width-only mobile detection
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

function CommaList({ items, keyPrefix }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      {items.map((x, i) => (
        <span key={`${keyPrefix}-${x}-${i}`}>
          {x}
          {i < items.length - 1 && (
            <>
              {", "}
              <wbr />
            </>
          )}
        </span>
      ))}
    </>
  );
}

// ------------------------------
// Mobile Board (NO flipping)
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
  unavailableDrivers,
  message,
  fleetioTrips,
}) {
  const routeItems = useMemo(
    () => items.filter((x) => x.type !== "blank"),
    [items],
  );

  const { residential, commercial } = useMemo(() => {
    const res = [];
    const com = [];
    for (const t of availableTrucks) {
      const type = String(t?.type ?? "").trim();
      const truck = String(t?.truck ?? "").trim();
      if (!truck) continue;
      if (type === "Residential ASL") res.push(truck);
      else if (type === "Commercial FEL") com.push(truck);
    }
    return { residential: res, commercial: com };
  }, [availableTrucks]);

  return (
    <div className="mobileRoot">
      <header className="mHeader">
        <div className="mLogoRow">
          <img
            src={cfg.logoSrc}
            alt={cfg.logoAlt}
            className="mHeaderLogo"
            draggable="false"
          />
          <div className="mHeaderTitle">{cfg.title}</div>
        </div>

        <div className="mTimestamp">
          {formatGeneratedAtNoTime(data?.generatedAt)}
        </div>
      </header>

      <div className="mScroll">
        <div className="mLayout">
          {message ? (
            <div className="card mMessageCard">
              <div className="mMessageText">{message}</div>
            </div>
          ) : null}

          <section className="card mCard">
            <div className="cardTitleRow">
              <div className="cardTitle">Routes</div>
              <div className="count">{(data?.dispatch || []).length}</div>
            </div>

            {loading && !data && <div className="mInlineNotice">Loading…</div>}
            {error ? (
              <div className="mInlineNotice mError">Error: {error}</div>
            ) : null}

            <div className="mRoutesList">
              {routeItems.map((item, idx) => {
                if (item.type === "city") {
                  return (
                    <div className="tile cityTile mCity" key={`mcity-${idx}`}>
                      {item.city}
                    </div>
                  );
                }

                const isComplete = norm(item.status) === "complete";

                const truckId = normTruck(item.truck);
                const trip = truckId ? fleetioTrips?.[truckId] : null;

                // LEFT: pretrip red if missing, green if ok
                const preClass = trip?.pretrip === "ok" ? "isOk" : "isLate";

                // RIGHT: gray initially, green if post (only if pre exists),
                // red if complete + missing post.
                let postClass = "isMissing";
                if (trip?.posttripEffective === "ok") postClass = "isOk";
                else if (isComplete) postClass = "isLate";

                const missingDriver =
                  !item.driver || norm(item.driver) === "open";
                const missingTruck = !item.truck || norm(item.truck) === "open";

                const alertClass =
                  !isComplete && (missingDriver || missingTruck)
                    ? "routeAlert"
                    : "";
                const completeClass = isComplete ? "routeComplete" : "";

                return (
                  <div
                    className={`tile routeTile mRouteRow ${alertClass} ${completeClass}`}
                    key={`mroute-${idx}`}
                    title={isComplete ? "Complete" : ""}
                  >
                    <div className={`tripCap left ${preClass}`} />
                    <div className="routeCode">{item.route}</div>
                    <div className="driverName">{item.driver}</div>
                    <div className="truckNum">{item.truck}</div>
                    <div className={`tripCap right ${postClass}`} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trucks Available */}
          <section className="card mCard">
            <div className="cardTitleRow">
              <div className="cardTitle">Trucks Available</div>
              <div className="count">{availableTrucks.length}</div>
            </div>

            <div className="mSectionBody">
              {residential.length === 0 && commercial.length === 0 ? (
                <div className="empty">No available trucks ✅</div>
              ) : (
                <>
                  <section className="truckGroup">
                    <div className="truckGroupTitle">
                      <span>Residential</span>
                      <span className="truckGroupCount">
                        {residential.length}
                      </span>
                    </div>
                    <div className="truckGroupList">
                      {residential.length ? residential.join(", ") : "—"}
                    </div>
                  </section>

                  <section className="truckGroup">
                    <div className="truckGroupTitle">
                      <span>Commercial</span>
                      <span className="truckGroupCount">
                        {commercial.length}
                      </span>
                    </div>
                    <div className="truckGroupList">
                      {commercial.length ? commercial.join(", ") : "—"}
                    </div>
                  </section>
                </>
              )}
            </div>
          </section>

          {/* Trucks Unavailable */}
          <section className="card mCard">
            <div className="cardTitleRow">
              <div className="cardTitle">Trucks Unavailable</div>
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

          {/* Drivers Available */}
          <section className="card mCard">
            <div className="cardTitleRow">
              <div className="cardTitle">Drivers Available</div>
              <div className="count">{availableDrivers.length}</div>
            </div>

            <div className="mSectionBody">
              {availableDrivers.length === 0 ? (
                <div className="empty">No available drivers</div>
              ) : (
                <div className="truckGroupList">
                  <CommaList
                    items={availableDrivers}
                    keyPrefix="m-avail-driver"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Drivers Unavailable */}
          <section className="card mCard">
            <div className="cardTitleRow">
              <div className="cardTitle">Drivers Unavailable</div>
              <div className="count">{unavailableDrivers.length}</div>
            </div>

            <div className="mSectionBody">
              {unavailableDrivers.length === 0 ? (
                <div className="empty">None ✅</div>
              ) : (
                <div className="truckGroupList">
                  <CommaList
                    items={unavailableDrivers}
                    keyPrefix="m-unavail-driver"
                  />
                </div>
              )}
            </div>
          </section>

          <div className="mCopyright">
            Copyright © {new Date().getFullYear()} {cfg.copyright}. All rights
            reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// App
// ------------------------------
export default function App() {
  const isMobile = useIsMobile();

  const company = useMemo(() => getCompanyFromUrl(), []);
  const cfg = useMemo(() => getCompanyConfig(company), [company]);

  const { data, error, loading } = useRouteBoardData(cfg.apiUrl);

  // show loader until first successful data load
  const [revealBoard, setRevealBoard] = useState(false);
  useEffect(() => {
    if (!revealBoard && data) setRevealBoard(true);
  }, [data, revealBoard]);

  // TV/DESKTOP: flip between trucks view and drivers view
  const [sidebarFace, setSidebarFace] = useState("trucks"); // "trucks" | "drivers"
  useEffect(() => {
    if (isMobile) return;
    if (!revealBoard) return;

    const t = setInterval(() => {
      setSidebarFace((prev) => (prev === "trucks" ? "drivers" : "trucks"));
    }, SIDEBAR_FLIP_MS);

    return () => clearInterval(t);
  }, [isMobile, revealBoard]);

  // Routeboard date for Fleetio comparison
  const boardDate = useMemo(
    () => ymdFromIso(data?.generatedAt),
    [data?.generatedAt],
  );
  const { trucks: fleetioTrips } = useFleetioTripStatus(boardDate);

  // API payload
  const dispatch = useMemo(() => data?.dispatch || [], [data]);
  const unavailable = useMemo(() => data?.unavailableTrucks || [], [data]);
  const shopTrucks = useMemo(() => data?.shopTrucks || [], [data]);

  const message = useMemo(() => (data?.message || "").trim(), [data]);
  const availableDrivers = useMemo(() => data?.availableDrivers || [], [data]);
  const unavailableDrivers = useMemo(
    () => data?.unavailableDrivers || [],
    [data],
  );

  // Sort "Trucks Unavailable"
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

  const groupedTrucks = useMemo(() => {
    const cleanLabel = (s) => String(s ?? "").trim() || "Unknown";

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

  // Build routes grid
  const items = useMemo(
    () => buildCityGroupedItems(dispatch, GRID_ROWS),
    [dispatch],
  );
  const slots = useMemo(() => toFixedSlots(items, GRID_SLOTS), [items]);
  const columns = useMemo(
    () => toColumns(slots, GRID_COLS, GRID_ROWS),
    [slots],
  );

  // exclude trucks that are assigned
  const assignedTruckSet = useMemo(() => {
    const set = new Set();
    for (const r of dispatch) {
      const t = normTruck(r?.truck);
      if (!t) continue;
      if (norm(r?.truck) === "open") continue;
      set.add(t);
    }
    return set;
  }, [dispatch]);

  // Available trucks from shop list
  const prefix = company === "mhd" ? "6" : "8";
  const trackedTypes = useMemo(
    () => new Set(["Residential ASL", "Commercial FEL"]),
    [],
  );

  const availableTrucks = useMemo(() => {
    const out = [];

    for (const row of shopTrucks) {
      const truck = normTruck(row?.truck);
      if (!truck) continue;
      if (!truck.startsWith(prefix)) continue;

      if (norm(row?.status) !== "available") continue;

      const type = String(row?.type ?? "").trim();
      if (!trackedTypes.has(type)) continue;

      if (assignedTruckSet.has(truck)) continue;

      out.push({ truck, type });
    }

    out.sort((a, b) =>
      a.truck.localeCompare(b.truck, undefined, { numeric: true }),
    );
    return out;
  }, [shopTrucks, prefix, trackedTypes, assignedTruckSet]);

  // Split available trucks by type for display
  const { residential, commercial } = useMemo(() => {
    const res = [];
    const com = [];
    for (const t of availableTrucks) {
      const type = String(t?.type ?? "").trim();
      const truck = String(t?.truck ?? "").trim();
      if (!truck) continue;

      if (type === "Residential ASL") res.push(truck);
      else if (type === "Commercial FEL") com.push(truck);
    }
    return { residential: res, commercial: com };
  }, [availableTrucks]);

  // =========================
  // MOBILE
  // =========================
  if (isMobile) {
    return (
      <div className="flipStage" style={{ "--watermark": cfg.watermark }}>
        <div className={`flipCard ${revealBoard ? "isRevealed" : ""}`}>
          <div className="flipFace flipFront">
            <div className="loaderScreen">
              <LoadingMark
                variant={cfg.loaderVariant}
                tagline={cfg.loaderTagline}
              />
            </div>
          </div>

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
              unavailableDrivers={unavailableDrivers}
              message={message}
              fleetioTrips={fleetioTrips}
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // TV / DESKTOP
  // =========================
  return (
    <div className="flipStage" style={{ "--watermark": cfg.watermark }}>
      <div className={`flipCard ${revealBoard ? "isRevealed" : ""}`}>
        <div className="flipFace flipFront">
          <div className="loaderScreen">
            <LoadingMark
              variant={cfg.loaderVariant}
              tagline={cfg.loaderTagline}
            />
          </div>
        </div>

        <div className="flipFace flipBack">
          <div className="layout">
            <header className="header">
              <div className="headerLeft">
                <img
                  src={cfg.logoSrc}
                  alt={cfg.logoAlt}
                  className="headerLogo"
                  draggable="false"
                />
                <div className="headerTitle">{cfg.title}</div>
              </div>

              <div className="timestamp">
                {formatGeneratedAt(data?.generatedAt)}
              </div>
            </header>

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

                          const truckId = normTruck(item.truck);
                          const trip = truckId ? fleetioTrips?.[truckId] : null;

                          // LEFT: pretrip red if missing, green if ok
                          const preClass =
                            trip?.pretrip === "ok" ? "isOk" : "isLate";

                          // RIGHT: gray initially; green if posttripEffective ok; red if complete + missing
                          let postClass = "isMissing";
                          if (trip?.posttripEffective === "ok")
                            postClass = "isOk";
                          else if (isComplete) postClass = "isLate";

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
                              <div className={`tripCap left ${preClass}`} />
                              <div className="routeCode">{item.route}</div>
                              <div className="driverName">{item.driver}</div>
                              <div className="truckNum">{item.truck}</div>
                              <div className={`tripCap right ${postClass}`} />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {loading && !data ? (
                  <div className="loadingOverlay">Loading…</div>
                ) : null}
                {error ? (
                  <div className="errorOverlay">Error: {error}</div>
                ) : null}
              </div>
            </main>

            <aside className="sidebar">
              <div className="sidebarFlipStage">
                <div
                  className={`sidebarFlipCard ${
                    sidebarFace === "drivers" ? "isFlipped" : ""
                  }`}
                >
                  <div className="sidebarFace sidebarFront">
                    <div className="card">
                      <div className="cardTitleRow">
                        <div className="cardTitle small">Trucks Available</div>
                        <div className="count">{availableTrucks.length}</div>
                      </div>

                      <div className="availTrucksBody">
                        {residential.length === 0 && commercial.length === 0 ? (
                          <div className="empty">No available trucks ✅</div>
                        ) : (
                          <>
                            <section className="truckGroup">
                              <div className="truckGroupTitle">
                                <span>Residential</span>
                                <span className="truckGroupCount">
                                  {residential.length}
                                </span>
                              </div>
                              <div className="truckGroupList">
                                {residential.length ? (
                                  <CommaList
                                    items={residential}
                                    keyPrefix="tv-res"
                                  />
                                ) : (
                                  "—"
                                )}
                              </div>
                            </section>

                            <section className="truckGroup">
                              <div className="truckGroupTitle">
                                <span>Commercial</span>
                                <span className="truckGroupCount">
                                  {commercial.length}
                                </span>
                              </div>
                              <div className="truckGroupList">
                                {commercial.length ? (
                                  <CommaList
                                    items={commercial}
                                    keyPrefix="tv-com"
                                  />
                                ) : (
                                  "—"
                                )}
                              </div>
                            </section>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="card">
                      <div className="cardTitleRow">
                        <div className="cardTitle small">
                          Trucks Unavailable
                        </div>
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
                                <CommaList
                                  items={trucks}
                                  keyPrefix={`unavail-${label}`}
                                />
                              </div>
                            </section>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sidebarFace sidebarBack">
                    <div className="card">
                      <div className="cardTitleRow">
                        <div className="cardTitle small">Drivers Available</div>
                        <div className="count">{availableDrivers.length}</div>
                      </div>

                      <div className="driversBody">
                        {availableDrivers.length === 0 ? (
                          <div className="empty">No available drivers</div>
                        ) : (
                          <div className="truckGroupList">
                            <CommaList
                              items={availableDrivers}
                              keyPrefix="tv-avail-driver"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card">
                      <div className="cardTitleRow">
                        <div className="cardTitle small">
                          Drivers Unavailable
                        </div>
                        <div className="count">{unavailableDrivers.length}</div>
                      </div>

                      <div className="driversBody">
                        {unavailableDrivers.length === 0 ? (
                          <div className="empty">None ✅</div>
                        ) : (
                          <div className="truckGroupList">
                            <CommaList
                              items={unavailableDrivers}
                              keyPrefix="tv-unavail-driver"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

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
