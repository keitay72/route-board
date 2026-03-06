import { useEffect, useState } from "react";

const REFRESH_MS = 15000;

export function useFleetioTripStatus(company, dateYmd) {
  const [trucks, setTrucks] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dateYmd) return;

    let cancelled = false;
    let timer;

    async function load() {
      try {
        setError("");
        const res = await fetch(
          `/.netlify/functions/fleetio-trip-status?company=${encodeURIComponent(company)}&date=${encodeURIComponent(dateYmd)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Fleetio fn HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setTrucks(json?.trucks || {});
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    }

    load();
    timer = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [company, dateYmd]);

  return { trucks, error };
}
