import { inferSiteProfile } from "../../normalize.mjs";

export function normalize(rawPayload) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }
  const siteProfile = inferSiteProfile(rawPayload);
  return { siteProfile };
}
