import { registerSkill, listSkills, clearRegistryForTesting } from "./registry.mjs";
import { designTokensSkill } from "./design-tokens/index.mjs";
import { productSurfaceSkill } from "./product-surface/index.mjs";
import { techStackSkill } from "./tech-stack/index.mjs";
import { infoArchitectureSkill } from "./info-architecture/index.mjs";
import { seoSkill } from "./seo/index.mjs";
import { geoSkill } from "./geo/index.mjs";

let installed = false;

export function installDefaultSkills() {
  if (installed) {
    return;
  }
  registerSkill(designTokensSkill);
  registerSkill(productSurfaceSkill);
  registerSkill(techStackSkill);
  registerSkill(infoArchitectureSkill);
  registerSkill(seoSkill);
  registerSkill(geoSkill);
  installed = true;
}

export function resetSkillsForTesting() {
  clearRegistryForTesting();
  installed = false;
}

export { listSkills, registerSkill };
export { designTokensSkill, productSurfaceSkill, techStackSkill, infoArchitectureSkill, seoSkill, geoSkill };

installDefaultSkills();
