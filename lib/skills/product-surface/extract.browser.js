__TYPEUI_REGISTER_EXTRACTOR("product-surface", function extractProductSurface(doc, win) {
  // product-surface in phase 2 reuses the siteSignals already collected by
  // design-tokens. We re-collect them here so each skill is self-contained
  // when the extractor pipeline runs in isolation. The DOM cost is negligible.
  return {
    source: {
      url: win.location.href,
      title: doc.title || "Untitled page"
    },
    siteSignals: collect(doc, win)
  };

  function collect(d, w) {
    return {
      title: d.title || "",
      description: getMeta(d, "description"),
      keywords: getMeta(d, "keywords"),
      ogType: getMeta(d, "og:type", true),
      ogSiteName: getMeta(d, "og:site_name", true),
      appName: getMeta(d, "application-name"),
      pathname: w.location.pathname || "/",
      hostname: w.location.hostname || "",
      headings: collectTexts(d, "h1, h2", 10, 120),
      navTexts: collectTexts(d, "nav a, nav button, header a, header button", 24, 50),
      ctaTexts: collectTexts(
        d,
        "button, [role='button'], a[class*='button'], a[class*='btn'], input[type='submit']",
        24,
        40
      ),
      textSample: norm(((d.body && d.body.innerText) || "").slice(0, 14000)),
      elementCounts: {
        forms: d.querySelectorAll("form").length,
        inputs: d.querySelectorAll("input, textarea, select").length,
        tables: d.querySelectorAll("table").length,
        codeBlocks: d.querySelectorAll("pre, code").length,
        articles: d.querySelectorAll("article").length,
        pricingSections: countByText(d, "section, div, article", ["pricing", "plans"]),
        productMarkers: d.querySelectorAll(
          "[itemtype*='Product'], [class*='product'], [id*='product'], [data-product]"
        ).length,
        authMarkers: countByText(d, "a, button, label, span", [
          "sign in", "log in", "login", "register", "dashboard", "workspace"
        ]),
        checkoutMarkers: countByText(d, "a, button, span", [
          "add to cart", "checkout", "buy now", "cart"
        ])
      }
    };
  }

  function getMeta(d, name, property) {
    const sel = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    const n = d.querySelector(sel);
    return norm((n && n.getAttribute("content")) || "");
  }

  function collectTexts(d, selector, limit, maxLength) {
    const seen = new Set();
    const out = [];
    const nodes = d.querySelectorAll(selector);
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const text = norm(node.innerText || node.textContent || "");
      if (!text || text.length > maxLength) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      out.push(text);
      if (out.length >= limit) break;
    }
    return out;
  }

  function countByText(d, selector, keywords) {
    const nodes = d.querySelectorAll(selector);
    let count = 0;
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const text = norm((node.innerText || node.textContent || "").toLowerCase());
      if (!text) continue;
      if (keywords.some(function (k) { return text.includes(k); })) count += 1;
    }
    return count;
  }

  function norm(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }
});
