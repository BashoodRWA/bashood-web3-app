

Resumen

Qué: Añade OpenZeppelin ReentrancyGuard e impone el modificador `nonReentrant` en `contracts/BashoodRescue.sol::emergencyWithdrawETH` para mitigar riesgo de reentrancy durante transferencias de ETH en emergencia.

Por qué: Slither detectó patrón de "send ether to arbitrary destination" y reentrancy en llamadas relacionadas. Como mitigación mínima y de bajo impacto aplicamos `nonReentrant` para reducir la ventana de explotación sin cambiar la lógica de negocio.

Cambios incluidos

- contracts/BashoodRescue.sol
  - Hereda `ReentrancyGuard` y marca `emergencyWithdrawETH` con `nonReentrant`.
- tests/
  - test/poc.bashoodrescue.reentrancy.test.js: PoC que valida comportamiento cuando project wallet rechaza transferencias y que la comprobación de roles impide reentrada.

Pruebas ejecutadas (local)

- PoC rescue:
  - Comando: `npx hardhat test test/poc.bashoodrescue.reentrancy.test.js`
  - Resultado: 2 passing
- Smoke tests:
  - Comando: `npx hardhat test test/BashoodPresaleFinal.focused2.test.cjs test/BashoodMultiToken.test.cjs test/poc.bashoodrescue.reentrancy.test.js`
  - Resultado: 19 passing

Análisis estático

- Slither antes: `slither-report-after-poc-2025-09-22.json` (guardado en repo)
- Slither después del parche: `slither-report-after-rescue-patch-2025-09-26.json` (guardado en repo)
- Observación: Slither continúa marcando la llamada de bajo nivel a `projectWallet.call{value:...}` como "sends eth to arbitrary user" aunque `nonReentrant` reduce la ventana de reentrancy. Recomendamos documentar esta limitación y plantear, como siguiente mejora, convertir la lógica a "pull" o añadir comprobaciones de allowlist si quieren eliminar la bandera por completo.

Checklist antes de merge

- [ ] Revisar por 1 Dev de contratos (security-focused)
- [ ] Revisar por 1 Dev de presale/ops (procedimiento de recepción de fondos)
- [ ] Añadir nota de runbook en `docs/` si se aprueba el cambio en producción

Notas adicionales

- Para abrir el PR en GitHub UI usa la URL de comparación:
  https://github.com/Bashood/bashood-web3-app/compare/main...fix/rescue-2025-09-25?expand=1
  (Reemplaza la rama si usas otro nombre, por ejemplo `fix/rescue-nonreentrant-2025-09-26`)

- Si tienes `gh` instalado y autenticado, crea un draft PR con:
  ```powershell
  gh pr create --draft --base main --head fix/rescue-2025-09-25 \
    --title "fix(rescue): add nonReentrant to emergencyWithdrawETH" \
    --body-file ./pr/PR_DRAFT_rescue.md
  ```

Archivos referenciados en el repo

- `pr/PR_DRAFT_rescue.md` (este archivo)
- `pr/pr_body_feature-oracles-structure.md` (backup PR body que guardamos antes)
- `slither-report-after-rescue-patch-2025-09-26.json` (resultado Slither after)

---
(Backup/auto-generated: creado por Copilot assistant)
