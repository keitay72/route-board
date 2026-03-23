import { useMemo } from "react";
import { formatGeneratedAtNoTime } from "../utils/format";
import RouteTile from "./RouteTile";
import CommaList from "./CommaList";
import { splitAvailableTrucksByType } from "../utils/trucks";

function buildTruckReadySections(company, availGroups, availableTrucks) {
  const isMhd = String(company || "").toLowerCase() === "mhd";

  if (isMhd) {
    return (Array.isArray(availGroups) ? availGroups : []).map(
      ([label, trucks]) => ({
        label,
        items: trucks || [],
      }),
    );
  }

  const { residential, commercial } =
    splitAvailableTrucksByType(availableTrucks);

  return [
    { label: "Residential", items: residential },
    { label: "Commercial", items: commercial },
  ];
}

export default function MobileBoard({
  company,
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
  availGroups,
}) {
  const routeItems = useMemo(
    () => items.filter((x) => x.type !== "blank"),
    [items],
  );

  const truckReadySections = useMemo(
    () => buildTruckReadySections(company, availGroups, availableTrucks),
    [company, availGroups, availableTrucks],
  );

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

                return (
                  <RouteTile
                    key={`mroute-${idx}`}
                    item={item}
                    fleetioTrips={fleetioTrips}
                    isMobile={true}
                  />
                );
              })}
            </div>
          </section>

          <div className="mOpsGrid">
            <section className="card mCard mOpsCard tone-ready">
              <div className="cardTitleRow">
                <div className="cardTitle">Trucks Ready</div>
                <div className="count">{availableTrucks.length}</div>
              </div>

              <div className="mSectionBody">
                {availableTrucks.length === 0 ? (
                  <div className="empty">No available trucks ✅</div>
                ) : (
                  <>
                    {truckReadySections.map((section) => (
                      <section className="truckGroup" key={section.label}>
                        <div className="truckGroupTitle">
                          <span>{section.label}</span>
                          <span className="truckGroupCount">
                            {section.items.length}
                          </span>
                        </div>
                        <div className="truckGroupList text-list mOpsList">
                          {section.items.length ? section.items.join(", ") : "—"}
                        </div>
                      </section>
                    ))}
                  </>
                )}
              </div>
            </section>

            <section className="card mCard mOpsCard tone-down">
              <div className="cardTitleRow">
                <div className="cardTitle">Trucks Down</div>
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
                      <div className="truckGroupList text-list mOpsList">
                        {trucks.join(", ")}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </section>

            <section className="card mCard mOpsCard tone-ready">
              <div className="cardTitleRow">
                <div className="cardTitle">Drivers Ready</div>
                <div className="count">{availableDrivers.length}</div>
              </div>

              <div className="mSectionBody">
                {availableDrivers.length === 0 ? (
                  <div className="empty">All drivers are assigned.</div>
                ) : (
                  <div className="truckGroupList text-list mOpsList">
                    <CommaList
                      items={availableDrivers}
                      keyPrefix="m-avail-driver"
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="card mCard mOpsCard tone-down">
              <div className="cardTitleRow">
                <div className="cardTitle">Drivers Out</div>
                <div className="count">{unavailableDrivers.length}</div>
              </div>

              <div className="mSectionBody">
                {unavailableDrivers.length === 0 ? (
                  <div className="empty">All drivers are present.</div>
                ) : (
                  <div className="truckGroupList text-list mOpsList">
                    <CommaList
                      items={unavailableDrivers}
                      keyPrefix="m-unavail-driver"
                    />
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="mCopyright">
            Copyright © {new Date().getFullYear()} {cfg.copyright}. All rights
            reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
