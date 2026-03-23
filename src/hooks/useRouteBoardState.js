import { useMemo } from "react";

import { ymdFromIso } from "../utils/dates";
import { buildCityGroupedItems, toColumns, toFixedSlots } from "../utils/grid";
import {
  buildAvailableTrucks,
  computeAssignedTruckSet,
  groupAvailableTrucksByLocation,
  groupUnavailableTrucks,
  sortUnavailableTrucks,
  splitAvailableTrucksByType,
} from "../utils/trucks";

/**
 * Derives the board-facing view model from raw API payloads and UI state.
 */
export function useRouteBoardState({
  company,
  data,
  gridCols = 5,
  gridRows = 13,
}) {
  const revealBoard = Boolean(data);

  const dispatch = useMemo(() => data?.dispatch || [], [data]);
  const unavailable = useMemo(() => data?.unavailableTrucks || [], [data]);
  const shopTrucks = useMemo(() => data?.shopTrucks || [], [data]);

  const message = useMemo(() => (data?.message || "").trim(), [data]);
  const availableDrivers = useMemo(() => data?.availableDrivers || [], [data]);
  const unavailableDrivers = useMemo(
    () => data?.unavailableDrivers || [],
    [data],
  );

  const unavailableSorted = useMemo(
    () => sortUnavailableTrucks(unavailable),
    [unavailable],
  );
  const groupedTrucks = useMemo(
    () => groupUnavailableTrucks(unavailableSorted),
    [unavailableSorted],
  );

  const items = useMemo(
    () => buildCityGroupedItems(dispatch, gridRows),
    [dispatch, gridRows],
  );

  const slots = useMemo(() => {
    const totalSlots = gridCols * gridRows;
    return toFixedSlots(items, totalSlots);
  }, [items, gridCols, gridRows]);

  const columns = useMemo(
    () => toColumns(slots, gridCols, gridRows),
    [slots, gridCols, gridRows],
  );

  const assignedTruckSet = useMemo(
    () => computeAssignedTruckSet(dispatch),
    [dispatch],
  );

  const availableTrucks = useMemo(() => {
    return buildAvailableTrucks({
      shopTrucks,
      company,
      assignedTruckSet,
    });
  }, [shopTrucks, company, assignedTruckSet]);

  const availGroups = useMemo(() => {
    if (company === "mhd") {
      return groupAvailableTrucksByLocation(availableTrucks);
    }
    return splitAvailableTrucksByType(availableTrucks);
  }, [company, availableTrucks]);

  const boardDate = useMemo(
    () => ymdFromIso(data?.generatedAt),
    [data?.generatedAt],
  );

  return {
    revealBoard,
    dispatch,
    message,
    availableDrivers,
    unavailableDrivers,
    boardDate,
    items,
    columns,
    unavailableSorted,
    groupedTrucks,
    availableTrucks,
    availGroups,
  };
}
