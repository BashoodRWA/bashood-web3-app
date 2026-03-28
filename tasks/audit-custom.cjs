/**
 * @task audit:custom
 * @description Validación semántica específica del protocolo Bashood.
 *   Módulo 1 — Role & Permission Audit   : roles definidos, funciones protegidas, escalada de privilegios.
 *   Módulo 2 — Presale Logic Audit       : bounds de fees, oracle, fases, caps.
 *   Módulo 3 — RWA Model Coherence       : storage gaps, invariantes financieros, modelos de depreciación.
 *   Módulo 4 — Vulnerability Patterns    : patrones de vulnerabilidad críticos (cross-contrato).
 *
 * No ejecuta ningún compilador ni subprocess. Análisis estático puro sobre fuentes .sol.
 * Genera reports/custom-audit-report.txt y reports/custom-findings.json (sidecar estructurado).
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
// Camina contratos de producción (sin mocks/tests/deprecated)
const EXCL_DIRS_M4  = new Set(["node_modules","test","tests","mocks","mock","deprecated","bak"]);
const EXCL_FILES_M4 = [/^Mock/,/^Attacker/,/^BadReceiver/,/^Libra(?:Vulnerable)?/,/^Lock\.sol/,/^NotRescue/,/\.sol\.disabled$/];

function walkProdContracts(dir, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return acc; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!EXCL_DIRS_M4.has(e.name)) walkProdContracts(full, acc);
    } else if (e.name.endsWith(".sol") && !e.name.endsWith(".disabled")) {
      if (!EXCL_FILES_M4.some(re => re.test(e.name))) acc.push(full);
    }
  }
  return acc;
}

// ── Severidad por check ID (para sidecar estructurado) ────────────────────────
const SEVERITY_MAP = {
  "R-001": "INFO",    "R-002": "HIGH",     "R-003": "HIGH",     "R-004": "HIGH",
  "R-005": "MEDIUM",  "R-006": "CRITICAL", "R-007": "CRITICAL", "R-008": "HIGH",
  "R-009": "HIGH",   "R-010": "MEDIUM",   "R-011": "HIGH",     "R-012": "MEDIUM",
  "P-001": "MEDIUM",  "P-002": "MEDIUM",   "P-003": "MEDIUM",   "P-004": "MEDIUM",
  "P-005": "LOW",     "P-006": "MEDIUM",   "P-007": "LOW",      "P-008": "CRITICAL",
  "P-009": "MEDIUM",  "P-010": "LOW",      "P-011": "LOW",      "P-012": "LOW",
  "M-001": "HIGH",   "M-002": "HIGH",     "M-003": "MEDIUM",   "M-004": "LOW",
  "M-005": "MEDIUM",  "M-006": "LOW",      "M-007": "LOW",      "M-008": "INFO",
  "M-009": "INFO",   "M-010": "INFO",     "M-011": "MEDIUM",   "M-012": "MEDIUM",
  "M-013": "LOW",    "M-014": "LOW",
  "C-001": "MEDIUM",  "C-002": "CRITICAL", "C-003": "CRITICAL", "C-004": "HIGH",
  "C-005": "MEDIUM",  "C-006": "HIGH",
};

// Descripción de impacto por check ID (los más críticos tienen descripción específica)
const IMPACT_DESC = {
  "R-006": "Un atacante con SPENDER_ROLE puede vaciar la tesoría de BHT sin restriction on-chain adicional.",
  "R-007": "Un atacante con SPENDER_ROLE puede extraer todo el ETH de la tesoría.",
  "P-008": "Reentrancy en presale permite realizar compras múltiples en una sola transacción, rompiendo los caps.",
  "C-002": "Storage slot calculado manualmente puede sobreescribir el espacio del proxy, causando pérdida total de control del contrato.",
  "C-003": "Un contrato sin protección en initialize puede ser capturado por cualquier actor antes del dueño legítimo.",
  "C-004": "Un cast a tipo más estrecho (ej: uint256→uint112) puede truncar silenciosamente valores grandes, corrompiendo balances.",
  "C-006": "keccak256(abi.encodePacked(a,b)) con tipos dinámicos permite colisión de hash: hash(\"AB\",\"C\") == hash(\"A\",\"BC\").",
  "R-009": "Sin onlyPresale en rewardReferrer, cualquier actor puede incrementar counters de referral sin realizar compra real.",
  "M-001": "Sin storage gap en V1, cualquier upgrade de V2 que añada variables de estado corromperiá el storage del proxy.",
};
const DEFAULT_IMPACT = "Riesgo identificado que puede comprometer la seguridad, corrección o conformidad del protocolo.";
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
  // Eliminamos líneas de comentario antes de buscar el patrón para evitar falsos positivos
  const modBaseSrcNoComments = (SRC.modBase || "")
    .split("\n")
    .filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l))
    .join("\n");
  checks.push(check(
    "R-011", "Módulos NO delegan grantRole al Core (M4 Pattern)",
    C.modBase,
    /grantRole\s*\(/,
    modBaseSrcNoComments,
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
// MÓDULO 4 — VULNERABILITY PATTERNS (cross-contrato)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Escanea todos los contratos de producción en busca de 6 patrones de vulnerabilidad
 * críticos: balanceOf sin validación, sload manual, initialize sin guard, casts inseguros,
 * ERC20.transfer sin check de retorno, y keccak256(encodePacked) con tipos dinámicos.
 */
