import HeaderBar from "./HeaderBar";
import Sidebar from "./Sidebar";
import RouteTile from "./RouteTile";

export default function TvBoard({
  cfg,
  company,
  data,
  loading,
  error,
  columns,
  sidebarFace,
  availableTrucks,
  availGroups,
  unavailableSorted,
  groupedTrucks,
  availableDrivers,
  unavailableDrivers,
  message,
  fleetioTrips,
}) {
  return (
    <div className="layout">
      <HeaderBar cfg={cfg} generatedAt={data?.generatedAt} />

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
        sidebarFace={sidebarFace}
        availGroups={availGroups}
        availableTrucksCount={availableTrucks?.length || 0}
        unavailableSortedCount={unavailableSorted?.length || 0}
        groupedTrucks={groupedTrucks}
        availableDrivers={availableDrivers}
        unavailableDrivers={unavailableDrivers}
      />

      <footer className="footer">
        <div className="messageCard">
          <div className="messageTextScroll">{message || ""}</div>
        </div>

        <div className="copyright">
          Copyright © {new Date().getFullYear()} {cfg.copyright}. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}
