import CommaList from "./CommaList";

export default function Sidebar({
  company,
  sidebarFace,
  availGroups,
  availableTrucksCount,
  unavailableSortedCount,
  groupedTrucks,
  availableDrivers,
  unavailableDrivers,
}) {
  const isMhd = String(company || "").toLowerCase() === "mhd";
  const safeGroups = !Array.isArray(availGroups) ? availGroups || {} : {};
  const residential = safeGroups.residential || [];
  const commercial = safeGroups.commercial || [];
  const locationGroups = Array.isArray(availGroups) ? availGroups : [];

  return (
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
                <div className="count">{availableTrucksCount}</div>
              </div>

              <div className="availTrucksBody">
                {availableTrucksCount === 0 ? (
                  <div className="empty">No available trucks ✅</div>
                ) : isMhd ? (
                  <>
                    {locationGroups.map(([label, trucks]) => (
                      <section className="truckGroup" key={label}>
                        <div className="truckGroupTitle">
                          <span>{label}</span>
                          <span className="truckGroupCount">
                            {trucks.length}
                          </span>
                        </div>
                        <div className="truckGroupList">
                          {trucks.length ? (
                            <CommaList
                              items={trucks}
                              keyPrefix={`mhd-${label}`}
                            />
                          ) : (
                            "—"
                          )}
                        </div>
                      </section>
                    ))}
                  </>
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
                          <CommaList items={residential} keyPrefix="tv-res" />
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
                          <CommaList items={commercial} keyPrefix="tv-com" />
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
                <div className="cardTitle small">Trucks Unavailable</div>
                <div className="count">{unavailableSortedCount}</div>
              </div>

              <div className="trucksBody">
                {unavailableSortedCount === 0 ? (
                  <div className="empty">All trucks available ✅</div>
                ) : (
                  groupedTrucks.map(([label, trucks]) => (
                    <section className="truckGroup" key={label}>
                      <div className={`truckGroupTitle ${label.toLowerCase()}`}>
                        <span>{label}</span>
                        <span className="truckGroupCount">{trucks.length}</span>
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
                <div className="cardTitle small">Drivers Unavailable</div>
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
  );
}
