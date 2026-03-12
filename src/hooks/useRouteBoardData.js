import { useEffect, useState } from "react";

const REFRESH_MS = 15000;
const ROOT_ARRAY_ALIASES = {
  dispatch: ["dispatch", "routes", "routeBoard", "route_board"],
  unavailableTrucks: [
    "unavailableTrucks",
    "unavailable_trucks",
    "trucksUnavailable",
  ],
  shopTrucks: ["shopTrucks", "shop_trucks", "trucks", "fleet"],
  availableDrivers: ["availableDrivers", "available_drivers"],
  unavailableDrivers: ["unavailableDrivers", "unavailable_drivers"],
};

function pickFirstValue(obj, keys, fallback = "") {
  for (const key of keys) {
    if (obj?.[key] != null) return obj[key];
  }
  return fallback;
}

function pickFirstArray(obj, keys) {
  const value = pickFirstValue(obj, keys, []);
  return Array.isArray(value) ? value : [];
}

function pickFirstString(obj, keys, fallback = "") {
  const value = pickFirstValue(obj, keys, fallback);
  return String(value ?? fallback).trim();
}

function normalizeDispatchRow(row) {
  const driver = pickFirstString(row, [
    "driver",
    "driverName",
    "driver_name",
    "Driver",
  ]);
  const driverFullName =
    pickFirstString(row, [
      "driverFullName",
      "driver_full_name",
      "fullDriverName",
      "full_driver_name",
      "driverFull",
      "driver_full",
      "Driver Full Name",
    ]) || driver;

  return {
    ...row,
    route: pickFirstString(row, ["route", "routeNumber", "route_number", "Route"]),
    city: pickFirstString(row, ["city", "City"]),
    driver,
    driverFullName,
    truck: pickFirstString(row, [
      "truck",
      "truckNumber",
      "truck_number",
      "vehicle",
      "unit",
      "Truck",
    ]),
    status: pickFirstString(row, ["status", "Status"]),
  };
}

function normalizeRouteBoardPayload(payload) {
  return {
    ...payload,
    generatedAt: pickFirstString(payload, [
      "generatedAt",
      "generated_at",
      "timestamp",
      "generated",
    ]),
    message: pickFirstString(payload, ["message", "Message"]),
    dispatch: pickFirstArray(payload, ROOT_ARRAY_ALIASES.dispatch).map(
      normalizeDispatchRow,
    ),
    unavailableTrucks: pickFirstArray(
      payload,
      ROOT_ARRAY_ALIASES.unavailableTrucks,
    ),
    shopTrucks: pickFirstArray(payload, ROOT_ARRAY_ALIASES.shopTrucks),
    availableDrivers: pickFirstArray(
      payload,
      ROOT_ARRAY_ALIASES.availableDrivers,
    ),
    unavailableDrivers: pickFirstArray(
      payload,
      ROOT_ARRAY_ALIASES.unavailableDrivers,
    ),
  };
}

export function useRouteBoardData(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setError(
        "Missing routeboard API URL for this company. Check your .env.local or Netlify env vars.",
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer;

    async function load() {
      try {
        setError("");
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(normalizeRouteBoardPayload(json));
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    load();
    timer = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url]);

  return { data, error, loading };
}
