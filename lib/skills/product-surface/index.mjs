import { normalize } from "./normalize.mjs";
import { section } from "./section.mjs";

export const productSurfaceSkill = {
  id: "product-surface",
  label: "Product surface",
  description: "Infers audience and product surface (dashboard, marketing, docs, e-commerce, content, web app) from page signals.",
  outputs: ["design.md", "skill.md"],
  defaultEnabled: true,
  normalize,
  section,
  diagnostics(normalized) {
    const out = [];
    const sp = normalized?.siteProfile;
    if (sp && sp.confidence === "low") {
      out.push("Audience and product surface inference confidence is low; verify generated brand context.");
    }
    return out;
  }
};
