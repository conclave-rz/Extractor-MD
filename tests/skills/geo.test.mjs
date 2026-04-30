import assert from "node:assert/strict";
import "../../lib/skills/index.mjs";
import { runSkills } from "../../lib/skills/orchestrator.mjs";

function withGeo(rawGeo) {
  return {
    meta: { url: "https://example.com/", title: "x" },
    skills: { geo: rawGeo },
    pendingFetches: []
  };
}

// === Test 1: high-quality page hits a high score ===

const goodRun = runSkills(withGeo({
  source: { url: "https://example.com/articles/x", origin: "https://example.com" },
  structuredData: { hasFaq: true, types: ["FAQPage", "Article"] },
  detailsCount: 3,
  summaryCount: 3,
  listCount: 6,
  tableCount: 2,
  wordCountMain: 1200,
  wordCountBody: 1800,
  contentToChromeRatio: 1200 / 1800,
  definitionalOpening: "GEO is a strategy to make web pages easier for LLMs to discover and quote.",
  headingsTotal: 8,
  headingsWithAnchors: 8,
  author: "Jane Doe",
  publishDate: "2025-11-12",
  internalCitations: 12,
  toc: { detected: true, withAnchors: true, anchorCount: 8 },
  fetched: {
    "https://example.com/llms.txt": { ok: true, status: 200, text: "User-agent: *\nAllow: /" },
    "https://example.com/llms-full.txt": { ok: true, status: 200, text: "long ingest text..." }
  }
}), { enabledSkills: ["geo"], outputs: ["info.md"] });

const goodNorm = goodRun.normalized.geo;
assert.ok(goodNorm.score >= 80, `expected score >= 80, got ${goodNorm.score}`);
assert.equal(goodNorm.breakdown.llmsTxt, 20);
assert.equal(goodNorm.breakdown.faqSchema, 15);
assert.equal(goodNorm.breakdown.authorAndDate, 10);
assert.equal(goodNorm.breakdown.tocWithAnchors, 10);
assert.equal(goodNorm.breakdown.definitional, 10);
assert.equal(goodNorm.breakdown.density, 10);
assert.equal(goodNorm.breakdown.contentRatio, 10);
assert.equal(goodNorm.breakdown.citations, 5);

const goodMd = goodRun.outputs["info.md"];
assert.ok(goodMd.includes("## GEO (Generative Engine Optimization)"));
assert.ok(/Score: \d+ \/ 100/.test(goodMd));
assert.ok(goodMd.includes("llms.txt: detected"));
assert.ok(goodMd.includes("FAQPage schema: detected"));
assert.ok(goodMd.includes("Definitional opening: yes"));
assert.ok(goodMd.includes("Author: Jane Doe"));
assert.ok(goodMd.includes("Published: 2025-11-12"));

// === Test 2: low-quality page hits low score and surfaces validations ===

const badRun = runSkills(withGeo({
  source: { url: "https://example.com/", origin: "https://example.com" },
  structuredData: { hasFaq: false, types: [] },
  detailsCount: 0,
  summaryCount: 0,
  listCount: 0,
  tableCount: 0,
  wordCountMain: 200,
  wordCountBody: 600,
  contentToChromeRatio: 200 / 600,
  definitionalOpening: null,
  headingsTotal: 1,
  headingsWithAnchors: 0,
  author: "",
  publishDate: "",
  internalCitations: 1,
  toc: { detected: false, withAnchors: false },
  fetched: {
    "https://example.com/llms.txt": { ok: false, status: 404, text: "" },
    "https://example.com/llms-full.txt": { ok: false, status: 404, text: "" }
  }
}), { enabledSkills: ["geo"], outputs: ["info.md"] });

const badNorm = badRun.normalized.geo;
assert.ok(badNorm.score <= 20, `expected score <= 20, got ${badNorm.score}`);

const badMd = badRun.outputs["info.md"];
assert.ok(badMd.includes("Add /llms.txt"));
assert.ok(badMd.includes("Consider adding FAQPage structured data"));
assert.ok(badMd.includes("(not detected)"), "missing author/date should render as not detected");
assert.ok(badMd.includes("Reduce navigational chrome"));

// === Test 3: pendingFetches keys are correct ===

const inflight = withGeo({});
// The extractor would emit pendingFetches, but in this normalized-only test
// we just confirm the skill metadata.
import("../../lib/skills/geo/index.mjs").then((m) => {
  assert.equal(m.geoSkill.id, "geo");
  assert.deepEqual(m.geoSkill.outputs, ["info.md"]);
});

console.log("geo tests passed.");
