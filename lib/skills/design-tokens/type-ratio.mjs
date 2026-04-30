const COMMON_RATIOS = [1.067, 1.125, 1.2, 1.25, 1.333, 1.414, 1.5, 1.618];

const SCALE_NAMES = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];

/**
 * Detect the closest common modular scale ratio for a set of pixel sizes.
 * Returns null if fewer than 3 distinct sizes are supplied.
 */
export function inferTypeRatio(fontSizesPx) {
  const unique = Array.from(new Set(fontSizesPx.filter((n) => Number.isFinite(n) && n > 0)))
    .sort((a, b) => a - b);
  if (unique.length < 3) return null;

  const ratios = [];
  for (let i = 1; i < unique.length; i++) {
    if (unique[i - 1] > 0) ratios.push(unique[i] / unique[i - 1]);
  }
  if (ratios.length === 0) return null;

  let best = { ratio: null, score: -Infinity };
  for (const candidate of COMMON_RATIOS) {
    const score = -ratios.reduce((acc, r) => acc + Math.abs(r - candidate), 0);
    if (score > best.score) best = { ratio: candidate, score };
  }
  return best.ratio;
}

/**
 * Build a complete typography scale from a base size and a ratio.
 * Returns 8 levels (xs..4xl).
 */
export function buildScaleFromRatio(baseSize, ratio) {
  const out = [];
  // Place 16 (or baseSize) at the "md" position so smaller sizes step down.
  const baseIndex = SCALE_NAMES.indexOf("md");
  for (let i = 0; i < SCALE_NAMES.length; i++) {
    const exponent = i - baseIndex;
    const size = Math.round(baseSize * Math.pow(ratio, exponent) * 100) / 100;
    out.push({ name: SCALE_NAMES[i], px: size });
  }
  return out;
}

/**
 * Pick a base font size from a list of observed sizes.
 * Prefers the modal value within 14..18 if present, else the median.
 */
export function inferBaseSize(fontSizesPx) {
  const counts = new Map();
  for (const n of fontSizesPx) {
    if (!Number.isFinite(n)) continue;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  const inRange = Array.from(counts.entries()).filter(([n]) => n >= 14 && n <= 18);
  if (inRange.length > 0) {
    inRange.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return inRange[0][0];
  }
  const all = Array.from(counts.keys()).sort((a, b) => a - b);
  if (all.length === 0) return 16;
  return all[Math.floor(all.length / 2)];
}
