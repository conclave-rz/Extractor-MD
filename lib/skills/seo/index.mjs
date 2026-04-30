import { normalize } from "./normalize.mjs";
import { section } from "./section.mjs";

export const seoSkill = {
  id: "seo",
  label: "SEO",
  description: "Title/description, canonical, robots, hreflang, Open Graph, JSON-LD, alt coverage, link ratio.",
  outputs: ["info.md"],
  defaultEnabled: true,
  normalize,
  section,
  diagnostics(normalized) {
    return Array.isArray(normalized?.validations) ? normalized.validations : [];
  }
};
