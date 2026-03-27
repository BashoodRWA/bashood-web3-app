/**
 * @task audit:coverage
 * @description Ejecuta solidity-coverage y guarda el resumen en reports/coverage-summary.txt
 *
 * Condiciones de aislamiento:
 *  - No modifica ningún contrato.
 *  - Utiliza la variable de entorno COVERAGE=true que hardhat.config.js ya honra
 *    para desactivar el optimizador (requerido por solidity-coverage).
 *  - El artefacto de cobertura (coverage/) se genera en la raíz del proyecto
 *    como hace la tarea nativa `hardhat coverage`.
 *
 * Uso directo: npx hardhat audit:coverage
 * Uso desde pipeline: npx hardhat audit:full
 */

"use strict";

const { task } = require("hardhat/config");
const path     = require("path");
const fs       = require("fs");
const { execSync } = require("child_process");

task("audit:coverage", "Genera reporte de cobertura de tests Solidity")
  .addOptionalParam("output", "Ruta del fichero de resumen", "reports/coverage-summary.txt")
  .setAction(async (taskArgs, hre) => {
    const reportsDir = path.resolve("reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const outputPath = path.resolve(taskArgs.output);
    console.log("\n══════════════════════════════════════════");
    console.log("  AUDIT:COVERAGE — Solidity Coverage");
    console.log("══════════════════════════════════════════");
    console.log(`  Output → ${outputPath}`);
    console.log("══════════════════════════════════════════\n");

    // Ejecutamos `hardhat coverage` en un subproceso.
    // COVERAGE=true ya está documentado en hardhat.config.js: desactiva el
    // optimizador para instrumentación de cobertura correcta.
    const cmd = `npx hardhat coverage`;
    const env = {
      ...process.env,
      COVERAGE: "true",
    };

    let rawOutput = "";
    let success   = false;
    try {
      rawOutput = execSync(cmd, {
        env,
        cwd: path.resolve("."),
        encoding: "utf8",
      });
      success = true;
    } catch (err) {
      rawOutput = (err.stdout || "") + (err.stderr || "");
      console.warn("\n[audit:coverage] La ejecución terminó con errores — el reporte puede estar incompleto.");
    }

    // Extraemos las líneas de resumen de cobertura (tabla del final)
    const summaryLines = rawOutput
      .split("\n")
      .filter(l => /Stmts|Branches|Funcs|Lines|File|---|All files/i.test(l));

    const summaryText = [
      `COVERAGE REPORT — ${new Date().toISOString()}`,
      "=".repeat(70),
      ...summaryLines,
      "",
      "Reporte completo: coverage/index.html",
    ].join("\n");

    fs.writeFileSync(outputPath, summaryText, "utf8");
    console.log(`\n✅  Coverage summary guardado: ${outputPath}`);

    // Imprime la tabla en consola también
    if (summaryLines.length > 0) {
      console.log("\n" + summaryLines.join("\n") + "\n");
    }

    return { success, outputPath };
  });
