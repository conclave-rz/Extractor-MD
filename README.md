# TypeUI DESIGN.md Extractor (Chrome Extension)

A Chrome extension (Manifest V3) that runs a multi-skill pipeline against any
page and emits up to four documents: `DESIGN.md`, `SKILL.md`, `STACK.md`, and
`INFO.md`. The output formats follow the open-source
[TypeUI DESIGN.md](https://www.typeui.sh/design-md) format and a coordinated
information-architecture / SEO / GEO blueprint.

<img width="1200" height="630" alt="designmdchrome" src="https://github.com/user-attachments/assets/64efbebb-1c68-4ca1-8792-ca167d5e12d6" />

## Getting started

```bash
npm run build       # produces dist/content-script.js
```

Then load the extension:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

> The extension injects `dist/content-script.js`, so `npm run build` must run
> at least once before the first use, and again whenever you change a
> `lib/skills/*/extract.browser.js` file.

## Skills

Each skill is a self-contained module that contributes signals to one or more
output files.

| Skill | Output(s) | What it captures |
| --- | --- | --- |
| `design-tokens` | DESIGN.md, SKILL.md | Typography scale, color palette (with OKLab clustering), spacing, radius, shadows (composite), motion, CSS custom properties, breakpoints, font-faces, dark-mode hints. |
| `product-surface` | (DESIGN.md / SKILL.md, embedded) | Audience and product surface inferred from headings, nav, CTAs, and metadata. |
| `tech-stack` | STACK.md | Frameworks (Next.js, Nuxt, Remix, SvelteKit, Astro, Solid, Qwik), UI libraries (React, Vue, Angular), CSS frameworks (Tailwind, Bootstrap, MUI, Chakra, Bulma), CMS / builders, bundlers, analytics, font hosts. |
| `info-architecture` | INFO.md | Heading tree, landmarks, per-`<nav>` structure, link graph, breadcrumbs, pagination, URL pattern, above-the-fold sections, hierarchy validations. |
| `seo` | INFO.md | Title and description ranges, canonical, robots, hreflang, Open Graph, Twitter cards, JSON-LD parsing, image alt coverage, link ratio, word count, robots.txt / sitemap.xml fetches. |
| `geo` | INFO.md | Generative-engine optimization score (0–100): `llms.txt`, FAQPage schema, definitional opening, table of contents, lists/tables density, content-to-chrome ratio, author + publish date, internal citations. |

## Outputs

| File | Contributing skills | Use it for |
| --- | --- | --- |
| `DESIGN.md` | design-tokens (+ product-surface) | Design-system source-of-truth for AI codegen tools. |
| `SKILL.md` | design-tokens (+ product-surface) | Drop-in skill file for Claude Code, Codex, or Cursor. |
| `STACK.md` | tech-stack | Quick reference of the page's tech footprint. |
| `INFO.md` | info-architecture, seo, geo | Information-architecture audit + SEO/GEO scorecard. |

The popup lets you toggle outputs and skills independently, persists the
choice in `chrome.storage.local`, and tabs between every produced file.
"Quick install" writes every selected output into the project folder of
your choice (`.claude/skills/typeui/`, `.agents/skills/typeui/`,
`.cursor/skills/typeui/`).

## Adding a new skill

A skill is described in [`lib/skills/types.mjs`](lib/skills/types.mjs).
Minimum scaffold:

```
lib/skills/<skill-id>/
├── extract.browser.js   # runs in the page (registers via __TYPEUI_REGISTER_EXTRACTOR)
├── normalize.mjs        # runs in service worker / Node tests
├── section.mjs          # returns { heading, body, anchor, sectionOrder } per outputId
└── index.mjs            # exports the Skill object
```

Register the skill in [`lib/skills/index.mjs`](lib/skills/index.mjs) and
re-run `npm run build` so its `extract.browser.js` is bundled into
`dist/content-script.js`. See `lib/skills/tech-stack/` for a concrete example.

## Local development

```bash
npm run build           # bundle content script
npm test                # run all tests (Node 20+)
```

Tests live under `tests/` and use `node:assert/strict`. Skill-specific
suites are in `tests/skills/`.

## License

MIT.
