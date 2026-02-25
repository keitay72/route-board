export function getCompanyFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get("company") || "").trim().toLowerCase();
  return raw === "mhd" ? "mhd" : "kcd"; // invalid/missing -> kcd
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
      watermark: 'url("/mhd-logo.png")', // set to "none" if you don’t have it
      copyright: "Mountain High Disposal LLC",
      loaderVariant: "mhd",
    };
  }

  return {
    ...base,
    displayName: "KC Disposal",
    apiUrl: kcdUrl,
    logoSrc: "/kc-logo.png",
    logoAlt: "KC Disposal",
    watermark: 'url("/kc-watermark.png")',
    copyright: "KC Disposal LLC",
    loaderVariant: "kc",
  };
}
