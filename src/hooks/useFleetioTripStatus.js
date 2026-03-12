// src/hooks/useFleetioTripStatus.js

import { useEffect, useState } from "react";

const REFRESH_MS = 30000;

export function useFleetioTripStatus(company, dateYmd) {
  const [trips, setTrips] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dateYmd) {
      setTrips({});
      setError("");
      return;
    }

    let cancelled = false;
    let timerId = null;

    async function load() {
      try {
        setError("");

        const res = await fetch(
          `/.netlify/functions/fleetio-trip-status?company=${encodeURIComponent(company)}&date=${encodeURIComponent(dateYmd)}`,
          { cache: "no-store" },
        );

        if (!res.ok) {
          throw new Error(`Fleetio fn HTTP ${res.status}`);
        }

        const json = await res.json();

        if (!cancelled) {
          setTrips(json?.trips || {});
        }
      } catch (e) {
        if (!cancelled) {
          setTrips({});
          setError(String(e?.message || e));
        }
      }
    }

    load();
    timerId = window.setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      if (timerId) window.clearInterval(timerId);
    };
  }, [company, dateYmd]);

  return { trips, error };
}
