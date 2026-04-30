import { normalize } from "./normalize.mjs";
import { section } from "./section.mjs";

export const techStackSkill = {
  id: "tech-stack",
  label: "Tech stack",
  description: "Detects frameworks, CSS libraries, CMS / builders, bundlers, analytics, and font hosts.",
  outputs: ["stack.md"],
  defaultEnabled: true,
  normalize,
  section,
  diagnostics(normalized) {
    if (!normalized) return [];
    const out = [];
    if (normalized.frameworks.length === 0 && normalized.uiLibraries.length === 0) {
      out.push("No JavaScript framework runtime detected; the site may be static HTML or render-blocked.");
    }
    if (normalized.cssFrameworks.length === 0 && normalized.customPropertyCount === 0) {
      out.push("No CSS framework or custom properties detected; styling may be ad-hoc CSS.");
    }
    return out;
  }
};
