const SECTION_ORDER = 30;

export function section(normalized, outputId) {
  if (!normalized || outputId !== "info.md") return null;

  const lines = [];
  lines.push("## GEO (Generative Engine Optimization)");
  lines.push(`- Score: ${normalized.score} / 100`);

  // Discoverability for AI
  lines.push("");
  lines.push("## Discoverability for AI");
  lines.push(`- llms.txt: ${formatFetched(normalized.llms)}`);
  lines.push(`- llms-full.txt: ${formatFetched(normalized.llmsFull)}`);
  lines.push(`- FAQPage schema: ${normalized.hasFaq ? "detected" : "not detected"}`);
  if (normalized.structuredDataTypes.length > 0) {
    lines.push(`- JSON-LD types: ${normalized.structuredDataTypes.join(", ")}`);
  }

  // Content extractability
  lines.push("");
  lines.push("## Content extractability");
  lines.push(`- Definitional opening: ${normalized.definitionalOpening ? "yes" : "no"}`);
  lines.push(`- Table of contents: ${normalized.toc.detected ? (normalized.toc.withAnchors ? `yes (${normalized.toc.anchorCount || 0} anchors)` : "yes (no anchor links)") : "no"}`);
  const densityTag = normalized.listsTablesDensity > 1 ? "✓" : "⚠";
  lines.push(`- Lists/tables density: ${normalized.listsTablesDensity.toFixed(2)} per 200 words ${densityTag}`);
  const ratioTag = normalized.contentToChromeRatio > 0.5 ? "✓" : "⚠";
  lines.push(`- Content-to-chrome ratio: ${normalized.contentToChromeRatio.toFixed(2)} ${ratioTag}`);
  if (normalized.detailsCount > 0) {
    lines.push(`- <details>/<summary>: ${normalized.detailsCount} / ${normalized.summaryCount}`);
  }
  if (normalized.headingsTotal > 0) {
    lines.push(`- Headings with anchors: ${normalized.headingsWithAnchors} / ${normalized.headingsTotal}`);
  }

  // Authority signals
  lines.push("");
  lines.push("## Authority signals");
  lines.push(`- Author: ${normalized.author || "(not detected)"}`);
  lines.push(`- Published: ${normalized.publishDate || "(not detected)"}`);
  lines.push(`- Internal citations: ${normalized.internalCitations}`);

  // Diagnostics
  if (normalized.validations.length > 0) {
    lines.push("");
    lines.push("## GEO diagnostics");
    for (const v of normalized.validations) lines.push(`- ⚠ ${v}`);
  }

  return {
    heading: null,
    body: lines.join("\n") + "\n",
    anchor: "geo",
    sectionOrder: SECTION_ORDER
  };
}

function formatFetched(entry) {
  if (!entry) return "not detected";
  if (entry.ok) return `detected (${entry.bytes} bytes)`;
  return `not detected (status ${entry.status || "?"})`;
}
