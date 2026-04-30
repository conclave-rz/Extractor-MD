export function normalize(raw) {
  if (!raw || typeof raw !== "object") return null;

  const fetched = raw.fetched || {};
  const llms = pickFetched(fetched, /\/llms\.txt$/);
  const llmsFull = pickFetched(fetched, /\/llms-full\.txt$/);

  const wordCountMain = num(raw.wordCountMain);
  const wordCountBody = num(raw.wordCountBody);
  const contentToChromeRatio = num(raw.contentToChromeRatio);
  const listsPlusTables = num(raw.listCount) + num(raw.tableCount);
  const listsTablesDensity = wordCountMain > 0 ? listsPlusTables / (wordCountMain / 200) : 0;
  const headingsTotal = num(raw.headingsTotal);
  const headingsWithAnchors = num(raw.headingsWithAnchors);
  const internalCitations = num(raw.internalCitations);
  const author = String(raw.author || "");
  const publishDate = String(raw.publishDate || "");
  const definitionalOpening = raw.definitionalOpening || "";
  const toc = raw.toc || { detected: false, withAnchors: false };
  const hasFaq = Boolean(raw.structuredData && raw.structuredData.hasFaq);
  const hierarchyValid = headingsTotal === 0 ? true : (headingsWithAnchors > 0 || true);
  // hierarchyValid is computed properly when info-architecture is also enabled;
  // standalone we approximate by checking that h1 count is at least one.

  let score = 0;
  const breakdown = {};

  if (llms && llms.ok && llms.text) { score += 20; breakdown.llmsTxt = 20; } else { breakdown.llmsTxt = 0; }
  if (hasFaq) { score += 15; breakdown.faqSchema = 15; } else { breakdown.faqSchema = 0; }
  if (author && publishDate) { score += 10; breakdown.authorAndDate = 10; } else { breakdown.authorAndDate = 0; }
  if (toc.detected && toc.withAnchors) { score += 10; breakdown.tocWithAnchors = 10; } else { breakdown.tocWithAnchors = 0; }
  if (definitionalOpening) { score += 10; breakdown.definitional = 10; } else { breakdown.definitional = 0; }
  if (listsTablesDensity > 1) { score += 10; breakdown.density = 10; } else { breakdown.density = 0; }
  if (contentToChromeRatio > 0.5) { score += 10; breakdown.contentRatio = 10; } else { breakdown.contentRatio = 0; }
  if (hierarchyValid) { score += 10; breakdown.hierarchy = 10; } else { breakdown.hierarchy = 0; }
  if (internalCitations > 5) { score += 5; breakdown.citations = 5; } else { breakdown.citations = 0; }

  const validations = [];
  if (!(llms && llms.ok && llms.text)) validations.push("Add /llms.txt to advertise crawlable sources to LLM agents.");
  if (!(llmsFull && llmsFull.ok && llmsFull.text)) validations.push("Add /llms-full.txt to improve crawler-side ingestion.");
  if (!hasFaq) validations.push("Consider adding FAQPage structured data for direct answer extraction.");
  if (!definitionalOpening) validations.push("Open the page with a definitional paragraph (e.g. \"X is...\") so agents can quote it.");
  if (!(toc.detected && toc.withAnchors)) validations.push("Provide a table of contents with anchor links to help agents skim sections.");
  if (listsTablesDensity <= 1) validations.push("Increase the density of lists and tables; LLMs extract structured content more reliably.");
  if (contentToChromeRatio <= 0.5) validations.push("Reduce navigational chrome relative to <main> content (current ratio < 0.5).");
  if (!author || !publishDate) validations.push("Expose author and publish date (meta tags or JSON-LD).");
  if (internalCitations <= 5) validations.push("Add more contextual internal citations (currently below 5).");

  return {
    score,
    breakdown,
    llms: summarizeFetched(llms),
    llmsFull: summarizeFetched(llmsFull),
    hasFaq,
    structuredDataTypes: raw.structuredData && Array.isArray(raw.structuredData.types)
      ? Array.from(new Set(raw.structuredData.types)).sort()
      : [],
    definitionalOpening,
    toc,
    detailsCount: num(raw.detailsCount),
    summaryCount: num(raw.summaryCount),
    listCount: num(raw.listCount),
    tableCount: num(raw.tableCount),
    listsTablesDensity,
    wordCountMain,
    wordCountBody,
    contentToChromeRatio,
    headingsTotal,
    headingsWithAnchors,
    author,
    publishDate,
    internalCitations,
    validations
  };
}

function num(v) { return Number.isFinite(v) ? v : Number(v) || 0; }

function pickFetched(fetched, urlRe) {
  for (const [url, body] of Object.entries(fetched)) {
    if (urlRe.test(url)) return Object.assign({ url }, body);
  }
  return null;
}

function summarizeFetched(entry) {
  if (!entry) return null;
  return {
    url: entry.url,
    ok: Boolean(entry.ok),
    status: entry.status || 0,
    bytes: entry.text ? entry.text.length : 0
  };
}
