import { useEffect, useRef, useState } from "react";

import {
  getFleetioOperationalStatus,
  parseExtraOperationalSaturdays,
} from "../utils/fleetioSchedule";

const REFRESH_MS = 15 * 60 * 1000;
const EXTRA_OPERATIONAL_SATURDAYS = parseExtraOperationalSaturdays(
  import.meta.env.VITE_FLEETIO_EXTRA_SATURDAYS,
);
const FLEETIO_TIME_ZONE =
  import.meta.env.VITE_FLEETIO_TIME_ZONE || "America/Chicago";

function buildFleetioResponseError(rawText, status) {
  const trimmed = String(rawText || "").trim();

  if (
    trimmed.startsWith("<!doctype html>") ||
    trimmed.includes('<script type="module" src="/@vite/client"></script>') ||
    trimmed.includes("<title>route-board</title>")
  ) {
    return new Error(
      "Fleetio function returned the Vite app HTML. In local development, open the board from http://localhost:8888 so Netlify Functions are available.",
    );
  }

  return new Error(
    trimmed
      ? `Fleetio fn returned non-JSON response: ${trimmed}`
      : `Fleetio fn HTTP ${status}`,
  );
}

export function useFleetioTripStatus(company, dateYmd) {
  const [trips, setTrips] = useState({});
  const [error, setError] = useState("");
  const lastLoadedAtRef = useRef(0);

  useEffect(() => {
    if (!dateYmd) {
      setTrips({});
      setError("");
      lastLoadedAtRef.current = 0;
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

    function isOperationalNow() {
      return getFleetioOperationalStatus(new Date(), {
        extraOperationalSaturdays: EXTRA_OPERATIONAL_SATURDAYS,
        timeZone: FLEETIO_TIME_ZONE,
      }).isOperational;
    }

    function hasFreshClientData() {
      return Date.now() - lastLoadedAtRef.current < REFRESH_MS;
    }

    async function load() {
      if (cancelled || document.visibilityState !== "visible") {
        return;
      }

      if (!isOperationalNow()) {
        scheduleNextLoad();
        return;
      }

      if (hasFreshClientData()) {
        scheduleNextLoad();
        return;
      }

      try {
        setError("");

        const res = await fetch(
          `/.netlify/functions/fleetio-trip-status?company=${encodeURIComponent(company)}&date=${encodeURIComponent(dateYmd)}`,
        );
        const rawText = await res.text();
        let payload = null;

        if (rawText) {
          try {
            payload = JSON.parse(rawText);
          } catch {
            payload = null;
          }
        }

        if (!res.ok) {
          const detail = String(
            payload?.error || payload?.reason || rawText || "",
          ).trim();

          throw new Error(
            detail
              ? `Fleetio fn HTTP ${res.status}: ${detail}`
              : `Fleetio fn HTTP ${res.status}`,
          );
        }

        if (!payload || typeof payload !== "object") {
          throw buildFleetioResponseError(
            rawText || "Fleetio fn returned an empty response.",
            res.status,
          );
        }

        if (!cancelled) {
          setTrips(payload?.trips || {});
          lastLoadedAtRef.current = Date.now();
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
        if (!isOperationalNow() || hasFreshClientData()) {
          scheduleNextLoad();
          return;
        }

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
