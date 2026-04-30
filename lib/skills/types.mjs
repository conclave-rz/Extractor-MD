/**
 * Skill contract for the DESIGN.md / SKILL.md / STACK.md / INFO.md pipeline.
 *
 * A skill describes a unit of capability that participates in three places:
 *
 *   1. `run(doc, win)` — runs INSIDE the page (content-script context).
 *      Must be synchronous, must not retain DOM references, and must return a
 *      JSON-serializable object. Called by the bundled content script.
 *
 *   2. `normalize(raw, ctx)` — runs in the service worker / Node test runner.
 *      Receives the raw output from `run`. Returns a clean model. Optional
 *      `ctx` exposes shared state ({ rawPayload, otherSkills }) for skills
 *      that depend on signals already extracted by another skill (for example,
 *      `product-surface` reuses `siteSignals` from `design-tokens`).
 *
 *   3. `section(normalized, outputId)` — runs in the service worker.
 *      Returns `{ heading, body, anchor, sectionOrder }` for the requested
 *      output file (`design.md`, `skill.md`, `stack.md`, `info.md`), or `null`
 *      if the skill does not contribute to that output.
 *
 *      `body` is the full markdown chunk for that section. The orchestrator
 *      concatenates all skill sections sorted by `sectionOrder` (ascending).
 *      A skill that produces an entire file (legacy path) can return `body`
 *      with the whole document and `sectionOrder = 0`.
 *
 * @typedef {Object} SkillSection
 * @property {string|null} heading  Optional H2 heading (skills may embed their own).
 * @property {string} body          Markdown body. Concatenated as-is.
 * @property {string} anchor        Stable identifier (kebab-case).
 * @property {number} sectionOrder  Lower numbers render first.
 *
 * @typedef {Object} Skill
 * @property {string} id                   Unique kebab-case identifier.
 * @property {string} label                Human-readable label for the popup.
 * @property {string} description          Short description for the popup.
 * @property {string[]} outputs            Files this skill contributes to (e.g. ['design.md','skill.md']).
 * @property {boolean} defaultEnabled      Whether the popup ships with this skill enabled.
 * @property {(doc:Document, win:Window) => any} [run]
 * @property {(raw:any, ctx?:object) => any} normalize
 * @property {(normalized:any, outputId:string) => SkillSection|null} section
 * @property {(normalized:any) => string[]} [diagnostics]
 */

export const SKILL_OUTPUTS = Object.freeze({
  DESIGN_MD: "design.md",
  SKILL_MD: "skill.md",
  STACK_MD: "stack.md",
  INFO_MD: "info.md"
});
