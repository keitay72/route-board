import CommaList from "./CommaList";

function buildTruckReadySections(company, availGroups) {
  const isMhd = String(company || "").toLowerCase() === "mhd";

  if (isMhd) {
    return (Array.isArray(availGroups) ? availGroups : []).map(([label, trucks]) => ({
      label,
      items: trucks || [],
    }));
  }

  const safeGroups = !Array.isArray(availGroups) ? availGroups || {} : {};

  return [
    { label: "Residential", items: safeGroups.residential || [] },
    { label: "Commercial", items: safeGroups.commercial || [] },
  ];
}

export default function Sidebar({
  company,
  availGroups,
  groupedTrucks,
  availableTrucksCount,
  unavailableSortedCount,
  availableDrivers,
  unavailableDrivers,
  railRef,
}) {
  const truckReadySections = buildTruckReadySections(company, availGroups);

  return (
    <aside className="sidebar">
      <div className="operationsRail" ref={railRef}>
        <section className="card railPanel">
          <div className="cardTitleRow">
            <div className="cardTitle">Drivers Ready</div>
            <div className="count">{availableDrivers.length}</div>
          </div>
          <div className="railBody singleList">
            {availableDrivers.length === 0 ? (
              <div className="empty">No available drivers.</div>
            ) : (
              <CommaList items={availableDrivers} keyPrefix="driver-ready" />
            )}
          </div>
        </section>

        <section className="card railPanel">
          <div className="cardTitleRow">
            <div className="cardTitle">Drivers Out</div>
            <div className="count">{unavailableDrivers.length}</div>
          </div>
          <div className="railBody singleList">
            {unavailableDrivers.length === 0 ? (
              <div className="empty">All drivers are present.</div>
            ) : (
              <CommaList items={unavailableDrivers} keyPrefix="driver-out" />
            )}
          </div>
        </section>

        <section className="card railPanel">
          <div className="cardTitleRow">
            <div className="cardTitle">Trucks Ready</div>
            <div className="count">{availableTrucksCount}</div>
          </div>
          <div className="railBody">
            {availableTrucksCount === 0 ? (
              <div className="empty">No available trucks.</div>
            ) : (
              truckReadySections.map((section) => (
                <section className="railGroup" key={section.label}>
                  <div className="railGroupHeader">
                    <span>{section.label}</span>
                    <span className="railGroupCount">{section.items.length}</span>
                  </div>
                  <div className="railGroupList">
                    {section.items.length ? (
                      <CommaList
                        items={section.items}
                        keyPrefix={`truck-ready-${section.label}`}
                      />
                    ) : (
                      "—"
                    )}
                  </div>
                </section>
              ))
            )}
          </div>
        </section>

        <section className="card railPanel">
          <div className="cardTitleRow">
            <div className="cardTitle">Trucks Down</div>
            <div className="count">{unavailableSortedCount}</div>
          </div>
          <div className="railBody">
            {unavailableSortedCount === 0 ? (
              <div className="empty">No trucks are down.</div>
            ) : (
              groupedTrucks.map(([label, trucks]) => (
                <section className="railGroup" key={label}>
                  <div className={`railGroupHeader ${label.toLowerCase()}`}>
                    <span>{label}</span>
                    <span className="railGroupCount">{trucks.length}</span>
                  </div>
                  <div className="railGroupList">
                    <CommaList items={trucks} keyPrefix={`truck-down-${label}`} />
                  </div>
                </section>
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
