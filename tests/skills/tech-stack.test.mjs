import assert from "node:assert/strict";
import "../../lib/skills/index.mjs";
import { runSkills } from "../../lib/skills/orchestrator.mjs";
import { techStackSkill } from "../../lib/skills/tech-stack/index.mjs";

// Build a bundle-format payload with a tech-stack slice.
function withTechStack(rawTechStack) {
  return {
    meta: { url: "https://example.com/", title: "x" },
    skills: { "tech-stack": rawTechStack },
    pendingFetches: []
  };
}

// === Test 1: Next.js + React + Tailwind detected ===

const nextRaw = {
  frameworks: [{ id: "nextjs", label: "Next.js", buildId: "abc123" }],
  uiLibraries: [{ id: "react", label: "React" }],
  cssFrameworks: { tailwind: 0.38, bootstrap: 0, mui: 0, chakra: 0, bulma: 0, classCountSampled: 1200 },
  cms: { detected: [], generatorMeta: "" },
  bundlersAndHosts: [{ id: "next-bundler", label: "Next.js bundler" }, { id: "vercel", label: "Vercel image pipeline" }],
  analytics: [{ id: "gtm", label: "Google Tag Manager" }, { id: "posthog", label: "PostHog" }],
  fonts: { hosts: ["google"], fontFaces: [{ family: "Inter", src: "url(https://fonts.gstatic.com/...)" }] },
  customPropertyCount: 24
};

const nextRun = runSkills(withTechStack(nextRaw), {
  enabledSkills: ["tech-stack"],
  outputs: ["stack.md"]
});

assert.ok(nextRun.outputs["stack.md"], "stack.md should be produced");
const stackMd = nextRun.outputs["stack.md"];
assert.ok(stackMd.includes("# Tech stack"));
assert.ok(stackMd.includes("Runtime: Next.js (high)"), "runtime line must include framework + confidence");
assert.ok(stackMd.includes("UI library: React (high)"));
assert.ok(stackMd.includes("Tailwind CSS (high, 38% utility class ratio)"), "Tailwind ratio should be reported");
assert.ok(stackMd.includes("Custom properties detected: 24"));
assert.ok(stackMd.includes("Vercel image pipeline"));
assert.ok(stackMd.includes("Google Tag Manager, PostHog"), "analytics summary must list every detected provider");
assert.ok(stackMd.includes("Inter (Google Fonts)"));

// === Test 2: WordPress detection ===

const wpRun = runSkills(withTechStack({
  frameworks: [],
  uiLibraries: [],
  cssFrameworks: { tailwind: 0, bootstrap: 0, mui: 0, chakra: 0, bulma: 0, classCountSampled: 0 },
  cms: { detected: [{ id: "wordpress", label: "WordPress" }], generatorMeta: "WordPress 6.4" },
  bundlersAndHosts: [],
  analytics: [],
  fonts: { hosts: [], fontFaces: [] },
  customPropertyCount: 0
}), { enabledSkills: ["tech-stack"], outputs: ["stack.md"] });

assert.ok(wpRun.outputs["stack.md"].includes("WordPress (high)"));
assert.ok(wpRun.outputs["stack.md"].includes("meta[generator]: WordPress 6.4"));

// === Test 3: low CSS ratio is filtered out ===

const lowRun = runSkills(withTechStack({
  frameworks: [],
  uiLibraries: [],
  cssFrameworks: { tailwind: 0.04, bootstrap: 0, mui: 0, chakra: 0, bulma: 0, classCountSampled: 100 },
  cms: { detected: [], generatorMeta: "" },
  bundlersAndHosts: [],
  analytics: [],
  fonts: { hosts: [], fontFaces: [] },
  customPropertyCount: 0
}), { enabledSkills: ["tech-stack"], outputs: ["stack.md"] });

assert.ok(
  lowRun.outputs["stack.md"].includes("(none detected at high or medium confidence)"),
  "ratios under 5% must not surface as detections"
);

// === Test 4: skill metadata exposed correctly ===

assert.equal(techStackSkill.id, "tech-stack");
assert.deepEqual(techStackSkill.outputs, ["stack.md"]);

console.log("tech-stack tests passed.");
