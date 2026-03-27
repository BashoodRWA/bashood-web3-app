/**
 * @task audit:regulatory
 * @description Analiza contratos de producción en busca de patrones de staking,
 *   rewards, income y tokenización RWA. Clasifica cada hallazgo como LOW / MEDIUM / HIGH
 *   según el riesgo regulatorio (MiCA, FINMA, SEC Howey Test).
 *
 * Criterios de exclusión: mocks/, test/, deprecated/, .disabled, contratos de ataque.
 * No ejecuta compilación ni modifica nada. Solo analiza fuentes .sol.
 *
 * Uso: npx hardhat audit:regulatory
 */

"use strict";

const { task } = require("hardhat/config");
const path = require("path");
const fs   = require("fs");

// ── Directorios y ficheros excluidos del alcance de producción ────────────────
const EXCL_DIRS  = new Set(["node_modules", "test", "tests", "mocks", "mock", "deprecated", "bak"]);
const EXCL_FILES = [
  /^Mock/, /^Attacker/, /^BadReceiver/, /^Libra(?:Vulnerable)?\.sol/, /^Lock\.sol/,
  /^NotRescue/, /\.sol\.disabled$/, /^LibraVulnerable/,
];

// ── Catálogo de patrones regulatorios ────────────────────────────────────────
//  risk: "HIGH" | "MEDIUM" | "LOW"
//  regex: aplicado línea a línea (case-insensitive)
//  note: si el match aparece en un comentario // se registra igualmente (hallazgo documental)
const PATTERNS = [
  // ── HIGH ──────────────────────────────────────────────────────────────────
  {
    id: "REG-H-001", risk: "HIGH", category: "RWA_TOKENIZATION",
    name: "Revenue Share Strategy detectada",
    regex: /REVENUE_SHARE|revenueShare(?:Pct)?/i,
    description: "Reparto de ingresos con titulares de tokens: posible valor mobiliario bajo el Test de Howey (SEC) y ART bajo MiCA Art. 3.",
    recommendation: "Confirmar que este campo es ÚNICAMENTE metadato descriptivo (no ejecutable on-chain). Revisión de asesor jurídico de valores requerida.",
  },
  {
    id: "REG-H-002", risk: "HIGH", category: "RWA_TOKENIZATION",
    name: "Performance Bond con rendimiento prometido",
    regex: /PERFORMANCE_BOND|performanceBon(?:us)?(?:Pct)?/i,
    description: "Los bonos de rendimiento crean expectativa de beneficio característica de contratos de inversión.",
    recommendation: "Asegurarse de que el metadato no es ejecutable. Añadir disclaimer explícito en documentación técnica y legal.",
  },
  {
    id: "REG-H-003", risk: "HIGH", category: "INCOME_TOKEN",
    name: "Lenguaje de rendimiento financiero (APR / APY / yield)",
    regex: /\b(?:APR|APY|annualReturn|yieldRate|interestRate)\b/,
    description: "Terminología de rentabilidad financiera explícita activa regulación de valores y banca en la mayoría de jurisdicciones.",
    recommendation: "Reemplazar con terminología no financiera. Si el rendimiento es intencional, obtener licencia regulatoria adecuada.",
  },
  {
    id: "REG-H-004", risk: "HIGH", category: "INCOME_TOKEN",
    name: "Distribución de dividendos / ingresos on-chain",
    regex: /\b(?:dividend|distributeIncome|claimIncome|withdrawIncome|earn(?:Income|Yield))\b/i,
    description: "Mecanismos de distribución de ingresos o dividendos son indicadores directos de instrumentos de inversión/acciones.",
    recommendation: "Eliminar o reestructurar como pagos de utilidad. Consulta obligatoria con asesor de valores.",
  },

  // ── MEDIUM ──────────────────────────────────────────────────────────────
  {
    id: "REG-M-001", risk: "MEDIUM", category: "FRACTIONAL_OWNERSHIP",
    name: "Propiedad fraccionada de activo RWA",
    regex: /\bFRACTIONAL\b|isFractional\b|totalShares\b/i,
    description: "Los tokens RWA fraccionados pueden clasificarse como valores en múltiples jurisdicciones (SEC, FINMA, MiCA).",
    recommendation: "Implementar restricciones de transferencia, controles KYC/AML y calificación de inversores por jurisdicción.",
  },
  {
    id: "REG-M-002", risk: "MEDIUM", category: "RWA_TOKENIZATION",
    name: "Micro-leasing tokenizado",
    regex: /MICRO_LEASING|dailyLeaseRate|leaseRate\b/i,
    description: "El arrendamiento tokenizado puede ser regulado como producto financiero (Ley de Arrendamientos Financieros, MiCA Art. 4).",
    recommendation: "Confirmar que dailyLeaseRate es metadato. Contratos de arrendamiento deben ser instrumentos legales off-chain.",
  },
  {
    id: "REG-M-003", risk: "MEDIUM", category: "WHITELIST_OFFERING",
    name: "Oferta con whitelist restringida",
    regex: /WHITELIST_ROLE|whitelistEnabled\b/i,
    description: "Ventas con whitelist pueden constituir oferta de valores a inversores cualificados bajo Reg D / Reg S (SEC) o PRIIPS (EU).",
    recommendation: "Documentar criterios de whitelist públicamente. Verificar cumplimiento con normativa anti-discriminación.",
  },
  {
    id: "REG-M-004", risk: "MEDIUM", category: "VESTING_SCHEDULE",
    name: "Calendario de vesting (equipo / asesores)",
    regex: /VestingSchedule|cliffEnd\b|vestingEnd\b|tgeAmount\b/i,
    description: "El vesting de tokens para equipo/asesores puede requerir disclosure bajo leyes de valores (lock-up agreements).",
    recommendation: "Aplicar Test de Howey a los tokens vestidos. Documentar como entrega de utilidad, no como participación en beneficios.",
  },
  {
    id: "REG-M-005", risk: "MEDIUM", category: "FEE_REDISTRIBUTION",
    name: "Token con fee en transferencia (fee-on-transfer)",
    regex: /(?:burnRate|treasuryFee)\s*[+\-*\/=]/i,
    description: "Los tokens fee-on-transfer con redistribución al treasury/staking pueden calificarse como tokens de inversión (BaFin, ASIC).",
    recommendation: "Garantizar que los desembolsos del treasury son para costes operativos, no para retornos a inversores. Publicar informes de transparencia.",
  },
  {
    id: "REG-M-006", risk: "MEDIUM", category: "STAKING_REWARDS",
    name: "Staking / recompensas de gobernanza",
    regex: /sendToStaking\b|stakingContract\b|claimReward\b|rewardReferrer\b/i,
    description: "Los mecanismos de staking o recompensas pueden interpretarse como distribución de beneficios a titulares de tokens.",
    recommendation: "Distinguir claramente entre participación de gobernanza y retornos económicos. El staking debe ser solo para governance, no para yield.",
  },

  // ── LOW ────────────────────────────────────────────────────────────────
  {
    id: "REG-L-001", risk: "LOW", category: "TOKEN_OFFERING",
    name: "Mecanismo de presale / oferta primaria",
    regex: /presaleStart\b|presaleEnd\b|nftPrice(?:ETH|BHT)\b|maxNFTSupply\b/i,
    description: "Presale de NFT/token detectada. La clasificación regulatoria depende de la utilidad vs. intención inversora.",
    recommendation: "Mantener documentación clara de utilidad. Evitar referencias a apreciación de precio. Revisión legal del whitepaper recomendada.",
  },
  {
    id: "REG-L-002", risk: "LOW", category: "ORACLE_DEPENDENCY",
    name: "Dependencia de oracle de precio on-chain",
    regex: /AggregatorV3Interface|latestRoundData\b|priceFeed(?:Address)?\b/i,
    description: "Price feeds on-chain para cálculos financieros. La manipulación del oracle puede afectar valoraciones de activos.",
    recommendation: "Verificar que los checks de staleness están implementados. Documentar comportamiento en caso de fallo del oracle.",
  },
  {
    id: "REG-L-003", risk: "LOW", category: "TOKEN_MECHANICS",
    name: "Mecanismo de quema deflacionario",
    regex: /burnRate\b|periodicBurn\b/i,
    description: "El burn deflacionario puede interpretarse como manipulación de valor en algunas jurisdicciones.",
    recommendation: "Documentar burn como mecanismo anti-inflación de utilidad, no como mejora de valor para inversores.",
  },
  {
    id: "REG-L-004", risk: "LOW", category: "TREASURY",
    name: "Tesorería DAO gobernada con gastos controlados",
    regex: /BashoodTreasury|SPENDER_ROLE|spendBHT\b|spendETH\b/i,
    description: "Tesorería centralizada con control de gasto por gobernanza DAO.",
    recommendation: "El control por gobernanza es buena práctica. Verificar que el threshold del multisig (3-of-5) es adecuado.",
  },
  {
    id: "REG-L-005", risk: "LOW", category: "COMPLIANCE",
    name: "Registro de compliance on-chain (KYC / Merkle)",
    regex: /ComplianceRegistry|isValidProof\b|setRoot\s*\(|MerkleProof/i,
    description: "Registro de compliance on-chain detectado. Positivo para alineación regulatoria.",
    recommendation: "Verificar cumplimiento GDPR. El patrón Merkle (datos hasheados off-chain) es el enfoque correcto.",
  },
];

// Pesos para scoring
const RISK_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 };

