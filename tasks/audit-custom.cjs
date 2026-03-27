/**
 * @task audit:custom
 * @description Validación semántica específica del protocolo Bashood.
 *   Módulo 1 — Role & Permission Audit   : roles definidos, funciones protegidas, escalada de privilegios.
 *   Módulo 2 — Presale Logic Audit       : bounds de fees, oracle, fases, caps.
 *   Módulo 3 — RWA Model Coherence       : storage gaps, invariantes financieros, modelos de depreciación.
 *
 * No ejecuta ningún compilador ni subprocess. Análisis estático puro sobre fuentes .sol.
 *
 * Uso: npx hardhat audit:custom
 */

"use strict";

const { task } = require("hardhat/config");
const path     = require("path");
const fs       = require("fs");

// ── Helpers ───────────────────────────────────────────────────────────────────
function readSol(relPath) {
  const full = path.resolve(relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

/** Devuelve la primera línea que coincide con el regex, o -1 */
function firstLine(content, regex) {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) { regex.lastIndex = 0; return i + 1; }
    regex.lastIndex = 0;
  }
  return -1;
}

/**
 * Construye un resultado de check.
 * @param {string} id          Identificador del check (ej. "R-001")
 * @param {string} name        Nombre descriptivo
 * @param {string} file        Ruta relativa del contrato inspeccionado
 * @param {RegExp|null} regex  Patrón a buscar (null = skip → WARN)
 * @param {string|null} content Contenido del fichero (null = fichero no encontrado)
 * @param {object} opts
 *   expectMatch  {boolean}  true (default) → el pattern DEBE aparecer; false → NO debe aparecer
 *   optional     {boolean}  Si el fichero no existe → WARN en vez de FAIL
 *   detail       {string}   Detalle adicional en el resultado
 *   warnOnly     {boolean}  La ausencia del patrón genera WARN, no FAIL
 */
function check(id, name, file, regex, content, opts = {}) {
  const { expectMatch = true, warnOnly = false, detail = "" } = opts;

  if (content === null) {
    return { id, name, file, status: "WARN", detail: `Fichero no encontrado: ${file}` };
  }
  if (regex === null) {
    return { id, name, file, status: "WARN", detail: detail || "Check omitido" };
  }

  const found = regex.test(content);
  regex.lastIndex = 0;
  const passed = found === expectMatch;
  const lineNum = found ? firstLine(content, regex) : -1;

  const statusIfFail = warnOnly ? "WARN" : "FAIL";

  return {
    id,
    name,
    file,
    status   : passed ? "PASS" : statusIfFail,
    lineHint : lineNum > 0 ? lineNum : undefined,
    detail   : passed
      ? (detail || (found ? `Pattern encontrado (L${lineNum})` : "Ausencia confirmada"))
      : (detail || (expectMatch ? "Pattern esperado NO encontrado" : "Pattern prohibido encontrado")),
  };
}

// ── CONTRACT PATHS ────────────────────────────────────────────────────────────
const C = {
  presale    : "contracts/BashoodPresaleFinal.sol",
  token      : "contracts/BashoodToken.sol",
  referral   : "contracts/BashoodReferral.sol",
  rwaV1      : "contracts/standards/BashoodRWAReference.sol",
  rwaV2      : "contracts/standards/BashoodRWAReferenceV2.sol",
  iRwa       : "contracts/standards/IBashoodRWA.sol",
  depr       : "contracts/utils/DepreciationEngine.sol",
  treasury   : "contracts/treasury/BashoodTreasury.sol",
  timelock   : "contracts/governance/BashoodTimelock.sol",
  governor   : "contracts/governance/BashoodGovernor.sol",
  vesting    : "contracts/governance/BashoodVesting.sol",
  bhtVotes   : "contracts/governance/BHTVotes.sol",
  compliance : "contracts/ComplianceRegistry.sol",
  modBase    : "contracts/modules/BashoodModuleBase.sol",
  certMod    : "contracts/modules/CertificationModule.sol",
  oracleMod  : "contracts/modules/OracleValuationModule.sol",
};

