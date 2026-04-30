import { generateDesignMarkdown } from "../../generate-design-md.mjs";
import { generateSkillMarkdown } from "../../generate-skill-md.mjs";

const SECTION_ORDER = 0;

export function section(normalized, outputId, ctx = {}) {
  if (!normalized) {
    return null;
  }
  const metadata = ctx.metadata || {};

  if (outputId === "design.md") {
    return {
      heading: null,
      body: generateDesignMarkdown({ normalized, metadata }),
      anchor: "design-tokens",
      sectionOrder: SECTION_ORDER
    };
  }

  if (outputId === "skill.md") {
    return {
      heading: null,
      body: generateSkillMarkdown({ normalized, metadata }),
      anchor: "design-tokens",
      sectionOrder: SECTION_ORDER
    };
  }

  return null;
}
