import { useEffect, useState } from "react";

const REFRESH_MS = 15000;

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
        if (!cancelled) setData(json);
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
