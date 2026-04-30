const SECTION_ORDER = 10;

export function section(normalized, outputId) {
  if (!normalized || outputId !== "stack.md") return null;

  const lines = [];
  lines.push("# Tech stack");
  lines.push("");

  // Frameworks
  lines.push("## Frameworks");
  if (normalized.frameworks.length === 0 && normalized.uiLibraries.length === 0) {
    lines.push("- (none detected)");
  } else {
    for (const fw of normalized.frameworks) {
      lines.push(`- Runtime: ${fw.label} (${fw.confidence})${fw.buildId ? ` [build ${truncate(fw.buildId, 12)}]` : ""}`);
    }
    for (const lib of normalized.uiLibraries) {
      const versionTag = lib.version ? ` v${lib.version}` : "";
      lines.push(`- UI library: ${lib.label}${versionTag} (${lib.confidence})`);
    }
  }

  // Styling
  lines.push("");
  lines.push("## Styling");
  if (normalized.cssFrameworks.length === 0) {
    lines.push("- CSS framework: (none detected at high or medium confidence)");
  } else {
    for (const css of normalized.cssFrameworks) {
      const pct = (css.ratio * 100).toFixed(0);
      lines.push(`- CSS framework: ${css.label} (${css.confidence}, ${pct}% utility class ratio)`);
    }
  }
  lines.push(`- Custom properties detected: ${normalized.customPropertyCount}`);

  // CMS / Builder
  lines.push("");
  lines.push("## CMS / Builder");
  if (normalized.cms.detected.length === 0) {
    lines.push("- (none detected)");
  } else {
    for (const cms of normalized.cms.detected) {
      lines.push(`- ${cms.label} (${cms.confidence})`);
    }
  }
  if (normalized.cms.generatorMeta) {
    lines.push(`- meta[generator]: ${normalized.cms.generatorMeta}`);
  }

  // Build & hosting
  lines.push("");
  lines.push("## Build & hosting");
  if (normalized.bundlers.length === 0) {
    lines.push("- (no bundler / host fingerprints detected)");
  } else {
    for (const b of normalized.bundlers) {
      lines.push(`- ${b.label} (${b.confidence})`);
    }
  }

  // Analytics & tags
  lines.push("");
  lines.push("## Analytics & tags");
  if (normalized.analytics.length === 0) {
    lines.push("- (none detected)");
  } else {
    lines.push(`- ${normalized.analytics.map((a) => a.label).join(", ")}`);
  }

  // Fonts
  lines.push("");
  lines.push("## Fonts");
  if (normalized.fonts.length === 0) {
    lines.push("- (no @font-face declarations or font CDN links detected)");
  } else {
    for (const f of normalized.fonts) {
      if (f.family) {
        lines.push(`- ${f.family} (${f.host})`);
      } else {
        lines.push(`- (host) ${f.host}`);
      }
    }
  }

  return {
    heading: null,
    body: lines.join("\n") + "\n",
    anchor: "tech-stack",
    sectionOrder: SECTION_ORDER
  };
}

function truncate(s, n) {
  s = String(s || "");
  return s.length <= n ? s : s.slice(0, n) + "…";
}
