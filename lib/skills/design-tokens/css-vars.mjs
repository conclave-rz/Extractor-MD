const PREFIX_GROUPS = [
  { key: "color", patterns: [/^--color(-|$)/, /^--clr(-|$)/, /^--c(-|$)/] },
  { key: "space", patterns: [/^--space(-|$)/, /^--spacing(-|$)/, /^--gap(-|$)/] },
  { key: "radius", patterns: [/^--radius(-|$)/, /^--rounded(-|$)/, /^--rad(-|$)/] },
  { key: "font", patterns: [/^--font(-|$)/, /^--text(-|$)/, /^--type(-|$)/] },
  { key: "shadow", patterns: [/^--shadow(-|$)/, /^--elevation(-|$)/] },
  { key: "ease", patterns: [/^--ease(-|$)/, /^--easing(-|$)/, /^--transition-easing(-|$)/] },
  { key: "duration", patterns: [/^--duration(-|$)/, /^--transition-duration(-|$)/, /^--motion-duration(-|$)/] },
  { key: "breakpoint", patterns: [/^--breakpoint(-|$)/, /^--bp(-|$)/, /^--screen(-|$)/] }
];

/**
 * Group raw CSS variable map by semantic prefix.
 * Returns an object like { color: { '--color-primary': '#...' }, space: {...}, ... }.
 * Anything that doesn't match a known prefix lands in the `other` bucket.
 */
export function groupCssVars(vars) {
  const out = { color: {}, space: {}, radius: {}, font: {}, shadow: {}, ease: {}, duration: {}, breakpoint: {}, other: {} };
  if (!vars || typeof vars !== "object") return out;

  for (const [name, value] of Object.entries(vars)) {
    if (!name || !value) continue;
    let placed = false;
    for (const group of PREFIX_GROUPS) {
      if (group.patterns.some((re) => re.test(name))) {
        out[group.key][name] = value;
        placed = true;
        break;
      }
    }
    if (!placed) out.other[name] = value;
  }
  return out;
}

/**
 * Detect dark-mode capable CSS variables (e.g. `--color-bg-dark`).
 */
export function hasDarkVariants(vars) {
  if (!vars) return false;
  return Object.keys(vars).some((name) => /-dark(\b|$|-)/.test(name));
}

/**
 * Build a quick-citing lookup: hex value -> CSS var name.
 * Useful so token rendering can prefer `var(--color-primary)` when available.
 */
export function buildHexToVarLookup(colorVars) {
  const out = {};
  if (!colorVars) return out;
  for (const [name, raw] of Object.entries(colorVars)) {
    const hex = anyToHex(raw);
    if (hex) out[hex] = name;
  }
  return out;
}

function anyToHex(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return null;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  }
  if (/^#[0-9a-f]{6}$/.test(v)) {
    return v;
  }
  const rgb = v.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      return "#" + [parts[0], parts[1], parts[2]].map((n) => clampByte(n).toString(16).padStart(2, "0")).join("");
    }
  }
  return null;
}

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}
