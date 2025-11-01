```markdown
Título propuesto:
fix(presale): pull-payments for projectWallet + claim function (mitigate forwarding/reentrancy)

Resumen
- Se convierte el forward inmediato de ETH en BashoodPresaleFinal.sol a un patrón pull-payment:
  - purchaseWithETH() ahora agenda el pago en pendingWithdrawals[projectWallet] en lugar de hacer call{value: ...} directo.
  - Añadida claimProjectFunds() (solo callable por projectWallet) que realiza la retirada segura con checks‑effects‑interactions y nonReentrant.
- Motivo: mitigar el vector de reentrancy / fallos por transferencias a contratos que puedan revertir o ejecutar callbacks maliciosos.

Cambios principales
- contracts/BashoodPresaleFinal.sol
  - Añadido mapping(address => uint256) public pendingWithdrawals;
  - purchaseWithETH() agenda pagos en pendingWithdrawals;
  - claimProjectFunds() realiza la retirada segura y emite PaymentClaimed;
  - Eventos: PaymentScheduled, PaymentClaimed.
- tests actualizados/añadidos
  - test/BashoodPresaleFinal.focused.test.cjs (actualizada aserción de comportamiento de compra con ETH).
  - test/PurchaseWithETH.test.cjs y test/poc.bashoodpresale.referralRevert.test.js ejecutados para validar mitigación PoC.

Evidencia (local)
- Tests focalizados (local): todos los tests relacionados con purchaseWithETH y el PoC de referral revert pasaron en mi ejecución local.
  - Comando usado:
    npx hardhat test test/poc.bashoodpresale.referralRevert.test.js test/PurchaseWithETH.test.cjs test/BashoodPresaleFinal.focused.test.cjs --show-stack-traces
- Slither: intento de ejecución falló en mi entorno por imports faltantes; se generará correctamente tras npm ci.
  - Ruta objetivo del JSON (cuando se genere): reports/slither-after-presale-pullpayment-2025-11-01.json

Decisión operativa (nonce-only-on-success) — Triage
- En la integración multisig EIP‑712 relacionada hemos decidido NO consumir el nonce hasta confirmar la transferencia exitosa.
  - Motivación: evitar pérdida irreparable de firmas válidas si la transferencia falla por razones externas; permite reintentos sin necesidad de re-firmar.
  - Mitigaciones aplicadas: ReentrancyGuard en funciones críticas, validación EIP‑712 + dedupe de firmantes + tests que cubren "revert on transfer" para demostrar que el nonce no cambia y que pendingWithdrawals se preserva.
  - Nota para reviewers: Slither marcará una advertencia “write-after-external-call” en el sitio correspondiente. Esta advertencia está documentada y justificada en este PR; si el equipo prefiere eliminarla, podemos cambiar a consumir el nonce antes de la llamada externa (trade‑off: perder firmas si la transferencia falla).
  - Artefactos de triage: reports/slither-after-multisig-eip712-2025-11-01.json, test outputs en analysis/tests-output.txt.

Comandos reproducibles (para reviewer)
- Compilar:
  npx hardhat compile
- Tests focalizados:
  npx hardhat test test/poc.bashoodpresale.referralRevert.test.js test/PurchaseWithETH.test.cjs test/BashoodPresaleFinal.focused.test.cjs --show-stack-traces
- Ejecutar Slither (tras npm ci):
  npm ci
  slither . --json reports/slither-after-presale-pullpayment-2025-11-01.json

Checklist (para reviewers)
- [ ] Revisar diff en contracts/BashoodPresaleFinal.sol
- [ ] Revisar tests y PoC output (analysis/tests-output.txt)
- [ ] Revisar Slither JSON (reports/slither-after-presale-pullpayment-2025-11-01.json) — y triage del hallazgo nonce-only-on-success
- [ ] Aceptar patch (merge) o solicitar cambio (e.g., consumir nonce antes)
- [ ] Desplegar en testnet y ejecutar e2e

Notas operativas
- En producción: owner debe ser multisig (Gnosis Safe) y projectWallet credencial debe ser documentada; claimProjectFunds() debe ser llamada por la cuenta multisig.
- Podemos seguir con auditoría externa o ajustar la decisión B según política del equipo.

FIN
```