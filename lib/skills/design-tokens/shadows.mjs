/**
 * Parse a CSS box-shadow declaration into one or more composite shadow
 * descriptors. Returns an empty array if the value is "none" or unparseable.
 *
 * Each layer: { x, y, blur, spread, color, inset }
 */
export function parseShadow(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "none") return [];

  const layers = splitTopLevelCommas(raw);
  const out = [];
  for (const layer of layers) {
    const parsed = parseSingleLayer(layer);
    if (parsed) out.push(parsed);
  }
  return out;
}

function splitTopLevelCommas(value) {
  const out = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function parseSingleLayer(layer) {
  let working = layer;
  let inset = false;
  if (/^inset\s/i.test(working)) {
    inset = true;
    working = working.replace(/^inset\s+/i, "");
  }

  // Pull out the color first (rgb/rgba/hsl/hex/named) — it can be at start or end.
  const colorMatch = working.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)$/);
  let color = "";
  if (colorMatch) {
    color = colorMatch[0];
    working = working.slice(0, working.length - color.length).trim();
  }

  const numericPattern = /(-?\d+(?:\.\d+)?(?:px|em|rem|%)?)/g;
  const numbers = working.match(numericPattern);
  if (!numbers || numbers.length < 2) return null;

  const px = numbers.map(toPx);
  const x = px[0] ?? 0;
  const y = px[1] ?? 0;
  const blur = px[2] ?? 0;
  const spread = px[3] ?? 0;

  return { x, y, blur, spread, color, inset };
}

function toPx(value) {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

const SHADOW_NAMES = ["sm", "md", "lg", "xl", "2xl"];

/**
 * Convert a list of full box-shadow strings into named composite tokens.
 * Dedupe by silhouette (x|y|blur|spread); rank by total radius.
 */
export function buildShadowTokens(shadowStrings) {
  const map = new Map();
  for (const raw of shadowStrings || []) {
    const layers = parseShadow(raw);
    if (layers.length === 0) continue;
    const silhouette = layers
      .map((l) => `${l.inset ? "i" : ""}${l.x}|${l.y}|${l.blur}|${l.spread}`)
      .join(";");
    const radius = layers.reduce((acc, l) => acc + Math.abs(l.x) + Math.abs(l.y) + l.blur + l.spread, 0);
    const existing = map.get(silhouette);
    if (existing) {
      existing.usage += 1;
    } else {
      map.set(silhouette, { silhouette, raw, layers, radius, usage: 1 });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => a.radius - b.radius)
    .slice(0, SHADOW_NAMES.length)
    .map((entry, index) => ({
      token: `shadow.${SHADOW_NAMES[index] || `level${index + 1}`}`,
      value: entry.raw,
      layers: entry.layers,
      usage: entry.usage
    }));
}
