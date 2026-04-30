import { normalize } from "./normalize.mjs";
import { section } from "./section.mjs";

export const infoArchitectureSkill = {
  id: "info-architecture",
  label: "Information architecture",
  description: "Captures heading hierarchy, landmarks, nav graph, link graph, and URL pattern.",
  outputs: ["info.md"],
  defaultEnabled: true,
  normalize,
  section,
  diagnostics(normalized) {
    if (!normalized) return [];
    const v = normalized.validations;
    const out = [];
    if (v.multipleH1) out.push(`Page has ${v.h1Count} h1 elements; only one should exist.`);
    if (v.missingMain) out.push("No <main> landmark detected.");
    if (v.skips.length > 0) out.push(`Heading hierarchy has ${v.skips.length} skip(s).`);
    return out;
  }
};
