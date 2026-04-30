import { hexToRgb, srgbToOklab, oklabDistance, oklabChroma } from "./oklab.mjs";

const DEFAULT_THRESHOLD = 0.04;

/**
 * Greedy clustering of hex colors using OKLab perceptual distance.
 *
 * @param {Array<{ hex: string, count?: number }>} entries  Color samples with frequency.
 * @param {number} [threshold]  Distance threshold (~0.04 ≈ ΔE 2.3).
 * @returns {Array<{ representative: string, members: string[], count: number, lab: object, chroma: number }>}
 */
export function clusterColors(entries, threshold = DEFAULT_THRESHOLD) {
  const sorted = entries
    .filter((e) => typeof e.hex === "string" && hexToRgb(e.hex))
    .map((e) => ({
      hex: normalizeHex(e.hex),
      count: typeof e.count === "number" ? e.count : 1
    }))
    .sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex));

  const clusters = [];
  for (const entry of sorted) {
    const rgb = hexToRgb(entry.hex);
    if (!rgb) continue;
    const lab = srgbToOklab(rgb.r, rgb.g, rgb.b);
    let assigned = false;
    for (const cluster of clusters) {
      if (oklabDistance(lab, cluster.lab) < threshold) {
        cluster.count += entry.count;
        if (!cluster.members.includes(entry.hex)) {
          cluster.members.push(entry.hex);
        }
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      clusters.push({
        representative: entry.hex,
        members: [entry.hex],
        count: entry.count,
        lab,
        chroma: oklabChroma(lab)
      });
    }
  }
  return clusters.sort((a, b) => b.count - a.count);
}

function normalizeHex(hex) {
  const clean = String(hex || "").trim().toLowerCase();
  if (clean.startsWith("#")) return clean;
  return "#" + clean;
}
