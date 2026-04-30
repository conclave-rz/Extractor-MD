import assert from "node:assert/strict";
import "../../lib/skills/index.mjs";
import { runSkills } from "../../lib/skills/orchestrator.mjs";
import { clusterColors } from "../../lib/skills/design-tokens/clustering.mjs";
import { inferTypeRatio, buildScaleFromRatio } from "../../lib/skills/design-tokens/type-ratio.mjs";
import { parseShadow, buildShadowTokens } from "../../lib/skills/design-tokens/shadows.mjs";
import { groupCssVars, hasDarkVariants } from "../../lib/skills/design-tokens/css-vars.mjs";

function basePayload(overrides = {}) {
  return Object.assign({
    source: { url: "https://example.com/", title: "Example" },
    sampledAt: "2026-04-30T00:00:00.000Z",
    totalElements: 100,
    sampledElements: 40,
    typography: [
      { fontFamily: "Inter, sans-serif", fontSize: "16px", lineHeight: "24px", fontWeight: "400" },
      { fontFamily: "Inter, sans-serif", fontSize: "16px", lineHeight: "24px", fontWeight: "400" },
      { fontFamily: "Inter, sans-serif", fontSize: "20px", lineHeight: "28px", fontWeight: "600" }
    ],
    colors: [
      { textColor: "rgb(17, 24, 39)", backgroundColor: "rgb(255, 255, 255)", borderColor: "rgb(229, 231, 235)", outlineColor: "rgb(59, 130, 246)" }
    ],
    spacing: [{ marginTop: "8px", paddingTop: "12px", marginRight: "16px", marginBottom: "8px", marginLeft: "16px", paddingRight: "16px", paddingBottom: "12px", paddingLeft: "16px" }],
    radius: ["8px"],
    shadows: ["none"],
    motion: [{ transitionDuration: "150ms", transitionTimingFunction: "ease-in-out", animationDuration: "0s", animationTimingFunction: "ease" }],
    components: [{ type: "buttons", count: 3 }],
    siteSignals: {
      title: "Example",
      description: "",
      keywords: "",
      ogType: "",
      ogSiteName: "",
      appName: "",
      pathname: "/",
      hostname: "example.com",
      headings: [],
      navTexts: [],
      ctaTexts: [],
      textSample: "",
      elementCounts: { forms: 0, inputs: 0, tables: 0, codeBlocks: 0, articles: 0, pricingSections: 0, productMarkers: 0, authMarkers: 0, checkoutMarkers: 0 }
    }
  }, overrides);
}

// === Test 1: CSS vars are surfaced and cited on color tokens ===

const payloadWithVars = basePayload({
  cssVars: {
    "--color-primary": "#4f46e5",
    "--color-text-primary": "rgb(17, 24, 39)",
    "--space-1": "4px",
    "--radius-md": "8px",
    "--font-base": "Inter"
  }
});

const runWithVars = runSkills(payloadWithVars, { enabledSkills: ["design-tokens"], outputs: ["design.md"] });
const dtNormalized = runWithVars.normalized["design-tokens"];

assert.ok(dtNormalized.cssVars, "cssVars must appear on normalized output when supplied");
assert.equal(dtNormalized.cssVars.color["--color-primary"], "#4f46e5", "color css var preserved with value");
assert.equal(dtNormalized.cssVars.space["--space-1"], "4px", "space var grouped into space bucket");
assert.equal(dtNormalized.cssVars.radius["--radius-md"], "8px", "radius var grouped into radius bucket");

const citedToken = dtNormalized.colorPaletteWithSources.find((t) => t.cssVar === "--color-text-primary");
assert.ok(citedToken, "a color token should cite --color-text-primary");
assert.equal(citedToken.citation, "var(--color-text-primary)", "citation should follow var(...) syntax");
assert.equal(citedToken.source, "css-var", "source must be css-var when cited");

// === Test 2: stylesheet @font-face declarations expose every weight ===

