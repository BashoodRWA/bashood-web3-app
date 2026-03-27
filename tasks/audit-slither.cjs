/**
 * @task audit:slither
 * @description Ejecuta Slither y genera reports/slither-latest.json + resumen en consola.
 *
 * Condiciones de aislamiento:
 *  - SOLO reporta. Nunca modifica contratos (sin --patch, sin --triage-database auto-write).
 *  - Filtra node_modules, archivos de tests, mocks y deprecated, de modo que el
 *    resumen muestre solo hallazgos en contratos de producción.
 *  - Workaround solc integrado: si foundry.toml tiene `solc = "0.8.28"` (no
 *    descargable vía internet) se fuerza 0.8.30 durante la ejecución y se revierte.
 *
 * Uso directo: npx hardhat audit:slither
 * Uso desde pipeline: npx hardhat audit:full
 */

"use strict";

const { task } = require("hardhat/config");
const path     = require("path");
const fs       = require("fs");
const { execSync } = require("child_process");

// Rutas y constantes
const SLITHER_BIN        = process.env.SLITHER_BIN || "slither";
const FOUNDRY_TOML_PATH  = path.resolve("foundry.toml");
const SOLC_28_REGEX      = /solc\s*=\s*["']?0\.8\.28["']?/;
const SOLC_30_REPLACEMENT = 'solc = "0.8.30"';

// Severidades a mostrar en el resumen de consola
const SEVERITY_ORDER = ["High", "Medium", "Low", "Informational", "Optimization"];

// Rutas de contratos de producción (excluir mocks, tests, deprecated)
const FILTER_PATHS = [
  "node_modules",
  "test",
  "tests",
  "mocks",
  "deprecated",
  "bak",
  "BAK",
  "contracts/test",
  "contracts/mocks",
  "contracts/deprecated",
  "scripts",
];

task("audit:slither", "Ejecuta Slither y genera reporte JSON de seguridad")
  .addOptionalParam("output",      "Ruta del JSON de salida",  "reports/slither-latest.json")
  .addOptionalParam("filterPaths", "Rutas a excluir (separadas por coma)", FILTER_PATHS.join(","))
  .addFlag("noAutofix", "Siempre activa — Slither no modifica contratos en este pipeline")
  .setAction(async (taskArgs, hre) => {
    const reportsDir = path.resolve("reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const outputPath  = path.resolve(taskArgs.output);
    const filterPaths = taskArgs.filterPaths;

    console.log("\n══════════════════════════════════════════");
    console.log("  AUDIT:SLITHER — Static Analysis");
    console.log("══════════════════════════════════════════");
    console.log(`  Output → ${outputPath}`);
    console.log(`  Filter → ${filterPaths}`);
    console.log("══════════════════════════════════════════\n");

    // ── Workaround solc ────────────────────────────────────────────────────────
    // foundry.toml puede tener `solc = "0.8.28"` que no es descargable desde la
    // CDN en este entorno. Slither usa el forge compiler y necesita solc 0.8.30.
    let foundryTomlOriginal = null;
    let foundryPatched      = false;

    if (fs.existsSync(FOUNDRY_TOML_PATH)) {
      foundryTomlOriginal = fs.readFileSync(FOUNDRY_TOML_PATH, "utf8");
      if (SOLC_28_REGEX.test(foundryTomlOriginal)) {
        const patched = foundryTomlOriginal.replace(SOLC_28_REGEX, SOLC_30_REPLACEMENT);
        fs.writeFileSync(FOUNDRY_TOML_PATH, patched, "utf8");
        foundryPatched = true;
        console.log("⚠️  foundry.toml: solc 0.8.28 → 0.8.30 (workaround temporal, se revertirá)\n");
      }
    }

    // ── Ejecución de Slither ───────────────────────────────────────────────────
    const cmd = [
      SLITHER_BIN,
      ".",
      "--compile-force-framework hardhat",
      `--filter-paths "${filterPaths}"`,
      "--exclude-informational",   // incluimos todo; el parser filtra
      "--json",
      `"${outputPath}"`,
    ].join(" ");

    let slitherExitCode = 0;
    try {
      execSync(cmd, {
        cwd: path.resolve("."),
        stdio: "pipe",
        encoding: "utf8",
      });
    } catch (err) {
      // Slither devuelve exit code != 0 cuando encuentra hallazgos — eso es OK.
      slitherExitCode = err.status || 1;
      if (!fs.existsSync(outputPath)) {
        // Error real de ejecución (no encontró Slither, fallo de compilación, etc.)
        console.error("\n[audit:slither] Slither no pudo completar su análisis.");
        console.error("stderr:", err.stderr || "(vacío)");
      }
    } finally {
      // ── Revertir foundry.toml ──────────────────────────────────────────────
      if (foundryPatched && foundryTomlOriginal !== null) {
        fs.writeFileSync(FOUNDRY_TOML_PATH, foundryTomlOriginal, "utf8");
        console.log("✅  foundry.toml revertido a solc 0.8.28\n");
      }
    }

    // ── Parse y resumen ───────────────────────────────────────────────────────
    if (!fs.existsSync(outputPath)) {
      console.warn("[audit:slither] No se generó el JSON de salida. Revisa el error anterior.");
      return { success: false, outputPath };
    }

    let report;
    try {
      report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    } catch {
      console.warn("[audit:slither] El JSON de salida no es válido. Revisa el fichero manualmente.");
      return { success: false, outputPath };
    }

    const results   = report?.results?.detectors || [];
    const byImpact  = {};

    for (const finding of results) {
      const impact = finding.impact || "Unknown";
      if (!byImpact[impact]) byImpact[impact] = [];
      byImpact[impact].push(finding);
    }

    console.log("═══════════════ RESULTADOS SLITHER ════════════════");
    console.log(`  Total findings: ${results.length}`);
    console.log("────────────────────────────────────────────────────");

    for (const sev of SEVERITY_ORDER) {
      const list = byImpact[sev] || [];
      if (list.length === 0) continue;
      console.log(`  ${sev.toUpperCase()} (${list.length})`);
      for (const f of list) {
        const check  = f.check  || "?";
        const desc   = (f.description || "").split("\n")[0].slice(0, 120);
        console.log(`    ▸ [${check}] ${desc}`);
      }
    }

    const prodFindings = results.filter(f => {
      const elem = f.elements || [];
      return elem.some(e => {
        const src = e?.source_mapping?.filename_relative || "";
        // Si el fichero NO está en ninguna ruta de filtro, es producción
        return !filterPaths.split(",").some(fp => src.includes(fp.trim()));
      });
    });

    console.log("────────────────────────────────────────────────────");
    console.log(`  Findings en producción: ${prodFindings.length}`);
    console.log("════════════════════════════════════════════════════");
    console.log(`\n✅  Reporte JSON guardado: ${outputPath}`);

    return { success: true, outputPath, totalFindings: results.length, prodFindings: prodFindings.length };
  });
