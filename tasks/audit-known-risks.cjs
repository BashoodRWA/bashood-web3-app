/**
 * @task audit:known-risks
 * @description Documenta y publica los riesgos conocidos y aceptados del protocolo Bashood.
 *   Genera reports/known-risks.json con findings en estado ACKNOWLEDGED.
 *
 *   Estos riesgos son inherentes a la arquitectura del protocolo y han sido revisados
 *   deliberadamente. Su presencia no indica negligencia, sino transparencia.
 *
 * Uso: npx hardhat audit:known-risks
 */

"use strict";

const { task } = require("hardhat/config");
const path = require("path");
const fs   = require("fs");

// ── Catálogo de riesgos conocidos del protocolo Bashood ───────────────────────
const KNOWN_RISKS = [
  {
    id         : "KR-001",
    severity   : "HIGH",
    category   : "ARCHITECTURE",
    title      : "Vinculación con activos físicos off-chain no verificable on-chain",
    description: "La existencia e integridad del activo físico (maquinaria industrial, inmueble) solo puede verificarse off-chain. El smart contract tokeniza datos del activo pero no puede constatar que el bien representado sigue existiendo, está operativo o tiene el valor declarado.",
    impact     : "Un activo tokenizado puede representar un bien dañado, perdido o inexistente. Los holders del NFT RWA no tienen garantía on-chain del respaldo físico. En caso de fraude del emisor, no hay mecanismo de recuperación on-chain.",
    recommendation: "Implementar sistema de informes periódicos firmados digitalmente por el emisor y un tercero verificador (auditor físico acreditado). Considerar tokenId-bound insurance data verificable on-chain via oracle. Publicar certificaciones de activo vinculadas al metadataHash.",
    status     : "ACKNOWLEDGED",
    tags       : ["RWA", "off-chain", "architecture", "physical-asset"],
  },
  {
    id         : "KR-002",
    severity   : "HIGH",
    category   : "REGULATORY",
    title      : "TokenizationStrategy REVENUE_SHARE / PERFORMANCE_BOND son metadatos no ejecutados on-chain — riesgo regulatorio latente",
    description: "El enum TokenizationStrategy incluye REVENUE_SHARE y PERFORMANCE_BOND. Actualmente son únicamente metadatos descriptivos — no existe lógica on-chain de distribución de ingresos. La ejecución de beneficios ocurre off-chain, bajo responsabilidad del emisor.",
    impact     : "Si el protocolo implementa distribución on-chain en el futuro, los contratos podrían clasificarse como valores mobiliarios (security tokens) bajo SEC/MiCA sin la estructura legal adecuada previamente aprobada. El riesgo regulatorio existe ahora por la presencia del enum, aunque no esté ejecutado.",
    recommendation: "Mantener disclaimer explícito en whitepaper, NatSpec y toda comunicación pública. No implementar distribución on-chain sin revisión jurídica previa completa (SEC Howey + MiCA Art. 3 + FINMA). Considerar eliminar REVENUE_SHARE/PERFORMANCE_BOND del enum público si no van a implementarse en el corto plazo.",
    status     : "ACKNOWLEDGED",
    tags       : ["regulatory", "MiCA", "SEC-Howey", "FINMA", "RWA", "security-token"],
  },
  {
    id         : "KR-003",
    severity   : "MEDIUM",
    category   : "TOKEN_MECHANICS",
    title      : "BHT es fee-on-transfer (0.1% burn + 0.5% treasury en cada transfer)",
    description: "BashoodToken implementa fee-on-transfer automático en cada transfer/transferFrom. El amount recibido por el destinatario es siempre menor que el amount enviado (net 0.4% de retención después del burn). Este comportamiento es no estándar ERC20.",
    impact     : "Integraciones externas (DEX, lending protocols, bridges) que asuman comportamiento ERC20 estándar tendrán invariantes rotas. Puede generar fondos atascados, precios incorrectos en AMMs o vulnerabilidades en protocolos que calculen amounts exactos.",
    recommendation: "Documentar prominentemente el comportamiento fee-on-transfer en README, interfaces e integraciones. Implementar IBashoodFeeToken interface para detección programática. Revisar cada integración futura contra este comportamiento antes del deployment.",
    status     : "ACKNOWLEDGED",
    tags       : ["ERC20", "fee-on-transfer", "integration-risk", "BHT"],
  },
  {
    id         : "KR-004",
    severity   : "MEDIUM",
    category   : "ORACLE_DEPENDENCY",
    title      : "Single point of failure: Chainlink price feeds para valuaciones y presale",
    description: "Las valuaciones on-chain de activos RWA (OracleValuationModule) y el precio de presale en ETH (BashoodPresaleFinal) dependen exclusivamente de Chainlink feeds. Si el feed se vuelve stale, se deprecia o es manipulado, las valuaciones quedan congeladas o incorrectas.",
    impact     : "Durante una interrupción del feed: (1) presale no puede calcular precio en ETH — compras bloqueadas; (2) OracleValuationModule no puede actualizar valores de activos — portfolio valuations freeze. En el caso extremo de manipulación del feed, un atacante podría obtener NFTs por un precio artificialmente bajo.",
    recommendation: "Implementar fallback oracle secundario (Redstone, API3, Pyth) con lógica de selección por confianza. Añadir circuit breaker que congele compras si el feed está stale > threshold configurable. El staleness check ya existe (setMaxPriceStaleness) — verificar que el umbral es apropiado en producción.",
    status     : "ACKNOWLEDGED",
    tags       : ["oracle", "Chainlink", "availability", "price-manipulation"],
  },
  {
    id         : "KR-005",
    severity   : "MEDIUM",
    category   : "GOVERNANCE",
    title      : "EXECUTOR_ROLE = address(0) permite ejecución anónima de governance actions",
    description: "En BashoodTimelock, EXECUTOR_ROLE es address(0), lo que significa que cualquier dirección puede ejecutar una propuesta aprobada tras el delay de 48h. No hay restricción sobre quién ejecuta — solo sobre el timing.",
    impact     : "Un actor adversarial puede ejecutar operaciones de gobernanza legítimas en momentos inconvenientes (front-run de liquidez, execución en condiciones de mercado desventajosas). NO puede modificar el contenido de las operaciones — el riesgo es de timing de ejecución, no de integridad del contenido.",
    recommendation: "Monitorear mempool para ejecuciones de timelock. Considerar una lista blanca de ejecutores si el timing se vuelve crítico. Documentar este comportamiento explícitamente en DEPLOYMENT.md para educación de la comunidad.",
    status     : "ACKNOWLEDGED",
    tags       : ["governance", "timelock", "execution-ordering", "MEV"],
  },
  {
    id         : "KR-006",
    severity   : "LOW",
    category   : "GOVERNANCE",
    title      : "Ciclo de gobernanza mínimo de ~10 días impide respuesta rápida a emergencias",
    description: "BashoodGovernor: votingDelay(~1d) + votingPeriod(~7d) + TimelockDelay(2d) = ~10 días mínimo para cualquier cambio vía gobernanza. En caso de vulnerabilidad crítica post-deployment, la respuesta formal de gobernanza es demasiado lenta.",
    impact     : "Un exploit activo puede tener hasta 10 días de ventana antes de que una mitigación vía gobernanza llegue al contrato. El mecanismo de pause de BashoodToken tiene delay de 24h (mejor), pero no todos los contratos lo implementan.",
    recommendation: "Implementar función de emergencia con multisig Gnosis Safe (3-of-5) capaz de pausar contratos críticos sin pasar por gobernanza completa. Extender el mecanismo de pause con timelock de 24h desde BashoodToken a BashoodRWAReference y BashoodPresaleFinal.",
    status     : "ACKNOWLEDGED",
    tags       : ["governance", "emergency-response", "timeliness"],
  },
  {
    id         : "KR-007",
    severity   : "LOW",
    category   : "STORAGE",
    title      : "Burn de NFT RWA no libera storage del activo (ghost data + coste de gas acumulado)",
    description: "Al quemar un tokenId de BashoodRWAReference, los 7 mappings de datos (_assetIdentification, _technicalSpecs, _financialData, _operationalMetrics, _certificationData, _telemetryConfig, _tokenizationConfig) no se eliminan. El storage permanece indefinidamente.",
    impact     : "Aumento gradual del storage footprint del contrato. No supone riesgo de seguridad inmediato, pero sí coste operativo a largo plazo y datos residuales que pueden confundir a indexers off-chain (The Graph, etc.).",
    recommendation: "Implementar función _cleanAssetStorage(tokenId) llamada desde _beforeTokenTransfer cuando to == address(0). Evaluar el coste de gas de limpieza vs el reembolso de SSTORE zero vs el impacto en indexers.",
    status     : "ACKNOWLEDGED",
    tags       : ["storage", "gas", "ERC721", "cleanup"],
  },
  {
    id         : "KR-008",
    severity   : "INFO",
    category   : "COMPLIANCE",
    title      : "ComplianceRegistry requiere renovación activa de roots Merkle antes de expiración",
    description: "Cada root Merkle en ComplianceRegistry tiene una expiración (expiry timestamp). Si el emisor no renueva el root antes del vencimiento, todas las pruebas de compliance fallarán automáticamente para todos los usuarios del issuer.",
    impact     : "Operaciones que requieran verificación de compliance quedarán bloqueadas hasta que el emisor renueve el root. El bloqueo afecta a todos los usuarios del issuer simultáneamente sin previo aviso on-chain.",
    recommendation: "Implementar alertas off-chain (webhook, Tenderly, script de monitoring) que notifiquen al emisor cuando el root está a < 7 días de expirar. Considerar overlapping roots (root nuevo válido antes que el viejo expire) para transición sin interrupciones.",
    status     : "ACKNOWLEDGED",
    tags       : ["compliance", "KYC", "operational", "merkle"],
  },
  {
    id         : "KR-009",
    severity   : "LOW",
    category   : "TYPE_SAFETY",
    title      : "uint32(block.timestamp) — patrón de compresión de timestamp revisado y aceptado",
    description: "Los módulos RWA (CertificationModule, InspectionModule, InsuranceModule, LifecycleEventsModule, MaintenanceHistoryModule) y BashoodRWAReference almacenan timestamps como uint32 en lugar de uint256. El cast uint32(block.timestamp) produce un narrowing del tipo sobre un valor conocido. Adicionalmente, BashoodRWAReference.updateUsageMetrics() castea el parámetro externo newValue a uint32 para el campo setupCount (corregido con require en L492).",
    impact     : "uint32 desborda en el año 2106. Para contratos de activos industriales con vida útil de décadas, el riesgo práctico es nulo dentro del horizonte de operación esperado del protocolo. El campo setupCount dispone de guard explícito (require(newValue <= type(uint32).max)) desde la revisión del 2026-03-28.",
    recommendation: "Sin acción adicional requerida. Mantener como conocido y revisado. Si el protocolo sigue activo post-2100, migrar los campos de timestamp a uint64 (seguro hasta el año 584.942 millones). El patrón es idéntico al utilizado por Uniswap v2 y OpenZeppelin ERC721.",
    status     : "ACKNOWLEDGED",
    tags       : ["type-safety", "narrowing-cast", "timestamp", "uint32", "C-004"],
  },
];

