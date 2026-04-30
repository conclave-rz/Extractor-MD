const CSS_FW_LABELS = {
  tailwind: "Tailwind CSS",
  bootstrap: "Bootstrap",
  mui: "Material UI",
  chakra: "Chakra UI",
  bulma: "Bulma"
};

export function normalize(raw) {
  if (!raw || typeof raw !== "object") return null;

  const frameworks = (raw.frameworks || []).map((f) => Object.assign({ confidence: "high" }, f));
  const uiLibraries = (raw.uiLibraries || []).map((u) => Object.assign({ confidence: "high" }, u));

  const cssCandidates = raw.cssFrameworks || {};
  const cssFrameworks = [];
  for (const [key, ratio] of Object.entries(cssCandidates)) {
    if (key === "classCountSampled" || typeof ratio !== "number") continue;
    if (ratio > 0.15) {
      cssFrameworks.push({ id: key, label: CSS_FW_LABELS[key] || key, ratio, confidence: "high" });
    } else if (ratio > 0.05) {
      cssFrameworks.push({ id: key, label: CSS_FW_LABELS[key] || key, ratio, confidence: "medium" });
    }
  }
  cssFrameworks.sort((a, b) => b.ratio - a.ratio);

  const cmsDetected = (raw.cms && raw.cms.detected) ? raw.cms.detected.map((c) => Object.assign({ confidence: "high" }, c)) : [];

  const bundlers = (raw.bundlersAndHosts || []).map((b) => Object.assign({ confidence: "high" }, b));

  const analytics = (raw.analytics || []).map((a) => Object.assign({ confidence: "high" }, a));

  const fontHosts = (raw.fonts && raw.fonts.hosts) ? raw.fonts.hosts.slice() : [];
  const fontFaces = (raw.fonts && raw.fonts.fontFaces) ? raw.fonts.fontFaces.slice() : [];
  const fonts = summarizeFonts(fontFaces, fontHosts);

  return {
    frameworks,
    uiLibraries,
    cssFrameworks,
    cms: { detected: cmsDetected, generatorMeta: (raw.cms && raw.cms.generatorMeta) || "" },
    bundlers,
    analytics,
    fonts,
    customPropertyCount: typeof raw.customPropertyCount === "number" ? raw.customPropertyCount : 0
  };
}

function summarizeFonts(fontFaces, fontHosts) {
  if (!fontFaces || fontFaces.length === 0) {
    if (fontHosts.length === 0) return [];
    return fontHosts.map((host) => ({ family: null, host: hostLabel(host) }));
  }
  const byFamily = new Map();
  for (const face of fontFaces) {
    if (!face.family) continue;
    const host = classifyFontSrc(face.src, fontHosts);
    if (!byFamily.has(face.family)) byFamily.set(face.family, host);
  }
  return Array.from(byFamily.entries()).map(([family, host]) => ({ family, host }));
}

function classifyFontSrc(src, hosts) {
  const s = String(src || "");
  if (/fonts\.gstatic\.com|fonts\.googleapis\.com/.test(s)) return "Google Fonts";
  if (/use\.typekit\.net/.test(s)) return "Adobe Fonts";
  if (/fonts\.bunny\.net/.test(s)) return "Bunny Fonts";
  if (s) return "Self-hosted";
  if (hosts.includes("google")) return "Google Fonts";
  if (hosts.includes("adobe")) return "Adobe Fonts";
  if (hosts.includes("bunny")) return "Bunny Fonts";
  return "Self-hosted";
}

function hostLabel(host) {
  if (host === "google") return "Google Fonts";
  if (host === "adobe") return "Adobe Fonts";
  if (host === "bunny") return "Bunny Fonts";
  return host;
}
