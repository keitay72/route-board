import { useEffect, useState } from "react";

export function useViewportTileScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function calc() {
      const w = window.innerWidth || 0;
      const h = window.innerHeight || 0;

      const refW = 1536;
      const refH = 856;

      const r = Math.min(w / refW, h / refH);
      const curved = Math.pow(r, 0.95);

      const s = Math.max(0.68, Math.min(1.15, curved));
      setScale(s);
    }

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return scale;
}
