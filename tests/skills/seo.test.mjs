import assert from "node:assert/strict";
import "../../lib/skills/index.mjs";
import { runSkills } from "../../lib/skills/orchestrator.mjs";

function withSeo(rawSeo) {
  return {
    meta: { url: "https://example.com/", title: "x" },
    skills: { seo: rawSeo },
    pendingFetches: []
  };
}

// === Test 1: complete head + valid JSON-LD ===

const goodRun = runSkills(withSeo({
  source: { url: "https://example.com/", origin: "https://example.com" },
  title: "Example: a clean home page with a fair length title",
  metaDescription: "A clean home page description that lands within the recommended SEO range so search snippets read naturally on every device.",
  canonical: "https://example.com/",
  robotsMeta: "index, follow",
  hreflang: [
    { hreflang: "en", href: "https://example.com/" },
    { hreflang: "es", href: "https://example.com/es" }
  ],
  openGraph: {
    "og:title": "Example",
    "og:description": "Clean home",
    "og:image": "https://example.com/cover.png",
    "og:url": "https://example.com/",
    "og:type": "website",
    "og:site_name": "Example"
  },
  twitter: {
    "twitter:card": "summary_large_image"
  },
  jsonLd: [
    { valid: true, types: ["Organization"], hasFaq: false, preview: "" },
    { valid: true, types: ["BreadcrumbList"], hasFaq: false, preview: "" }
  ],
  altCoverage: { total: 10, withAlt: 9, decorative: 1 },
  linkRatio: { internal: 50, external: 8, nofollow: 2 },
  wordCount: 1240,
  fetched: {
    "https://example.com/robots.txt": { ok: true, status: 200, text: "User-agent: *\nAllow: /" },
    "https://example.com/sitemap.xml": { ok: true, status: 200, text: "<urlset></urlset>" }
  }
}), { enabledSkills: ["seo"], outputs: ["info.md"] });

const md = goodRun.outputs["info.md"];
assert.ok(md, "info.md should be produced");
assert.ok(md.includes("## SEO basics"));
assert.ok(/Title: ".*" \(\d+ chars ✓\)/.test(md), "title length should be marked OK");
assert.ok(/Description: ".*" \(\d+ chars ✓\)/.test(md));
assert.ok(md.includes("Canonical: https://example.com/"));
assert.ok(md.includes("Robots: index, follow"));
assert.ok(md.includes("Hreflang: en, es"));
assert.ok(md.includes("og:image: https://example.com/cover.png"));
assert.ok(md.includes("Organization, BreadcrumbList") || md.includes("BreadcrumbList, Organization"));
assert.ok(md.includes("Word count (main): 1,240"));
assert.ok(md.includes("Image alt coverage: 100%") || md.includes("Image alt coverage: 100%"));
assert.ok(md.includes("Internal/external links: 50 / 8 (2 nofollow)"));
assert.ok(md.includes("robots.txt:"));

// === Test 2: missing fields trigger diagnostics ===

const badRun = runSkills(withSeo({
  source: { url: "https://example.com/", origin: "https://example.com" },
  title: "x", // 1 char — far too short
  metaDescription: "",
  canonical: "",
  robotsMeta: "noindex",
  hreflang: [],
  openGraph: {},
  twitter: {},
  jsonLd: [{ valid: false, types: [], hasFaq: false, preview: "" }],
  altCoverage: { total: 10, withAlt: 4, decorative: 0 },
  linkRatio: { internal: 0, external: 0, nofollow: 0 },
  wordCount: 0,
  fetched: {}
}), { enabledSkills: ["seo"], outputs: ["info.md"] });

const bad = badRun.outputs["info.md"];
assert.ok(bad.includes("Title length 1 chars is outside the recommended"), "short titles flagged");
assert.ok(bad.includes("Meta description is missing."));
assert.ok(bad.includes("Canonical link is missing."));
assert.ok(bad.includes("Robots meta declares noindex."));
assert.ok(bad.includes("og:image is missing."));
assert.ok(/Image alt coverage 40% is below the recommended/.test(bad));
assert.ok(bad.includes("⚠ 1 JSON-LD block(s) failed to parse"));

// === Test 3: pendingFetches surfaced from extract ===

const seoSlice = withSeo({
  source: { url: "https://example.com/", origin: "https://example.com" },
  title: "ok title with reasonable length",
  metaDescription: "ok description with reasonable length so it reads naturally on every device and stays inside guidance.",
  canonical: "https://example.com/",
  robotsMeta: "",
  hreflang: [],
  openGraph: { "og:image": "https://example.com/x.png" },
  twitter: {},
  jsonLd: [],
  altCoverage: { total: 0, withAlt: 0, decorative: 0 },
  linkRatio: { internal: 1, external: 0, nofollow: 0 },
  wordCount: 100,
  pendingFetches: [
    { key: "robots.txt", url: "https://example.com/robots.txt" },
    { key: "sitemap.xml", url: "https://example.com/sitemap.xml" }
  ]
});

assert.deepEqual(
  seoSlice.skills.seo.pendingFetches.map((f) => f.key),
  ["robots.txt", "sitemap.xml"],
  "extract result should expose pendingFetches for the orchestrator to resolve"
);

console.log("seo tests passed.");
