import { norm, normTruck } from "../utils/normalize";

export default function RouteTile({
  item,
  fleetioTrips,
  className = "",
  isMobile = false,
}) {
  const isComplete = norm(item?.status) === "complete";

  const truckId = normTruck(item?.truck);

  // ✅ Robust lookup to avoid "0846" vs "846" mismatches
  const trip = !truckId
    ? null
    : (fleetioTrips?.[truckId] ??
      fleetioTrips?.[String(parseInt(truckId, 10))] ?? // "0846" -> "846"
      fleetioTrips?.[truckId.padStart(4, "0")] ?? // "846" -> "0846"
      null);

  // LEFT cap inputs
  const preOk = trip?.pretrip === "ok";
  const postOk = trip?.posttrip === "ok";
  const postEffectiveOk = trip?.posttripEffective === "ok";

  // Left cap: green if pre ok, else red
  const preClass = preOk ? "isOk" : "isLate";

  // RIGHT cap rules (your spec):
  // - If NO posttrip: gray, except if route complete + pre ok => red
  // - If posttrip exists but NO pretrip: yellow
  // - If pretrip exists and posttripEffective ok: green
  // - If pretrip exists and posttrip exists but not effective (post before pre): yellow
  let postClass = "isMissing";

  if (postOk && !preOk) {
    postClass = "isWarn"; // ✅ post done without pre
  } else if (postEffectiveOk) {
    postClass = "isOk"; // ✅ pre then post
  } else if (postOk && preOk && !postEffectiveOk) {
    postClass = "isWarn"; // ✅ post exists but not after pre
  } else if (!postOk && isComplete && preOk) {
    postClass = "isLate"; // ✅ complete + pre exists + no post after pre
  }

  const missingDriver = !norm(item?.driver) || norm(item?.driver) === "open";
  const missingTruck = !norm(item?.truck) || norm(item?.truck) === "open";

  const alertClass =
    !isComplete && (missingDriver || missingTruck) ? "routeAlert" : "";
  const completeClass = isComplete ? "routeComplete" : "";

  // Helpful tooltip so you can verify a specific tile quickly
  const title = [
    item?.route ? `Route ${item.route}` : "Route",
    truckId ? `Truck ${truckId}` : "Truck —",
    `pre=${trip?.pretrip ?? "—"}`,
    `post=${trip?.posttrip ?? "—"}`,
    `eff=${trip?.posttripEffective ?? "—"}`,
    isComplete ? "Complete" : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className={`tile routeTile ${isMobile ? "mRouteRow" : ""} ${alertClass} ${completeClass} ${className}`}
      title={title}
    >
      <div className={`tripCap left ${preClass}`} />
      <div className="routeCode">{item?.route}</div>

      <div className="driverName">
        <span className="fitText">{item?.driver}</span>
      </div>

      <div className="truckNum">{item?.truck}</div>
      <div className={`tripCap right ${postClass}`} />
    </div>
  );
}
