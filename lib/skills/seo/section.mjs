const SECTION_ORDER = 20;

export function section(normalized, outputId) {
  if (!normalized || outputId !== "info.md") return null;

  const lines = [];

  // SEO basics
  lines.push("## SEO basics");
  if (normalized.title.value) {
    lines.push(`- Title: "${ellipsis(normalized.title.value, 100)}" (${normalized.title.length} chars ${normalized.title.ok ? "✓" : "⚠"})`);
  } else {
    lines.push("- Title: ⚠ missing");
  }
  if (normalized.description.value) {
    lines.push(`- Description: "${ellipsis(normalized.description.value, 160)}" (${normalized.description.length} chars ${normalized.description.ok ? "✓" : "⚠"})`);
  } else {
    lines.push("- Description: ⚠ missing");
  }
  lines.push(`- Canonical: ${normalized.canonical || "⚠ missing"}`);
  lines.push(`- Robots: ${normalized.robotsMeta.raw || "(not set; defaults to index, follow)"}`);
  if (normalized.hreflang.length > 0) {
    lines.push(`- Hreflang: ${normalized.hreflang.map((h) => h.hreflang).join(", ")}`);
  }

  // Open Graph
  lines.push("");
  lines.push("## Open Graph");
  const ogKeys = Object.keys(normalized.openGraph);
  if (ogKeys.length === 0) {
    lines.push("- (no Open Graph tags detected)");
  } else {
    const expected = ["og:title", "og:description", "og:image", "og:url", "og:type", "og:site_name"];
    const present = expected.filter((k) => k in normalized.openGraph);
    const missing = expected.filter((k) => !(k in normalized.openGraph));
    if (present.length > 0) lines.push(`- Present: ${present.join(", ")}`);
    if (missing.length > 0) lines.push(`- Missing: ${missing.join(", ")}`);
    if (normalized.openGraph["og:image"]) lines.push(`- og:image: ${normalized.openGraph["og:image"]}`);
  }

  // Twitter
  if (Object.keys(normalized.twitter).length > 0) {
    lines.push("");
    lines.push("## Twitter Card");
    for (const [k, v] of Object.entries(normalized.twitter)) {
      lines.push(`- ${k}: ${ellipsis(v, 120)}`);
    }
  }

  // Structured data
  lines.push("");
  lines.push("## Structured data");
  const invalid = normalized.jsonLdEntries.filter((e) => !e.valid).length;
  if (normalized.structuredDataTypes.length === 0 && normalized.jsonLdEntries.length === 0) {
    lines.push("- (no JSON-LD detected)");
  } else if (normalized.structuredDataTypes.length === 0) {
    lines.push("- (no parseable JSON-LD types found)");
  } else {
    lines.push(`- ${normalized.structuredDataTypes.join(", ")}`);
  }
  if (invalid > 0) lines.push(`- ⚠ ${invalid} JSON-LD block(s) failed to parse`);

  // Content metrics
  lines.push("");
  lines.push("## Content metrics");
  lines.push(`- Word count (main): ${normalized.wordCount.toLocaleString("en-US")}`);
  if (normalized.alt.total > 0) {
    lines.push(`- Image alt coverage: ${(normalized.alt.ratio * 100).toFixed(0)}% (${normalized.alt.withAlt}/${normalized.alt.total} described, ${normalized.alt.decorative} decorative)`);
  }
  const lr = normalized.linkRatio;
  lines.push(`- Internal/external links: ${lr.internal} / ${lr.external}${lr.nofollow > 0 ? ` (${lr.nofollow} nofollow)` : ""}`);

  // Origin files
  if (normalized.robotsTxt || normalized.sitemapXml) {
    lines.push("");
    lines.push("## Origin files");
    if (normalized.robotsTxt) {
      lines.push(`- robots.txt: ${normalized.robotsTxt.ok ? `${normalized.robotsTxt.bytes} bytes` : `⚠ ${normalized.robotsTxt.status || "fetch failed"}`}`);
    }
    if (normalized.sitemapXml) {
      lines.push(`- sitemap.xml: ${normalized.sitemapXml.ok ? `${normalized.sitemapXml.bytes} bytes` : `⚠ ${normalized.sitemapXml.status || "fetch failed"}`}`);
    }
  }

  // Diagnostics
  if (normalized.validations.length > 0) {
    lines.push("");
    lines.push("## SEO diagnostics");
    for (const v of normalized.validations) lines.push(`- ⚠ ${v}`);
  }

  return {
    heading: null,
    body: lines.join("\n") + "\n",
    anchor: "seo",
    sectionOrder: SECTION_ORDER
  };
}

function ellipsis(s, n) {
  s = String(s || "");
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
