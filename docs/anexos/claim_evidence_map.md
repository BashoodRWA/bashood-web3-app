 # Mapa de evidencia para reivindicaciones — Bashood

Este fichero enlaza cada reivindicación del borrador con fragmentos de código, pruebas PoC y salidas de Slither que sirven como evidencia técnica y soporte para revisión por peritos y abogados.

Formato: Reivindicación X → [Tipo: ruta] comentarios + fragmento ilustrativo.

---

Reivindicación 1 — Mitigación de reentrancy en minting masivo
- Código: `contracts/BashoodMultiToken.sol`
  - Fragmento: asignación de contador antes del bucle y escritura-before-call
    - "nftCounter = 31;"
    - "nftOwners[i] = contractOwner;"
    - "_mint(contractOwner, BASHOOD_NFT, 1, "");"
- PoC/tests: `test/poc.multitoken.mintAllNFTs.test.cjs`, `test/poc.multitoken.reentrancy.test.cjs`
- Slither: ver `docs/anexos/slither_snippets.md` (detección teórica de reentrancy en mintAllNFTs).

Reivindicación 2 — Contador inmutable temporal
- Código: `contracts/BashoodMultiToken.sol` (línea con `nftCounter = 31` antes del bucle).
- PoC: `test/poc.multitoken.*`

Reivindicación 3 — Fallback ledger para reenvío de ETH en emergencias
- Código: `contracts/BashoodRescue.sol`
  - Fragmento: intento de forward y registro en `pendingWithdrawals`
    - "(bool ok, ) = projectWallet.call{value: bal}("");"
    - "pendingWithdrawals[projectWallet] += bal;"
- PoC: `test/poc.bashoodrescue.reentrancy.test.js`

Reivindicación 4 — Manejo resiliente de forwards en preventa
- Código: `contracts/BashoodPresaleFinal.sol`
  - Fragmento: forward en `purchaseWithETH` con fallback
    - "(bool sent, ) = projectWallet.call{value: msg.value}("");"
    - "pendingWithdrawals[projectWallet] += msg.value;"
- PoC: `test/BashoodPresaleFinal_IERC1155Receiver.test.js`

Reivindicación 5 — Registro on-chain y trazabilidad
- Código: `contracts/BashoodRescue.sol`, `contracts/BashoodPresaleFinal.sol` (mapeos y eventos `EmergencyEthWithdrawn`, `AssetPurchased`)
- Logs: `docs/anexos/poc_snippets.md`

Reivindicación 6 — Método combinado de análisis y mitigación de reentrancy
- Scripts/config: `hardhat.config.js`, `package.json` (scripts de test)
- PoC: `test/poc.*` (batería de pruebas dinámicas)
- Slither JSON: `slither-run-latest.json` (si está presente en el repo)

Reivindicación 7 — Buenas prácticas de endurecimiento
- Docs: `docs/anexos/poc_snippets.md`, `docs/anexos/contract_references.md`

Reivindicación 8 — Proceso de auditoría automática y verificación continua
- Evidencia: `docs/anexos/slither_snippets.md`, `slither-run-latest.json`, `package.json` scripts

Reivindicación 9 — Control compartido / multisig (integración propuesta)
- Nota: esquema de integración (conceptual) — no implementado como multisig en este repo; documentar integración en anexos si se desea.

Reivindicación 10 — Monitorización y alertas
- Eventos relevantes: `contracts/BashoodRescue.sol` (EmergencyEthWithdrawn), `contracts/BashoodPresaleFinal.sol` (AssetPurchased, ProposalSubmitted)

Reivindicación 11 — Upgradeability e interoperabilidad
- Referencias: `contracts/oracles/*` (Chainlink interfaces) y notas en memoria reorganizada sobre patrones proxy.

Reivindicación 12 — Compliance y regulación
- Referencias: `docs/Bashood_Memoria_Patente_Reorganizada.md` (sección de onboarding y KYC/AML recomendados).

---

Fin del mapa de evidencia
