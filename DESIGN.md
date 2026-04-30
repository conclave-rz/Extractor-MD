# Arquitectura

Este documento describe la arquitectura interna de la extensión.
Para documentación de uso, consulta [README.md](README.md).

## Vista general de la pipeline

```
┌──────────────┐      ┌───────────────────────┐      ┌──────────────────┐
│ pestaña      │ ───▶ │ dist/content-script.js│ ───▶ │  service-worker  │
│ activa       │      └───────────────────────┘      └────────┬─────────┘
└──────────────┘                                              │
                              chrome.scripting.executeScript  │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │ resolvePendingFetches│
                                                   │ (archivos de origen) │
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

## El contrato de skill

Las skills se documentan en
[`lib/skills/types.mjs`](lib/skills/types.mjs). Cada skill es un objeto
plano con tres ganchos de ciclo de vida:

```js
{
  id: 'tech-stack',
  label: 'Tech stack',
  description: 'descripción corta',
  outputs: ['stack.md'],
  defaultEnabled: true,

  // Corre EN la página (contexto del content script). El bundler
  // scripts/build-content-script.mjs lo incluye en dist/content-script.js.
  // Cada extractor de browser se registra con
  // __EXTRACTOR_MD_REGISTER_EXTRACTOR(id, fn).
  run(doc, win) -> RawSignals,

  // Corre en el service worker / tests de Node. Recibe las señales
  // crudas de ESTA skill (o el payload legacy completo) más un
  // contexto con { rawPayload, skillRaw, meta }.
  normalize(raw, ctx) -> Normalized,

  // Devuelve { heading, body, anchor, sectionOrder } para el output
  // pedido, o null. Un sectionOrder menor renderiza primero.
  section(normalized, outputId) -> SkillSection | null,

  diagnostics(normalized) -> string[]
}
```

## Orden de las secciones

Cada archivo de salida se ensambla concatenando la sección de cada skill
que contribuye, ordenadas por `sectionOrder` (ascendente), con
`id.localeCompare()` como desempate determinístico. El orden actual de
`info.md` es:

| Skill | sectionOrder |
| --- | ---: |
| `info-architecture` | 10 |
| `seo` | 20 |
| `geo` | 30 |

Para `design.md` y `skill.md`, la skill `design-tokens` emite un body con
`sectionOrder = 0` que contiene el documento completo (esto preserva el
output legacy byte-a-byte). `product-surface` retorna `null` para ambos
outputs porque sus datos ya están embebidos por `design-tokens`. Trabajo
futuro puede dividir esos renderers en secciones por skill sin cambiar
el contrato.

Cuando solo una skill aporta a un output, el orquestador devuelve su
body intacto (sin join, sin colapsar whitespace). Esto es lo que mantiene
`DESIGN.md` y `SKILL.md` byte-idénticos al output anterior al refactor.

## pendingFetches y resolución de archivos de origen

Las skills que necesitan recursos cross-origin (`/llms.txt`,
`/robots.txt`, `/sitemap.xml`, etc.) no pueden hacer fetch directamente
desde la página por CORS. El contrato es:

1. El extractor de browser devuelve un array `pendingFetches: [{ key,
   url }]` como parte de sus señales crudas.
2. El wrapper del bundler eleva esas entradas al nivel superior del
   payload como `payload.pendingFetches: [{ skill, key, url }]` para
   que el service worker sepa quién pidió qué.
3. `service-worker.js#resolvePendingFetches` ejecuta cada fetch en
   paralelo a través de `fetchOriginFile(url)` (contexto de background,
   donde el `host_permissions: ["<all_urls>"]` de MV3 permite la
   request).
4. Los resultados se mezclan de vuelta dentro del slice de cada skill
   como `payload.skills[skillId].fetched = { url: { ok, status, text } }`.
5. `runSkills()` corre como siempre; cada skill lee
   `raw.fetched[<alguna url>]` y decide qué hacer.

La misma infraestructura está expuesta vía el mensaje runtime
`FETCH_ORIGIN_FILE` para cualquier código de popup o tooling que
necesite un fetch arbitrario.

## Formato del bundle

`scripts/build-content-script.mjs` recorre los archivos
`lib/skills/<id>/extract.browser.js` en orden alfabético y los
concatena dentro de un wrapper IIFE que:

1. resguarda `window.__extractorMdInstalled`,
2. define `__EXTRACTOR_MD_REGISTER_EXTRACTOR(id, fn)`,
3. instala un listener `chrome.runtime.onMessage` que ejecuta cada
   extractor registrado y responde con
   `{ meta, skills: { id: rawData }, pendingFetches: [...] }`.

Los archivos `extract.browser.js` deben ser autocontenidos: sin
`import` / `export`, sin top-level `await`. Registran su función y
dependen del wrapper. Consulta
`lib/skills/design-tokens/extract.browser.js` como ejemplo canónico.

## Tests

- `tests/run-tests.mjs` es el entry point e incluye los asserts legacy
  para garantizar que `DESIGN.md` y `SKILL.md` mantienen paridad con
  la pipeline anterior al refactor.
- `tests/skills/<skill>.test.mjs` cubre la normalización y el render de
  secciones por skill, usando payloads del formato bundle hechos a mano.
- Un test combinado de info.md verifica el orden de las secciones entre
  info-architecture / seo / geo.

La pipeline nunca depende de un browser real, así que los tests corren
con `node tests/run-tests.mjs`.

---

# Blueprint para autoría de SKILL.md

El resto de este documento es una referencia canónica para el formato
de salida SKILL.md. Úsala cuando escribas un SKILL.md a mano o cuando
modifiques la plantilla en `lib/generate-skill-md.mjs`.

## Reglas de autoría

- Mantén el lenguaje conciso y operativo.
- Prefiere reglas explícitas en lugar de consejos de estilo vagos.
- Usa restricciones medibles (tokens, estados, umbrales).
- Escribe en orden de implementación: foundations, components,
  accessibility, QA.
- Usa terminología consistente en todo el archivo.

## Estructura requerida del `skill.md`

```md
---
name: design-system-[brand-or-scope]
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards.
---

<!-- EXTRACTOR_MD_MANAGED_START -->

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

<!-- EXTRACTOR_MD_MANAGED_END -->
```

> Los textos del bloque (Mission, Brand, Style Foundations, etc.) se
> mantienen en inglés porque son el formato canónico del producto y los
> consumen herramientas de IA en inglés. Solo la documentación del repo
> está en español.

## Checklist de aceptación

- El frontmatter existe con `name` y `description` válidos.
- La guía se mantiene por debajo de 500 líneas para `skill.md` cuando
  es posible.
- Los estados de accesibilidad e interacción están documentados de
  forma explícita.
- Las reglas son concretas, testeables y no ambiguas.
- El output puede reutilizarse en otros repositorios solo con
  reemplazar las variables.
