import { useMemo } from "react";

import { getCompanyConfig, getCompanyFromUrl } from "./company";
import LoadingMark from "./components/LoadingMark";

import { useIsMobile } from "./hooks/useIsMobile";
import { useViewportTileScale } from "./hooks/useViewportTileScale";
import { useRouteBoardData } from "./hooks/useRouteBoardData";
import { useFleetioTripStatus } from "./hooks/useFleetioTripStatus";
import { useFitDriverText } from "./hooks/useFitDriverText";

import { useRouteBoardState } from "./hooks/useRouteBoardState";

import MobileBoard from "./components/MobileBoard";
import TvBoard from "./components/TvBoard";

const GRID_COLS = 5;
const GRID_ROWS = 13;
const SIDEBAR_FLIP_MS = 5000;

export default function App() {
  const isMobile = useIsMobile();

  const company = useMemo(() => getCompanyFromUrl(), []);
  const cfg = useMemo(() => getCompanyConfig(company), [company]);

  const { data, error, loading } = useRouteBoardData(cfg.apiUrl);
  const tileScale = useViewportTileScale();

  const vm = useRouteBoardState({
    company,
    data,
    isMobile,
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    sidebarFlipMs: SIDEBAR_FLIP_MS,
  });

  useFitDriverText(vm.revealBoard, `${data?.generatedAt || ""}|${tileScale}`);

  const { trips: fleetioTrips, error: fleetioError } = useFleetioTripStatus(
    company,
    vm.boardDate,
  );

  const mergedError = [error, fleetioError].filter(Boolean).join(" | ");

  const stageStyle = {
    "--tileTypeScale": tileScale,
  };

  if (isMobile) {
    return (
      <div className="flipStage" style={stageStyle}>
        <div className={`flipCard ${vm.revealBoard ? "isRevealed" : ""}`}>
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
              error={mergedError}
              items={vm.items}
              unavailableSorted={vm.unavailableSorted}
              groupedTrucks={vm.groupedTrucks}
              availableTrucks={vm.availableTrucks}
              availableDrivers={vm.availableDrivers}
              unavailableDrivers={vm.unavailableDrivers}
              message={vm.message}
              fleetioTrips={fleetioTrips}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flipStage" style={stageStyle}>
      <div className={`flipCard ${vm.revealBoard ? "isRevealed" : ""}`}>
        <div className="flipFace flipFront">
          <div className="loaderScreen">
            <LoadingMark
              variant={cfg.loaderVariant}
              tagline={cfg.loaderTagline}
            />
          </div>
        </div>

        <div className="flipFace flipBack">
          <TvBoard
            cfg={cfg}
            company={company}
            data={data}
            loading={loading}
            error={mergedError}
            columns={vm.columns}
            sidebarFace={vm.sidebarFace}
            availableTrucks={vm.availableTrucks}
            availGroups={vm.availGroups}
            unavailableSorted={vm.unavailableSorted}
            groupedTrucks={vm.groupedTrucks}
            availableDrivers={vm.availableDrivers}
            unavailableDrivers={vm.unavailableDrivers}
            message={vm.message}
            fleetioTrips={fleetioTrips}
          />
        </div>
      </div>
    </div>
  );
}
