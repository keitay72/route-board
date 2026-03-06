// src/hooks/useRouteBoardState.js
import { useEffect, useMemo, useState } from "react";

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
 * Central “view model” hook:
 * - All derived computations from API data
 * - Reveal board after first load
 * - Sidebar flipping state (TV only)
 * - Fleetio compare date selection (board date)
 *
 * Keeps App.jsx small and readable.
 */
export function useRouteBoardState({
  company,
  data,
  isMobile,
  gridCols = 5,
  gridRows = 13,
  sidebarFlipMs = 5000,
}) {
  // Reveal board after first data load
  const [revealBoard, setRevealBoard] = useState(false);
  useEffect(() => {
    if (!revealBoard && data) setRevealBoard(true);
  }, [data, revealBoard]);

  // Sidebar flip (TV/Desktop only)
  const [sidebarFace, setSidebarFace] = useState("trucks");
  useEffect(() => {
    if (isMobile) return;
    if (!revealBoard) return;

    const t = setInterval(() => {
      setSidebarFace((prev) => (prev === "trucks" ? "drivers" : "trucks"));
    }, sidebarFlipMs);

    return () => clearInterval(t);
  }, [isMobile, revealBoard, sidebarFlipMs]);

  // API payload (normalized)
  const dispatch = useMemo(() => data?.dispatch || [], [data]);
  const unavailable = useMemo(() => data?.unavailableTrucks || [], [data]);
  const shopTrucks = useMemo(() => data?.shopTrucks || [], [data]);

  const message = useMemo(() => (data?.message || "").trim(), [data]);
  const availableDrivers = useMemo(() => data?.availableDrivers || [], [data]);
  const unavailableDrivers = useMemo(
    () => data?.unavailableDrivers || [],
    [data],
  );

  // Unavailable trucks: sorted + grouped
  const unavailableSorted = useMemo(
    () => sortUnavailableTrucks(unavailable),
    [unavailable],
  );
  const groupedTrucks = useMemo(
    () => groupUnavailableTrucks(unavailableSorted),
    [unavailableSorted],
  );

  // Routes grid items -> fixed slots -> columns
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

  // Assigned trucks set
  const assignedTruckSet = useMemo(
    () => computeAssignedTruckSet(dispatch),
    [dispatch],
  );

  // Available trucks derived from shop list
  const availableTrucks = useMemo(() => {
    return buildAvailableTrucks({
      shopTrucks,
      company,
      assignedTruckSet,
    });
  }, [shopTrucks, company, assignedTruckSet]);

  // KCD: residential/commercial
  // MHD: dynamic location groups from sheet/API
  const availGroups = useMemo(() => {
    if (company === "mhd") {
      return groupAvailableTrucksByLocation(availableTrucks);
    }
    return splitAvailableTrucksByType(availableTrucks);
  }, [company, availableTrucks]);

  // Fleetio compare date (board date)
  const boardDate = useMemo(
    () => ymdFromIso(data?.generatedAt),
    [data?.generatedAt],
  );

  return {
    revealBoard,
    sidebarFace,

    // raw-ish
    dispatch,
    message,
    availableDrivers,
    unavailableDrivers,
    boardDate,

    // routes UI
    items,
    columns,

    // trucks UI
    unavailableSorted,
    groupedTrucks,
    availableTrucks,
    availGroups,
  };
}
