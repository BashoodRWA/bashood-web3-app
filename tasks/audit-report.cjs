/**
 * @task audit:report
 * @description Agrega todos los findings del pipeline de auditoría en un único
 *   reporte profesional estructurado.  Lee los archivos de salida de las demás
 *   tareas sin modificarlos (non-intrusive).
 *
 * Inputs (opcionales, se ignoran si no existen todavía):
 *   reports/regulatory-findings.json  ← audit:regulatory
 *   reports/custom-findings.json      ← audit:custom
 *   reports/known-risks.json          ← audit:known-risks
 *   reports/slither-latest.json       ← audit:slither
 *   reports/coverage-summary.txt      ← audit:coverage
 *   reports/gas-report.txt            ← audit:gas
 *
 * Outputs:
 *   reports/audit-findings.json       — todos los findings estructurados (JSON)
 *   reports/audit-report-full.txt     — reporte profesional de texto plano
 *
 * Uso: npx hardhat audit:report
 *   Después de correr: audit:regulatory, audit:custom, audit:known-risks, audit:slither
 */

"use strict";

const { task } = require("hardhat/config");
const path = require("path");
const fs   = require("fs");

// ── Orden canónico de severidad (mayor → menor) ───────────────────────────────
const SEV_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

// Checks de Slither que califican como CRITICAL independientemente del impact
const SLITHER_CRITICAL_CHECKS = new Set([
  "reentrancy-eth",
  "reentrancy-no-eth",
  "suicidal",
  "controlled-delegatecall",
  "arbitrary-send-eth",
  "arbitrary-send-erc20",
  "unprotected-upgrade",
  "delegatecall-loop",
  "msg-value-loop",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readTextSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/** Mapea impact/confidence de Slither al severity scale del proyecto */
function slitherSeverity(impact, check) {
  const imp = (impact || "").toLowerCase();
  if (imp === "high" && SLITHER_CRITICAL_CHECKS.has(check)) return "CRITICAL";
  if (imp === "high") return "HIGH";
  if (imp === "medium") return "MEDIUM";
  if (imp === "low") return "LOW";
  return "INFO"; // informational / optimization
}

/** Extrae findings estructurados del JSON de Slither */
function parseSlitherFindings(slitherJson) {
  const detectors = slitherJson?.results?.detectors;
  if (!Array.isArray(detectors) || detectors.length === 0) return [];

  const findings = [];
  // Deduplicar por check + primer archivo
  const seen = new Set();
  let idx = 0;

  for (const d of detectors) {
    const key = `${d.check}::${(d.elements?.[0]?.source_mapping?.filename_relative || "")}`;
    if (seen.has(key)) continue;
    seen.add(key);

    idx++;
    const severity  = slitherSeverity(d.impact, d.check);
    const files     = (d.elements || [])
      .map(e => e.source_mapping?.filename_relative)
      .filter(Boolean);
    const lines     = (d.elements || [])
      .flatMap(e => e.source_mapping?.lines || [])
      .slice(0, 3);

    findings.push({
      id            : `SLI-${String(idx).padStart(3, "0")}`,
      severity,
      category      : "SLITHER",
      title         : d.check,
      description   : (d.description || "").replace(/\n/g, " ").trim().slice(0, 300),
      impact        : `Slither: impact=${d.impact}, confidence=${d.confidence}`,
      recommendation: "Revisar manualmente. Ver descripción completa en reports/slither-latest.json.",
      status        : "UNRESOLVED",
      source        : "audit:slither",
      files,
      lines,
    });
  }
  return findings;
}

/** Extrae una sección de texto de un reporte de cobertura */
function parseCoverageSummary(txt) {
  if (!txt) return null;
  // Buscar la tabla de resumen (líneas con % o "All files")
  const lines = txt.split("\n").filter(l =>
    l.includes("%") || l.includes("All files") || l.includes("Stmts") || l.includes("Branches")
  );
  return lines.slice(0, 20).join("\n").trim() || null;
}

/** Extrae el resumen del gas report */
function parseGasSummary(txt) {
  if (!txt) return null;
  const lines = txt.split("\n").filter(l => l.trim().length > 0);
  return lines.slice(0, 40).join("\n").trim() || null;
}

/** Cuenta findings por severidad */
function countBySeverity(findings) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of findings) {
    if (counts[f.severity] !== undefined) counts[f.severity]++;
  }
  return counts;
}

/** Calcula nivel de riesgo global desde counts */
function globalRisk(counts) {
  if (counts.CRITICAL > 0) return "CRITICAL";
  if (counts.HIGH >= 3 || (counts.HIGH >= 1 && counts.MEDIUM >= 3)) return "HIGH";
  if (counts.HIGH >= 1 || counts.MEDIUM >= 5) return "MEDIUM";
  return "LOW";
}

// ── Formato texto del reporte profesional ─────────────────────────────────────

const W = "═".repeat(72);
const w = "─".repeat(72);

