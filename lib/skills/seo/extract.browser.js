__EXTRACTOR_MD_REGISTER_EXTRACTOR("seo", function extractSeo(doc, win) {
  const head = doc.head || doc;
  const robotsUrl = win.location.origin + "/robots.txt";
  const sitemapUrl = win.location.origin + "/sitemap.xml";

  return {
    source: { url: win.location.href, origin: win.location.origin },
    title: doc.title || "",
    metaDescription: getMeta(doc, "description"),
    canonical: getLink(doc, 'link[rel="canonical"]', "href"),
    robotsMeta: getMeta(doc, "robots"),
    hreflang: collectHreflang(doc),
    openGraph: collectMeta(doc, "property", /^og:/),
    twitter: collectMeta(doc, "name", /^twitter:/),
    jsonLd: collectJsonLd(doc),
    altCoverage: computeAltCoverage(doc),
    linkRatio: classifyLinks(doc, win),
    wordCount: countWords(doc),
    pendingFetches: [
      { key: "robots.txt", url: robotsUrl },
      { key: "sitemap.xml", url: sitemapUrl }
    ]
  };

  function getMeta(d, name) {
    const node = d.querySelector(`meta[name="${name}"]`);
    return node ? (node.getAttribute("content") || "") : "";
  }

  function getLink(d, selector, attr) {
    const node = d.querySelector(selector);
    return node ? (node.getAttribute(attr) || "") : "";
  }

  function collectHreflang(d) {
    const nodes = d.querySelectorAll('link[rel="alternate"][hreflang]');
    return Array.from(nodes).map(function (n) {
      return { hreflang: n.getAttribute("hreflang") || "", href: n.getAttribute("href") || "" };
    });
  }

  function collectMeta(d, attribute, prefixRe) {
    const nodes = d.querySelectorAll(`meta[${attribute}]`);
    const out = {};
    for (const node of nodes) {
      const key = node.getAttribute(attribute) || "";
      if (!prefixRe.test(key)) continue;
      out[key] = node.getAttribute("content") || "";
    }
    return out;
  }

  function collectJsonLd(d) {
    const nodes = d.querySelectorAll('script[type="application/ld+json"]');
    const out = [];
    for (const node of nodes) {
      const text = node.textContent || "";
      let parsed = null;
      let valid = false;
      try {
        parsed = JSON.parse(text);
        valid = true;
      } catch (_e) {
        parsed = null;
      }
      const types = valid ? extractTypes(parsed) : [];
      out.push({ valid, types, hasFaq: types.includes("FAQPage"), preview: text.slice(0, 200) });
    }
    return out;
  }

  function extractTypes(parsed) {
    const out = [];
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) { for (const n of node) visit(n); return; }
      if (typeof node["@type"] === "string") out.push(node["@type"]);
      else if (Array.isArray(node["@type"])) for (const t of node["@type"]) if (typeof t === "string") out.push(t);
      if (Array.isArray(node["@graph"])) for (const g of node["@graph"]) visit(g);
    }
    visit(parsed);
    return out;
  }

  function computeAltCoverage(d) {
    const imgs = d.querySelectorAll("img");
    let total = 0; let withAlt = 0; let decorative = 0;
    for (const img of imgs) {
      total++;
      const alt = img.getAttribute("alt");
      if (alt && alt.trim().length > 0) withAlt++;
      else if (alt === "") decorative++;
    }
    return { total, withAlt, decorative };
  }

  function classifyLinks(d, w) {
    const anchors = d.querySelectorAll("a[href]");
    const host = w.location.host || "";
    let internal = 0, external = 0, nofollow = 0;
    for (const a of anchors) {
      const href = a.getAttribute("href") || "";
      const rel = (a.getAttribute("rel") || "").toLowerCase();
      if (rel.split(/\s+/).includes("nofollow")) nofollow++;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
      try {
        const url = new URL(href, w.location.href);
        if (url.host === host) internal++;
        else external++;
      } catch (_e) {
        internal++;
      }
    }
    return { internal, external, nofollow };
  }

  function countWords(d) {
    const main = d.querySelector("main") || d.body;
    if (!main) return 0;
    const text = (main.innerText || main.textContent || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }
});