// Carga de contenidos
const SRC = {};
for (const [k, v] of Object.entries(C)) SRC[k] = readSol(v);

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 1 — ROLE & PERMISSION AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

function runRoleAudit() {
  const checks = [];

  // 1. Roles definidos con keccak256 en cada contrato
  const roleDefs = {};
  for (const [key, src] of Object.entries(SRC)) {
    if (!src) continue;
    const matches = [...src.matchAll(/bytes32\s+(?:public\s+)?(?:constant\s+)?(\w+_ROLE)\s*=/g)];
    for (const m of matches) roleDefs[m[1]] = (roleDefs[m[1]] || []).concat(C[key]);
  }

  checks.push({
    id: "R-001", name: "Roles definidos en el sistema",
    file: "(todos los contratos)",
    status: Object.keys(roleDefs).length >= 5 ? "PASS" : "WARN",
    detail: `${Object.keys(roleDefs).length} roles encontrados: ${Object.keys(roleDefs).join(", ")}`,
  });

  // 2. UPGRADER_ROLE protege _authorizeUpgrade
  checks.push(check(
    "R-002", "UPGRADER_ROLE protege _authorizeUpgrade (RWA V1)",
    C.rwaV1,
    /_authorizeUpgrade[\s\S]{0,120}(?:UPGRADER_ROLE|onlyRole)/m,
    SRC.rwaV1,
    { detail: "Función de upgrade UUPS debe requerir UPGRADER_ROLE" }
  ));

  // V2 hereda _authorizeUpgrade de V1 (correcto). Verificamos que NO la redefine
  // sin UPGRADER_ROLE (lo cual sería un bypass). Si no la redefine → OK (PASS).
  {
    const v2src = SRC.rwaV2;
    if (v2src !== null) {
      const redefines = /_authorizeUpgrade/.test(v2src);
      // Si la redefine, debe tener UPGRADER_ROLE
      const safe = !redefines || /_authorizeUpgrade[\s\S]{0,200}(?:UPGRADER_ROLE|onlyRole)/m.test(v2src);
      checks.push({
        id: "R-003", name: "UPGRADER_ROLE protege _authorizeUpgrade (RWA V2)",
        file: C.rwaV2,
        status: safe ? "PASS" : "FAIL",
        detail: redefines
          ? "V2 redefine _authorizeUpgrade — verificar que tiene UPGRADER_ROLE"
          : "V2 hereda _authorizeUpgrade de V1 (con UPGRADER_ROLE) — correcto",
      });
    } else {
      checks.push({ id: "R-003", name: "UPGRADER_ROLE protege _authorizeUpgrade (RWA V2)", file: C.rwaV2, status: "WARN", detail: "Fichero no encontrado" });
    }
  }

  // 3. ASSET_MANAGER_ROLE protege mintAsset (función multi-línea → ventana amplia)
  checks.push(check(
    "R-004", "ASSET_MANAGER_ROLE protege mintAsset (RWA V1)",
    C.rwaV1,
    /mintAsset[\s\S]{0,500}(?:ASSET_MANAGER_ROLE|onlyRole)/m,
    SRC.rwaV1
  ));

  // 4. ORACLE_ROLE protege updateUsageMetrics / updateCertificationStatus
  checks.push(check(
    "R-005", "ORACLE_ROLE protege actualizaciones de telemetría (RWA V1)",
    C.rwaV1,
    /ORACLE_ROLE[\s\S]{0,300}(?:updateUsageMetrics|updateCertificationStatus)|(?:updateUsageMetrics|updateCertificationStatus)[\s\S]{0,300}ORACLE_ROLE/m,
    SRC.rwaV1
  ));

  // 5. SPENDER_ROLE protege spendBHT y spendETH en Treasury
  checks.push(check(
    "R-006", "SPENDER_ROLE protege spendBHT en Treasury",
    C.treasury,
    /function\s+spendBHT[\s\S]{0,150}(?:SPENDER_ROLE|onlyRole)/m,
    SRC.treasury
  ));
  checks.push(check(
    "R-007", "SPENDER_ROLE protege spendETH en Treasury",
    C.treasury,
    /function\s+spendETH[\s\S]{0,150}(?:SPENDER_ROLE|onlyRole)/m,
    SRC.treasury
  ));

  // 6. DEFAULT_ADMIN_ROLE del Timelock asignado a address(0) (descentralización total)
  checks.push(check(
    "R-008", "DEFAULT_ADMIN_ROLE del Timelock = address(0) (DAO fully decentralized)",
    C.timelock,
    /DEFAULT_ADMIN_ROLE[\s\S]{0,300}address\(0\)|address\(0\)[\s\S]{0,300}DEFAULT_ADMIN_ROLE/m,
    SRC.timelock,
    { warnOnly: true, detail: "Si DEFAULT_ADMIN_ROLE ≠ address(0), el Timelock no es completamente descentralizado" }
  ));

  // 7. onlyPresale en BashoodReferral (Sybil-resistance)
  checks.push(check(
    "R-009", "rewardReferrer protegida por onlyPresale (anti-Sybil)",
    C.referral,
    /rewardReferrer[\s\S]{0,200}onlyPresale|onlyPresale[\s\S]{1,50}rewardReferrer/m,
    SRC.referral
  ));

  // 8. BashoodToken: lockParameters bloquea setBurnRate, setTreasuryFee
  checks.push(check(
    "R-010", "parametersLocked bloquea setBurnRate post-presale",
    C.token,
    /(?:setBurnRate|setTreasuryFee)[\s\S]{0,200}parametersLocked|parametersLocked[\s\S]{0,200}(?:setBurnRate|setTreasuryFee)/m,
    SRC.token
  ));

  // 9. Módulo base: módulos NO pueden llamar grantRole en el Core
  checks.push(check(
    "R-011", "Módulos NO delegan grantRole al Core (M4 Pattern)",
    C.modBase,
    /grantRole\s*\(/,
    SRC.modBase,
    { expectMatch: false, warnOnly: true, detail: "Si existe una llamada a grantRole en BashoodModuleBase, viola el patrón M4" }
  ));

  // 10. ComplianceRegistry: setRoot protegido por onlyOwner
  checks.push(check(
    "R-012", "setRoot protegido por onlyOwner en ComplianceRegistry",
    C.compliance,
    /function\s+setRoot[\s\S]{0,100}onlyOwner/m,
    SRC.compliance
  ));

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 2 — PRESALE LOGIC AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

function runPresaleAudit() {
  const checks = [];
  const src    = SRC.presale;

  // 1. burnBps tiene cap máximo (1500 = 15%)
  checks.push(check(
    "P-001", "burnBps hard cap ≤1500 (15%) verificado en setter",
    C.presale,
    /(?:setBurnBps|setBurnRate)[\s\S]{0,400}(?:1500|_MAX_BPS_BURN)|(?:1500|_MAX_BPS_BURN)[\s\S]{0,400}(?:setBurnBps|setBurnRate)/m,
    src
  ));

  // 2. discountBps tiene cap máximo (2000 = 20%)
  checks.push(check(
    "P-002", "discountBps hard cap ≤2000 (20%) verificado en setter",
    C.presale,
    /(?:setDiscountBps|setBhtDiscountBps)[\s\S]{0,400}(?:2000|_MAX_BPS_DISCOUNT)|(?:2000|_MAX_BPS_DISCOUNT)[\s\S]{0,400}(?:setDiscountBps|setBhtDiscountBps)/m,
    src
  ));

  // 3. Oracle: AggregatorV3Interface importado y usado
  checks.push(check(
    "P-003", "Oracle Chainlink (AggregatorV3Interface) referenciado en presale",
    C.presale,
    /AggregatorV3Interface/,
    src
  ));

  // 4. Staleness check del oracle
  checks.push(check(
    "P-004", "Staleness del oracle verificado en presale",
    C.presale,
    /(?:staleness|_maxPriceStaleness|staleThreshold|updatedAt)/i,
    src
  ));

  // 5. Per-user cap implementado
  checks.push(check(
    "P-005", "Cap por usuario (maxPerUser / userPurchases) implementado",
    C.presale,
    /(?:maxPerUser|userPurchases)/i,
    src
  ));

  // 6. Total supply cap implementado (totalNFTsSold vs maxNFTSupply)
  checks.push(check(
    "P-006", "Total supply cap (totalNFTsSold ≤ maxNFTSupply) implementado",
    C.presale,
    /totalNFTsSold[\s\S]{0,200}maxNFTSupply|maxNFTSupply[\s\S]{0,200}totalNFTsSold/m,
    src
  ));

  // 7. Whitelist check coherente (whitelistEnabled + WHITELIST_ROLE)
  checks.push(check(
    "P-007", "Coherencia whitelist: whitelistEnabled + WHITELIST_ROLE presentes",
    C.presale,
    /whitelistEnabled[\s\S]{0,400}WHITELIST_ROLE|WHITELIST_ROLE[\s\S]{0,400}whitelistEnabled/ms,
    src
  ));

  // 8. Reentrancy guard en presale
  checks.push(check(
    "P-008", "ReentrancyGuard / nonReentrant protege funciones de pago",
    C.presale,
    /(?:nonReentrant|ReentrancyGuard)/,
    src
  ));

  // 9. Pago en BHT: slippage/precio mínimo para evitar front-run
  checks.push(check(
    "P-009", "Protección frente a front-running en precio BHT",
    C.presale,
    /(?:slippage|maxPrice|minAmount|deadline|maxBht|minBht|tolerance)/i,
    src,
    { warnOnly: true, detail: "Si no hay slippage tolerance, un attacker puede manipular el precio BHT antes de la tx" }
  ));

  // 10. Eventos emitidos en eventos de compra (trazabilidad)
  checks.push(check(
    "P-010", "Evento de compra (AssetPurchased / NFTPurchased) emitido",
    C.presale,
    /emit\s+(?:AssetPurchased|NFTPurchased|Purchased|ServicePaid|BHTBurned)/,
    src
  ));

  // 11. BashoodReferral: límite mínimo de referrals antes de reward
  checks.push(check(
    "P-011", "Threshold de referrals (REQUIRED_REFERRALS) definido en contrato",
    C.referral,
    /REQUIRED_REFERRALS/,
    SRC.referral
  ));

  // 12. Vesting presale: TGE + lineal documentado
  checks.push(check(
    "P-012", "Presale vesting: tgePercent / tgeAmount / vestingMonths en BashoodVesting",
    C.vesting,
    /tgePercent|tgeAmount|vestingMonths/i,
    SRC.vesting
  ));

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 3 — RWA MODEL COHERENCE
// ═══════════════════════════════════════════════════════════════════════════════

function runRwaAudit() {
  const checks = [];

  // 1. Storage gap V1: 47 slots (acepta private o internal — ambos son válidos en OZ pattern)
  checks.push(check(
    "M-001", "V1 storage gap 47 slots para upgrade seguro",
    C.rwaV1,
    /uint256\s*\[\s*47\s*\]\s*(?:private|internal)\s+__gap/,
    SRC.rwaV1,
    { detail: "El gap garantiza que V2 puede agregar variables sin colisión de storage" }
  ));

  // 2. Storage gap V2: 49 slots (para V3+)
  checks.push(check(
    "M-002", "V2 storage gap 49 slots para upgrades futuros",
    C.rwaV2,
    /uint256\s*\[\s*49\s*\]\s*private\s+__gapV2/,
    SRC.rwaV2
  ));

  // 3. purchasePrice validado > 0 en mintAsset
  checks.push(check(
    "M-003", "purchasePrice > 0 validado en mintAsset",
    C.rwaV1,
    /purchasePrice[\s\S]{0,200}(?:>|require)[\s\S]{0,100}0|require[\s\S]{0,200}purchasePrice/m,
    SRC.rwaV1,
    { warnOnly: true, detail: "Un purchasePrice = 0 haría que la depreciación no tenga sentido económico" }
  ));

  // 4. residualValuePct tiene bounds (10–25%)
  checks.push(check(
    "M-004", "residualValuePct acotado (min 10%, max 25%)",
    C.rwaV1,
    /residualValuePct[\s\S]{0,400}(?:10|25)|(?:MIN_RESIDUAL|MAX_RESIDUAL)/m,
    SRC.rwaV1,
    { warnOnly: true, detail: "Valor residual debe ser ≥10% (plataformas) y ≤25% según modelos de industria" }
  ));

  // 5. Depreciación máxima cap en 10_000 bps (100%) — no puede exceder el valor del activo
  checks.push(check(
    "M-005", "DepreciationEngine: cap a 10_000 bps (100% depreciación máxima)",
    C.depr,
    /10[_,]?000/,
    SRC.depr
  ));

  // 6. Todos los modelos de depreciación implementados (6 modelos según IBashoodRWA)
  checks.push(check(
    "M-006", "6 modelos de depreciación implementados en DepreciationEngine",
    C.depr,
    /loadBased[\s\S]{0,2000}extrusionBased[\s\S]{0,2000}setupBased[\s\S]{0,2000}(?:efficiencyBased|linearTimeBased)/ms,
    SRC.depr
  ));

  // 7. Metadato hash (keccak256 canonicalizado) en V2
  checks.push(check(
    "M-007", "V2: hash de metadatos (keccak256) para integridad IPFS",
    C.rwaV2,
    /keccak256[\s\S]{0,300}metadata|metadata[\s\S]{0,300}keccak256/i,
    SRC.rwaV2
  ));

  // 8. Función version() en V2 para identificación de proxy
  checks.push(check(
    "M-008", "V2: función version() presente para identificación de contrato",
    C.rwaV2,
    /function\s+version\s*\(\s*\)/,
    SRC.rwaV2
  ));

  // 9. Enum DepreciationModel con todos los tipos
  checks.push(check(
    "M-009", "Enum DepreciationModel con ≥5 variantes definido en interfaz",
    C.iRwa,
    /enum\s+DepreciationModel[\s\S]{0,400}(?:LOAD_BASED|TIME_BASED|LINEAR)/m,
    SRC.iRwa
  ));

  // 10. Enum TokenizationStrategy presente en interfaz
  checks.push(check(
    "M-010", "Enum TokenizationStrategy definido en IBashoodRWA",
    C.iRwa,
    /enum\s+TokenizationStrategy/,
    SRC.iRwa
  ));

  // 11. OracleValuationModule: staleness check al pushear valuación
  checks.push(check(
    "M-011", "OracleValuationModule: staleness threshold verificado",
    C.oracleMod,
    /stalen(?:ess)?(?:Threshold|Check)|setStalenessThreshold/i,
    SRC.oracleMod
  ));

  // 12. OracleValuationModule: price > 0 verificado
  checks.push(check(
    "M-012", "OracleValuationModule: precio oracle validado > 0",
    C.oracleMod,
    /price\s*(?:>|<=)\s*0|answer\s*(?:>|<=)\s*0|require[\s\S]{0,100}(?:price|answer)[\s\S]{0,50}0/m,
    SRC.oracleMod,
    { warnOnly: true }
  ));

  // 13. annualMaintenancePct acotado (bps 200-300 = 2-3%)
  checks.push(check(
    "M-013", "annualMaintenancePct en rango 2–3% (200–300 bps)",
    C.rwaV1,
    /annualMaintenancePct[\s\S]{0,400}(?:200|300)|(?:MIN_MAINT|MAX_MAINT)/m,
    SRC.rwaV1,
    { warnOnly: true, detail: "2-3% es el rango estándar de mantenimiento para maquinaria industrial" }
  ));

  // 14. CertificationModule: expiryDate = 0 significa sin vencimiento (documentado)
  checks.push(check(
    "M-014", "CertificationModule: expiryDate = 0 tratado como 'sin vencimiento'",
    C.certMod,
    /expiry(?:Date)?\s*==\s*0|0\s*==\s*expiry(?:Date)?/i,
    SRC.certMod
  ));

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

task("audit:custom", "Valida roles/permisos, lógica de presale y coherencia del modelo RWA")
  .addOptionalParam("output", "Ruta del reporte", "reports/custom-audit-report.txt")
  .setAction(async (taskArgs, hre) => {
    const reportsDir = path.resolve("reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const outputPath = path.resolve(taskArgs.output);

    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║     AUDIT:CUSTOM — Validación Semántica Bashood    ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    const modules = [
      { name: "MÓDULO 1 — ROLE & PERMISSION AUDIT", fn: runRoleAudit },
      { name: "MÓDULO 2 — PRESALE LOGIC AUDIT",     fn: runPresaleAudit },
      { name: "MÓDULO 3 — RWA MODEL COHERENCE",     fn: runRwaAudit },
    ];

    const allChecks  = [];
    const W = "═".repeat(60);
    const w = "─".repeat(60);
    const lines_out  = [];

    lines_out.push("BASHOOD CUSTOM AUDIT REPORT");
    lines_out.push(`Fecha: ${new Date().toISOString()}`);
    lines_out.push(W);

    for (const mod of modules) {
      console.log(`  ▶ ${mod.name} …`);
      const results = mod.fn();
      allChecks.push(...results);

      lines_out.push("");
      lines_out.push(mod.name);
      lines_out.push(w);

      for (const r of results) {
        const icon = r.status === "PASS" ? "✓" : r.status === "WARN" ? "▲" : "✗";
        const line = `  [${r.status}] ${r.id.padEnd(6)}  ${r.name}`;
        lines_out.push(line);
        if (r.status !== "PASS" || r.lineHint) {
          const detail = r.detail ? `          → ${r.detail}` : "";
          const lineRef = r.lineHint ? `  (L${r.lineHint})` : "";
          if (detail || lineRef) lines_out.push(`${detail}${lineRef}`);
          lines_out.push(`          Fichero: ${r.file}`);
        }
        // Consola: solo fallos y warns
        if (r.status !== "PASS") {
          console.log(`    ${icon} [${r.id}] ${r.name} → ${r.status}`);
          if (r.detail) console.log(`      ${r.detail}`);
        }
      }
    }

    // ── Resumen ──────────────────────────────────────────────────────────────
    const pass = allChecks.filter(c => c.status === "PASS").length;
    const warn = allChecks.filter(c => c.status === "WARN").length;
    const fail = allChecks.filter(c => c.status === "FAIL").length;
    const total = allChecks.length;
    const score = total > 0 ? Math.round((pass / total) * 100) : 0;

    const failItems = allChecks.filter(c => c.status === "FAIL");
    const warnItems = allChecks.filter(c => c.status === "WARN");

    lines_out.push("");
    lines_out.push(W);
    lines_out.push("RESUMEN DE COMPLIANCE");
    lines_out.push(W);
    lines_out.push(`  Total checks  : ${total}`);
    lines_out.push(`  PASS          : ${pass}  (${score}%)`);
    lines_out.push(`  WARN          : ${warn}`);
    lines_out.push(`  FAIL          : ${fail}`);
    lines_out.push(`  Score         : ${score}%`);
    lines_out.push("");

    if (failItems.length > 0) {
      lines_out.push("  ACCIONES REQUERIDAS (FAIL):");
      for (const c of failItems) {
        lines_out.push(`    ▸ [${c.id}] ${c.name}`);
        if (c.detail) lines_out.push(`      ${c.detail}`);
        lines_out.push(`      Fichero: ${c.file}`);
      }
      lines_out.push("");
    }

    if (warnItems.length > 0) {
      lines_out.push("  REVISIÓN RECOMENDADA (WARN):");
      for (const c of warnItems) {
        lines_out.push(`    ▸ [${c.id}] ${c.name}`);
        if (c.detail) lines_out.push(`      ${c.detail}`);
      }
    }

    lines_out.push(W);

    const reportText = lines_out.join("\n");
    fs.writeFileSync(outputPath, reportText, "utf8");

    console.log(`\n  Resultado: ${pass} PASS / ${warn} WARN / ${fail} FAIL  (score ${score}%)`);
    console.log(`  ✅  Reporte guardado: ${outputPath}\n`);

    return { success: fail === 0, outputPath, pass, warn, fail, score };
  });
