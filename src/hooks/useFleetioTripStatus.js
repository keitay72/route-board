import { useEffect, useState } from "react";

const REFRESH_MS = 5 * 60 * 1000;

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

    function clearRefreshTimer() {
      if (timerId) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    }

    function scheduleNextLoad() {
      clearRefreshTimer();

      if (document.visibilityState === "visible") {
        timerId = window.setTimeout(load, REFRESH_MS);
      }
    }

    async function load() {
      if (cancelled || document.visibilityState !== "visible") {
        return;
      }

      try {
        setError("");

        const res = await fetch(
          `/.netlify/functions/fleetio-trip-status?company=${encodeURIComponent(company)}&date=${encodeURIComponent(dateYmd)}`,
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
      } finally {
        if (!cancelled) {
          scheduleNextLoad();
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        load();
        return;
      }

      clearRefreshTimer();
    }

    load();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearRefreshTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [company, dateYmd]);

  return { trips, error };
}
