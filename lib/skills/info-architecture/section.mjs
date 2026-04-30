const SECTION_ORDER = 10;

export function section(normalized, outputId) {
  if (!normalized || outputId !== "info.md") return null;

  const lines = [];
  lines.push("# Information architecture");
  lines.push("");

  // Outline
  lines.push("## Outline");
  if (normalized.headingTree.length === 0) {
    lines.push("- (no headings detected)");
  } else {
    appendTree(lines, normalized.headingTree, 0);
  }

  // Landmarks
  lines.push("");
  lines.push("## Landmarks");
  const lm = normalized.landmarks;
  lines.push(`- main: ${lm.main || 0}`);
  lines.push(`- nav: ${lm.nav || 0}`);
  lines.push(`- aside: ${lm.aside || 0}`);
  lines.push(`- header: ${lm.header || 0}`);
  lines.push(`- footer: ${lm.footer || 0}`);

  // Navigation
  lines.push("");
  lines.push("## Navigation");
  if (normalized.navs.length === 0) {
    lines.push("- (no <nav> elements detected)");
  } else {
    for (const n of normalized.navs) {
      const labelTag = n.ariaLabel ? `"${n.ariaLabel}"` : "(no aria-label)";
      const depthTag = n.depth > 1 ? "mega-menu" : "flat";
      lines.push(`- ${cap(n.location)} nav ${labelTag}: ${n.directItems} items, depth ${n.depth} (${depthTag})`);
    }
  }

  // Link graph
  lines.push("");
  lines.push("## Link graph");
  const lg = normalized.linkGraph;
  lines.push(`- Internal: ${lg.internal}`);
  lines.push(`- External: ${lg.external}`);
  if (lg.nofollow > 0) lines.push(`- nofollow: ${lg.nofollow}`);
  if (lg.anchor > 0) lines.push(`- Anchor links: ${lg.anchor}`);

  // Breadcrumbs / pagination
  lines.push("");
  lines.push(`## Breadcrumbs: ${normalized.breadcrumbs ? "detected" : "not detected"}`);
  lines.push(`## Pagination: ${normalized.pagination ? "detected" : "not detected"}`);

  // URL pattern
  lines.push("");
  lines.push("## URL pattern");
  lines.push(`- Path: ${normalized.urlPattern.pathname}`);
  lines.push(`- Path depth: ${normalized.urlPattern.pathDepth}`);
  lines.push(`- Looks like: ${normalized.urlPattern.slugLooksDetail ? "detail page" : "section / index"}`);

  // Above the fold
  if (normalized.aboveTheFold.length > 0) {
    lines.push("");
    lines.push("## Above the fold");
    for (const block of normalized.aboveTheFold.slice(0, 8)) {
      const headingHint = block.firstHeading ? ` — "${block.firstHeading}"` : "";
      const idHint = block.id ? `#${block.id}` : "";
      lines.push(`- <${block.tag}${idHint}>${headingHint}`);
    }
  }

  // Diagnostics
  const diags = describeDiagnostics(normalized.validations);
  if (diags.length > 0) {
    lines.push("");
    lines.push("## Diagnostics");
    for (const d of diags) lines.push(`- ⚠ ${d}`);
  }

  return {
    heading: null,
    body: lines.join("\n") + "\n",
    anchor: "info-architecture",
    sectionOrder: SECTION_ORDER
  };
}

function appendTree(lines, nodes, depth) {
  for (const node of nodes) {
    const indent = "  ".repeat(depth);
    const text = node.text ? trim(node.text, 80) : "(empty heading)";
    lines.push(`${indent}- h${node.level}: ${text}`);
    if (node.children && node.children.length > 0) {
      appendTree(lines, node.children, depth + 1);
    }
  }
}

function describeDiagnostics(v) {
  const out = [];
  if (v.multipleH1) out.push(`Multiple h1 detected (${v.h1Count}); pick one canonical heading per page`);
  if (v.missingMain) out.push("No <main> landmark detected; assistive tech relies on it for primary content");
  if (v.navLabelWarning) out.push("Multiple <nav> regions detected without aria-label; add unique labels");
  for (const skip of v.skips) {
    out.push(`Heading skip detected: h${skip.from} → h${skip.to}${skip.text ? ` ("${trim(skip.text, 60)}")` : ""}`);
  }
  return out;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function trim(s, n) { return s && s.length > n ? s.slice(0, n) + "…" : s; }
