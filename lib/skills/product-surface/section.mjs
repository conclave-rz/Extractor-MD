/**
 * In phase 1 the design-tokens skill emits the entire DESIGN.md / SKILL.md
 * document (including the Brand block that uses siteProfile data), so this
 * skill's contribution is already embedded in that output. We return null
 * here to avoid duplicating the brand block.
 *
 * When future phases introduce stack.md / info.md, this skill can emit its
 * own dedicated section there.
 */
export function section(_normalized, _outputId) {
  return null;
}
