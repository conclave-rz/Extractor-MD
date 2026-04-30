__TYPEUI_REGISTER_EXTRACTOR("tech-stack", function extractTechStack(doc, win) {
  const out = {
    frameworks: detectFrameworks(doc, win),
    uiLibraries: detectUiLibraries(doc, win),
    cssFrameworks: detectCssFramework(doc),
    cms: detectCms(doc, win),
    bundlersAndHosts: detectBundlersAndHosts(doc),
    analytics: detectAnalytics(doc, win),
    fonts: detectFontHosts(doc),
    headerSignals: collectHeaderSignals(doc),
    customPropertyCount: countCustomProperties(doc, win)
  };
  return out;

  function get(obj, path) {
    try {
      return path.split(".").reduce(function (acc, k) { return acc == null ? acc : acc[k]; }, obj);
    } catch (_e) { return undefined; }
  }

  function detectFrameworks(d, w) {
    const frameworks = [];
    if (w.__NEXT_DATA__) {
      frameworks.push({ id: "nextjs", label: "Next.js", buildId: get(w, "__NEXT_DATA__.buildId") || null });
    }
    if (w.__NUXT__) frameworks.push({ id: "nuxt", label: "Nuxt" });
    if (w.___gatsby || w.___loader) frameworks.push({ id: "gatsby", label: "Gatsby" });
    if (w.__remixContext || w.__remixManifest) frameworks.push({ id: "remix", label: "Remix" });
    if (w.__SVELTEKIT_DATA__ || d.querySelector("[data-sveltekit-preload-data]")) {
      frameworks.push({ id: "sveltekit", label: "SvelteKit" });
    }
    if (d.querySelector("astro-island, [data-astro-cid], astro-slot")) {
      frameworks.push({ id: "astro", label: "Astro" });
    }
    if (w._$HY) frameworks.push({ id: "solid", label: "Solid" });
    if (d.querySelector("[q\\:container]")) frameworks.push({ id: "qwik", label: "Qwik" });
    return frameworks;
  }

  function detectUiLibraries(d, w) {
    const libs = [];
    if (d.querySelector("[data-reactroot], [data-reactid]") || w.React) {
      libs.push({ id: "react", label: "React" });
    }
    if (d.querySelector("[data-v-app]") || w.__VUE__) {
      libs.push({ id: "vue", label: "Vue" });
    }
    if (w.ng || d.querySelector("[ng-version]")) {
      const ngEl = d.querySelector("[ng-version]");
      libs.push({
        id: "angular",
        label: "Angular",
        version: ngEl ? ngEl.getAttribute("ng-version") : null
      });
    }
    return libs;
  }

  function detectCssFramework(d) {
    const all = Array.from(d.querySelectorAll("*")).slice(0, 1500);
    const classes = [];
    for (const el of all) {
      const list = el.classList;
      if (!list) continue;
      for (let i = 0; i < list.length; i++) classes.push(list.item(i));
    }
    const total = classes.length || 1;
    function ratio(re) { return classes.filter(function (c) { return c && re.test(c); }).length / total; }

    const tailwindRe = /^(?:[a-z]+:)?(?:flex|grid|hidden|block|text-(?:xs|sm|base|lg|xl|\dxl|\w+-\d+)|bg-\w+-\d+|p[xytrbl]?-\d+|m[xytrbl]?-\d+|rounded|shadow|gap-\d+|w-\d+|h-\d+)$/;
    const bootstrapRe = /^(?:container|row|col(?:-\w+)?|btn(?:-\w+)?|navbar(?:-\w+)?|d-(?:flex|block|none))$/;
    const muiRe = /^Mui[A-Z]/;
    const chakraRe = /^chakra-/;
    const bulmaRe = /^(?:is-|has-)/;
    return {
      tailwind: ratio(tailwindRe),
      bootstrap: ratio(bootstrapRe),
      mui: ratio(muiRe),
      chakra: ratio(chakraRe),
      bulma: ratio(bulmaRe),
      classCountSampled: total
    };
  }

  function detectCms(d, w) {
    const cms = [];
    const generator = (d.querySelector("meta[name='generator']") || {}).getAttribute
      ? d.querySelector("meta[name='generator']").getAttribute("content")
      : "";

    function startsWith(s, pre) { return String(s || "").toLowerCase().indexOf(pre.toLowerCase()) === 0; }

    if (startsWith(generator, "WordPress") || d.querySelector('link[href*="/wp-content/"]')) {
      cms.push({ id: "wordpress", label: "WordPress" });
    }
    if (d.querySelector("html[data-wf-page]")) cms.push({ id: "webflow", label: "Webflow" });
    if (w.Shopify || d.querySelector('link[href*="cdn.shopify.com"]')) {
      cms.push({ id: "shopify", label: "Shopify" });
    }
    if (d.querySelector("[data-framer-name]")) cms.push({ id: "framer", label: "Framer" });
    if (startsWith(generator, "Wix")) cms.push({ id: "wix", label: "Wix" });
    if (startsWith(generator, "Squarespace")) cms.push({ id: "squarespace", label: "Squarespace" });
    if (startsWith(generator, "Hugo")) cms.push({ id: "hugo", label: "Hugo" });
    if (startsWith(generator, "Ghost")) cms.push({ id: "ghost", label: "Ghost" });
    if (d.querySelector('img[src*="images.ctfassets.net"]')) cms.push({ id: "contentful", label: "Contentful" });
    if (d.querySelector('img[src*="cdn.sanity.io"]')) cms.push({ id: "sanity", label: "Sanity" });
    return { detected: cms, generatorMeta: generator || "" };
  }

  function detectBundlersAndHosts(d) {
    const scripts = Array.from(d.querySelectorAll("script[src]")).map(function (s) { return s.getAttribute("src") || ""; });
    const links = Array.from(d.querySelectorAll("link[href]")).map(function (l) { return l.getAttribute("href") || ""; });
    const all = scripts.concat(links);

    function has(re) { return all.some(function (u) { return re.test(u); }); }

    const out = [];
    if (has(/\/_next\/static\//)) out.push({ id: "next-bundler", label: "Next.js bundler" });
    if (has(/\/@vite\//) || has(/\/assets\/index-[a-z0-9]+\.js/i)) out.push({ id: "vite", label: "Vite" });
    if (has(/webpack-runtime|[a-f0-9]{8,}\.chunk\.js/i)) out.push({ id: "webpack", label: "Webpack runtime" });
    if (has(/_next\/image\?url=/)) out.push({ id: "vercel", label: "Vercel image pipeline" });
    if (has(/res\.cloudinary\.com/)) out.push({ id: "cloudinary", label: "Cloudinary" });
    if (has(/imgix\.net/)) out.push({ id: "imgix", label: "Imgix" });
    return out;
  }

  function detectAnalytics(d, w) {
    const out = [];
    if (typeof w.gtag === "function" || (Array.isArray(w.dataLayer) && w.dataLayer.length >= 0)) {
      out.push({ id: "ga4", label: "Google Analytics / dataLayer" });
    }
    if (d.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
      out.push({ id: "gtm", label: "Google Tag Manager" });
    }
    if (typeof w.analytics === "object" && w.analytics) out.push({ id: "segment", label: "Segment" });
    if (w.posthog) out.push({ id: "posthog", label: "PostHog" });
    if (d.querySelector('script[data-domain][src*="plausible.io"]')) out.push({ id: "plausible", label: "Plausible" });
    if (typeof w.hj === "function") out.push({ id: "hotjar", label: "Hotjar" });
    if (w.amplitude) out.push({ id: "amplitude", label: "Amplitude" });
    if (w.mixpanel) out.push({ id: "mixpanel", label: "Mixpanel" });
    if (w.Sentry || w.__SENTRY__) out.push({ id: "sentry", label: "Sentry" });
    return out;
  }

  function detectFontHosts(d) {
    const links = Array.from(d.querySelectorAll('link[href]'));
    const found = new Set();
    for (const l of links) {
      const href = String(l.getAttribute("href") || "");
      if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(href)) found.add("google");
      if (/use\.typekit\.net/.test(href)) found.add("adobe");
      if (/fonts\.bunny\.net/.test(href)) found.add("bunny");
    }
    const stylesheetSignals = [];
    try {
      const sheets = Array.from(d.styleSheets || []);
      for (const sheet of sheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (_e) { continue; }
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (typeof CSSFontFaceRule !== "undefined" && rule instanceof CSSFontFaceRule) {
            const family = rule.style.getPropertyValue("font-family").replace(/['"]/g, "").trim();
            const src = rule.style.getPropertyValue("src") || "";
            stylesheetSignals.push({ family: family, src: src });
          }
        }
      }
    } catch (_e) { /* ignore */ }
    return { hosts: Array.from(found), fontFaces: stylesheetSignals };
  }

  function collectHeaderSignals(d) {
    const meta = {};
    const nodes = d.querySelectorAll("meta[name], meta[property]");
    for (const node of nodes) {
      const key = (node.getAttribute("name") || node.getAttribute("property") || "").toLowerCase();
      if (!key) continue;
      meta[key] = node.getAttribute("content") || "";
    }
    return { metaSample: meta };
  }

  function countCustomProperties(d, w) {
    let count = 0;
    try {
      const cs = w.getComputedStyle(d.documentElement);
      for (let i = 0; i < cs.length; i++) {
        const prop = cs[i];
        if (prop && prop.indexOf("--") === 0) count++;
      }
    } catch (_e) { /* ignore */ }
    return count;
  }
});
