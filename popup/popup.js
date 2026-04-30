const STORAGE_KEY = "popupConfig";

const ALL_OUTPUTS = [
  { id: "design.md", label: "DESIGN.md", filename: "DESIGN.md" },
  { id: "skill.md", label: "SKILL.md", filename: "SKILL.md" },
  { id: "stack.md", label: "STACK.md", filename: "STACK.md" },
  { id: "info.md", label: "INFO.md", filename: "INFO.md" }
];

const QUICK_INSTALL_PROVIDERS = {
  claude: { label: "Claude Code", baseDir: ".claude/skills/typeui" },
  codex: { label: "Codex", baseDir: ".agents/skills/typeui" },
  cursor: { label: "Cursor", baseDir: ".cursor/skills/typeui" }
};

const state = {
  busy: false,
  skills: [],
  enabledSkills: new Set(),
  enabledOutputs: new Set(["design.md", "skill.md"]),
  outputs: {},
  filenames: {},
  validations: {},
  diagnostics: [],
  activeTab: "design.md",
  lastResult: null
};

const els = {
  outputsList: document.getElementById("outputsList"),
  skillsList: document.getElementById("skillsList"),
  outputTabs: document.getElementById("outputTabs"),
  preview: document.getElementById("preview"),
  status: document.getElementById("status"),
  issues: document.getElementById("issues"),
  refreshBtn: document.getElementById("refreshBtn"),
  copyBtn: document.getElementById("copyBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  helpBtn: document.getElementById("helpBtn"),
  helpPanel: document.getElementById("helpPanel"),
  helpContent: document.getElementById("helpContent"),
  closeHelpBtn: document.getElementById("closeHelpBtn"),
  quickInstallButtons: Array.from(document.querySelectorAll(".quick-install-btn")),
  quickInstallResult: document.getElementById("quickInstallResult")
};

els.refreshBtn.addEventListener("click", () => {
  runExtraction().catch((err) => setStatus(toErrorText(err), true));
});

els.copyBtn.addEventListener("click", copyActive);
els.downloadBtn.addEventListener("click", downloadActive);
els.helpBtn.addEventListener("click", toggleHelp);
els.closeHelpBtn.addEventListener("click", () => { els.helpPanel.hidden = true; });

for (const btn of els.quickInstallButtons) {
  btn.addEventListener("click", () => {
    quickInstall(btn.dataset.provider).catch((err) => setQuickInstallResult(toErrorText(err), true));
  });
}

init().catch((err) => setStatus(`Init failed: ${toErrorText(err)}`, true));

async function init() {
  await loadConfig();
  await loadSkills();
  renderOutputCheckboxes();
  renderSkillCheckboxes();
  await runExtraction();
}

async function loadConfig() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const cfg = data[STORAGE_KEY] || {};
  if (Array.isArray(cfg.enabledOutputs) && cfg.enabledOutputs.length > 0) {
    state.enabledOutputs = new Set(cfg.enabledOutputs);
  }
  if (Array.isArray(cfg.enabledSkills)) {
    state.enabledSkills = new Set(cfg.enabledSkills);
  }
  if (typeof cfg.activeTab === "string") {
    state.activeTab = cfg.activeTab;
  }
}

async function persistConfig() {
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      enabledOutputs: Array.from(state.enabledOutputs),
      enabledSkills: Array.from(state.enabledSkills),
      activeTab: state.activeTab
    }
  });
}

async function loadSkills() {
  const response = await chrome.runtime.sendMessage({ type: "LIST_SKILLS" });
  if (!response || !response.ok) {
    throw new Error(response?.error || "Could not list skills.");
  }
  state.skills = response.skills || [];
  // First-time defaults: every shipped skill enabled.
  if (state.enabledSkills.size === 0) {
    for (const s of state.skills) state.enabledSkills.add(s.id);
  }
}

function renderOutputCheckboxes() {
  els.outputsList.innerHTML = "";
  for (const output of ALL_OUTPUTS) {
    const id = `output-${output.id.replace(/\W/g, "-")}`;
    const wrapper = document.createElement("label");
    wrapper.className = "checkbox-row";
    wrapper.htmlFor = id;
    wrapper.innerHTML = `
      <input type="checkbox" id="${id}" data-output="${output.id}" ${state.enabledOutputs.has(output.id) ? "checked" : ""} />
      <span class="checkbox-label">${output.label}</span>
    `;
    const input = wrapper.querySelector("input");
    input.addEventListener("change", async () => {
      if (input.checked) state.enabledOutputs.add(output.id);
      else state.enabledOutputs.delete(output.id);
      if (state.enabledOutputs.size === 0) {
        // never let the user end up with zero outputs — re-enable design.md
        state.enabledOutputs.add("design.md");
        input.checked = output.id === "design.md";
      }
      await persistConfig();
      runExtraction().catch((err) => setStatus(toErrorText(err), true));
    });
    els.outputsList.appendChild(wrapper);
  }
}

