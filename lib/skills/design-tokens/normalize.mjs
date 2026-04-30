import { normalizeExtractedStyles } from "../../normalize.mjs";
import { groupCssVars, hasDarkVariants, buildHexToVarLookup } from "./css-vars.mjs";
import { clusterColors } from "./clustering.mjs";
import { inferTypeRatio, inferBaseSize, buildScaleFromRatio } from "./type-ratio.mjs";
import { buildShadowTokens } from "./shadows.mjs";

export function normalize(rawPayload) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }

  // Run the legacy normalization path first so the output remains
  // byte-for-byte identical when no new signals are present.
  const base = normalizeExtractedStyles(rawPayload);

  const enrichments = computeEnrichments(rawPayload, base);
  if (!enrichments) {
    return base;
  }
  return Object.assign({}, base, enrichments);
}

function computeEnrichments(payload, base) {
  const cssVars = (payload && payload.cssVars) || {};
  const stylesheetSignals = (payload && payload.stylesheetSignals) || null;
  const supportsDarkMode = Boolean(payload && payload.supportsDarkMode) ||
    hasDarkVariants(cssVars) ||
    (stylesheetSignals && hasDarkVariants(stylesheetSignals.rootVars));

  const hasAnyNew = Object.keys(cssVars).length > 0 ||
    (stylesheetSignals && (
      (stylesheetSignals.fontFaces && stylesheetSignals.fontFaces.length > 0) ||
      (stylesheetSignals.breakpoints && stylesheetSignals.breakpoints.length > 0) ||
      (stylesheetSignals.keyframes && stylesheetSignals.keyframes.length > 0) ||
      Object.keys(stylesheetSignals.rootVars || {}).length > 0
    )) ||
    Boolean(payload.supportsDarkMode);

  if (!hasAnyNew) {
    return null;
  }

  const groupedVars = groupCssVars(Object.assign({}, (stylesheetSignals && stylesheetSignals.rootVars) || {}, cssVars));
  const hexToVar = buildHexToVarLookup(groupedVars.color);

  // Color clustering — runs only when new signals exist, so legacy paths
  // remain untouched.
  const colorEntries = base.colorPalette.map((row) => ({
    hex: String(row.value || "").toLowerCase(),
    count: row.usage || 1
  }));
  const colorClusters = clusterColors(colorEntries);

  // Cite CSS vars on color tokens when a hex match exists.
  const colorPaletteWithSources = base.colorPalette.map((row) => {
    const hex = String(row.value || "").toLowerCase();
    const cssVar = hexToVar[hex];
    return {
      token: row.token,
      value: row.value,
      usage: row.usage,
      source: cssVar ? "css-var" : "cluster",
      cssVar: cssVar || null,
      citation: cssVar ? `var(${cssVar})` : null
    };
  });

  // Typography ratio detection.
  const fontSizes = (payload.typography || [])
    .map((row) => parsePx(row.fontSize))
    .filter((n) => Number.isFinite(n));
  const typeRatio = inferTypeRatio(fontSizes);
  const baseSize = typeRatio ? inferBaseSize(fontSizes) : null;
  const typographyMeta = typeRatio
    ? {
        ratio: typeRatio,
        baseSize,
        derivedScale: buildScaleFromRatio(baseSize || 16, typeRatio)
      }
    : null;

  // Composite shadows.
  const shadowComposites = buildShadowTokens(payload.shadows || []);

  // Breakpoints.
  const breakpoints = stylesheetSignals && Array.isArray(stylesheetSignals.breakpoints)
    ? stylesheetSignals.breakpoints.slice()
    : [];
  const breakpointTokens = namedBreakpoints(breakpoints);

  // Font faces summarization.
  const fontFaces = stylesheetSignals && Array.isArray(stylesheetSignals.fontFaces)
    ? stylesheetSignals.fontFaces.map(normalizeFontFace)
    : [];

  return {
    cssVars: groupedVars,
    colorPaletteWithSources,
    colorClusters,
    typographyMeta,
    shadowComposites,
    breakpoints,
    breakpointTokens,
    fontFaces,
    keyframes: stylesheetSignals && Array.isArray(stylesheetSignals.keyframes)
      ? stylesheetSignals.keyframes.slice()
      : [],
    supportsDarkMode
  };
}

function parsePx(value) {
  if (!value || value === "normal" || value === "auto") return null;
  const num = Number.parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

function namedBreakpoints(values) {
  const names = ["sm", "md", "lg", "xl", "2xl"];
  return values
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .slice(0, names.length)
    .map((px, i) => ({ token: `breakpoint.${names[i]}`, value: `${px}px` }));
}

function normalizeFontFace(face) {
  return {
    family: String(face.family || "").trim(),
    weight: String(face.weight || "400").trim(),
    style: String(face.style || "normal").trim(),
    src: String(face.src || "").trim()
  };
}
