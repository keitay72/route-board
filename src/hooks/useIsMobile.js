import { useEffect, useState } from "react";

const MOBILE_MEDIA_QUERY = "(max-width: 900px)";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    const m = window.matchMedia(MOBILE_MEDIA_QUERY);
    const onChange = () => setIsMobile(m.matches);

    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);

    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, []);

  return isMobile;
}
