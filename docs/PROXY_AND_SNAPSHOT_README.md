```markdown
# Proxy / Addresses / Snapshot  instrucciones rápidas

Estructura recomendada en repo:
- addresses/<network>.json  (ej. addresses/mainnet.json, addresses/base.json)
- snapshots/holders.csv

Comandos que el equipo debe ejecutar localmente (copiar/pegar)
Instalar dependencias si no están:
npm install

Ejecutar inspección de proxy:
npx hardhat run scripts/getProxyInfo.js --network <network> --proxy 0xProxyAddress

Exportar holders (ejemplo ERC721):
npx hardhat run scripts/export-holders.js --network <network> --token 0xTokenAddress --type ERC721 --fromBlock 0 --toBlock latest

Buscar referencias a upgrades en repo:
git grep -n "deployProxy|@openzeppelin/hardhat-upgrades" || echo "No matches"

Mensaje corto para Slack (una línea)
He preparado instrucciones y scripts para documentar proxies y exportar snapshot de holders. Por favor: 1) añadid addresses/<network>.json y snapshots/holders.csv, 2) ejecutad scripts/getProxyInfo.js para cada proxy y documentad admin; 3) decidid si queréis Opción A (POC Registry+Wrapper) o Opción B (tabla gas). Yo solo asesoro; no voy a crear PRs ni ejecutar deploys.

Recomendaciones rápidas y obligatorias de gobernanza
ProxyAdmin debe ser una multisig (p.ej. Gnosis Safe) y tener timelock antes de permitir upgrades en mainnet. Documentad la multisig en addresses/<network>.json.
Si no controláis ProxyAdmin, planificad wrapper/bridge POC (lock > mint) en vez de upgrade.
Documentad la preferencia de attestation KYC: Merkle (batch, barato) vs JWT/provider (mejor UX).

```
