import { normalize } from "./normalize.mjs";
import { section } from "./section.mjs";

export const designTokensSkill = {
  id: "design-tokens",
  label: "Design tokens",
  description: "Extracts typography, color, spacing, radius, shadow, and motion tokens from computed styles.",
  outputs: ["design.md", "skill.md"],
  defaultEnabled: true,
  normalize,
  section,
  diagnostics(normalized) {
    return Array.isArray(normalized?.diagnostics) ? normalized.diagnostics : [];
  }
};
