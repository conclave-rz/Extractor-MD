__TYPEUI_REGISTER_EXTRACTOR("info-architecture", function extractInfoArchitecture(doc, win) {
  const headings = collectHeadings(doc);
  const landmarks = collectLandmarks(doc);
  const navs = describeNavs(doc);
  const linkGraph = classifyLinks(doc, win);
  const breadcrumbs = detectBreadcrumbs(doc);
  const pagination = detectPagination(doc);
  const urlPattern = describeUrl(win);
  const aboveTheFold = collectAboveTheFold(doc, win);

  return {
    headings,
    landmarks,
    navs,
    linkGraph,
    breadcrumbs,
    pagination,
    urlPattern,
    aboveTheFold
  };

  function collectHeadings(d) {
    const nodes = d.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const out = [];
    for (const node of nodes) {
      out.push({
        level: parseInt(node.tagName.slice(1), 10),
        text: norm(node.innerText || node.textContent || ""),
        id: node.id || null,
        hasAnchorLink: Boolean(node.querySelector('a[href^="#"]'))
      });
    }
    return out;
  }

  function collectLandmarks(d) {
    const map = {
      main: 0, nav: 0, aside: 0, header: 0, footer: 0
    };
    const explicit = {
      main: d.querySelectorAll("main, [role='main']").length,
      nav: d.querySelectorAll("nav, [role='navigation']").length,
      aside: d.querySelectorAll("aside, [role='complementary']").length,
      header: d.querySelectorAll("header, [role='banner']").length,
      footer: d.querySelectorAll("footer, [role='contentinfo']").length
    };
    return Object.assign(map, explicit);
  }

  function describeNavs(d) {
    const out = [];
    const nodes = d.querySelectorAll("nav");
    for (const node of nodes) {
      const directClickables = node.querySelectorAll(":scope > ul > li > a, :scope > ul > li > button, :scope > a, :scope > button");
      out.push({
        ariaLabel: node.getAttribute("aria-label") || null,
        directItems: directClickables.length,
        depth: maxDepth(node, "ul", "ul", 0),
        location: classifyLocation(node)
      });
    }
    return out;
  }

  function maxDepth(root, childSel, descendantSel, current) {
    const children = root.querySelectorAll(":scope > " + childSel);
    if (children.length === 0) return current;
    let deepest = current + 1;
    for (const child of children) {
      const next = maxDepth(child, "li > " + descendantSel, descendantSel, current + 1);
      if (next > deepest) deepest = next;
    }
    return deepest;
  }

  function classifyLocation(node) {
    if (node.closest("header")) return "header";
    if (node.closest("footer")) return "footer";
    return "body";
  }

  function classifyLinks(d, w) {
    const anchors = d.querySelectorAll("a[href]");
    let internal = 0, external = 0, anchor = 0, mailto = 0, tel = 0, nofollow = 0;
    const host = (w.location && w.location.host) || "";
    for (const a of anchors) {
      const href = a.getAttribute("href") || "";
      const rel = (a.getAttribute("rel") || "").toLowerCase();
      if (rel.split(/\s+/).includes("nofollow")) nofollow++;
      if (href.startsWith("#")) { anchor++; continue; }
      if (href.startsWith("mailto:")) { mailto++; continue; }
      if (href.startsWith("tel:")) { tel++; continue; }
      try {
        const url = new URL(href, w.location.href);
        if (url.host === host) internal++;
        else external++;
      } catch (_e) {
        internal++; // relative paths default to internal
      }
    }
    return { internal, external, anchor, mailto, tel, nofollow };
  }

  function detectBreadcrumbs(d) {
    return Boolean(
      d.querySelector("[itemtype*='BreadcrumbList']") ||
      d.querySelector("nav[aria-label*='breadcrumb' i]") ||
      d.querySelector(".breadcrumb, .breadcrumbs, [class*='breadcrumb']")
    );
  }

  function detectPagination(d) {
    return Boolean(
      d.querySelector("[rel='next'], [rel='prev']") ||
      d.querySelector("nav[aria-label*='pagination' i], nav[aria-label*='pager' i]") ||
      d.querySelector(".pagination, [class*='pagination']")
    );
  }

  function describeUrl(w) {
    const path = w.location.pathname || "/";
    const segments = path.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || "";
    return {
      pathname: path,
      pathDepth: segments.length,
      lastSegment: last,
      slugLooksDetail: /[-_]/.test(last) || /\d/.test(last)
    };
  }

  function collectAboveTheFold(d, w) {
    const innerHeight = w.innerHeight || 800;
    const candidates = Array.from(d.querySelectorAll("main > *, section, article")).slice(0, 80);
    const out = [];
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.top < innerHeight && rect.height > 0) {
        out.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          className: typeof el.className === "string" ? el.className : "",
          rectTop: Math.round(rect.top),
          rectHeight: Math.round(rect.height),
          firstHeading: firstHeadingText(el)
        });
      }
    }
    return out.slice(0, 12);
  }

  function firstHeadingText(el) {
    const h = el.querySelector("h1, h2, h3, h4");
    return h ? norm(h.innerText || h.textContent || "") : "";
  }

  function norm(value) { return String(value || "").trim().replace(/\s+/g, " "); }
});
