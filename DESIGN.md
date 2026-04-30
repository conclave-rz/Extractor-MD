# Architecture

This document describes the internal architecture of the extension.
For end-user docs, see [README.md](README.md).

## Pipeline overview

```
┌──────────────┐      ┌───────────────────────┐      ┌──────────────────┐
│  active tab  │ ───▶ │ dist/content-script.js│ ───▶ │  service-worker  │
└──────────────┘      └───────────────────────┘      └────────┬─────────┘
                                                              │
                              chrome.scripting.executeScript  │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │ resolvePendingFetches│
                                                   │     (origin files)  │
                                                   └────────┬─────────────┘
                                                            │
                                                            ▼
                                                   ┌──────────────────┐
                                                   │ runSkills()      │
                                                   │  • normalize     │
                                                   │  • section       │
                                                   │  • assemble      │
                                                   └────────┬─────────┘
                                                            │
                                                            ▼
                                                  outputs: DESIGN.md,
                                                  SKILL.md, STACK.md,
                                                  INFO.md
```

## The skill contract

Skills are described in [`lib/skills/types.mjs`](lib/skills/types.mjs). A
skill is a plain object with three lifecycle hooks:

```js
{
  id: 'tech-stack',
  label: 'Tech stack',
  description: 'short string',
  outputs: ['stack.md'],
  defaultEnabled: true,

  // Runs IN the page (content-script context). Bundled by
  // scripts/build-content-script.mjs into dist/content-script.js.
  // Each browser extractor registers itself with
  // __TYPEUI_REGISTER_EXTRACTOR(id, fn).
  run(doc, win) -> RawSignals,

  // Runs in the service worker / Node tests. Receives the raw signals
  // for THIS skill (or the whole legacy payload) plus a context with
  // { rawPayload, skillRaw, meta }.
  normalize(raw, ctx) -> Normalized,

  // Returns { heading, body, anchor, sectionOrder } for the requested
  // output, or null. Lower sectionOrder renders first.
  section(normalized, outputId) -> SkillSection | null,

  diagnostics(normalized) -> string[]
}
```

## Section ordering

Each output file is assembled by concatenating every contributing skill's
section, sorted by `sectionOrder` (ascending), with `id.localeCompare()` as
a deterministic tie-breaker. The current ordering for `info.md`:

| Skill | sectionOrder |
| --- | ---: |
| `info-architecture` | 10 |
| `seo` | 20 |
| `geo` | 30 |

For `design.md` and `skill.md`, the `design-tokens` skill emits a
`sectionOrder = 0` body that contains the entire document (preserving the
legacy byte-for-byte output). `product-surface` returns `null` for both
outputs because its data is already embedded by `design-tokens`. Future
work can split these renderers into per-skill sections without changing
the contract.

When only one section contributes to an output, the orchestrator returns
its body verbatim (no joining, no whitespace collapsing). This is what
keeps `DESIGN.md` / `SKILL.md` byte-identical to the pre-refactor output.

## pendingFetches and origin-file resolution

Skills that need cross-origin assets (`/llms.txt`, `/robots.txt`,
`/sitemap.xml`, …) cannot fetch directly from the page (CORS). The
contract is:

1. The browser extractor returns a `pendingFetches: [{ key, url }]`
   array as part of its raw signals.
2. The bundler wrapper hoists those entries into the top-level
   `payload.pendingFetches: [{ skill, key, url }]` so the service
   worker can see who asked for what.
3. `service-worker.js#resolvePendingFetches` runs every fetch in
   parallel through `fetchOriginFile(url)` (background context, where
   MV3 `host_permissions: ["<all_urls>"]` lets the request through).
4. Results are merged back into each skill's slice as
   `payload.skills[skillId].fetched = { url: { ok, status, text } }`.
5. `runSkills()` then runs as usual; each skill reads
   `raw.fetched[<some url>]` and decides what to do with it.

The same backbone is exposed via the `FETCH_ORIGIN_FILE` runtime message
for any popup or tooling code that needs an arbitrary fetch.

## Bundle format

`scripts/build-content-script.mjs` walks `lib/skills/<id>/extract.browser.js`
files in alphabetical order and concatenates them inside an IIFE wrapper
that:

1. guards `window.__typeuiStyleExtractorInstalled`,
2. defines `__TYPEUI_REGISTER_EXTRACTOR(id, fn)`,
3. installs a `chrome.runtime.onMessage` listener that runs every
   registered extractor and responds with
   `{ meta, skills: { id: rawData }, pendingFetches: [...] }`.

`extract.browser.js` files must be self-contained — no `import` /
`export`, no top-level `await`. They register their function and rely on
the wrapper. See `lib/skills/design-tokens/extract.browser.js` for a
canonical example.

## Tests

- `tests/run-tests.mjs` is the entrypoint and re-exports legacy assertions
  to guarantee `DESIGN.md` / `SKILL.md` parity with the pre-refactor pipeline.
- `tests/skills/<skill>.test.mjs` covers per-skill normalization and
  section rendering with hand-crafted bundle-format payloads.
- A combined info.md test asserts section ordering across
  info-architecture / seo / geo.

The pipeline never depends on a real browser, so tests run with plain
`node tests/run-tests.mjs`.

---

# SKILL.md authoring blueprint

The rest of this document is a canonical reference for the SKILL.md output
format. Use it when authoring a SKILL.md by hand or when modifying the
`lib/generate-skill-md.mjs` template.

## Authoring rules

- Keep language concise and operational.
- Prefer explicit rules over vague styling advice.
- Use measurable constraints (tokens, states, thresholds).
- Write in implementation-first order: foundations, components, accessibility, QA.
- Use consistent terminology across the entire file.

## Required `skill.md` structure

```md
---
name: design-system-[brand-or-scope]
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards.
---

<!-- TYPEUI_SH_MANAGED_START -->

# [Design System Name]

## Mission
One paragraph describing the system objective and target product experience.

## Brand
- Product/brand: [name]
- Audience: [primary users]
- Product surface: [web app, marketing site, dashboard, mobile web]

## Style Foundations
- Visual style: [keywords]
- Typography scale: [token list]
- Color palette: [semantic tokens + values]
- Spacing scale: [token list]
- Radius/shadow/motion tokens: [if applicable]

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required
- Focus-visible rules required
- Contrast constraints required

## Writing Tone
concise, confident, implementation-focused

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Define all required states: default, hover, focus-visible, active, disabled, loading, error.
- Specify responsive behavior and edge-case handling.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and tokens.
3. Define component anatomy, variants, and interactions.
4. Add accessibility acceptance criteria.
5. Add anti-patterns and migration notes.
6. End with QA checklist.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.

## Quality Gates
- Every non-negotiable rule uses "must".
- Every recommendation uses "should".
- Every accessibility rule is testable in implementation.
- Prefer system consistency over local visual exceptions.

<!-- TYPEUI_SH_MANAGED_END -->
```

## Acceptance checklist

- Frontmatter exists with valid `name` and `description`.
- Guidance is under 500 lines for `skill.md` when possible.
- Accessibility and interaction states are explicitly documented.
- Rules are concrete, testable, and non-ambiguous.
- Output can be reused in other repositories with only variable replacement.