function formatFindingBlock(f) {
  const lines = [];
  lines.push(`  [${f.severity}] ${f.id} — ${f.title}`);
  lines.push(`  Categoría : ${f.category}  |  Source: ${f.source}  |  Status: ${f.status}`);
  if (f.files?.length > 0)
    lines.push(`  Archivos  : ${f.files.slice(0, 3).join(", ")}`);
  if (f.lines?.length > 0)
    lines.push(`  Líneas    : ${f.lines.slice(0, 5).join(", ")}`);
  lines.push(`  Impacto   : ${f.impact?.slice(0, 200) || "—"}`);
  lines.push(`  Recomen.  : ${f.recommendation?.slice(0, 250) || "—"}`);
  return lines.join("\n");
}

// ── Task ──────────────────────────────────────────────────────────────────────

task("audit:report", "Agrega todos los findings del pipeline en un reporte profesional")
  .addOptionalParam("findingsOut", "JSON de findings estructurados", "reports/audit-findings.json")
  .addOptionalParam("reportOut",   "Reporte texto completo",         "reports/audit-report-full.txt")
  .setAction(async (taskArgs, hre) => {
    const reportsDir = path.resolve("reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║        AUDIT:REPORT — Reporte Consolidado          ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    // ── Leer fuentes ─────────────────────────────────────────────────────────
    const regulatoryJson = readJsonSafe(path.resolve("reports/regulatory-findings.json"));
    const customJson     = readJsonSafe(path.resolve("reports/custom-findings.json"));
    const knownRisksJson = readJsonSafe(path.resolve("reports/known-risks.json"));
    const slitherJson    = readJsonSafe(path.resolve("reports/slither-latest.json"));
    const coverageTxt    = readTextSafe(path.resolve("reports/coverage-summary.txt"));
    const gasTxt         = readTextSafe(path.resolve("reports/gas-report.txt"));

    // ── Compilar findings ─────────────────────────────────────────────────────
    const allFindings   = [];
    const knownRisks    = [];

    if (regulatoryJson?.findings) {
      allFindings.push(...regulatoryJson.findings);
      console.log(`  ✓ audit:regulatory  → ${regulatoryJson.findings.length} finding(s)`);
    } else {
      console.log("  ○ audit:regulatory  → no encontrado (ejecutar audit:regulatory primero)");
    }

    if (customJson?.findings) {
      allFindings.push(...customJson.findings);
      console.log(`  ✓ audit:custom      → ${customJson.findings.length} finding(s)`);
    } else {
      console.log("  ○ audit:custom      → no encontrado (ejecutar audit:custom primero)");
    }

    const slitherFindings = parseSlitherFindings(slitherJson);
    if (slitherFindings.length > 0) {
      allFindings.push(...slitherFindings);
      console.log(`  ✓ audit:slither     → ${slitherFindings.length} finding(s)`);
    } else if (slitherJson) {
      console.log("  ✓ audit:slither     → 0 findings (Slither limpio)");
    } else {
      console.log("  ○ audit:slither     → no encontrado (ejecutar audit:slither primero)");
    }

    if (knownRisksJson?.findings) {
      knownRisks.push(...knownRisksJson.findings);
      console.log(`  ✓ audit:known-risks → ${knownRisksJson.findings.length} riesgo(s) ACKNOWLEDGED`);
    } else {
      console.log("  ○ audit:known-risks → no encontrado (ejecutar audit:known-risks primero)");
    }

    // ── Ordenar findings por severidad, luego por ID ──────────────────────────
    allFindings.sort((a, b) => {
      const sa = SEV_ORDER.indexOf(a.severity);
      const sb = SEV_ORDER.indexOf(b.severity);
      if (sa !== sb) return sa - sb;
      return (a.id || "").localeCompare(b.id || "");
    });

    // ── Estadísticas ──────────────────────────────────────────────────────────
    const unresolvedFindings = allFindings.filter(f => f.status !== "ACKNOWLEDGED" && f.status !== "FIXED");
    const counts   = countBySeverity(unresolvedFindings);
    const risk     = globalRisk(counts);
    const totalAll = allFindings.length;
    const date     = new Date().toISOString();

    console.log(`\n  Total findings (no-acknowledged): ${unresolvedFindings.length}`);
    for (const sev of SEV_ORDER) {
      if (counts[sev] > 0) console.log(`    ${sev.padEnd(8)}: ${counts[sev]}`);
    }
    console.log(`  Riesgo Global : ${risk}`);

    // ── Escribir JSON ─────────────────────────────────────────────────────────
    const findingsPath = path.resolve(taskArgs.findingsOut);
    const findingsJson = {
      meta: {
        task         : "audit:report",
        date,
        protocol     : "Bashood",
        totalFindings: allFindings.length,
        counts,
        globalRisk   : risk,
        sources      : {
          regulatory : !!regulatoryJson,
          custom     : !!customJson,
          slither    : !!slitherJson,
          knownRisks : !!knownRisksJson,
        },
      },
      findings : allFindings,
      knownRisks,
    };
    fs.writeFileSync(findingsPath, JSON.stringify(findingsJson, null, 2), "utf8");

    // ── Generar reporte de texto profesional ──────────────────────────────────
    const lines = [];

    lines.push(W);
    lines.push("        BASHOOD PROTOCOL — SECURITY AUDIT REPORT");
    lines.push(W);
    lines.push(`  Fecha       : ${date}`);
    lines.push(`  Protocolo   : Bashood RWA Platform`);
    lines.push(`  Metodología : Análisis automatizado (estático + semántico + regulatorio)`);
    lines.push(`  Scope       : contracts/ (producción, excluye mocks/tests/deprecated)`);
    lines.push(W);
    lines.push("");

    // Executive Summary
    lines.push(W);
    lines.push("  EXECUTIVE SUMMARY");
    lines.push(W);
    lines.push(`  Total findings (sin ACKNOWLEDGED): ${unresolvedFindings.length}`);
    for (const sev of SEV_ORDER) {
      lines.push(`    ${sev.padEnd(10)}: ${counts[sev]}`);
    }
    lines.push("");
    lines.push(`  ⚡ RIESGO GLOBAL: ${risk}`);

    // Métricas de tareas
    if (regulatoryJson?.meta) {
      const m = regulatoryJson.meta;
      lines.push(`  Riesgo Regulatorio : ${m.projectRisk || "N/A"}  (score: ${m.totalScore || "N/A"})`);
    }
    if (customJson?.meta) {
      const m = customJson.meta;
      lines.push(`  Custom Score       : ${m.score || "N/A"}%  (${m.pass || 0} PASS / ${m.warn || 0} WARN / ${m.fail || 0} FAIL)`);
    }
    lines.push("");

    // Sección de Findings
    lines.push(W);
    lines.push("  FINDINGS");
    lines.push(W);
    lines.push("");

    if (unresolvedFindings.length === 0) {
      lines.push("  ✅  No se encontraron findings pendientes de resolución.");
      lines.push("");
    } else {
      for (const sev of SEV_ORDER) {
        const group = unresolvedFindings.filter(f => f.severity === sev);
        if (group.length === 0) continue;
        lines.push(w);
        lines.push(`  ${sev} (${group.length})`);
        lines.push(w);
        for (const f of group) {
          lines.push(formatFindingBlock(f));
          lines.push("");
        }
      }
    }

    // Sección Known Risks
    if (knownRisks.length > 0) {
      lines.push(W);
      lines.push("  KNOWN RISKS (ACKNOWLEDGED)");
      lines.push(W);
      lines.push("  Los siguientes riesgos han sido revisados deliberadamente.");
      lines.push("  Su presencia indica transparencia, no negligencia.");
      lines.push("");
      for (const sev of SEV_ORDER) {
        const group = knownRisks.filter(r => r.severity === sev);
        if (group.length === 0) continue;
        for (const r of group) {
          lines.push(`  [${r.severity}/ACKNOWLEDGED] ${r.id} — ${r.title}`);
          lines.push(`  ${r.description?.slice(0, 200) || "—"}`);
          lines.push(`  Recomendación: ${r.recommendation?.slice(0, 200) || "—"}`);
          lines.push("");
        }
      }
    }

    // Sección Coverage & Gas (si disponibles)
    const coverageSection = parseCoverageSummary(coverageTxt);
    const gasSection      = parseGasSummary(gasTxt);

    if (coverageSection || gasSection) {
      lines.push(W);
      lines.push("  COBERTURA & GAS");
      lines.push(W);
      if (coverageSection) {
        lines.push("  COBERTURA:");
        lines.push(coverageSection);
        lines.push("");
      }
      if (gasSection) {
        lines.push("  GAS (extracto):");
        lines.push(gasSection);
        lines.push("");
      }
    }

    // Sección Slither raw si había findings
    if (slitherFindings.length > 0) {
      lines.push(W);
      lines.push("  SLITHER — RESUMEN");
      lines.push(W);
      const slCounts = countBySeverity(slitherFindings);
      for (const sev of SEV_ORDER) {
        if (slCounts[sev] > 0)
          lines.push(`  ${sev.padEnd(10)}: ${slCounts[sev]} detector(s)`);
      }
      lines.push("  Ver reports/slither-latest.json para detalle completo.");
      lines.push("");
    }

    lines.push(W);
    lines.push("  FIN DEL REPORTE");
    lines.push(W);

    const reportText = lines.join("\n");
    const reportPath = path.resolve(taskArgs.reportOut);
    fs.writeFileSync(reportPath, reportText, "utf8");

    console.log(`\n✅  Findings JSON : ${findingsPath}`);
    console.log(`✅  Reporte texto : ${reportPath}\n`);

    return {
      success      : true,
      findingsPath,
      reportPath,
      totalFindings: allFindings.length,
      counts,
      globalRisk   : risk,
    };
  });