function renderSkillCheckboxes() {
  els.skillsList.innerHTML = "";
  for (const skill of state.skills) {
    const id = `skill-${skill.id}`;
    const wrapper = document.createElement("label");
    wrapper.className = "checkbox-row";
    wrapper.htmlFor = id;
    wrapper.title = skill.description || "";
    wrapper.innerHTML = `
      <input type="checkbox" id="${id}" data-skill="${skill.id}" ${state.enabledSkills.has(skill.id) ? "checked" : ""} />
      <span class="checkbox-label">${skill.label}</span>
    `;
    const input = wrapper.querySelector("input");
    input.addEventListener("change", async () => {
      if (input.checked) state.enabledSkills.add(skill.id);
      else state.enabledSkills.delete(skill.id);
      await persistConfig();
      runExtraction().catch((err) => setStatus(toErrorText(err), true));
    });
    els.skillsList.appendChild(wrapper);
  }
}

function renderOutputTabs() {
  els.outputTabs.innerHTML = "";
  const ids = Object.keys(state.outputs);
  if (ids.length === 0) {
    els.outputTabs.innerHTML = `<span class="output-tab is-empty">No outputs produced yet</span>`;
    return;
  }
  if (!ids.includes(state.activeTab)) {
    state.activeTab = ids[0];
  }
  for (const id of ids) {
    const meta = ALL_OUTPUTS.find((o) => o.id === id) || { id, label: id, filename: id };
    const validation = state.validations[id];
    const validHint = validation
      ? (validation.isValid ? " ✓" : " ⚠")
      : "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "output-tab" + (state.activeTab === id ? " is-active" : "");
    btn.dataset.output = id;
    btn.textContent = meta.label + validHint;
    btn.addEventListener("click", () => {
      state.activeTab = id;
      renderActivePreview();
      renderOutputTabs();
      persistConfig();
    });
    els.outputTabs.appendChild(btn);
  }
}

function renderActivePreview() {
  const md = state.outputs[state.activeTab] || "";
  els.preview.value = md;
  const has = Boolean(md);
  els.copyBtn.disabled = !has;
  els.downloadBtn.disabled = !has;
  renderValidationIssues(state.validations[state.activeTab] || null, state.diagnostics);
}

async function runExtraction() {
  if (state.busy) return;
  setBusy(true);
  clearStatus();
  els.issues.innerHTML = "";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "RUN_EXTRACTION",
      enabledSkills: Array.from(state.enabledSkills),
      outputs: Array.from(state.enabledOutputs)
    });
    if (!response || !response.ok) {
      throw new Error(response?.error || "Extraction request failed.");
    }
    state.outputs = response.outputs || {};
    state.filenames = response.filenames || {};
    state.validations = response.validations || {};
    state.diagnostics = response.diagnostics || [];
    state.lastResult = response;
    renderOutputTabs();
    renderActivePreview();
    if (!els.helpPanel.hidden) renderGenerationExplanation();
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  state.busy = isBusy;
  els.refreshBtn.disabled = isBusy;
  for (const btn of els.quickInstallButtons) btn.disabled = isBusy;
  for (const input of document.querySelectorAll(".checkbox-row input")) input.disabled = isBusy;
}

function renderValidationIssues(validation, diagnostics) {
  els.issues.innerHTML = "";
  const issues = [];
  if (validation) {
    for (const e of validation.errors || []) issues.push({ kind: "error", text: e });
    for (const w of validation.warnings || []) issues.push({ kind: "warn", text: w });
  }
  for (const d of diagnostics || []) issues.push({ kind: "info", text: d });
  if (issues.length === 0) {
    els.issues.hidden = true;
    return;
  }
  els.issues.hidden = false;
  for (const issue of issues) {
    const item = document.createElement("li");
    item.textContent = issue.text;
    item.dataset.kind = issue.kind;
    els.issues.appendChild(item);
  }
}

