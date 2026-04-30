const skills = new Map();

const REQUIRED_FIELDS = ["id", "label", "outputs", "normalize", "section"];

export function registerSkill(skill) {
  for (const field of REQUIRED_FIELDS) {
    if (!skill || skill[field] === undefined || skill[field] === null) {
      throw new Error(`Skill is missing required field: ${field}`);
    }
  }
  if (typeof skill.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(skill.id)) {
    throw new Error(`Skill id must be kebab-case: got "${skill.id}"`);
  }
  if (!Array.isArray(skill.outputs) || skill.outputs.length === 0) {
    throw new Error(`Skill "${skill.id}" must declare at least one output file`);
  }
  if (typeof skill.normalize !== "function") {
    throw new Error(`Skill "${skill.id}" must expose a normalize() function`);
  }
  if (typeof skill.section !== "function") {
    throw new Error(`Skill "${skill.id}" must expose a section() function`);
  }
  if (skills.has(skill.id)) {
    throw new Error(`Skill id "${skill.id}" is already registered`);
  }
  skills.set(skill.id, Object.freeze({
    id: skill.id,
    label: skill.label,
    description: skill.description || "",
    outputs: [...skill.outputs],
    defaultEnabled: skill.defaultEnabled !== false,
    run: skill.run,
    normalize: skill.normalize,
    section: skill.section,
    diagnostics: skill.diagnostics
  }));
  return skill;
}

export function listSkills() {
  return Array.from(skills.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function getSkill(id) {
  return skills.get(id) || null;
}

export function getSkillsForOutput(outputId) {
  return listSkills().filter((skill) => skill.outputs.includes(outputId));
}

export function clearRegistryForTesting() {
  skills.clear();
}
