# Memoria reorganizada — Sistema blockchain para activos físicos 3D

Título del proyecto: Sistema blockchain para activos físicos 3D — trazabilidad digital y propiedad inteligente de activos físicos tokenizados

Última actualización: 29/09/2025
Versión: 0.1 (borrador)
Autor: Equipo Bashood

---

## Objetivo de la memoria

Esta memoria reorganizada describe en detalle la arquitectura, diseño y justificación técnica del sistema. Es la documentación de referencia que acompaña a la solicitud provisional y debe recoger el estado actual del desarrollo, decisiones de diseño, diagramas, mapeo a código (commits/archivos) y un registro de cambios.

## Índice propuesto

1. Resumen y título
2. Estado del proyecto y cronología
3. Arquitectura del sistema (componentes y relaciones)
4. Diseño de contratos (especificaciones por contrato)
5. Protocolos y flujos (presale, rescue, referral, minting, treasury)
6. Oráculos y datos externos
7. Seguridad y mitigaciones (PoC, Slither, tests)
8. Integraciones y dependencias (OpenZeppelin, Chainlink, etc.)
9. Plan de despliegue y runbook de emergencia
10. Reivindicaciones técnicas detalladas
11. Anexos (diagramas, tests, reports, commits)
## 1. Resumen y título

(Usar el título del proyecto y el resumen ejecutivo. Referenciar la Solicitud provisional: `docs/Solicitud_Provisional_Patente_Bashood.md`.)
## 2. Estado del proyecto y cronología
- Lista de hitos y fechas (milestones).
- Cambios recientes: canonicalización de `IPriceFeed`, correcciones en `ReferralValidator`, `nonReentrant` en `BashoodRescue`, PoC tests añadidos.

## Evidencia técnica (anexo inmediato)

Esta sección agrupa la evidencia técnica que soporta las reivindicaciones provisionales y los puntos de diseño mencionados en el documento.

- PoC tests (implementados en `test/`):
  - `test/poc.bashoodrescue.reentrancy.test.js` — PoC de emergencia ETH y manejo de transferencias rechazadas.
  - `test/poc.bashoodrescue.reentrancy.revert.test.cjs` — sender/recipient revert behavior tests.
  - `test/poc.bashoodpresale.referralRevert.test.js` — PoC de fallo por validación de referidos.
  - `test/poc.bashoodmultitoken.reentrancy.test.js` — PoC de reentrancy en `mintAllNFTs`.

- Tests de integración y focused (indicativos de flujos):
  - `test/PurchaseWithETH.test.cjs`, `test/BashoodPresaleFinal.focused.test.cjs`, `test/presale.*.test.js`.

- Informes estáticos (Slither):
  - `slither-run3.json` — run con múltiples hallazgos (reentrancy en `mintAllNFTs`, low-level calls en `purchaseWithETH` y `emergencyWithdrawETH`, advertencias sobre `latestRoundData()` no usado).
  - Otros archivos `slither-*.json` ubicados en el repo (buscar `slither-`).

- Cobertura y resultados de pruebas:
  - `coverage/coverage-final.json`, `coverage/lcov.info` — resúmenes de ejecución de tests.

- Diagramas y artefactos gráficos:
  - `docs/diagrama_bashood_final.svg`
  - `docs/diagrama_interoperabilidad_bashood.svg`
  - `docs/pseudodiagrama_bashood.svg`

## Anexos consolidados (evidencia técnica)

Se incluyen a continuación los anexos generados automáticamente durante la auditoría interna y la ejecución de PoC/tests. Estos archivos contienen logs, fragmentos relevantes y resúmenes ejecutivos que soportan las reivindicaciones técnicas.

- `docs/anexos/poc_snippets.md` — Resumen y logs de los PoC ejecutados localmente (MultiToken reentrancy, Rescue ETH handling, variantes de receptor atacante). Contiene resultados de los tests (6 passing para MultiToken PoCs) y fragmentos de salida relevantes.
- `docs/anexos/slither_snippets.md` — Extractos de Slither centrados en hallazgos de alto interés: reentrancy en `mintAllNFTs`, low-level calls en `purchaseWithETH` y `emergencyWithdrawETH`, contratos que "lock ether" y advertencias sobre pragmas de Solidity.
- `docs/anexos/contract_references.md` — Mapeo de funciones/contratos a líneas de código y notas de PoC/Slither para facilitar la vinculación entre reivindicaciones y evidencia.

Extracto clave (PoC vs Slither):

- PoC dinámico: `mintAllNFTs` mitigaciones (writes-before-call + ReentrancyGuard) fueron probadas con 6 PoC tests que pasan localmente. Resultado: los atacantes mock no consiguieron ejecutar `withdrawFunds` desde `onERC1155Received`.
- Slither estático: detecta la ruta teórica de reentrancy en `mintAllNFTs` porque identifica llamadas externas en un loop y cierta escritura de estado que el análisis considera posterior a la llamada. Debido a las limitaciones del análisis estático, Slither emite una señal que debe contextualizarse con pruebas dinámicas (ya presentes).

