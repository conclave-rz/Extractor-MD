__TYPEUI_REGISTER_EXTRACTOR("design-tokens", function extractDesignTokens(doc, win) {
  const sampledElements = collectSampledElements(doc, win, 280);
  const typography = [];
  const colors = [];
  const spacing = [];
  const radius = [];
  const shadows = [];
  const motion = [];

  for (const el of sampledElements) {
    const style = win.getComputedStyle(el);
    typography.push({
      fontFamily: normalizeWhitespace(style.fontFamily),
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing
    });

    colors.push({
      textColor: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      outlineColor: style.outlineColor
    });

    spacing.push({
      marginTop: style.marginTop,
      marginRight: style.marginRight,
      marginBottom: style.marginBottom,
      marginLeft: style.marginLeft,
      paddingTop: style.paddingTop,
      paddingRight: style.paddingRight,
      paddingBottom: style.paddingBottom,
      paddingLeft: style.paddingLeft
    });

    radius.push(style.borderRadius);
    shadows.push(style.boxShadow);
    motion.push({
      transitionDuration: style.transitionDuration,
      transitionTimingFunction: style.transitionTimingFunction,
      animationDuration: style.animationDuration,
      animationTimingFunction: style.animationTimingFunction
    });
  }

  let cssVars = {};
  try {
    cssVars = readCssVariables(doc, win);
  } catch (_e) {
    cssVars = {};
  }

  let stylesheetSignals = { fontFaces: [], breakpoints: [], keyframes: [], rootVars: {} };
  try {
    stylesheetSignals = readStylesheetSignals(doc);
  } catch (_e) {
    // CORS-safe: ignore stylesheets we can't read
  }

  const supportsDarkMode = detectDarkModeSupport(doc, cssVars, stylesheetSignals);

  return {
    source: {
      url: win.location.href,
      title: doc.title || "Untitled page"
    },
    sampledAt: new Date().toISOString(),
    totalElements: doc.querySelectorAll("*").length,
    sampledElements: sampledElements.length,
    typography: typography,
    colors: colors,
    spacing: spacing,
    radius: radius,
    shadows: shadows,
    motion: motion,
    components: collectComponentCounts(doc),
    siteSignals: collectSiteSignals(doc, win),
    cssVars: cssVars,
    stylesheetSignals: stylesheetSignals,
    supportsDarkMode: supportsDarkMode
  };

  function collectSampledElements(d, w, limit) {
    const selectors = [
      "body",
      "h1,h2,h3,h4,h5,h6",
      "p",
      "a",
      "button",
      "input,textarea,select",
      "label",
      "nav,header,footer,main,section,article,aside",
      "ul li,ol li",
      "table,th,td",
      "[role='button']",
      "[class*='card']",
      "[class*='btn']",
      "[tabindex]"
    ];
    const seen = new Set();
    const output = [];
    for (const selector of selectors) {
      const nodes = d.querySelectorAll(selector);
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (seen.has(node)) continue;
        if (!isVisible(node, w)) continue;
        seen.add(node);
        output.push(node);
        if (output.length >= limit) return output;
      }
    }
    if (output.length === 0 && d.body) {
      output.push(d.body);
    }
    return output;
  }

  function isVisible(el, w) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = w.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
  }

  function collectComponentCounts(d) {
    const map = {
      buttons: "button, [role='button'], .btn, [class*='button']",
      links: "a[href]",
      inputs: "input, textarea, select",
      cards: ".card, [class*='card'], article",
      navigation: "nav, header",
      lists: "ul, ol",
      tables: "table"
    };
    return Object.entries(map).map(function (entry) {
      return { type: entry[0], count: d.querySelectorAll(entry[1]).length };
    });
  }

  function collectSiteSignals(d, w) {
    const title = d.title || "";
    return {
      title: title,
      description: getMetaContent(d, "description"),
      keywords: getMetaContent(d, "keywords"),
      ogType: getMetaContent(d, "og:type", true),
      ogSiteName: getMetaContent(d, "og:site_name", true),
      appName: getMetaContent(d, "application-name"),
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
      textSample: normalizeWhitespace(((d.body && d.body.innerText) || "").slice(0, 14000)),
      elementCounts: {
        forms: d.querySelectorAll("form").length,
        inputs: d.querySelectorAll("input, textarea, select").length,
        tables: d.querySelectorAll("table").length,
        codeBlocks: d.querySelectorAll("pre, code").length,
        articles: d.querySelectorAll("article").length,
        pricingSections: countNodesByText(d, "section, div, article", ["pricing", "plans"]),
        productMarkers: d.querySelectorAll(
          "[itemtype*='Product'], [class*='product'], [id*='product'], [data-product]"
        ).length,
        authMarkers: countNodesByText(d, "a, button, label, span", [
          "sign in", "log in", "login", "register", "dashboard", "workspace"
        ]),
        checkoutMarkers: countNodesByText(d, "a, button, span", [
          "add to cart", "checkout", "buy now", "cart"
        ])
      }
    };
  }

  function getMetaContent(d, name, property) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    const node = d.querySelector(selector);
    const value = node ? node.getAttribute("content") : "";
    return normalizeWhitespace(value || "");
  }

  function collectTexts(d, selector, limit, maxLength) {
    const seen = new Set();
    const output = [];
    const nodes = d.querySelectorAll(selector);
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const text = normalizeWhitespace(node.innerText || node.textContent || "");
      if (!text || text.length > maxLength) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      output.push(text);
      if (output.length >= limit) break;
    }
    return output;
  }

  function countNodesByText(d, selector, keywords) {
    const nodes = d.querySelectorAll(selector);
    let count = 0;
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const text = normalizeWhitespace((node.innerText || node.textContent || "").toLowerCase());
      if (!text) continue;
      if (keywords.some(function (k) { return text.includes(k); })) count += 1;
    }
    return count;
  }

  function readCssVariables(d, w) {
    const targets = [d.documentElement, d.body].filter(Boolean);
    const vars = {};
    for (const target of targets) {
      const cs = w.getComputedStyle(target);
      for (let i = 0; i < cs.length; i++) {
        const name = cs[i];
        if (name && name.indexOf("--") === 0) {
          const value = cs.getPropertyValue(name).trim();
          if (value && !(name in vars)) vars[name] = value;
        }
      }
    }
    return vars;
  }

  function readStylesheetSignals(d) {
    const out = { fontFaces: [], breakpoints: [], keyframes: [], rootVars: {} };
    const breakpointSet = new Set();
    const sheets = Array.from(d.styleSheets || []);
    for (const sheet of sheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (_e) { continue; }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (typeof CSSFontFaceRule !== "undefined" && rule instanceof CSSFontFaceRule) {
          out.fontFaces.push({
            family: rule.style.getPropertyValue("font-family").replace(/['"]/g, "").trim(),
            weight: rule.style.getPropertyValue("font-weight") || "400",
            style: rule.style.getPropertyValue("font-style") || "normal",
            src: rule.style.getPropertyValue("src") || ""
          });
        } else if (typeof CSSMediaRule !== "undefined" && rule instanceof CSSMediaRule) {
          const m = String(rule.conditionText || "").match(/min-width:\s*(\d+)px/);
          if (m) breakpointSet.add(parseInt(m[1], 10));
        } else if (typeof CSSKeyframesRule !== "undefined" && rule instanceof CSSKeyframesRule) {
          out.keyframes.push({ name: rule.name, frames: rule.cssRules ? rule.cssRules.length : 0 });
        } else if (rule.selectorText === ":root") {
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (prop && prop.indexOf("--") === 0) {
              out.rootVars[prop] = rule.style.getPropertyValue(prop).trim();
            }
          }
        }
      }
    }
    out.breakpoints = Array.from(breakpointSet).sort(function (a, b) { return a - b; });
    return out;
  }

  function detectDarkModeSupport(d, cssVars, stylesheetSignals) {
    const allVars = Object.assign({}, stylesheetSignals.rootVars || {}, cssVars || {});
    for (const name of Object.keys(allVars)) {
      if (/-dark(\b|$|-)/.test(name) || name.endsWith("-dark")) return true;
    }
    if (d.querySelector("[data-theme='dark'],[data-color-mode='dark'],html.dark,body.dark")) return true;
    return false;
  }

  function normalizeWhitespace(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }
});
