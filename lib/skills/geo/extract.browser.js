__TYPEUI_REGISTER_EXTRACTOR("geo", function extractGeo(doc, win) {
  const main = doc.querySelector("main") || doc.body;
  const wordCountMain = countWords(main);
  const wordCountBody = countWords(doc.body);

  return {
    source: { url: win.location.href, origin: win.location.origin },
    structuredData: collectFaqSignals(doc),
    detailsCount: doc.querySelectorAll("details").length,
    summaryCount: doc.querySelectorAll("summary").length,
    listCount: countContentChildren(main, "ul, ol"),
    tableCount: countContentChildren(main, "table"),
    wordCountMain,
    wordCountBody,
    contentToChromeRatio: wordCountBody > 0 ? wordCountMain / wordCountBody : 0,
    definitionalOpening: detectDefinitionalParagraph(main),
    headingsWithAnchors: countHeadingsWithAnchors(doc),
    headingsTotal: doc.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
    author: detectAuthor(doc),
    publishDate: detectPublishDate(doc),
    internalCitations: countInternalCitations(main, win),
    toc: detectTableOfContents(doc),
    pendingFetches: [
      { key: "llms.txt", url: win.location.origin + "/llms.txt" },
      { key: "llms-full.txt", url: win.location.origin + "/llms-full.txt" }
    ]
  };

  function countWords(el) {
    if (!el) return 0;
    const text = (el.innerText || el.textContent || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }

  function countContentChildren(el, selector) {
    if (!el) return 0;
    return el.querySelectorAll(selector).length;
  }

  function collectFaqSignals(d) {
    const nodes = d.querySelectorAll('script[type="application/ld+json"]');
    const out = { hasFaq: false, types: [] };
    for (const node of nodes) {
      let parsed;
      try { parsed = JSON.parse(node.textContent || ""); } catch (_e) { continue; }
      const types = [];
      visit(parsed, types);
      for (const t of types) out.types.push(t);
      if (types.includes("FAQPage")) out.hasFaq = true;
    }
    return out;

    function visit(node, types) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) { for (const n of node) visit(n, types); return; }
      if (typeof node["@type"] === "string") types.push(node["@type"]);
      else if (Array.isArray(node["@type"])) for (const t of node["@type"]) if (typeof t === "string") types.push(t);
      if (Array.isArray(node["@graph"])) for (const g of node["@graph"]) visit(g, types);
    }
  }

  function detectDefinitionalParagraph(main) {
    if (!main) return null;
    const paragraphs = main.querySelectorAll("p");
    for (const p of paragraphs) {
      const text = (p.innerText || p.textContent || "").trim();
      if (text.length < 30) continue;
      if (/^[A-Z][^.]{10,200}\bes\b|^[A-Z][^.]{10,200}\bis\b/.test(text)) {
        return text.slice(0, 200);
      }
      break; // only consider the first substantial paragraph
    }
    return null;
  }

  function countHeadingsWithAnchors(d) {
    const headings = d.querySelectorAll("h1, h2, h3, h4, h5, h6");
    let count = 0;
    for (const h of headings) {
      if (h.id || h.querySelector('a[href^="#"]')) count++;
    }
    return count;
  }

  function detectAuthor(d) {
    const meta = d.querySelector('meta[name="author"]');
    if (meta) return meta.getAttribute("content") || "";
    const relAuthor = d.querySelector('a[rel="author"]');
    if (relAuthor) return (relAuthor.innerText || relAuthor.textContent || "").trim();
    const ldAuthor = readJsonLdField(d, "author");
    return ldAuthor || "";
  }

  function detectPublishDate(d) {
    const meta = d.querySelector('meta[property="article:published_time"]');
    if (meta) return meta.getAttribute("content") || "";
    const time = d.querySelector("time[datetime]");
    if (time) return time.getAttribute("datetime") || "";
    const ld = readJsonLdField(d, "datePublished");
    return ld || "";
  }

  function readJsonLdField(d, field) {
    const nodes = d.querySelectorAll('script[type="application/ld+json"]');
    for (const node of nodes) {
      let parsed;
      try { parsed = JSON.parse(node.textContent || ""); } catch (_e) { continue; }
      const found = pluck(parsed, field);
      if (found) return found;
    }
    return "";

    function pluck(node, key) {
      if (!node || typeof node !== "object") return "";
      if (typeof node[key] === "string") return node[key];
      if (node[key] && typeof node[key] === "object") {
        if (typeof node[key].name === "string") return node[key].name;
      }
      if (Array.isArray(node["@graph"])) {
        for (const g of node["@graph"]) {
          const inner = pluck(g, key);
          if (inner) return inner;
        }
      }
      return "";
    }
  }

  function countInternalCitations(main, w) {
    if (!main) return 0;
    const host = w.location.host || "";
    const anchors = main.querySelectorAll("a[href]");
    let count = 0;
    for (const a of anchors) {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
      try {
        const url = new URL(href, w.location.href);
        if (url.host === host) count++;
      } catch (_e) {
        count++;
      }
    }
    return count;
  }

  function detectTableOfContents(d) {
    const candidates = [
      d.querySelector('nav[aria-label*="contents" i]'),
      d.querySelector('nav[aria-label*="tabla" i]'),
      d.querySelector('.toc, .table-of-contents, [class*="toc"]'),
      d.querySelector('[role="doc-toc"]')
    ].filter(Boolean);
    if (candidates.length === 0) return { detected: false, withAnchors: false };
    const node = candidates[0];
    const anchors = node.querySelectorAll('a[href^="#"]').length;
    return { detected: true, withAnchors: anchors > 0, anchorCount: anchors };
  }
});
