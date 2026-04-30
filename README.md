# Extractor TypeUI DESIGN.md (Extensión de Chrome)

Extensión de Chrome (Manifest V3) que ejecuta una pipeline multi-skill sobre
cualquier página y genera hasta cuatro archivos: `DESIGN.md`, `SKILL.md`,
`STACK.md` e `INFO.md`. Los formatos siguen la especificación open-source de
[TypeUI DESIGN.md](https://www.typeui.sh/design-md), más un blueprint
coordinado de arquitectura de información, SEO y GEO.

<img width="1200" height="630" alt="designmdchrome" src="https://github.com/user-attachments/assets/64efbebb-1c68-4ca1-8792-ca167d5e12d6" />

## Cómo empezar

```bash
npm run build       # genera dist/content-script.js
```

Después, carga la extensión:

1. Abre `chrome://extensions`
2. Activa el **Modo de desarrollador**
3. Haz clic en **Cargar descomprimida**
4. Selecciona la carpeta del proyecto

> La extensión inyecta `dist/content-script.js`, así que `npm run build`
> debe ejecutarse al menos una vez antes del primer uso, y cada vez que
> modifiques algún `lib/skills/*/extract.browser.js`.

## Skills incluidas

Cada skill es un módulo autocontenido que aporta señales a uno o más
archivos de salida.

| Skill | Archivo(s) | Qué captura |
| --- | --- | --- |
| `design-tokens` | DESIGN.md, SKILL.md | Escala tipográfica, paleta de color (con clustering OKLab), spacing, radius, sombras compuestas, motion, propiedades CSS personalizadas, breakpoints, font-faces, indicios de modo oscuro. |
| `product-surface` | (DESIGN.md / SKILL.md, embebido) | Audiencia y superficie de producto inferidas a partir de headings, navegación, CTAs y metadatos. |
| `tech-stack` | STACK.md | Frameworks (Next.js, Nuxt, Remix, SvelteKit, Astro, Solid, Qwik), librerías UI (React, Vue, Angular), frameworks CSS (Tailwind, Bootstrap, MUI, Chakra, Bulma), CMS / builders, bundlers, analytics, hosts de fuentes. |
| `info-architecture` | INFO.md | Árbol de headings, landmarks, estructura por `<nav>`, link graph, breadcrumbs, paginación, patrón de URL, secciones above-the-fold, validaciones de jerarquía. |
| `seo` | INFO.md | Title y description con rangos, canonical, robots, hreflang, Open Graph, Twitter Cards, parsing de JSON-LD, cobertura de alt en imágenes, ratio de enlaces, conteo de palabras, fetch de robots.txt y sitemap.xml. |
| `geo` | INFO.md | Score de optimización para motores generativos (0–100): `llms.txt`, schema FAQPage, párrafo definicional, tabla de contenidos, densidad de listas y tablas, ratio contenido vs cromo, autor y fecha, citas internas. |

## Archivos de salida

| Archivo | Skills que lo alimentan | Para qué sirve |
| --- | --- | --- |
| `DESIGN.md` | design-tokens (+ product-surface) | Documento source-of-truth del sistema de diseño para herramientas de codegen con IA. |
| `SKILL.md` | design-tokens (+ product-surface) | Archivo skill listo para Claude Code, Codex o Cursor. |
| `STACK.md` | tech-stack | Referencia rápida del stack técnico de la página. |
| `INFO.md` | info-architecture, seo, geo | Auditoría de arquitectura de información + scorecard de SEO/GEO. |

El popup permite activar outputs y skills de forma independiente,
persiste la selección en `chrome.storage.local`, y muestra una pestaña
por cada archivo generado. El botón **Quick install** escribe todos los
archivos seleccionados dentro de la carpeta del proyecto que elijas
(`.claude/skills/typeui/`, `.agents/skills/typeui/`,
`.cursor/skills/typeui/`).

## Cómo agregar una skill nueva

El contrato está documentado en
[`lib/skills/types.mjs`](lib/skills/types.mjs). Estructura mínima:

```
lib/skills/<id-de-skill>/
├── extract.browser.js   # corre en la página (se registra con __TYPEUI_REGISTER_EXTRACTOR)
├── normalize.mjs        # corre en el service worker / tests de Node
├── section.mjs          # devuelve { heading, body, anchor, sectionOrder } por outputId
└── index.mjs            # exporta el objeto Skill
```

Registra la skill en [`lib/skills/index.mjs`](lib/skills/index.mjs) y
vuelve a correr `npm run build` para que su `extract.browser.js` se
incluya en `dist/content-script.js`. Usa `lib/skills/tech-stack/` como
referencia.

## Desarrollo local

```bash
npm run build           # bundlea el content script
npm test                # corre todos los tests (Node 20+)
```

Los tests viven en `tests/` y usan `node:assert/strict`. Las suites por
skill están en `tests/skills/`.

## Licencia

MIT.
