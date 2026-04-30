import { registerSkill, listSkills, clearRegistryForTesting } from "./registry.mjs";
import { designTokensSkill } from "./design-tokens/index.mjs";
import { productSurfaceSkill } from "./product-surface/index.mjs";
import { techStackSkill } from "./tech-stack/index.mjs";

let installed = false;

export function installDefaultSkills() {
  if (installed) {
    return;
  }
  registerSkill(designTokensSkill);
  registerSkill(productSurfaceSkill);
  registerSkill(techStackSkill);
  installed = true;
}

export function resetSkillsForTesting() {
  clearRegistryForTesting();
  installed = false;
}

export { listSkills, registerSkill };
export { designTokensSkill, productSurfaceSkill, techStackSkill };

installDefaultSkills();
