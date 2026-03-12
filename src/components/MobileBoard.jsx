// src/components/MobileBoard.jsx

import { useMemo } from "react";
import { formatGeneratedAtNoTime } from "../utils/format";
import RouteTile from "./RouteTile";
import CommaList from "./CommaList";
import { splitAvailableTrucksByType } from "../utils/trucks";

export default function MobileBoard({
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

  const { residential, commercial } = useMemo(
    () => splitAvailableTrucksByType(availableTrucks),
    [availableTrucks],
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
                    <div className="truckGroupList text-list">
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
                    <div className="truckGroupList text-list">
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
                    <div className="truckGroupList text-list">
                      {trucks.join(", ")}
                    </div>
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
                <div className="truckGroupList text-list">
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
                <div className="truckGroupList text-list">
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