async function copyActive() {
  const md = state.outputs[state.activeTab] || "";
  if (!md) {
    setStatus("Nothing to copy.", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(md);
    els.copyBtn.classList.add("copied");
    const copyIcon = els.copyBtn.querySelector(".icon-copy");
    const successIcon = els.copyBtn.querySelector(".icon-success");
    if (copyIcon && successIcon) {
      copyIcon.style.display = "none";
      successIcon.style.display = "block";
      setTimeout(() => {
        els.copyBtn.classList.remove("copied");
        copyIcon.style.display = "block";
        successIcon.style.display = "none";
      }, 1800);
    }
  } catch (err) {
    setStatus(`Copy failed: ${toErrorText(err)}`, true);
  }
}

async function downloadActive() {
  const md = state.outputs[state.activeTab] || "";
  if (!md) {
    setStatus("Nothing to download.", true);
    return;
  }
  const filename = state.filenames[state.activeTab] || state.activeTab.toUpperCase();
  const response = await chrome.runtime.sendMessage({
    type: "DOWNLOAD_MARKDOWN",
    filename,
    markdown: md
  });
  if (!response || !response.ok) {
    throw new Error(response?.error || "Download failed.");
  }
}

async function quickInstall(providerId) {
  const provider = QUICK_INSTALL_PROVIDERS[providerId];
  if (!provider) {
    setQuickInstallResult("Unknown provider.", true);
    return;
  }
  if (state.busy) return;
  if (Object.keys(state.outputs).length === 0) {
    setQuickInstallResult("Run extraction first.", true);
    return;
  }
  clearQuickInstallResult();
  setBusy(true);
  try {
    if (typeof window.showDirectoryPicker !== "function") {
      await fallbackQuickInstall(provider);
      return;
    }
    let rootHandle;
    try {
      rootHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    } catch (err) {
      if (isAbortError(err)) {
        setQuickInstallResult("Quick install cancelled.");
        return;
      }
      await fallbackQuickInstall(provider, err);
      return;
    }
    const written = [];
    for (const [outputId, markdown] of Object.entries(state.outputs)) {
      const filename = state.filenames[outputId] || outputId.toUpperCase();
      await writeFileToProject(rootHandle, `${provider.baseDir}/${filename}`, markdown);
      written.push(filename);
    }
    setQuickInstallResult(`Installed ${written.length} file(s) at ${provider.baseDir}/: ${written.join(", ")}`);
  } finally {
    setBusy(false);
  }
}

async function writeFileToProject(rootHandle, relativePath, content) {
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error("Invalid target path.");
  let dir = rootHandle;
  for (const segment of parts) {
    dir = await dir.getDirectoryHandle(segment, { create: true });
  }
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function fallbackQuickInstall(provider, originalError) {
  let copied = false;
  let downloaded = 0;
  try {
    const concatenated = Object.entries(state.outputs)
      .map(([id, md]) => `<!-- ${state.filenames[id] || id} -->\n${md}`)
      .join("\n\n");
    await navigator.clipboard.writeText(concatenated);
    copied = true;
  } catch (_e) { /* ignore */ }
  for (const [outputId, markdown] of Object.entries(state.outputs)) {
    try {
      const filename = state.filenames[outputId] || outputId.toUpperCase();
      const r = await chrome.runtime.sendMessage({ type: "DOWNLOAD_MARKDOWN", filename, markdown });
      if (r?.ok) downloaded++;
    } catch (_e) { /* ignore */ }
  }
  if (copied || downloaded > 0) {
    setQuickInstallResult(`${copied ? "Concatenated content copied." : ""} Downloaded ${downloaded} file(s). Move them under <project>/${provider.baseDir}/ for ${provider.label}.`);
  } else {
    const reason = originalError ? ` (${toErrorText(originalError)})` : "";
    setQuickInstallResult(`Quick install failed${reason}.`, true);
  }
}

function toggleHelp() {
  const shouldOpen = els.helpPanel.hidden;
  els.helpPanel.hidden = !shouldOpen;
  if (shouldOpen) renderGenerationExplanation();
}

function renderGenerationExplanation() {
  const result = state.lastResult;
  if (!result) {
    els.helpContent.innerHTML = `<p>Run extraction and reopen this panel for the breakdown.</p>`;
    return;
  }
  const skillRows = state.skills
    .filter((s) => state.enabledSkills.has(s.id))
    .map((s) => `<li><strong>${escape(s.label)}</strong> — outputs: ${s.outputs.map((o) => `<code>${escape(o)}</code>`).join(", ")}</li>`)
    .join("");
  const outputRows = Object.keys(state.outputs)
    .map((id) => {
      const v = state.validations[id];
      const tag = v ? (v.isValid ? " ✓" : " ⚠") : "";
      return `<li><code>${escape(state.filenames[id] || id)}</code>${tag}</li>`;
    })
    .join("");
  const diagRows = (state.diagnostics || []).slice(0, 8).map((d) => `<li>${escape(d)}</li>`).join("");
  els.helpContent.innerHTML = `
    <p>Each enabled skill emits zero or more sections into the requested output files. The orchestrator concatenates sections by sectionOrder.</p>
    <p><strong>Active skills:</strong></p>
    <ul>${skillRows || "<li>(none)</li>"}</ul>
    <p><strong>Generated files:</strong></p>
    <ul>${outputRows || "<li>(none)</li>"}</ul>
    ${diagRows ? `<p><strong>Diagnostics:</strong></p><ul>${diagRows}</ul>` : ""}
  `;
}

function setStatus(text, isError = false) {
  const value = String(text || "").trim();
  if (!value) { clearStatus(); return; }
  els.status.hidden = false;
  els.status.textContent = value;
  els.status.style.color = isError ? "#b91c1c" : "#1f1f1f";
}

function clearStatus() {
  els.status.textContent = "";
  els.status.hidden = true;
}

function setQuickInstallResult(text, isError = false) {
  const value = String(text || "").trim();
  if (!value) { clearQuickInstallResult(); return; }
  els.quickInstallResult.hidden = false;
  els.quickInstallResult.textContent = value;
  els.quickInstallResult.classList.toggle("error", Boolean(isError));
}

function clearQuickInstallResult() {
  els.quickInstallResult.hidden = true;
  els.quickInstallResult.textContent = "";
  els.quickInstallResult.classList.remove("error");
}

function isAbortError(error) {
  return error && typeof error === "object" && error.name === "AbortError";
}

function toErrorText(err) {
  if (err instanceof Error) return err.message;
  return String(err || "Unknown error");
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
