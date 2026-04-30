import assert from "node:assert/strict";
import "../../lib/skills/index.mjs";
import { runSkills } from "../../lib/skills/orchestrator.mjs";

function withSkill(rawIa) {
  return {
    meta: { url: "https://example.com/articles/2026-04-30-example", title: "x" },
    skills: { "info-architecture": rawIa },
    pendingFetches: []
  };
}

// === Test 1: valid hierarchy renders cleanly ===

const validRun = runSkills(withSkill({
  headings: [
    { level: 1, text: "Página principal", id: null, hasAnchorLink: false },
    { level: 2, text: "Cómo funciona", id: "como", hasAnchorLink: true },
    { level: 3, text: "Paso 1", id: "paso-1", hasAnchorLink: true },
    { level: 3, text: "Paso 2", id: "paso-2", hasAnchorLink: true }
  ],
  landmarks: { main: 1, nav: 2, aside: 0, header: 1, footer: 1 },
  navs: [
    { ariaLabel: "primary", directItems: 6, depth: 2, location: "header" },
    { ariaLabel: "footer", directItems: 12, depth: 1, location: "footer" }
  ],
  linkGraph: { internal: 84, external: 12, anchor: 4, mailto: 0, tel: 0, nofollow: 0 },
  breadcrumbs: true,
  pagination: false,
  urlPattern: { pathname: "/docs/api", pathDepth: 2, lastSegment: "api", slugLooksDetail: false },
  aboveTheFold: []
}), { enabledSkills: ["info-architecture"], outputs: ["info.md"] });

const md = validRun.outputs["info.md"];
assert.ok(md, "info.md should be produced");
assert.ok(md.includes("# Information architecture"));
assert.ok(md.includes("- h1: Página principal"));
assert.ok(md.includes("  - h2: Cómo funciona"));
assert.ok(md.includes("    - h3: Paso 1"));
assert.ok(md.includes("Internal: 84"));
assert.ok(md.includes("External: 12"));
assert.ok(md.includes("Breadcrumbs: detected"));
assert.ok(md.includes("Pagination: not detected"));
assert.ok(!md.includes("## Diagnostics"), "no diagnostics for a clean page");

// === Test 2: heading skip surfaces a diagnostic ===

const skipRun = runSkills(withSkill({
  headings: [
    { level: 1, text: "Top", id: null, hasAnchorLink: false },
    { level: 3, text: "Skipped h2", id: null, hasAnchorLink: false }
  ],
  landmarks: { main: 1, nav: 1, aside: 0, header: 1, footer: 0 },
  navs: [{ ariaLabel: null, directItems: 4, depth: 1, location: "header" }],
  linkGraph: { internal: 5, external: 0, anchor: 0, mailto: 0, tel: 0, nofollow: 0 },
  breadcrumbs: false,
  pagination: false,
  urlPattern: { pathname: "/", pathDepth: 0, lastSegment: "", slugLooksDetail: false },
  aboveTheFold: []
}), { enabledSkills: ["info-architecture"], outputs: ["info.md"] });

assert.ok(skipRun.outputs["info.md"].includes("Heading skip detected: h1 → h3"));

// === Test 3: missing <main> + multiple h1 + multiple unlabeled navs ===

const messyRun = runSkills(withSkill({
  headings: [
    { level: 1, text: "First h1", id: null, hasAnchorLink: false },
    { level: 1, text: "Second h1", id: null, hasAnchorLink: false }
  ],
  landmarks: { main: 0, nav: 3, aside: 0, header: 0, footer: 0 },
  navs: [
    { ariaLabel: null, directItems: 5, depth: 1, location: "body" },
    { ariaLabel: null, directItems: 8, depth: 1, location: "body" }
  ],
  linkGraph: { internal: 1, external: 0, anchor: 0, mailto: 0, tel: 0, nofollow: 0 },
  breadcrumbs: false,
  pagination: false,
  urlPattern: { pathname: "/", pathDepth: 0, lastSegment: "", slugLooksDetail: false },
  aboveTheFold: []
}), { enabledSkills: ["info-architecture"], outputs: ["info.md"] });

const messy = messyRun.outputs["info.md"];
assert.ok(messy.includes("Multiple h1 detected (2)"));
assert.ok(messy.includes("No <main> landmark detected"));
assert.ok(messy.includes("Multiple <nav> regions detected without aria-label"));

console.log("info-architecture tests passed.");
