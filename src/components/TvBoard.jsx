import { useLayoutEffect, useRef, useState } from "react";

import HeaderBar from "./HeaderBar";
import Sidebar from "./Sidebar";
import RouteTile from "./RouteTile";

export default function TvBoard({
  cfg,
  company,
  data,
  loading,
  error,
  fleetioLoading,
  columns,
  availableTrucks,
  availGroups,
  unavailableSorted,
  groupedTrucks,
  availableDrivers,
  unavailableDrivers,
  message,
  fleetioTrips,
}) {
  const mainRef = useRef(null);
  const sidebarRailRef = useRef(null);
  const [sidebarNeedsFooterRow, setSidebarNeedsFooterRow] = useState(false);

  useLayoutEffect(() => {
    function measureLayout() {
      const mainEl = mainRef.current;
      const railEl = sidebarRailRef.current;
      if (!mainEl || !railEl) return;

      const availableHeight = mainEl.clientHeight;
      const neededHeight = railEl.scrollHeight;
      const next = neededHeight > availableHeight + 1;

      setSidebarNeedsFooterRow((prev) => (prev === next ? prev : next));
    }

    measureLayout();

    let frameId = 0;
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measureLayout);
    };

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleMeasure);
      if (mainRef.current) observer.observe(mainRef.current);
      if (sidebarRailRef.current) observer.observe(sidebarRailRef.current);
    }

    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleMeasure);
      observer?.disconnect();
    };
  }, [availGroups, groupedTrucks, availableDrivers, unavailableDrivers]);

  return (
    <div className={`layout ${sidebarNeedsFooterRow ? "layoutSidebarExpanded" : ""}`}>
      <HeaderBar
        cfg={cfg}
        generatedAt={data?.generatedAt}
        fleetioLoading={fleetioLoading}
      />

      <main className="main" ref={mainRef}>
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

                    return (
                      <RouteTile
                        key={`r-${cIdx}-${rIdx}`}
                        item={item}
                        fleetioTrips={fleetioTrips}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {loading && !data ? (
            <div className="loadingOverlay">Loading…</div>
          ) : null}
          {error ? <div className="errorOverlay">Error: {error}</div> : null}
        </div>
      </main>

      <Sidebar
        company={company}
        availGroups={availGroups}
        groupedTrucks={groupedTrucks}
        availableTrucksCount={availableTrucks?.length || 0}
        unavailableSortedCount={unavailableSorted?.length || 0}
        availableDrivers={availableDrivers}
        unavailableDrivers={unavailableDrivers}
        railRef={sidebarRailRef}
      />

      <footer className="footer">
        <div className="messageCard">
          <div className="messageTextScroll">{message || ""}</div>
        </div>
      </footer>

      <div className="copyright globalCopyright">
        Copyright © {new Date().getFullYear()} {cfg.copyright}. All rights
        reserved.
      </div>
    </div>
  );
}
