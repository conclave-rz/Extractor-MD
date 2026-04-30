export function normalize(raw) {
  if (!raw || typeof raw !== "object") return null;

  const headings = Array.isArray(raw.headings) ? raw.headings : [];
  const landmarks = raw.landmarks || {};
  const navs = Array.isArray(raw.navs) ? raw.navs : [];
  const linkGraph = raw.linkGraph || { internal: 0, external: 0, anchor: 0, mailto: 0, tel: 0, nofollow: 0 };

  const validations = computeValidations(headings, landmarks, navs);
  const headingTree = buildHeadingTree(headings);

  return {
    headings,
    headingTree,
    landmarks,
    navs,
    linkGraph,
    breadcrumbs: Boolean(raw.breadcrumbs),
    pagination: Boolean(raw.pagination),
    urlPattern: raw.urlPattern || { pathname: "/", pathDepth: 0, lastSegment: "", slugLooksDetail: false },
    aboveTheFold: Array.isArray(raw.aboveTheFold) ? raw.aboveTheFold : [],
    validations,
    isHierarchyValid: validations.skips.length === 0 && validations.h1Count <= 1
  };
}

function computeValidations(headings, landmarks, navs) {
  const skips = [];
  let lastLevel = 0;
  let h1Count = 0;
  for (const h of headings) {
    if (h.level === 1) h1Count++;
    if (lastLevel > 0 && h.level > lastLevel + 1) {
      skips.push({ from: lastLevel, to: h.level, text: h.text });
    }
    lastLevel = h.level;
  }

  const navsWithoutLabel = navs.filter((n) => !n.ariaLabel).length;
  const missingMain = (landmarks.main || 0) === 0;
  const multipleH1 = h1Count > 1;
  const navLabelWarning = navs.length > 1 && navsWithoutLabel > 0;

  return {
    skips,
    h1Count,
    multipleH1,
    missingMain,
    navLabelWarning
  };
}

function buildHeadingTree(headings) {
  const root = { level: 0, children: [] };
  const stack = [root];
  for (const h of headings) {
    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }
    const node = { level: h.level, text: h.text, id: h.id, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root.children;
}