// ── File walker ───────────────────────────────────────────────────────────────
function walkContracts(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCL_DIRS.has(entry.name)) walkContracts(full, results);
    } else if (entry.name.endsWith(".sol") && !entry.name.endsWith(".disabled")) {
      const excluded = EXCL_FILES.some(re => re.test(entry.name));
      if (!excluded) results.push(full);
    }
  }
  return results;
}

// ── Task principal ────────────────────────────────────────────────────────────
task("audit:regulatory", "Detecta riesgos regulatorios (staking, income, RWA) y clasifica LOW/MEDIUM/HIGH")
  .addOptionalParam("output", "Ruta del reporte", "reports/regulatory-report.txt")
  .setAction(async (taskArgs, hre) => {
    const reportsDir = path.resolve("reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const outputPath     = path.resolve(taskArgs.output);
    const contractsDir   = path.resolve("contracts");
    const files          = walkContracts(contractsDir);

    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║     AUDIT:REGULATORY — Análisis de Riesgo Regulatorio ║");
    console.log("╚══════════════════════════════════════════════════════╝");
    console.log(`  Contratos en alcance: ${files.length}`);
    console.log(`  Patrones: ${PATTERNS.length} (${PATTERNS.filter(p=>p.risk==="HIGH").length} HIGH, ${PATTERNS.filter(p=>p.risk==="MEDIUM").length} MEDIUM, ${PATTERNS.filter(p=>p.risk==="LOW").length} LOW)\n`);

    // ── Análisis ────────────────────────────────────────────────────────────
    // findings: [ { pattern, file, relFile, lines: [num] } ]
    const findings = [];
    const scorePerFile = {};

    for (const file of files) {
      const rel     = path.relative(process.cwd(), file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf8");
      const lines   = content.split("\n");

      for (const pat of PATTERNS) {
        const matchedLines = [];
        for (let i = 0; i < lines.length; i++) {
          if (pat.regex.test(lines[i])) matchedLines.push(i + 1);
          pat.regex.lastIndex = 0; // reset for global flags (safety)
        }
        if (matchedLines.length > 0) {
          findings.push({ pattern: pat, file, relFile: rel, lines: matchedLines });
          scorePerFile[rel] = (scorePerFile[rel] || 0) + RISK_WEIGHT[pat.risk];
        }
      }
    }

    // ── Agrupar por nivel de riesgo ─────────────────────────────────────────
    const byRisk = { HIGH: [], MEDIUM: [], LOW: [] };
    for (const f of findings) byRisk[f.pattern.risk].push(f);

    const totalScore = findings.reduce((s, f) => s + RISK_WEIGHT[f.pattern.risk], 0);
    const projectRisk = totalScore >= 15 ? "HIGH" : totalScore >= 6 ? "MEDIUM" : "LOW";

    // ── Top contratos más expuestos ─────────────────────────────────────────
    const topFiles = Object.entries(scorePerFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // ── Contexto regulatorio dinámico ───────────────────────────────────────
    const hasRevShare  = byRisk.HIGH.some(f => f.pattern.id === "REG-H-001");
    const hasPerfBond  = byRisk.HIGH.some(f => f.pattern.id === "REG-H-002");
    const hasFractional = byRisk.MEDIUM.some(f => f.pattern.id === "REG-M-001");
    const hasWhitelist  = byRisk.MEDIUM.some(f => f.pattern.id === "REG-M-003");
    const hasVesting    = byRisk.MEDIUM.some(f => f.pattern.id === "REG-M-004");

    // ── Construcción del reporte ────────────────────────────────────────────
    const lines_out = [];
    const W = "═".repeat(62);
    const w = "─".repeat(62);

    lines_out.push(`BASHOOD REGULATORY RISK REPORT`);
    lines_out.push(`Fecha     : ${new Date().toISOString()}`);
    lines_out.push(`Contratos : ${files.length} (producción, sin mocks/tests/deprecated)`);
    lines_out.push(`Patrones  : ${PATTERNS.length}`);
    lines_out.push(W);

    for (const level of ["HIGH", "MEDIUM", "LOW"]) {
      const group = byRisk[level];
      if (group.length === 0) {
        lines_out.push(`\n▶ ${level} — Sin hallazgos\n`);
        continue;
      }
      lines_out.push(`\n▶ ${level} (${group.length} hallazgo${group.length > 1 ? "s" : ""})`);
      lines_out.push(w);

      // Agrupar hallazgos por patrón
      const byPatId = {};
      for (const f of group) {
        if (!byPatId[f.pattern.id]) byPatId[f.pattern.id] = { pat: f.pattern, files: [] };
        byPatId[f.pattern.id].files.push({ rel: f.relFile, lines: f.lines });
      }

      for (const { pat, files: pFiles } of Object.values(byPatId)) {
        lines_out.push(`  [${pat.id}] ${pat.name}`);
        lines_out.push(`  Categoría   : ${pat.category}`);
        lines_out.push(`  Descripción : ${pat.description}`);
        lines_out.push(`  Recomendación: ${pat.recommendation}`);
        lines_out.push(`  Contratos afectados (${pFiles.length}):`);
        for (const pf of pFiles) {
          lines_out.push(`    ▸ ${pf.rel}  (líneas: ${pf.lines.slice(0, 5).join(", ")}${pf.lines.length > 5 ? " …" : ""})`);
        }
        lines_out.push("");
      }
    }

    lines_out.push(W);
    lines_out.push("RESUMEN DE RIESGO REGULATORIO");
    lines_out.push(W);
    lines_out.push(`  Hallazgos HIGH     : ${byRisk.HIGH.length}`);
    lines_out.push(`  Hallazgos MEDIUM   : ${byRisk.MEDIUM.length}`);
    lines_out.push(`  Hallazgos LOW      : ${byRisk.LOW.length}`);
    lines_out.push(`  Score ponderado    : ${totalScore} pts (HIGH×3, MEDIUM×2, LOW×1)`);
    lines_out.push(`  Nivel de riesgo    : *** ${projectRisk} ***`);
    lines_out.push("");
    lines_out.push("  Contratos más expuestos:");
    for (const [rel, score] of topFiles) {
      lines_out.push(`    ${String(score).padStart(3)} pts — ${rel}`);
    }

    lines_out.push("");
    lines_out.push(W);
    lines_out.push("CONTEXTO REGULATORIO (MiCA · FINMA · SEC)");
    lines_out.push(W);
    lines_out.push("  MiCA (UE, aplicable desde 30-dic-2024):");
    if (hasRevShare || hasFractional) {
      lines_out.push("    → Patrones REVENUE_SHARE + FRACTIONAL sugieren Asset-Referenced Token (ART).");
      lines_out.push("      Requiere whitepaper aprobado y autorización de autoridad competente (ESMA/CNMV).");
    } else {
      lines_out.push("    → Sin indicadores ART de alto riesgo. Clasificación probable: utility token (Título II MiCA).");
    }
    lines_out.push("  FINMA (CH):");
    if (hasRevShare || hasPerfBond) {
      lines_out.push("    → REVENUE_SHARE / PERFORMANCE_BOND: probable token DLT-Wertpapier (DLT Act). Requiere prospecto.");
    } else {
      lines_out.push("    → Sin indicadores de Securities Token bajo FINMA ICO Guidelines.");
    }
    lines_out.push("  SEC (EEUU — Test de Howey):");
    if (hasRevShare || hasPerfBond) {
      lines_out.push("    → REVENUE_SHARE / PERFORMANCE_BOND: alta probabilidad de 'investment contract' bajo Reves/Howey.");
      lines_out.push("      Requiere Reg D (accredited) o Reg S (non-US) y Form D filing si aplica.");
    } else {
      lines_out.push("    → Patrones presales + whitelist: revisar si inversores US incluidos (Reg S compliance).");
    }
    if (hasVesting) {
      lines_out.push("  Lock-up / Vesting:");
      lines_out.push("    → Divulgación de calendarios de vesting de equipo/asesores puede ser obligatoria.");
    }
    if (hasWhitelist) {
      lines_out.push("  Whitelist:");
      lines_out.push("    → Considerar implementar on-chain proof de acreditación (ComplianceRegistry.isValidProof).");
    }
    lines_out.push("");
    lines_out.push(`  CONCLUSIÓN: Revisión jurídica ${projectRisk === "HIGH" ? "OBLIGATORIA" : projectRisk === "MEDIUM" ? "RECOMENDADA" : "sugerida"} antes del despliegue en mainnet.`);
    lines_out.push(W);

    const reportText = lines_out.join("\n");
    fs.writeFileSync(outputPath, reportText, "utf8");

    // Imprimir resumen en consola
    console.log(`  HIGH   : ${byRisk.HIGH.length} hallazgos`);
    console.log(`  MEDIUM : ${byRisk.MEDIUM.length} hallazgos`);
    console.log(`  LOW    : ${byRisk.LOW.length} hallazgos`);
    console.log(`  Score  : ${totalScore} pts → Riesgo ${projectRisk}`);
    console.log(`\n✅  Reporte guardado: ${outputPath}\n`);

    return {
      success    : true,
      outputPath,
      highCount  : byRisk.HIGH.length,
      mediumCount: byRisk.MEDIUM.length,
      lowCount   : byRisk.LOW.length,
      totalScore,
      projectRisk,
    };
  });
