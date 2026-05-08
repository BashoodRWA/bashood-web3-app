Anexo: Extractos de Slither relevantes

Resumen ejecutivo

Se ejecutó Slither con salida JSON (`slither-run-latest.json`). A continuación se resumen los hallazgos de mayor interés para la memoria y los PoC, centrados en reentrancy y llamadas de bajo nivel que afectan a `BashoodMultiToken`, `BashoodRescue` y `BashoodPresaleFinal`.

Hallazgos clave

1) Reentrancy — `BashoodMultiToken.mintAllNFTs()`
- Detector: Reentrancy
- Descripción: Slither detecta una llamada externa durante el loop de `mintAllNFTs()` (la invocación a `_mint(...)` puede desencadenar `onERC1155Received` en receptores), y además detecta que la variable `nftOwners[i]` se escribe después de la(s) llamada(s) externas según análisis estático.
- Entrada relevante (resumen):
  Reentrancy in BashoodMultiToken.mintAllNFTs() (contracts/BashoodMultiToken.sol#76-92):
    External calls:
      - _mint(contractOwner,BASHOOD_NFT,1,) (contracts/BashoodMultiToken.sol#89)
      - response = IERC1155Receiver(to).onERC1155Received(...) (OpenZeppelin internals)
    State variables written after the call(s):
      - nftOwners[i] = contractOwner (contracts/BashoodMultiToken.sol#88)
- Impacto: ruta teórica para reentrancy via callbacks ERC1155. Slither marca esto como alta señal, aunque la presencia de `nonReentrant` y la escritura-antes-de-call mitigación reduce riesgo práctico (ver PoC tests).

2) Low-level calls — `BashoodRescue.emergencyWithdrawETH()`
- Detector: Functions that send ether to arbitrary destinations / Low-level call
- Descripción: Uso de `projectWallet.call{ value: bal }()` detectado por Slither como llamada de bajo nivel que envía ETH a dirección arbitraria.
- Entrada relevante (resumen):
  BashoodRescue.emergencyWithdrawETH() (contracts/BashoodRescue.sol#89-96) sends eth to arbitrary user
    - (ok,None) = projectWallet.call{value: bal}() (contracts/BashoodRescue.sol#93)
- Impacto: Slither marca la ruta porque llamadas `call` son susceptibles a reentrancy y a que la contabilidad del contrato quede inconsistente si no se aplican checks/effects/interactions apropiados. Nota: ya se aplicó `nonReentrant` en este método en el branch actual y `projectWallet` ahora es state variable con setter (cambios previos), lo que reduce la exposición práctica.

3) Low-level calls — `BashoodPresaleFinal.purchaseWithETH(...)`
- Detector: Low-level call
- Descripción: Slither detectó el envío directo de `msg.value` a `projectWallet` usando `projectWallet.call{ value: msg.value }()`, lo que aparece como llamada de bajo nivel dentro del flujo de `purchaseWithETH`.
- Entrada relevante (resumen):
  Low level call in BashoodPresaleFinal.purchaseWithETH(uint256,uint256,uint256,bytes) (contracts/BashoodPresaleFinal.sol#339-376):
    - (sent,None) = projectWallet.call{value: msg.value}() (contracts/BashoodPresaleFinal.sol#366)
- Impacto: riesgo teórico por llamadas externas en flujo de compra. Recomendación: documentar y, si se desea endurecer, usar patrón pull payments o comprobar retornos y manejar fallos de forma explícita.

Otros hallazgos de interés rápido

- Slither reportó múltiples reentrancy y llamadas dentro de loops en contracts/mocks de ataque (AttackerLoop, AttackerBatch, AttackerConditional, AttackerOwner, etc.). Son útiles como PoC y ya se usan en tests.
- Contratos que "lock ether" (BadReceiver, BadReceiver721, MockAttackerProjectWallet, MockProjectWalletRevert, RejectingWallet) listados: revisar si son mocks o producción.
- Varias advertencias de "missing zero-check" y "should inherit" en mocks y helpers; de baja prioridad para la memoria, se pueden corregir en mantenibilidad futura.
- Diferentes pragmas de Solidity detectadas en la base (varias versiones). Documentar en el anexo técnico.

Recomendaciones (no intrusivas)

- Mantener: ReentrancyGuard + escritura-antes-de-call en `mintAllNFTs` (defensa en profundidad). Los PoC locales pasaron y confirman mitigación práctica.
- Considerar (opcional, con PR separado):
  - Evitar llamadas externas dentro de loops cuando sea posible; si no, reducir efectos colaterales antes de la llamada.
  - Usar patrón pull-over-push para transferencias de ETH (pull payments) o comprobar y manejar fallos de `call` explícitamente.
  - Documentar en `docs/` las razones por las que se confía en las mitigaciones actuales (PoC + ReentrancyGuard) para la memoria de patente.

Próximos pasos realizados en esta sesión

- Se generó este anexo resumen (`docs/anexos/slither_snippets.md`) con extractos relevantes.
- El informe JSON generado por Slither está en: `slither-run-latest.json` (workspace root) — revisar si quieres que lo incorpore íntegro al repositorio o extraiga fragmentos adicionales.

Observación legal/operacional

- No se realizaron cambios a contratos de producción en esta sesión. Cualquier parche propuesto se preparará en un branch y requerirá tu autorización antes de tocar la rama principal.

---
Fecha de ejecución: 29 de septiembre de 2025
Generado por: sesión local Hardhat + Slither (output parcial capturado).
