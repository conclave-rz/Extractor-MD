import { normalizeExtractedStyles } from "../../normalize.mjs";

export function normalize(rawPayload) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }
  return normalizeExtractedStyles(rawPayload);
}
