import { normalize } from "./normalize.mjs";
import { section } from "./section.mjs";

export const geoSkill = {
  id: "geo",
  label: "Generative engine optimization",
  description: "Scores how easily an LLM agent can discover, extract, and cite the page (llms.txt, FAQPage, definitional copy, density).",
  outputs: ["info.md"],
  defaultEnabled: true,
  normalize,
  section,
  diagnostics(normalized) {
    return Array.isArray(normalized?.validations) ? normalized.validations : [];
  }
};