Recomendación de inclusión en la Solicitud provisional: adjuntar `docs/anexos/poc_snippets.md` y `docs/anexos/slither_snippets.md` como evidencia técnica, y en el cuerpo de la memoria insertar referencias a los fragmentos relevantes (líneas y firmas) que sostienen cada reivindicación.

## Checklist priorizado (tareas y mapeo a archivos)

1) Evidencia de seguridad y PoC — Alta prioridad
	- Acción: Consolidar y anexar extractos de los PoC + slither en `docs/anexos/poc_and_slither_summary.md`.
	- Archivos relacionados: `test/poc.*`, `slither-run3.json`, `coverage/coverage-final.json`.

2) Mapeo técnico (Código ↔ Reivindicaciones) — Alta prioridad
	- Acción: Por cada reivindicación provisional, añadir referencia a la(s) funciones y líneas de código que la ilustran.
	- Ejemplos iniciales (añadir enlaces):
	  - `contracts/BashoodRescue.sol::emergencyWithdrawETH` (líneas relevantes en el contrato)
	  - `contracts/BashoodPresaleFinal.sol::purchaseWithETH`
	  - `contracts/BashoodMultiToken.sol::mintAllNFTs`
	  - `contracts/oracles/IPriceFeed.sol` y `contracts/oracles/ChainlinkPriceFeed.sol`
	  - `contracts/ReferralValidator.sol`

3) Reivindicaciones provisionales — Muy alta prioridad
	- Acción: Redactar borrador técnico de 6–8 reivindicaciones y vincular cada una con la evidencia (tests/slither/diagramas).

4) Dibujos y leyendas — Media/Alta
	- Acción: Numerar y revisar diagramas de `docs/`, exportar PNG/PDF para anexos y añadir leyenda.

5) Descripción detallada y casos de uso — Media
	- Acción: Completar secciones 5.1–5.5 con flujos narrativos y referencias a pruebas.

6) Runbook y plan de despliegue — Media/Baja
	- Acción: Extraer `docs/DEV_RUNBOOK.md` y adaptar a sección 9.

7) Administrativa (inventores, metadatos) — Baja
	- Acción: Añadir inventores, fechas de prioridad y notas legales.

---

Si confirmas, ejecuto las acciones siguientes en orden: A) crear `docs/anexos/poc_and_slither_summary.md` con resúmenes de PoC y enlaces a los JSON; B) actualizar `docs/Bashood_Memoria_Patente_Reorganizada.md` con enlaces directos en las secciones relevantes (hecho parcialmente aquí); C) redactar borrador de reivindicaciones provisionales y colocarlo en `docs/anexos/reivindicaciones_borrador.md`.

## 3. Arquitectura del sistema

(Incluir diagrama de alto nivel — referenciar `docs/diagrama_interoperabilidad_patente.svg` si procede.)

## 4. Diseño de contratos

Para cada contrato incluir:
- Propósito y alcance
- Interfaz pública y roles
- Estados críticos y invariantes
- Métodos sensibles y mitigaciones
- Referencias a archivos en `contracts/` y commits relevantes

Ejemplo: `contracts/BashoodRescue.sol` — roles, `authorizedCallers`, `emergencyWithdrawETH`, uso de `ReentrancyGuard`.

## 5. Protocolos y flujos

Describir paso a paso: compra en presale, validación de referidos, emisión minting, rescate de activos, retiro de fondos.

## 6. Oráculos y datos externos

- Especificar la interfaz `IPriceFeed` y contract `ChainlinkPriceFeed`.
- Documentar manejo de errores, fallback y validación de datos.

## 7. Seguridad y mitigaciones

- Resumen de PoC tests y resultados.
- Resumen de Slither hallazgos y acciones tomadas.
- Recomendaciones para auditoría y fuzzing.

## 8. Integraciones y dependencias

- Lista de bibliotecas externas y versiones (OpenZeppelin, Chainlink, Hardhat, etc.).

## 9. Plan de despliegue y runbook

- Procedimiento para emergencia (cómo usar `BashoodRescue`), roles implicados y pasos de recuperación.

## 10. Reivindicaciones técnicas detalladas

- Espacio para la redacción formal de reivindicaciones; vincular a la sección de la Solicitud provisional.

## 11. Anexos

- Incluir enlaces a `test/`, `slither-*.json`, `pr/` y diagramas en `docs/`.

---

_Notas para el autor_: Completar cada sección con el nivel de detalle necesario para la presentación de patente (diagramas, pseudocódigo, referencias a commits y evidencias temporales). Este documento será la base para la redacción final y para la memoria técnica que enviará el equipo legal.
