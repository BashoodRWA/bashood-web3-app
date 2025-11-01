Título: rescue: add ReentrancyGuard and nonReentrant emergencyWithdraw; projectWallet storage + setter (minimal patch)

Resumen
-------
Este PR aplica un parche mínimo a `contracts/BashoodRescue.sol` para mitigar una superficie de reentrancy detectada por Slither. Cambios principales:

- Añade `ReentrancyGuard` e implementa `nonReentrant` en `emergencyWithdrawETH()`.
- Añade almacenamiento `address payable public projectWallet` y la función administrable `setProjectWallet(address payable)` para fijar el destino de los retiros.

Motivación
----------
Slither detectó un vector de reentrancy y un envío de ETH a destino potencialmente arbitrario desde `emergencyWithdrawETH`. La solución aplicada es mínima y orientada a evitar reentrancy (checks-effects-interactions + guardia), evitando cambios funcionales grandes en el contrato de producción sin revisión adicional.

Pruebas realizadas
------------------
- Ejecuté los PoC tests añadidos en `test/poc.*`:
  - `test/poc.bashoodrescue.reentrancy.test.js` — 2 passing
  - `test/poc.bashoodpresale.referralRevert.test.js` — 1 passing
  - `test/poc.bashoodmultitoken.reentrancy.test.js` — 1 passing
- Smoke tests (subset) ejecutadas: todos los PoC pasan tras compilación.

Comandos útiles (local)
-----------------------
Correr los PoC tests:

```powershell
npx hardhat test test/poc.bashoodrescue.reentrancy.test.js --network hardhat --no-compile
npx hardhat test test/poc.bashoodpresale.referralRevert.test.js --network hardhat --no-compile
npx hardhat test test/poc.bashoodmultitoken.reentrancy.test.js --network hardhat --no-compile
```

Generar Slither (ya generado aquí):

```powershell
slither . --json slither-report-after-rescue-patch-2025-09-25.json
```

Resultados de Slither (resumen)
------------------------------
- Reentrancy mitigado parcialmente: `emergencyWithdrawETH` ahora tiene `nonReentrant`, lo que mitiga la mayoría de reentrancies prácticos.
- Slither todavía marca `BashoodRescue.emergencyWithdrawETH()` como "sends eth to arbitrary user" debido al patrón de envío a una dirección en estado; la advertencia no desaparece solo con `nonReentrant` (es una señal de diseño: envío a destinatario variable).

Riesgos y recomendaciones
-------------------------
- Esta es una mitigación rápida y mínima (reduce riesgo de reentrancy). Para eliminar completamente la advertencia de Slither considerar:
  - Cambiar a patrón PullPayment (almacenar y permitir que la `projectWallet` retire) o
  - Forzar que `projectWallet` sea una dirección pre-registrada/whitelisted y comprobarla antes de transferir, o
  - Requerir que `projectWallet` sea un contrato conocido (opcional) y manejar errores explícitamente.
- Triage recomendado a continuación (prioridad):
  1) `BashoodMultiToken.sol` — reentrancy en `mintAllNFTs` por callbacks ERC1155; mover actualización de estado antes de llamadas externas o usar `nonReentrant`/patrón checks-effects-interactions.
  2) `BashoodPresaleFinal.sol` — envío de ETH directo a `projectWallet` y manejo de oráculos (staleness/unused return values).

Checklist para reviewers
------------------------
- [ ] Revisar que la empresa acepta la mitigación mínima (nonReentrant).
- [ ] Confirmar el owner/admin pueda fijar `projectWallet` mediante `setProjectWallet` y que la emisión/uso está documentado.
- [ ] Acordar si aplicar cambio mayor (PullPayment) en una PR posterior.

Próximos pasos sugeridos
------------------------
- Merge de este parche rápido después de revisión de seguridad y legal (si procede).
- Abrir PRs adicionales para `BashoodMultiToken.sol` y `BashoodPresaleFinal.sol` con PoC y fixes propuestos.

Notas técnicas
--------------
- Branch con el cambio: `fix/rescue-2025-09-25` (ya empujada al remoto).
- Link para abrir PR en GitHub (formulario prellenado):
  https://github.com/Bashood/bashood-web3-app/pull/new/fix/rescue-2025-09-25

Si prefieres que lo cree desde la CLI (yo lo intentaría desde aquí):
1) Instala GitHub CLI en Windows (PowerShell):

```powershell
winget install --id GitHub.cli -e --source winget
```

2) Autentícate con `gh auth login`.
3) Ejecuta (desde la raíz del repo):

```powershell
gh pr create --title "rescue: add ReentrancyGuard and nonReentrant emergencyWithdraw; projectWallet storage + setter (minimal patch)" --body-file pr_body.md --base main --head fix/rescue-2025-09-25 --draft
```

Alternativamente, abre el enlace del formulario y pega el contenido de este fichero como descripción y crea el PR draft.

-- Fin del cuerpo del PR --
