# Extractor MD

By Rz Inc.

Extensión de Chrome que extrae estilos, stack técnico, arquitectura de
información, SEO y señales de optimización para motores generativos (GEO)
desde cualquier sitio web. Genera archivos `DESIGN.md`, `SKILL.md`,
`STACK.md` e `INFO.md` para usar con Claude Code, Codex, Cursor y
agentes similares. Construido sobre el formato open-source DESIGN.md.

## Instalación

1. Clona este repositorio.
2. Ejecuta `npm run build` para empaquetar el content script.
3. Abre `chrome://extensions`.
4. Activa el **Modo de desarrollador**.
5. **Cargar descomprimida** → selecciona la carpeta del repositorio.

## Outputs

| Archivo | Contenido |
| --- | --- |
| `DESIGN.md` | Style foundations: tipografía, color, spacing, radius, shadow, motion. |
| `SKILL.md` | Instrucciones listas para agentes derivadas de las señales extraídas. |
| `STACK.md` | Frameworks, CSS, CMS, bundlers, analytics y fuentes detectadas. |
| `INFO.md` | Arquitectura de información, fundamentos de SEO y score GEO. |

## Skills

| Skill | Qué hace |
| --- | --- |
| `design-tokens` | Extrae tokens visuales desde variables CSS, stylesheets y computed styles. |
| `product-surface` | Infiere audiencia y product surface a partir del contenido de la página. |
| `tech-stack` | Detecta runtime, framework CSS, CMS, bundler, analytics, fuentes. |
| `info-architecture` | Mapea árbol de headings, landmarks y grafo de navegación. |
| `seo` | Valida meta, OG, JSON-LD y cobertura de alt en imágenes. |
| `geo` | Califica la optimización para motores generativos (llms.txt, FAQPage, extractabilidad de contenido). |

## Contribuir

Consulta `DESIGN.md` (el del repositorio, no el generado) para ver el
contrato del plugin de skills.

## Licencia

MIT.