function runVulnerabilityPatternAudit() {
  // Check result type: { id, name, file, status, detail, lineHint? }
  const aggregated = {}; // id -> { name, desc, files: [{rel, lines}] }

  // Definición de patrones
  const VULNPATTERNS = [
    {
      id: "C-001", name: "balanceOf usado en cálculo arítmético sin validación de fallo",
      // Detecta: <var> = something.balanceOf( seguido de operaciones aritméticas
      // Relevante para BHT (fee-on-transfer): usar balanceOf como referencia exacta es incorrecto
      regex: /\.balanceOf\s*\([^)]+\)\s*[-+*\/]|[-+*\/]\s*\.?balanceOf\s*\(/,
      desc: "Uso de balanceOf en aritmética: puede ser incorrecto con tokens fee-on-transfer (BHT burn 0.1% + fee 0.5%).",
    },
    {
      id: "C-002", name: "Cálculo manual de storage slot (assembly/sload)",
      // Detecta uso de assembly con sload/sstore o manejo manual de slots de storage
      regex: /assembly\s*\{[^}]{0,400}(?:sload|sstore|slot)/ms,
      desc: "Cálculo manual de storage slot via assembly. En contratos UUPS/proxy, un slot incorrecto puede sobreescribir el slot 0 del proxy (ERC1967) y tomar control del contrato.",
    },
    {
      id: "C-003", name: "Función initialize sin modificador initializer / onlyInitializing",
      // Detecta function initialize(...) que NO tiene modificador initializer NI onlyInitializing
      // en el mismo bloque de declaración (primeras 4 líneas tras la firma)
      regex: /function\s+initialize\s*\(/,
      negativeRegex: /function\s+initialize\s*\([^)]*\)[^{]{0,200}(?:initializer|onlyInitializing)/ms,
      desc: "Función initialize sin protección: cualquier actor puede llamarla antes que el deployer legítimo, tomando el rol de admin.",
    },
    {
      id: "C-004", name: "Cast de estrechamiento inseguro (uint256 → uint112/96/64/32/16)",
      // Detecta casts que reducen precisión silenciosamente
      regex: /uint(?:112|96|64|32|16)\s*\(|int(?:112|96|64|32|16)\s*\(/,
      desc: "Cast a tipo más estrecho puede truncar silenciosamente valores > max del tipo destino, corrompiendo balances o contadores.",
    },
    {
      id: "C-005", name: "ERC20.transfer / transferFrom sin verificación del valor de retorno",
      // Detecta .transfer( o .transferFrom( donde el resultado bool no es asignado ni verificado
      // Patrón: línea contiene .transfer( o .transferFrom( pero no bool|require|=
      regex: /(?<![A-Za-z])(?:transfer|transferFrom)\s*\(/,
      lineFilter: (line) => {
        // Excluir líneas de comentario de bloque (/** ... */ con * al inicio)
        if (/^\s*\*/.test(line)) return false;
        // Excluir declaraciones de función (no son llamadas externas)
        if (/function\s+(?:transfer|transferFrom)\s*\(/.test(line)) return false;
        // Excluir llamadas internas al hook _transfer (ERC20Upgradeable interno)
        if (/_transfer\s*\(/.test(line)) return false;
        // Excluir transferencias ETH nativas: .transfer(address(this).balance)
        if (/\.transfer\s*\(\s*address\s*\(this\)\.balance/.test(line)) return false;
        // Excluir emit de eventos Transfer
        if (/emit\s+\w*[Tt]ransfer/.test(line)) return false;
        // Excluir ya usa SafeERC20
        if (/safeTransfer|SafeERC20/.test(line)) return false;
        // Solo es problemático si el valor de retorno NO está verificado
        const hasBoolAssign = /bool\s+\w+\s*=|\w+\s*=\s*.*(?:transfer|transferFrom)|require\s*\(/.test(line);
        return !hasBoolAssign;
      },
      desc: "Tokens ERC20 no-standard (pre-EIP-20) pueden retornar false en lugar de revertir. Sin verificación del bool, la operación aparece exitosa aunque falle.",
    },
    {
      id: "C-006", name: "keccak256(abi.encodePacked) con múltiples tipos dinámicos",
      // Detecta keccak256(abi.encodePacked( con ≥2 argumentos (coma dentro del encodePacked)
      // Riesgo: hash("AB","C") == hash("A","BC") con strings/bytes
      regex: /keccak256\s*\(\s*abi\.encodePacked\s*\([^)]+,[^)]+\)/,
      lineFilter: (line) => {
        // Excluir patrones legítimos que no tienen riesgo de colisión:
        // 1. EIP-191: "\x19Ethereum Signed Message" — esquema de firma estándar, NO cambiar
        // 2. Merkle tree (bytes32, bytes32): tipos fijos sin colisión posible
        // 3. abi.encode ya aplicado (safeEncode/abi.encode)
        if (/\\x19|Ethereum Signed Message/i.test(line)) return false;
        // Detectar patrones Merkle: dos identificadores sin espacios/comas internas (bytes32 + bytes32)
        // p.ej. encodePacked(computed, p) o encodePacked(p, computed)
        if (/encodePacked\s*\(\s*\w+\s*,\s*\w+\s*\)/.test(line)) {
          // Si los dos argumentos son identificadores simples (Merkle-tree pattern) podría ser seguro
          // Solo reportar si hay strings literales u operaciones complejas
          const inner = line.match(/encodePacked\s*\(([^)]+)\)/);
          if (inner) {
            const args = inner[1].split(",").map(s => s.trim());
            // Si todos los args son identificadores simples (variable names), es patrón Merkle/bytes32
            const allSimpleIdents = args.every(a => /^\w+$/.test(a));
            if (allSimpleIdents) return false; // bytes32+bytes32 Merkle — no es vulnerable
          }
        }
        return true;
      },
      desc: "Colisión de hash: keccak256(abi.encodePacked(a,b)) puede producir el mismo hash para diferentes (a,b) cuando son tipos dinámicos. Usar abi.encode() en su lugar.",
    },
  ];

  const prodFiles = walkProdContracts(path.resolve("contracts"));

  for (const pat of VULNPATTERNS) {
    const matchedFiles = [];

    for (const file of prodFiles) {
      const rel     = path.relative(process.cwd(), file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf8");
      const lines   = content.split("\n");
      const hitLines = [];

      if (pat.id === "C-003") {
        // Caso especial: initialize SIN guard
        const hasInitialize = pat.regex.test(content);
        pat.regex.lastIndex = 0;
        if (hasInitialize) {
          const isProtected = pat.negativeRegex.test(content);
          pat.negativeRegex.lastIndex = 0;
          if (!isProtected) {
            // Encontrar la línea exacta
            for (let i = 0; i < lines.length; i++) {
              if (/function\s+initialize\s*\(/.test(lines[i])) hitLines.push(i + 1);
            }
          }
        }
      } else {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Ignorar comentarios de línea
          if (/^\s*\/\//.test(line)) continue;
          pat.regex.lastIndex = 0;
          if (pat.regex.test(line)) {
            // Aplicar lineFilter si existe
            if (pat.lineFilter && !pat.lineFilter(line)) continue;
            hitLines.push(i + 1);
          }
          pat.regex.lastIndex = 0;
        }
      }

      if (hitLines.length > 0) {
        matchedFiles.push({ rel, lines: hitLines });
      }
    }

    if (matchedFiles.length > 0) {
      aggregated[pat.id] = { pat, files: matchedFiles };
    }
  }

  // Convertir agrupados en checks individuales por patrón (un check por patrón encontrado)
  const checks = [];
  for (const patId of ["C-001","C-002","C-003","C-004","C-005","C-006"]) {
    const found = aggregated[patId];
    if (found) {
      const firstFile = found.files[0];
      const firstLine = firstFile.lines[0];
      checks.push({
        id      : patId,
        name    : found.pat.name,
        file    : `${found.files.length} contrato(s): ${found.files.map(f=>f.rel).slice(0,3).join(", ")}`,
        status  : "WARN", // Requieren revisión manual — pueden ser falsos positivos
        lineHint: firstLine,
        detail  : `${found.pat.desc} (${found.files.length} archivo(s), primera ocurrencia L${firstLine} en ${firstFile.rel})`,
        // Guardar datos extendidos para el sidecar JSON
        _vulnFiles: found.files,
      });
    }
  }

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
      { name: "MÓDULO 4 — VULNERABILITY PATTERNS",  fn: runVulnerabilityPatternAudit },
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

    // ── Sidecar JSON (findings estructurados) ───────────────────────────────────────────
    const structuredFindings = [];
    for (const c of allChecks) {
      if (c.status === "PASS") continue; // Solo reportar hallazgos con acción requerida
      const severity = SEVERITY_MAP[c.id] || "LOW";
      structuredFindings.push({
        id            : c.id,
        severity,
        category      : c.id.startsWith("R-") ? "ROLE_PERMISSION"
                      : c.id.startsWith("P-") ? "PRESALE_LOGIC"
                      : c.id.startsWith("M-") ? "RWA_COHERENCE"
                      : "VULNERABILITY_PATTERN",
        title         : c.name,
        description   : c.detail || c.name,
        impact        : IMPACT_DESC[c.id] || DEFAULT_IMPACT,
        recommendation: `Revisar check [${c.id}] en modo manual. Ver fichero: ${c.file}.`,
        status        : "UNRESOLVED",
        source        : "audit:custom",
        files         : [c.file],
        lines         : c.lineHint ? [c.lineHint] : [],
        // Para Módulo 4, incluir todos los archivos afectados
        ...(c._vulnFiles ? { files: c._vulnFiles.map(f => f.rel), lines: c._vulnFiles.flatMap(f => f.lines.slice(0,3)) } : {}),
      });
    }
    const findingsPath = path.resolve("reports/custom-findings.json");
    fs.writeFileSync(findingsPath, JSON.stringify({
      meta    : { task: "audit:custom", date: new Date().toISOString(), pass, warn, fail, score },
      findings: structuredFindings,
    }, null, 2), "utf8");

    console.log(`\n  Resultado: ${pass} PASS / ${warn} WARN / ${fail} FAIL  (score ${score}%)`);
    console.log(`  ✅  Reporte guardado: ${outputPath}\n`);

    return { success: fail === 0, outputPath, pass, warn, fail, score };
  });
