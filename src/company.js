// src/company.js

export function getCompanyFromUrl() {
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  // Query param override always wins
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get("company") || "").trim().toLowerCase();

  if (raw === "mhd") return "mhd";
  if (raw === "kcd") return "kcd";

  // Host-based detection
  // Works for:
  // - mhd.example.com
  // - routeboard-mhd.netlify.app
  // - anything with "mhd" in the hostname
  if (host.includes("mhd")) return "mhd";
  if (host.includes("kcd")) return "kcd";

  // Path-based detection
  // Works for:
  // - /mhd
  // - /mhd-route-board
  // - /company/mhd
  if (path.includes("/mhd")) return "mhd";
  if (path.includes("/kcd")) return "kcd";

  // Default
  return "kcd";
}

export function getCompanyConfig(company) {
  const kcdUrl = import.meta.env.VITE_ROUTEBOARD_API_URL_KCD;
  const mhdUrl = import.meta.env.VITE_ROUTEBOARD_API_URL_MHD;

  const base = {
    company,
    loaderTagline: "Please excuse the wait, we're still talking trash.",
  };

  if (company === "mhd") {
    return {
      ...base,
      displayName: "Mountain High Disposal",
      title: "MOUNTAIN HIGH DISPOSAL ROUTE BOARD",
      apiUrl: mhdUrl,
      logoSrc: "/mhd-logo.png",
      logoAlt: "Mountain High Disposal",
      watermark: 'url("/mhd-logo.png")',
      copyright: "Mountain High Disposal LLC",
      loaderVariant: "mhd",
    };
  }

  return {
    ...base,
    displayName: "KC Disposal",
    title: "",
    apiUrl: kcdUrl,
    logoSrc: "/kc-logo.png",
    logoAlt: "KC Disposal",
    watermark: 'url("/kc-watermark.png")',
    copyright: "KC Disposal LLC",
    loaderVariant: "kc",
  };
}
