const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 160;
const ALT_COVERAGE_MIN = 0.8;

export function normalize(raw) {
  if (!raw || typeof raw !== "object") return null;

  const title = raw.title || "";
  const desc = raw.metaDescription || "";
  const og = raw.openGraph || {};
  const twitter = raw.twitter || {};
  const jsonLd = Array.isArray(raw.jsonLd) ? raw.jsonLd : [];
  const alt = raw.altCoverage || { total: 0, withAlt: 0, decorative: 0 };
  const altRatio = alt.total > 0 ? (alt.withAlt + alt.decorative) / alt.total : 1;
  const robotsParsed = parseRobotsMeta(raw.robotsMeta || "");
  const allTypes = jsonLd.flatMap((entry) => entry.types);
  const linkRatio = raw.linkRatio || { internal: 0, external: 0, nofollow: 0 };

  const fetched = raw.fetched || {};
  const robotsTxt = pickFetched(fetched, /robots\.txt$/);
  const sitemapXml = pickFetched(fetched, /sitemap\.xml$/);

  const validations = [];

  if (!title) validations.push("Title is missing.");
  else if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    validations.push(`Title length ${title.length} chars is outside the recommended ${TITLE_MIN}-${TITLE_MAX} range.`);
  }

  if (!desc) validations.push("Meta description is missing.");
  else if (desc.length < DESCRIPTION_MIN || desc.length > DESCRIPTION_MAX) {
    validations.push(`Meta description length ${desc.length} chars is outside the recommended ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} range.`);
  }

  if (!raw.canonical) validations.push("Canonical link is missing.");
  if (robotsParsed.noindex) validations.push("Robots meta declares noindex.");
  if (!og["og:image"]) validations.push("og:image is missing.");
  if (alt.total > 0 && altRatio < ALT_COVERAGE_MIN) {
    validations.push(`Image alt coverage ${(altRatio * 100).toFixed(0)}% is below the recommended ${ALT_COVERAGE_MIN * 100}%.`);
  }

  return {
    title: { value: title, length: title.length, ok: title.length >= TITLE_MIN && title.length <= TITLE_MAX },
    description: { value: desc, length: desc.length, ok: desc.length >= DESCRIPTION_MIN && desc.length <= DESCRIPTION_MAX },
    canonical: raw.canonical || "",
    robotsMeta: robotsParsed,
    hreflang: Array.isArray(raw.hreflang) ? raw.hreflang : [],
    openGraph: og,
    twitter,
    jsonLdEntries: jsonLd,
    structuredDataTypes: Array.from(new Set(allTypes)).sort(),
    alt: Object.assign({}, alt, { ratio: altRatio }),
    linkRatio,
    wordCount: typeof raw.wordCount === "number" ? raw.wordCount : 0,
    robotsTxt: summarizeFetched(robotsTxt),
    sitemapXml: summarizeFetched(sitemapXml),
    validations
  };
}

function parseRobotsMeta(value) {
  const lower = String(value || "").toLowerCase();
  return {
    raw: value || "",
    noindex: /\bnoindex\b/.test(lower),
    nofollow: /\bnofollow\b/.test(lower),
    noarchive: /\bnoarchive\b/.test(lower)
  };
}

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
