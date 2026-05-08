# POC: Compliance Registry (Merkle) + TokenWrapper

Este POC implementa un flujo mínimo para validar KYC/whitelist por medio de Merkle roots y una `ComplianceRegistry`.

Archivos clave añadidos en branch `feature/compliance-poc-merkle`:
- `contracts/ComplianceRegistry.sol`
- `contracts/TokenWrapperERC20.sol`
- `scripts/deploy-compliance-poc.js`
- `test/compliance.registry.test.js`

Flujo rápido para pruebas local/testnet:
1. Instalar dependencias: `npm install`
2. Ejecutar tests: `npx hardhat test`
3. Deploy POC a testnet: `npx hardhat run scripts/deploy-compliance-poc.js --network <network>`
4. Generar una Merkle root desde una lista de addresses (usar cualquier herramienta merkle-tree-js) y pasar la root al registry:
   - `await registry.setRoot(issuerAddress, root, expiry)` (expiry 0 = no expiry)
5. Generar proof para un usuario y llamar a `wrapper.wrap(amount, leaf, proof)` en testnet.

Nota importante: Mantener PR en DRAFT hasta que el equipo haya rellenado `addresses/<network>.json`, subido `snapshots/holders.csv` reales y verificado ProxyAdmin es multisig + timelock.

Checklist pre-merge (poner en PR):
- addresses/<network>.json rellenado con impl/proxy/proxyAdmin por red.
- snapshots/holders.csv real subido o enlace a snapshot externo.
- Ejecutado: `npx hardhat run scripts/getProxyInfo.js --network <network> --proxy <address>` para cada proxy y documentado ProxyAdmin.
- Tests unitarios pasados en CI.
- Plan de gobernanza: multisig + timelock confirmado.
