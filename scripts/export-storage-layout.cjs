/**
 * @file export-storage-layout.cjs
 * @notice Genera y guarda el storage layout de BashoodRWAReference para
 *         validación de upgrades futuros.
 *
 * Uso:
 *   npx hardhat run scripts/export-storage-layout.cjs --no-compile
 *
 * Salida:
 *   STORAGE_LAYOUT_v1.0.json — layout serializado, referencia para futuros upgrades.
 *
 * Plan: v1.0-mainnet-freeze — verificación pre-auditoría.
 */

const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

const CONTRACTS_TO_EXPORT = ["BashoodRWAReference"];

async function main() {
  console.log("=======================================================");
  console.log("  BASHOOD Storage Layout Export — v1.0-mainnet-freeze  ");
  console.log("=======================================================\n");

  const output = {
    generatedAt: new Date().toISOString(),
    solcVersion:  "0.8.28",
    evmVersion:   "cancun",
    note: "Layout de referencia para v1.0-mainnet-freeze. " +
          "Cualquier upgrade DEBE validarse contra este archivo usando " +
          "@openzeppelin/hardhat-upgrades validateUpgrade().",
    contracts: {}
  };

  for (const contractName of CONTRACTS_TO_EXPORT) {
    console.log(`► Procesando ${contractName} …`);

    const buildInfoPaths = await hre.artifacts.getBuildInfoPaths();
    let storageLayout = null;
    let found = false;

    for (const bip of buildInfoPaths) {
      const buildInfo = JSON.parse(fs.readFileSync(bip, "utf8"));
      for (const [sourcePath, sourceOutput] of Object.entries(buildInfo.output.contracts || {})) {
        if (sourceOutput[contractName]) {
          storageLayout = sourceOutput[contractName].storageLayout || null;
          found = true;
          console.log(`  Fuente: ${sourcePath}`);
          break;
        }
      }
      if (found) break;
    }

    if (!storageLayout) {
      console.error(`  ⚠  storageLayout no encontrado para ${contractName}.`);
      continue;
    }

    const slotMap = {};
    for (const entry of storageLayout.storage || []) {
      slotMap[`slot_${entry.slot}_offset_${entry.offset}`] = {
        label:    entry.label,
        type:     entry.type,
        slot:     Number(entry.slot),
        offset:   entry.offset,
        contract: entry.contract
      };
    }

    output.contracts[contractName] = {
      storageLayout,
      slotSummary: slotMap,
      gapSlot:     findGapSlot(storageLayout),
    };

    const vars = storageLayout.storage || [];
    console.log(`  Variables totales en layout: ${vars.length}`);
    const gapEntry = vars.find(e => e.label === "__gap");
    if (gapEntry) {
      console.log(`  __gap encontrado en slot ${gapEntry.slot} — OK ✓`);
    } else {
      console.warn("  ⚠  __gap NO encontrado — revisar manualmente.");
    }
    console.log("");
  }

  // ── Validar con OZ Upgrades ───────────────────────────────────────────
  console.log("► Validando implementación con @openzeppelin/hardhat-upgrades …");
  try {
    const factory = await hre.ethers.getContractFactory("BashoodRWAReference");
    await hre.upgrades.validateImplementation(factory, { kind: "uups" });
    console.log("  validateImplementation: PASS ✓\n");
    output.ozValidation = { status: "PASS", kind: "uups" };
  } catch (err) {
    console.error("  validateImplementation: FAIL ✗");
    console.error(" ", err.message);
    output.ozValidation = { status: "FAIL", error: err.message };
  }

  // ── Escribir archivo de referencia ────────────────────────────────────
  const outFile = path.join(process.cwd(), "STORAGE_LAYOUT_v1.0.json");
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`► Layout guardado en: ${outFile}  (${kb} KB)\n`);

  // ── Resumen de slots propios ──────────────────────────────────────────
  const rwaLayout = output.contracts["BashoodRWAReference"];
  if (rwaLayout) {
    console.log("=== Slots propios de BashoodRWAReference ===");
    const ownSlots = (rwaLayout.storageLayout.storage || []).filter(
      e => e.contract && e.contract.includes("BashoodRWAReference")
    );
    for (const v of ownSlots) {
      const isGap = v.label === "__gap";
      console.log(
        `  slot ${String(v.slot).padStart(3)}  ${v.label.padEnd(32)} ${v.type}${isGap ? "  ← reserva upgrade" : ""}`
      );
    }
    console.log("");
  }

  console.log("=======================================================");
  console.log("  DONE — listo para auditoría externa.                 ");
  console.log("=======================================================");
}

function findGapSlot(storageLayout) {
  if (!storageLayout || !storageLayout.storage) return null;
  const gap = storageLayout.storage.find(e => e.label === "__gap");
  return gap ? { slot: Number(gap.slot), type: gap.type } : null;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
