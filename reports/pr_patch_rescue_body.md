# PR: rescue — Pull-payment for emergencyWithdrawETH (draft)

Resumen
----
Este PR implementa un patrón de "pull-payment" para la funcionalidad de emergencia en `BashoodRescue`.

Qué cambié
----
- `contracts/BashoodRescue.sol`
  - Añadido `pendingWithdrawals` mapping.
  - `emergencyWithdrawETH()` ya no envía ETH directamente; registra el monto a favor de `projectWallet` y emite `EmergencyEthWithdrawalScheduled`.
  - Añadida `claimEmergencyWithdrawal()` para que el beneficiario reclame su saldo (protegida con `nonReentrant`).
- Tests actualizados:
  - `test/poc.bashoodrescue.reentrancy.test.js` — ahora verifica que el retiro se registra en `pendingWithdrawals`.
  - `test/poc.rescue.emergencyWithdraw.revert.test.cjs` — adaptado al nuevo flujo.

Motivación y contexto
----
Slither reportó que `emergencyWithdrawETH` realizaba un low-level `call{value: ...}` hacia una dirección dinámica (posible vector de envío de ETH a destino arbitrario). El cambio aplica la mitigación de defensa en profundidad: en lugar de enviar ETH dentro de la función de emergencia (lo que puede activar callbacks y producir ventanas de reentrancy), el contrato registra la cantidad y permite que el `projectWallet` reclame los fondos vía `claimEmergencyWithdrawal()`.

Pruebas y verificación
----
- Ejecución local de los PoC actualizados:
  - `test/poc.bashoodrescue.reentrancy.test.js` — passed
  - `test/poc.rescue.emergencyWithdraw.revert.test.cjs` — passed
- Slither re-ejecutado y JSON generado en: `reports/slither-report-after-rescue-pullpayment-2025-11-01.json`
  - Nota: Slither ahora reporta la transferencia de ETH en `claimEmergencyWithdrawal()` (transferencia hacia `msg.sender`). Esto es esperado: el patrón pull-payment mueve la transferencia al flujo de reclamación. La mitigación reduce la ventana de ataque en la función de emergencia concreta y facilita pruebas adicionales.

Impacto operativo
----
- El `projectWallet` deberá ejecutar `claimEmergencyWithdrawal()` para recibir fondos en caso de emergencia.
- Si el equipo prefiere un envío "push" (operativa unchanged), considerar una whitelist de wallets o un contrato de escrow separado. Recomiendo revisar y aceptar el cambio por seguridad ante posibles callbacks.

Lista de verificación (para reviewers)
----
- [ ] Revisar que la UX de reclamación es aceptable para operaciones.
- [ ] Revisar tests y añadir integración si el flujo debe ser probado en staging.
- [ ] Revisar el JSON de Slither adjunto para validar la reducción de la señal original.

Siguientes pasos recomendados
----
- (Opcional) Forzar que `projectWallet` sólo pueda definirse una vez o validar una whitelist para reducir aún más la superficie marcada por Slither.
- (Opcional) Mover pagos a un contrato escrow externo para separar responsabilidades y facilitar auditoría.

Branch
----
- Branch: `patch/rescue-pullpayment-2025-11-01`
- Base sugerida: `chore/slither-issue-template-2025-10-30`

Artefactos
----
- Tests verdes (PoC)
- Slither JSON: `reports/slither-report-after-rescue-pullpayment-2025-11-01.json`

Gracias — puedo actualizar el PR con cambios adicionales (por ejemplo: make `projectWallet` write-once) si lo solicitas.
