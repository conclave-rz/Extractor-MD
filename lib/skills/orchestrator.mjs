import { listSkills } from "./registry.mjs";
import { validateMarkdownOutput } from "../validate.mjs";

const OUTPUT_FILENAMES = {
  "design.md": "DESIGN.md",
  "skill.md": "SKILL.md",
  "stack.md": "STACK.md",
  "info.md": "INFO.md"
};

const VALIDATABLE_OUTPUTS = {
  "design.md": "design",
  "skill.md": "skill"
};

/**
 * Run the configured skills against an extracted raw payload and return
 * a map of output files plus per-skill normalized data.
 *
 * @param {Object} rawPayload   The raw signals collected by the content script.
 * @param {Object} [options]
 * @param {string[]} [options.enabledSkills]  Skill ids to run. Defaults to every registered skill.
 * @param {string[]} [options.outputs]        Output ids to assemble. Defaults to ['design.md','skill.md'].
 * @param {Object}   [options.metadata]       Renderer metadata (systemName, brand, audience, etc).
 */
export function runSkills(rawPayload, options = {}) {
  const allSkills = listSkills();
  const enabled = Array.isArray(options.enabledSkills) && options.enabledSkills.length > 0
    ? new Set(options.enabledSkills)
    : new Set(allSkills.map((s) => s.id));
  const outputs = Array.isArray(options.outputs) && options.outputs.length > 0
    ? options.outputs
    : ["design.md", "skill.md"];
  const metadata = options.metadata || {};

  const skillOutcomes = [];
  const normalized = {};
  const errors = [];

  const usingBundleFormat = isBundleFormat(rawPayload);

  for (const skill of allSkills) {
    if (!enabled.has(skill.id)) {
      continue;
    }
    const skillRaw = rawForSkill(skill.id, rawPayload, usingBundleFormat);
    let normalizedSkill = null;
    try {
      normalizedSkill = skill.normalize(skillRaw, {
        rawPayload,
        skillRaw,
        meta: usingBundleFormat ? rawPayload.meta : null
      }) ?? null;
    } catch (err) {
      errors.push({ skill: skill.id, phase: "normalize", message: stringifyError(err) });
    }
    skillOutcomes.push({ skill, normalized: normalizedSkill });
    if (normalizedSkill && typeof normalizedSkill === "object") {
      normalized[skill.id] = normalizedSkill;
    }
  }

  const outputFiles = {};
  const sectionsByOutput = {};

  for (const outputId of outputs) {
    const sections = [];
    for (const { skill, normalized: nSkill } of skillOutcomes) {
      if (!skill.outputs.includes(outputId) || !nSkill) {
        continue;
      }
      let result = null;
      try {
        result = skill.section(nSkill, outputId, { metadata, rawPayload });
      } catch (err) {
        errors.push({ skill: skill.id, phase: "section", output: outputId, message: stringifyError(err) });
      }
      if (result && typeof result.body === "string" && result.body.length > 0) {
        sections.push({
          skillId: skill.id,
          heading: result.heading || null,
          body: result.body,
          anchor: result.anchor || skill.id,
          sectionOrder: typeof result.sectionOrder === "number" ? result.sectionOrder : 0
        });
      }
    }
    sections.sort((a, b) => {
      if (a.sectionOrder !== b.sectionOrder) {
        return a.sectionOrder - b.sectionOrder;
      }
      return a.skillId.localeCompare(b.skillId);
    });
    const markdown = assembleMarkdown(sections);
    if (markdown) {
      outputFiles[outputId] = markdown;
      sectionsByOutput[outputId] = sections;
    }
  }

  const validations = {};
  for (const outputId of Object.keys(outputFiles)) {
    const mode = VALIDATABLE_OUTPUTS[outputId];
    if (mode) {
      validations[outputId] = validateMarkdownOutput(mode, outputFiles[outputId]);
    }
  }

  const diagnostics = collectDiagnostics(skillOutcomes);

  return {
    outputs: outputFiles,
    filenames: outputsToFilenames(outputFiles),
    sectionsByOutput,
    normalized,
    validations,
    diagnostics,
    errors
  };
}

function assembleMarkdown(sections) {
  if (sections.length === 0) {
    return "";
  }
  // When a single skill owns the entire output (phase 1 path) we return its
  // body byte-for-byte to preserve the legacy markdown exactly.
  if (sections.length === 1) {
    return sections[0].body;
  }
  const parts = [];
  for (const section of sections) {
    const piece = section.heading
      ? `${section.heading}\n\n${section.body.trim()}`
      : section.body.trim();
    parts.push(piece);
  }
  return parts.join("\n\n") + "\n";
}

function collectDiagnostics(skillOutcomes) {
  const all = [];
  for (const { skill, normalized } of skillOutcomes) {
    if (!normalized || typeof skill.diagnostics !== "function") {
      continue;
    }
    try {
      const items = skill.diagnostics(normalized);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (typeof item === "string" && item.trim()) {
            all.push(item.trim());
          }
        }
      }
    } catch (_err) {
      // diagnostics must never break the flow
    }
  }
  return Array.from(new Set(all));
}

function outputsToFilenames(outputFiles) {
  const map = {};
  for (const outputId of Object.keys(outputFiles)) {
    map[outputId] = OUTPUT_FILENAMES[outputId] || outputId;
  }
  return map;
}

function stringifyError(err) {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err || "unknown error");
}

function isBundleFormat(rawPayload) {
  return Boolean(
    rawPayload &&
    typeof rawPayload === "object" &&
    rawPayload.skills &&
    typeof rawPayload.skills === "object" &&
    !Array.isArray(rawPayload.skills)
  );
}

function rawForSkill(skillId, rawPayload, usingBundle) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }
  if (usingBundle) {
    const slice = rawPayload.skills[skillId];
    return slice === undefined ? null : slice;
  }
  // Legacy flat payload — every skill receives the entire object and picks
  // the fields it cares about (this is the path used by the mock-based tests
  // and by the legacy content-script.js).
  return rawPayload;
}

export { OUTPUT_FILENAMES, isBundleFormat, rawForSkill };
