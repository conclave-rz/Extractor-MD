import "./lib/skills/index.mjs";
import { runSkills } from "./lib/skills/orchestrator.mjs";
import { listSkills } from "./lib/skills/registry.mjs";

const EXTRACTION_MESSAGE = "TYPEUI_EXTRACT_STYLES";

const OUTPUT_FILENAMES = {
  "design.md": "DESIGN.md",
  "skill.md": "SKILL.md",
  "stack.md": "STACK.md",
  "info.md": "INFO.md"
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    outputMode: "design"
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "RUN_EXTRACTION") {
    handleExtraction(message)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: stringifyError(error) }));
    return true;
  }

  if (message.type === "DOWNLOAD_MARKDOWN") {
    handleDownload(message)
      .then((downloadId) => sendResponse({ ok: true, downloadId }))
      .catch((error) => sendResponse({ ok: false, error: stringifyError(error) }));
    return true;
  }

  if (message.type === "FETCH_ORIGIN_FILE") {
    fetchOriginFile(message.url)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: stringifyError(error) }));
    return true;
  }

  if (message.type === "LIST_SKILLS") {
    try {
      const skills = listSkills().map((s) => ({
        id: s.id,
        label: s.label,
        description: s.description,
        outputs: [...s.outputs],
        defaultEnabled: s.defaultEnabled
      }));
      sendResponse({ ok: true, skills });
    } catch (error) {
      sendResponse({ ok: false, error: stringifyError(error) });
    }
    return false;
  }
});

async function handleExtraction(message) {
  const requestedOutputs = sanitizeOutputs(message.outputs, message.mode);
  const enabledSkills = sanitizeSkills(message.enabledSkills);
  const tab = await getActiveTab();
  await injectExtractor(tab.id);
  const payload = await requestExtractionPayload(tab.id);
  const enrichedPayload = await resolvePendingFetches(payload);

  const skillRun = runSkills(enrichedPayload, {
    enabledSkills,
    outputs: requestedOutputs,
    metadata: message.metadata || {}
  });

  // Legacy single-mode contract used by the current popup.
  const legacyMode = message.mode === "skill" ? "skill" : "design";
  const legacyOutputId = legacyMode === "skill" ? "skill.md" : "design.md";
  const legacyMarkdown = skillRun.outputs[legacyOutputId] || "";
  const legacyFilename = OUTPUT_FILENAMES[legacyOutputId];
  const legacyValidation = skillRun.validations[legacyOutputId] || null;
  const designTokensNormalized = skillRun.normalized["design-tokens"] || null;

  if (message.persistOutputMode !== false && message.mode) {
    await chrome.storage.local.set({
      outputMode: legacyMode
    });
  }

  return {
    mode: legacyMode,
    filename: legacyFilename,
    markdown: legacyMarkdown,
    normalized: designTokensNormalized,
    validation: legacyValidation,
    outputs: skillRun.outputs,
    filenames: skillRun.filenames,
    validations: skillRun.validations,
    diagnostics: skillRun.diagnostics,
    skillsNormalized: skillRun.normalized,
    skillErrors: skillRun.errors
  };
}

async function handleDownload(message) {
  if (!message.markdown) {
    throw new Error("Cannot download empty markdown.");
  }

  const filename = normalizeMarkdownFilename(message.filename, message.mode);
  const url = `data:text/markdown;charset=utf-8,${encodeURIComponent(message.markdown)}`;
  return chrome.downloads.download({
    url,
    filename,
    saveAs: true,
    conflictAction: "uniquify"
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  if (!tab || !tab.id) {
    throw new Error("No active tab available.");
  }
  if (String(tab.url || "").startsWith("chrome://")) {
    throw new Error("Extraction is not available on chrome:// pages.");
  }
  return tab;
}

async function injectExtractor(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content-script.js"]
    });
  } catch (error) {
    const msg = error && error.message ? error.message : String(error);
    if (/no such file|not found/i.test(msg)) {
      throw new Error(
        "dist/content-script.js is missing. Run `npm run build` before loading the extension."
      );
    }
    throw error;
  }
}

function requestExtractionPayload(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: EXTRACTION_MESSAGE }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response || !response.ok) {
        reject(new Error(response?.error || "No extraction response from tab."));
        return;
      }
      resolve(response.payload);
    });
  });
}

function stringifyError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || "Unknown error");
}

function sanitizeOutputs(outputs, mode) {
  if (Array.isArray(outputs) && outputs.length > 0) {
    const allowed = ["design.md", "skill.md", "stack.md", "info.md"];
    const filtered = outputs.filter((id) => typeof id === "string" && allowed.includes(id));
    if (filtered.length > 0) {
      return Array.from(new Set(filtered));
    }
  }
  // Legacy single-mode fallback.
  if (mode === "skill") {
    return ["skill.md"];
  }
  if (mode === "design") {
    return ["design.md"];
  }
  // Default contract: build both legacy outputs.
  return ["design.md", "skill.md"];
}

async function resolvePendingFetches(payload) {
  if (!payload || !Array.isArray(payload.pendingFetches) || payload.pendingFetches.length === 0) {
    return payload;
  }
  const grouped = {};
  await Promise.all(payload.pendingFetches.map(async (req) => {
    const result = await fetchOriginFile(req.url);
    if (!grouped[req.skill]) grouped[req.skill] = {};
    grouped[req.skill][req.url] = result;
  }));
  if (payload.skills && typeof payload.skills === "object") {
    for (const [skillId, fetched] of Object.entries(grouped)) {
      const slice = payload.skills[skillId] || {};
      slice.fetched = Object.assign({}, slice.fetched || {}, fetched);
      payload.skills[skillId] = slice;
    }
  }
  return payload;
}

async function fetchOriginFile(url) {
  if (!url || typeof url !== "string") {
    return { ok: false, status: 0, text: "", error: "missing url" };
  }
  try {
    const res = await fetch(url, { credentials: "omit", redirect: "follow" });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    return { ok: false, status: 0, text: "", error: err && err.message ? err.message : String(err) };
  }
}

function sanitizeSkills(enabledSkills) {
  if (Array.isArray(enabledSkills) && enabledSkills.length > 0) {
    return enabledSkills.filter((id) => typeof id === "string" && id.length > 0);
  }
  return undefined;
}

function normalizeMarkdownFilename(inputName, mode) {
  const normalizedMode = mode === "skill" ? "skill" : "design";
  const fallback = normalizedMode === "skill" ? "SKILL.md" : "DESIGN.md";
  const raw = String(inputName || "").trim();

  if (!raw) {
    return fallback;
  }

  const name = raw.replace(/[\\/]/g, "").trim();
  if (!name) {
    return fallback;
  }

  if (normalizedMode === "skill") {
    if (/^skill(\.md)?$/i.test(name)) {
      return "SKILL.md";
    }
    return name.toLowerCase().endsWith(".md") ? name : `${name}.md`;
  }

  if (/^design(\.md)?$/i.test(name)) {
    return "DESIGN.md";
  }
  return name.toLowerCase().endsWith(".md") ? name : `${name}.md`;
}
