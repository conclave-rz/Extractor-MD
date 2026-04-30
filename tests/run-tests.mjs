import assert from "node:assert/strict";
import { normalizeExtractedStyles } from "../lib/normalize.mjs";
import { generateDesignMarkdown } from "../lib/generate-design-md.mjs";
import { generateSkillMarkdown } from "../lib/generate-skill-md.mjs";
import { validateMarkdownOutput } from "../lib/validate.mjs";
import "../lib/skills/index.mjs";
import { listSkills } from "../lib/skills/registry.mjs";
import { runSkills } from "../lib/skills/orchestrator.mjs";

const mockPayload = {
  source: {
    url: "https://example.com/dashboard",
    title: "Example Dashboard"
  },
  sampledAt: "2026-04-14T12:00:00.000Z",
  totalElements: 460,
  sampledElements: 120,
  typography: [
    { fontFamily: "\"Inter\", \"Helvetica Neue\", Arial, sans-serif", fontSize: "14px", lineHeight: "20px", fontWeight: "400" },
    { fontFamily: "\"Inter\", \"Helvetica Neue\", Arial, sans-serif", fontSize: "16px", lineHeight: "24px", fontWeight: "400" },
    { fontFamily: "\"Inter\", \"Helvetica Neue\", Arial, sans-serif", fontSize: "16px", lineHeight: "24px", fontWeight: "400" },
    { fontFamily: "\"Inter\", \"Helvetica Neue\", Arial, sans-serif", fontSize: "20px", lineHeight: "28px", fontWeight: "600" }
  ],
  colors: [
    { textColor: "rgb(17, 24, 39)", backgroundColor: "rgb(255, 255, 255)", borderColor: "rgb(229, 231, 235)", outlineColor: "rgb(59, 130, 246)" },
    { textColor: "rgb(75, 85, 99)", backgroundColor: "rgb(249, 250, 251)", borderColor: "rgb(209, 213, 219)", outlineColor: "rgb(59, 130, 246)" },
    { textColor: "rgb(17, 24, 39)", backgroundColor: "rgb(255, 255, 255)", borderColor: "rgb(229, 231, 235)", outlineColor: "rgb(59, 130, 246)" }
  ],
  spacing: [
    {
      marginTop: "8px",
      marginRight: "16px",
      marginBottom: "8px",
      marginLeft: "16px",
      paddingTop: "12px",
      paddingRight: "16px",
      paddingBottom: "12px",
      paddingLeft: "16px"
    }
  ],
  radius: ["6px", "8px", "8px"],
  shadows: ["none", "0 1px 2px rgba(0, 0, 0, 0.08)"],
  motion: [
    {
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-in-out",
      animationDuration: "0s",
      animationTimingFunction: "ease"
    }
  ],
  components: [
    { type: "buttons", count: 12 },
    { type: "inputs", count: 9 },
    { type: "navigation", count: 2 }
  ],
  siteSignals: {
    title: "Example Dashboard",
    description: "Manage your workspace, analytics, billing, and team settings.",
    keywords: "dashboard, analytics, reports, workspace, admin",
    ogType: "website",
    ogSiteName: "Example",
    appName: "Example App",
    pathname: "/app/dashboard",
    hostname: "example.com",
    headings: ["Team Dashboard", "Usage Analytics"],
    navTexts: ["Dashboard", "Reports", "Settings", "Billing", "Users"],
    ctaTexts: ["Invite user", "Save settings"],
    textSample: "Use this workspace dashboard to manage team projects, billing, reports, and account settings.",
    elementCounts: {
      forms: 4,
      inputs: 22,
      tables: 2,
      codeBlocks: 0,
      articles: 0,
      pricingSections: 0,
      productMarkers: 0,
      authMarkers: 3,
      checkoutMarkers: 0
    }
  }
};

const normalized = normalizeExtractedStyles(mockPayload);

assert.ok(normalized.typographyScale.length >= 3, "typography scale should be inferred");
assert.equal(normalized.mainFontStyle.primaryFamily, "Inter", "main font family should be inferred");
assert.ok(normalized.colorPalette.length >= 3, "color palette should be inferred");
assert.ok(normalized.spacingScale.length >= 2, "spacing scale should be inferred");

const designMd = generateDesignMarkdown({
  normalized,
  metadata: {
    systemName: "Example DS",
    brand: "Example"
  }
});

const skillMd = generateSkillMarkdown({
  normalized,
  metadata: {
    systemName: "Example DS",
    brand: "Example"
  }
});

