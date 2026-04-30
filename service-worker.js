import "./lib/skills/index.mjs";
import { runSkills } from "./lib/skills/orchestrator.mjs";

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
});

async function handleExtraction(message) {
  const requestedOutputs = sanitizeOutputs(message.outputs, message.mode);
  const enabledSkills = sanitizeSkills(message.enabledSkills);
  const tab = await getActiveTab();
  await injectExtractor(tab.id);
  const payload = await requestExtractionPayload(tab.id);

  const skillRun = runSkills(payload, {
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
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-script.js"]
  });
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
