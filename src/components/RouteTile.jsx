import { norm, normDriverName, normTruck } from "../utils/normalize";

function buildTripKey(driverFullName, truck) {
  const d = normDriverName(driverFullName);
  const truckKey = normTruck(truck);

  if (!d || !truckKey) return "";

  return `${d}__${truckKey}`;
}

function getPostClass({ isComplete, postEffectiveOk, postWarn }) {
  if (postEffectiveOk) return "isOk";
  if (postWarn) return "isWarn";
  if (isComplete) return "isLate";
  return "isMissing";
}

function buildTitle({ item, displayDriver, matchDriver, tripKey, trip, isComplete }) {
  return [
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
}

export default function RouteTile({
  item,
  fleetioTrips,
  className = "",
  isMobile = false,
}) {
  const isComplete = norm(item?.status) === "complete";
  const displayDriver = item?.driver || "";
  const matchDriver = item?.driverFullName || displayDriver;

  const tripKey = buildTripKey(matchDriver, item?.truck);
  const trip = tripKey ? (fleetioTrips?.[tripKey] ?? null) : null;

  const preOk = trip?.pretrip === "ok";
  const postEffectiveOk = trip?.posttripEffective === "ok";
  const postWarn = trip?.posttripWarning === "warn";
  const preClass = preOk ? "isOk" : "isLate";
  const postClass = getPostClass({ isComplete, postEffectiveOk, postWarn });

  const missingDriver = !norm(displayDriver) || norm(displayDriver) === "open";
  const missingTruck = !norm(item?.truck) || norm(item?.truck) === "open";

  const alertClass =
    !isComplete && (missingDriver || missingTruck) ? "routeAlert" : "";
  const completeClass = isComplete ? "routeComplete" : "";

  const title = buildTitle({
    item,
    displayDriver,
    matchDriver,
    tripKey,
    trip,
    isComplete,
  });

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
