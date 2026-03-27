/**
 * @task audit:full
 * @description Orquestador del pipeline de auditoría completo.
 *   Ejecuta en secuencia:
 *     1. audit:gas        → reporte de gas por función
 *     2. audit:coverage   → cobertura de ramas
 *     3. audit:slither    → análisis estático de seguridad
 *     4. audit:regulatory → riesgos regulatorios (MiCA/FINMA/SEC)
 *     5. audit:custom     → roles, presale y coherencia RWA
 *   Genera un resumen consolidado en reports/audit-full-summary.txt
 *
 * Uso: npx hardhat audit:full
 *   Opciones:
 *     --skip-gas         Omite audit:gas
 *     --skip-coverage    Omite audit:coverage
 *     --skip-slither     Omite audit:slither
 *     --skip-regulatory  Omite audit:regulatory
 *     --skip-custom      Omite audit:custom
 *     --output           Ruta del resumen consolidado
 */

"use strict";

const { task } = require("hardhat/config");
const path = require("path");
const fs   = require("fs");

task("audit:full", "Pipeline completo de auditoría: gas, coverage, Slither, regulatorio y custom")
  .addFlag("skipGas",        "Omite la tarea audit:gas")
  .addFlag("skipCoverage",   "Omite la tarea audit:coverage")
  .addFlag("skipSlither",    "Omite la tarea audit:slither")
  .addFlag("skipRegulatory", "Omite la tarea audit:regulatory")
  .addFlag("skipCustom",     "Omite la tarea audit:custom")
  .addOptionalParam("output", "Ruta del resumen consolidado", "reports/audit-full-summary.txt")
  .setAction(async (taskArgs, hre) => {
    const startTime  = Date.now();
    const reportsDir = path.resolve("reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║        BASHOOD AUDIT PIPELINE — FULL         ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log(`  Inicio: ${new Date().toISOString()}`);
    console.log("  Tareas: gas, coverage, slither");
    console.log("  Reportes → reports/\n");

    const results = {
      gas:        { status: "skipped", outputPath: null },
      coverage:   { status: "skipped", outputPath: null },
      slither:    { status: "skipped", outputPath: null },
      regulatory: { status: "skipped", outputPath: null },
      custom:     { status: "skipped", outputPath: null },
    };

    // ── audit:gas ──────────────────────────────────────────────────────────────
    if (!taskArgs.skipGas) {
      console.log("▶  [1/5] audit:gas …");
      try {
        const res = await hre.run("audit:gas", { output: "reports/gas-report.txt" });
        results.gas = { status: "ok", outputPath: res?.outputPath || "reports/gas-report.txt" };
        console.log("   ✅  audit:gas completado\n");
      } catch (err) {
        results.gas = { status: "error", error: err.message };
        console.warn(`   ⚠️  audit:gas terminó con error: ${err.message}\n`);
      }
    } else {
      console.log("▷  [1/5] audit:gas  — OMITIDA (--skip-gas)\n");
    }

    // ── audit:coverage ────────────────────────────────────────────────────────
    if (!taskArgs.skipCoverage) {
      console.log("▶  [2/5] audit:coverage …");
      try {
        const res = await hre.run("audit:coverage", { output: "reports/coverage-summary.txt" });
        results.coverage = { status: "ok", outputPath: res?.outputPath || "reports/coverage-summary.txt" };
        console.log("   ✅  audit:coverage completado\n");
      } catch (err) {
        results.coverage = { status: "error", error: err.message };
        console.warn(`   ⚠️  audit:coverage terminó con error: ${err.message}\n`);
      }
    } else {
      console.log("▷  [2/5] audit:coverage — OMITIDA (--skip-coverage)\n");
    }

    // ── audit:slither ─────────────────────────────────────────────────────────
    if (!taskArgs.skipSlither) {
      console.log("▶  [3/5] audit:slither …");
      try {
        const res = await hre.run("audit:slither", { output: "reports/slither-latest.json" });
        results.slither = {
          status:       "ok",
          outputPath:   res?.outputPath || "reports/slither-latest.json",
          totalFindings: res?.totalFindings ?? "?",
          prodFindings:  res?.prodFindings  ?? "?",
        };
        console.log("   ✅  audit:slither completado\n");
      } catch (err) {
        results.slither = { status: "error", error: err.message };
        console.warn(`   ⚠️  audit:slither terminó con error: ${err.message}\n`);
      }
    } else {
      console.log("▷  [3/5] audit:slither — OMITIDA (--skip-slither)\n");
    }

    // ── audit:regulatory ─────────────────────────────────────────────────────
    if (!taskArgs.skipRegulatory) {
      console.log("▶  [4/5] audit:regulatory …");
      try {
        const res = await hre.run("audit:regulatory", { output: "reports/regulatory-report.txt" });
        results.regulatory = {
          status     : "ok",
          outputPath : res?.outputPath || "reports/regulatory-report.txt",
          projectRisk: res?.projectRisk ?? "?",
          highCount  : res?.highCount  ?? 0,
          mediumCount: res?.mediumCount ?? 0,
          lowCount   : res?.lowCount   ?? 0,
        };
        console.log("   ✅  audit:regulatory completado\n");
      } catch (err) {
        results.regulatory = { status: "error", error: err.message };
        console.warn(`   ⚠️  audit:regulatory terminó con error: ${err.message}\n`);
      }
    } else {
      console.log("▷  [4/5] audit:regulatory — OMITIDA (--skip-regulatory)\n");
    }

    // ── audit:custom ──────────────────────────────────────────────────────────
    if (!taskArgs.skipCustom) {
      console.log("▶  [5/5] audit:custom …");
      try {
        const res = await hre.run("audit:custom", { output: "reports/custom-audit-report.txt" });
        results.custom = {
          status    : "ok",
          outputPath: res?.outputPath || "reports/custom-audit-report.txt",
          score     : res?.score     ?? "?",
          pass      : res?.pass      ?? 0,
          warn      : res?.warn      ?? 0,
          fail      : res?.fail      ?? 0,
        };
        console.log("   ✅  audit:custom completado\n");
      } catch (err) {
        results.custom = { status: "error", error: err.message };
        console.warn(`   ⚠️  audit:custom terminó con error: ${err.message}\n`);
      }
    } else {
      console.log("▷  [5/5] audit:custom — OMITIDA (--skip-custom)\n");
    }

    // ── Resumen consolidado ───────────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const summaryLines = [
      `BASHOOD AUDIT PIPELINE — FULL REPORT`,
      `Fecha: ${new Date().toISOString()}`,
      `Duración: ${elapsed}s`,
      "=".repeat(60),
      "",
      `GAS        → ${results.gas.status.toUpperCase()}${results.gas.outputPath ? " — " + results.gas.outputPath : ""}`,
      `COVERAGE   → ${results.coverage.status.toUpperCase()}${results.coverage.outputPath ? " — " + results.coverage.outputPath : ""}`,
      `SLITHER    → ${results.slither.status.toUpperCase()}`,
      `REGULATORY → ${results.regulatory.status.toUpperCase()}`,
      `CUSTOM     → ${results.custom.status.toUpperCase()}`,
    ];

    if (results.slither.status === "ok") {
      summaryLines.push(`             Total findings  : ${results.slither.totalFindings}`);
      summaryLines.push(`             Findings en prod: ${results.slither.prodFindings}`);
    }
    if (results.regulatory.status === "ok") {
      summaryLines.push(`             Riesgo proyecto : ${results.regulatory.projectRisk}  (H:${results.regulatory.highCount} M:${results.regulatory.mediumCount} L:${results.regulatory.lowCount})`);
    }
    if (results.custom.status === "ok") {
      summaryLines.push(`             Compliance score: ${results.custom.score}%  (${results.custom.pass} PASS / ${results.custom.warn} WARN / ${results.custom.fail} FAIL)`);
    }

    summaryLines.push("");
    summaryLines.push("Reportes generados:");
    if (results.gas.outputPath)        summaryLines.push(`  - ${results.gas.outputPath}`);
    if (results.coverage.outputPath)   summaryLines.push(`  - ${results.coverage.outputPath}`);
    if (results.slither.outputPath)    summaryLines.push(`  - ${results.slither.outputPath}`);
    if (results.regulatory.outputPath) summaryLines.push(`  - ${results.regulatory.outputPath}`);
    if (results.custom.outputPath)     summaryLines.push(`  - ${results.custom.outputPath}`);
    summaryLines.push("  - coverage/index.html  (HTML interactivo de cobertura)");

    const summaryText = summaryLines.join("\n");
    const outputPath  = path.resolve(taskArgs.output);
    fs.writeFileSync(outputPath, summaryText, "utf8");

    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║          PIPELINE COMPLETADO                 ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log(summaryText);
    console.log(`\n📄  Resumen guardado: ${outputPath}`);

    // Si alguna subtarea falló, terminamos con error para CI
    const hasError = Object.values(results).some(r => r.status === "error");
    if (hasError) {
      throw new Error("El pipeline de auditoría terminó con errores. Revisa los detalles arriba.");
    }
  });