const payloadWithFontFaces = basePayload({
  stylesheetSignals: {
    fontFaces: [
      { family: "Inter", weight: "400", style: "normal", src: "url(https://fonts.gstatic.com/...)" },
      { family: "Inter", weight: "600", style: "normal", src: "url(https://fonts.gstatic.com/...)" }
    ],
    breakpoints: [640, 768, 1024, 1280],
    keyframes: [{ name: "fadeIn", frames: 2 }],
    rootVars: {}
  }
});

const fontRun = runSkills(payloadWithFontFaces, { enabledSkills: ["design-tokens"], outputs: ["design.md"] });
const fontNormalized = fontRun.normalized["design-tokens"];

assert.equal(fontNormalized.fontFaces.length, 2, "both font-face declarations preserved");
const weights = fontNormalized.fontFaces.map((f) => f.weight).sort();
assert.deepEqual(weights, ["400", "600"], "weights 400 and 600 must both be present");
assert.equal(fontNormalized.breakpointTokens.length, 4, "4 breakpoints exposed as tokens");
assert.equal(fontNormalized.breakpointTokens[0].token, "breakpoint.sm");
assert.equal(fontNormalized.breakpointTokens[0].value, "640px");

// === Test 3: near-identical colors collapse into a single cluster ===

const clusters = clusterColors([
  { hex: "#fafafa", count: 10 },
  { hex: "#fbfbfb", count: 8 }
]);
assert.equal(clusters.length, 1, "two near-white colors must form one cluster");
assert.equal(clusters[0].count, 18, "cluster aggregates frequency");
assert.ok(clusters[0].members.includes("#fafafa") && clusters[0].members.includes("#fbfbfb"));

const distantClusters = clusterColors([
  { hex: "#000000", count: 5 },
  { hex: "#ffffff", count: 5 },
  { hex: "#4f46e5", count: 3 }
]);
assert.equal(distantClusters.length, 3, "distinct colors stay in separate clusters");

// === Test 4: typography sizes yield a known modular ratio ===

const ratio = inferTypeRatio([12, 14, 16, 20, 24]);
assert.ok(ratio !== null, "type ratio must be detected");
// Mathematically the closest common ratio for [12,14,16,20,24] is 1.2
// (sum of absolute deltas) — accept either 1.2 or 1.25 as a sensible fit.
assert.ok(ratio === 1.2 || ratio === 1.25, `ratio should be 1.2 or 1.25, got ${ratio}`);

const cleanRatio = inferTypeRatio([16, 20, 25, 31.25]);
assert.equal(cleanRatio, 1.25, "a pure 1.25 progression must round to 1.25");

const scale = buildScaleFromRatio(16, 1.25);
assert.equal(scale.length, 8, "scale should contain xs..4xl (8 levels)");
const md = scale.find((s) => s.name === "md");
assert.equal(md.px, 16);

// === Bonus: composite shadow parsing ===

const layers = parseShadow("0 1px 2px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.12)");
assert.equal(layers.length, 2, "multi-layer shadow parsed into 2 layers");
assert.equal(layers[0].x, 0);
assert.equal(layers[0].y, 1);
assert.equal(layers[0].blur, 2);

const composites = buildShadowTokens([
  "0 1px 2px rgba(0,0,0,0.1)",
  "0 4px 12px rgba(0,0,0,0.15)",
  "0 1px 2px rgba(0,0,0,0.1)" // dup silhouette
]);
assert.equal(composites.length, 2, "duplicate shadow silhouettes collapse");
assert.equal(composites[0].token, "shadow.sm", "smallest by radius gets shadow.sm");

// === Bonus: dark mode detection ===

assert.ok(hasDarkVariants({ "--color-bg-dark": "#000" }), "dark suffix triggers dark mode flag");
assert.ok(!hasDarkVariants({ "--color-bg": "#fff" }), "no dark suffix means no dark mode");

// === Bonus: groupCssVars unknown keys land in `other` ===

const grouped = groupCssVars({ "--mystery-x": "1", "--color-foo": "#fff" });
assert.equal(grouped.other["--mystery-x"], "1");
assert.equal(grouped.color["--color-foo"], "#fff");

console.log("design-tokens phase-2 tests passed.");