// ── Task ──────────────────────────────────────────────────────────────────────
task("audit:known-risks", "Documenta los riesgos conocidos y aceptados del protocolo Bashood")
  .addOptionalParam("output", "Ruta del JSON de salida", "reports/known-risks.json")
  .setAction(async (taskArgs, hre) => {
    const reportsDir = path.resolve("reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const outputPath = path.resolve(taskArgs.output);

    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║       AUDIT:KNOWN-RISKS — Riesgos Documentados     ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    const bySeverity = { HIGH: [], MEDIUM: [], LOW: [], INFO: [] };
    for (const r of KNOWN_RISKS) (bySeverity[r.severity] || bySeverity.INFO).push(r);

    for (const [sev, list] of Object.entries(bySeverity)) {
      if (list.length > 0)
        console.log(`  ${sev.padEnd(8)}: ${list.length} riesgo(s) — estado: ACKNOWLEDGED`);
    }

    const report = {
      meta: {
        task      : "audit:known-risks",
        date      : new Date().toISOString(),
        protocol  : "Bashood",
        totalRisks: KNOWN_RISKS.length,
        note      : "Todos los riesgos listados han sido revisados y son riesgos aceptados del diseño del protocolo. No son bugs no resueltos.",
      },
      findings: KNOWN_RISKS,
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`\n✅  Known risks guardados: ${outputPath} (${KNOWN_RISKS.length} entradas)\n`);

    return { success: true, outputPath, count: KNOWN_RISKS.length };
  });
