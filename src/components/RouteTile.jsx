// src/components/RouteTile.jsx

// src/components/RouteTile.jsx

import { norm, normTruck } from "../utils/normalize";

function normDriverKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildTripKey(driverFullName, truck) {
  const d = normDriverKey(driverFullName);
  const t = normTruck(truck);

  if (!d || !t) return "";

  // normalize "0846" and "846" to the same key
  const truckKey = String(parseInt(t, 10));
  return `${d}__${truckKey}`;
}

export default function RouteTile({
  item,
  fleetioTrips,
  className = "",
  isMobile = false,
}) {
  const isComplete = norm(item?.status) === "complete";

  // Display name on tile = nickname (or whatever board sends as driver)
  const displayDriver = item?.driver || "";

  // Match name for Fleetio = full name from sheet
  const matchDriver = item?.driverFullName || displayDriver;

  const tripKey = buildTripKey(matchDriver, item?.truck);
  const trip = tripKey ? (fleetioTrips?.[tripKey] ?? null) : null;

  const preOk = trip?.pretrip === "ok";
  const postOk = trip?.posttrip === "ok";
  const postEffectiveOk = trip?.posttripEffective === "ok";

  // Left end cap (LEC)
  // green if matching pre exists, else red
  const preClass = preOk ? "isOk" : "isLate";

  // Right end cap (REC)
  // Not complete:
  // - green = valid post
  // - yellow = invalid post exists
  // - gray = no post
  //
  // Complete:
  // - green = valid post
  // - yellow = invalid post exists
  // - red = no valid post exists
  let postClass = "isMissing";

  if (postEffectiveOk) {
    postClass = "isOk";
  } else if (postOk) {
    postClass = "isWarn";
  } else if (isComplete) {
    postClass = "isLate";
  }

  const missingDriver = !norm(displayDriver) || norm(displayDriver) === "open";
  const missingTruck = !norm(item?.truck) || norm(item?.truck) === "open";

  const alertClass =
    !isComplete && (missingDriver || missingTruck) ? "routeAlert" : "";
  const completeClass = isComplete ? "routeComplete" : "";

  const title = [
    item?.route ? `Route ${item.route}` : "Route",
    displayDriver ? `Display ${displayDriver}` : "Display —",
    matchDriver ? `Match ${matchDriver}` : "Match —",
    item?.truck ? `Truck ${item.truck}` : "Truck —",
    `key=${tripKey || "—"}`,
    `pre=${trip?.pretrip ?? "—"}`,
    `post=${trip?.posttrip ?? "—"}`,
    `eff=${trip?.posttripEffective ?? "—"}`,
    isComplete ? "Complete" : "Not Complete",
  ].join(" • ");

  return (
    <div
      className={`tile routeTile ${isMobile ? "mRouteRow" : ""} ${alertClass} ${completeClass} ${className}`}
      title={title}
    >
      <div className={`tripCap left ${preClass}`} />
      <div className="routeCode">{item?.route}</div>

      <div className="driverName">
        <span className="fitText">{displayDriver}</span>
      </div>

      <div className="truckNum">{item?.truck}</div>
      <div className={`tripCap right ${postClass}`} />
    </div>
  );
}
