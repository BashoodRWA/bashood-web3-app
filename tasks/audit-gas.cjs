/**
 * @task audit:gas
 * @description Ejecuta el suite de tests con hardhat-gas-reporter habilitado
 *              y guarda el reporte en reports/gas-report.txt
 *
 * Condiciones de aislamiento:
 *  - No modifica ningún contrato.
 *  - Solo activa la variable de entorno REPORT_GAS que ya lee hardhat.config.js.
 *  - El reporte es un artefacto de salida; no afecta bytecode ni deploy.
 *
 * Uso directo: npx hardhat audit:gas
 * Uso desde pipeline: npx hardhat audit:full
 */

"use strict";

const { task } = require("hardhat/config");
const path    = require("path");
const fs      = require("fs");
const { execSync } = require("child_process");

task("audit:gas", "Genera reporte de gas para contratos de producción")
  .addOptionalParam("output", "Ruta del fichero de salida", "reports/gas-report.txt")
  .setAction(async (taskArgs, hre) => {
    const reportsDir = path.resolve("reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const outputPath = path.resolve(taskArgs.output);
    console.log("\n══════════════════════════════════════════");
    console.log("  AUDIT:GAS — Hardhat Gas Reporter");
    console.log("══════════════════════════════════════════");
    console.log(`  Output → ${outputPath}`);
    console.log("══════════════════════════════════════════\n");

    // Invocamos hardhat test en un subproceso con REPORT_GAS=true
    // para no mutar el proceso actual (que tiene hre ya inicializado).
    const cmd = `npx hardhat test --network hardhat`;
    const env = {
      ...process.env,
      REPORT_GAS: "true",
      GAS_REPORTER_OUTPUT_FILE: outputPath,
      GAS_REPORTER_NO_COLORS: "true",
    };

    let success = false;
    try {
      execSync(cmd, {
        env,
        stdio: "inherit",
        cwd: path.resolve("."),
      });
      success = true;
    } catch (err) {
      console.warn("\n[audit:gas] Tests terminaron con errores — el reporte puede estar incompleto.");
    }

    if (fs.existsSync(outputPath)) {
      const stat = fs.statSync(outputPath);
      console.log(`\n✅  Gas report guardado: ${outputPath} (${stat.size} bytes)`);
    } else {
      console.log(`\n⚠️  Gas report no encontrado en ${outputPath}`);
      console.log("   Verifica que GAS_REPORTER_OUTPUT_FILE está soportado en tu versión de hardhat-gas-reporter,");
      console.log("   o revisa reports/gas-report.txt manualmente después del test.");
    }

    return { success, outputPath };
  });
