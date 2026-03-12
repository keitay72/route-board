// src/hooks/useFitDriverText.js

import { useEffect } from "react";

export function useFitDriverText(enabled, rerunKey) {
  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let t1 = 0;
    let t2 = 0;

    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nodes = document.querySelectorAll(
          ".routeTile .driverName .fitText",
        );

        nodes.forEach((span) => {
          const box = span.parentElement;
          if (!box) return;

          span.style.transform = "scaleX(1)";

          const available = box.clientWidth;
          const needed = span.scrollWidth;

          if (!available || !needed) return;

          if (needed > available) {
            const ratio = available / needed;
            const s = Math.max(0.6, Math.min(1, ratio));
            span.style.transform = `scaleX(${s})`;
          }
        });
      });
    };

    apply();
    t1 = window.setTimeout(apply, 60);
    t2 = window.setTimeout(apply, 260);

    window.addEventListener("resize", apply);

    if (document.fonts?.ready) {
      document.fonts.ready.then(apply).catch(() => {});
    }

    return () => {
      window.removeEventListener("resize", apply);
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [enabled, rerunKey]);
}
