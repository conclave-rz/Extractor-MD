#!/usr/bin/env node
/*
 * Genera assets/icons/icon{16,32,48,128}.png a partir de
 * assets/icons/source/icon-source.png.
 *
 * No agrega dependencias npm. Detecta `sharp` si ya está instalado
 * en el sistema; si no, intenta `imagemagick` (`magick` o `convert`).
 * Si nada está disponible, imprime instrucciones manuales.
 */

import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const sourceFile = resolve(repoRoot, "assets/icons/source/icon-source.png");
const iconsDir = resolve(repoRoot, "assets/icons");
const SIZES = [16, 32, 48, 128];

if (!existsSync(sourceFile)) {
  console.error(`[icons] ERROR: el archivo fuente no existe en ${sourceFile}`);
  console.error(`[icons] coloca tu icono pixel art en esa ruta y vuelve a correr.`);
  process.exit(1);
}

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const tool = detectTool();
if (tool.kind === "sharp") {
  await renderWithSharp();
} else if (tool.kind === "imagemagick") {
  renderWithImagemagick(tool.bin);
} else {
  fallbackToCopies();
}

function detectTool() {
  try {
    const requireFn = createRequire(import.meta.url);
    requireFn.resolve("sharp");
    return { kind: "sharp" };
  } catch (_e) { /* sharp not installed, continue */ }

  for (const candidate of ["magick", "convert"]) {
    const probe = spawnSync(candidate, ["-version"], { stdio: "ignore" });
    if (probe.status === 0) return { kind: "imagemagick", bin: candidate };
  }

  return { kind: "none" };
}

async function renderWithSharp() {
  const { default: sharp } = await import("sharp");
  for (const size of SIZES) {
    const outPath = resolve(iconsDir, `icon${size}.png`);
    await sharp(sourceFile)
      .resize(size, size, { kernel: "nearest" })
      .png()
      .toFile(outPath);
    console.log(`[icons] sharp wrote ${outPath}`);
  }
}

function renderWithImagemagick(bin) {
  for (const size of SIZES) {
    const outPath = resolve(iconsDir, `icon${size}.png`);
    const args = [sourceFile, "-resize", `${size}x${size}`, "-filter", "point", outPath];
    const result = spawnSync(bin, args, { stdio: "inherit" });
    if (result.status !== 0) {
      console.error(`[icons] ${bin} failed for size ${size}`);
      process.exit(1);
    }
    console.log(`[icons] ${bin} wrote ${outPath}`);
  }
}

function fallbackToCopies() {
  console.warn("[icons] no encontré ni `sharp` ni `imagemagick`.");
  console.warn("[icons] Copio el archivo fuente como placeholder en cada tamaño.");
  console.warn("[icons] Para iconos correctos, instala una de estas opciones:");
  console.warn("  • npm i sharp        (luego vuelve a correr este script)");
  console.warn("  • brew install imagemagick");
  console.warn("[icons] o redimensiona manualmente icon-source.png a 16/32/48/128.");
  for (const size of SIZES) {
    const outPath = resolve(iconsDir, `icon${size}.png`);
    copyFileSync(sourceFile, outPath);
    console.log(`[icons] placeholder copy → ${outPath} (size: ${size}x${size} target)`);
  }
}