const designValidation = validateMarkdownOutput("design", designMd);
const skillValidation = validateMarkdownOutput("skill", skillMd);

assert.ok(designValidation.isValid, `DESIGN.md should be valid: ${designValidation.errors.join(", ")}`);
assert.ok(skillValidation.isValid, `SKILL.md should be valid: ${skillValidation.errors.join(", ")}`);
assert.ok(skillMd.includes("TYPEUI_SH_MANAGED_START"), "SKILL.md should include managed markers");
assert.ok(designMd.includes("WCAG 2.2 AA"), "DESIGN.md should include accessibility target");
assert.ok(designMd.includes("- URL: https://example.com/dashboard"), "DESIGN.md should include extraction URL");
assert.ok(designMd.includes("- Main font style: `font.family.primary=Inter`"), "DESIGN.md should include inferred main font style");
assert.ok(skillMd.includes("- URL: https://example.com/dashboard"), "SKILL.md should include extraction URL");
assert.ok(skillMd.includes("- Main font style: `font.family.primary=Inter`"), "SKILL.md should include inferred main font style");
assert.ok(designMd.includes("- Audience: authenticated users and operators"), "DESIGN.md should infer audience from site signals");
assert.ok(designMd.includes("- Product surface: dashboard web app"), "DESIGN.md should infer product surface from site signals");
assert.ok(skillMd.includes("- Product surface: dashboard web app"), "SKILL.md should infer product surface from site signals");
assert.ok(!designMd.includes("Audience/surface inference confidence"), "DESIGN.md should not include inference confidence text");
assert.ok(!skillMd.includes("Audience/surface inference confidence"), "SKILL.md should not include inference confidence text");

// --- Skill registry tests ---

const skills = listSkills();
const skillIds = skills.map((s) => s.id);
assert.ok(skillIds.includes("design-tokens"), "design-tokens skill should be registered");
assert.ok(skillIds.includes("product-surface"), "product-surface skill should be registered");

// Default run (no enabledSkills filter, default outputs) must produce DESIGN.md and SKILL.md
// byte-for-byte identical to the legacy generator output.
const skillRun = runSkills(mockPayload, {
  metadata: {
    systemName: "Example DS",
    brand: "Example"
  }
});

assert.equal(
  skillRun.outputs["design.md"],
  designMd,
  "orchestrator-produced design.md must match legacy generator output byte-for-byte"
);
assert.equal(
  skillRun.outputs["skill.md"],
  skillMd,
  "orchestrator-produced skill.md must match legacy generator output byte-for-byte"
);
assert.equal(skillRun.filenames["design.md"], "DESIGN.md");
assert.equal(skillRun.filenames["skill.md"], "SKILL.md");

assert.ok(skillRun.normalized["design-tokens"], "design-tokens normalized payload should exist");
assert.ok(skillRun.normalized["product-surface"]?.siteProfile, "product-surface should expose siteProfile");
assert.equal(
  skillRun.normalized["product-surface"].siteProfile.productSurface,
  "dashboard web app",
  "product-surface should infer dashboard web app"
);

assert.ok(skillRun.validations["design.md"]?.isValid, "DESIGN.md validation must pass via orchestrator");
assert.ok(skillRun.validations["skill.md"]?.isValid, "SKILL.md validation must pass via orchestrator");
assert.equal(skillRun.errors.length, 0, `orchestrator should not report errors: ${JSON.stringify(skillRun.errors)}`);

// Filtering by enabledSkills must still produce the legacy output when both
// design-tokens and product-surface are enabled (the default pair).
const filteredRun = runSkills(mockPayload, {
  enabledSkills: ["design-tokens", "product-surface"],
  outputs: ["design.md", "skill.md"],
  metadata: { systemName: "Example DS", brand: "Example" }
});
assert.equal(filteredRun.outputs["design.md"], designMd, "filtered run still byte-equal for design.md");
assert.equal(filteredRun.outputs["skill.md"], skillMd, "filtered run still byte-equal for skill.md");

// product-surface alone must not emit any output in phase 1.
const onlyProductSurface = runSkills(mockPayload, {
  enabledSkills: ["product-surface"],
  outputs: ["design.md", "skill.md"]
});
assert.equal(Object.keys(onlyProductSurface.outputs).length, 0, "product-surface alone should emit nothing in phase 1");
assert.ok(onlyProductSurface.normalized["product-surface"]?.siteProfile, "but it should still emit normalized data");

console.log("All tests passed.");
