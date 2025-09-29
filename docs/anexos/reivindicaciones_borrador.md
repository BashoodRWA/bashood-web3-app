# Borrador de reivindicaciones provisionales — Bashood

Fecha: 29/09/2025

Introducción breve

El siguiente borrador contiene reivindicaciones técnicas orientadas a una solicitud provisional. Se proponen 7 reivindicaciones principales (independientes y dependientes) redactadas en lenguaje técnico; se incluye al final un mapeo a la evidencia técnica disponible en el repositorio (contratos, PoC y salidas de Slither). Recomendado: revisión y ajuste por el equipo legal.

---

## Reivindicación 1 (independiente) — Mitigación de reentrancy en minting masivo

Un sistema implementado mediante contratos inteligentes ejecutados en una máquina virtual compatible con EVM, el sistema comprende:

- un contrato que implementa una función de acuñado masivo denominada `mintAllNFTs()` que, antes de iniciar un bucle de acuñado, fija un contador final de tokens (`nftCounter`) y en cada iteración del bucle realiza escrituras de estado críticas (por ejemplo, asignación en un mapeo `nftOwners`) antes de invocar la operación de acuñado `_mint(...)` que puede desencadenar callbacks externos del estándar ERC-1155; y
- un mecanismo de protección contra reentrancia aplicado a la función de acuñado (por ejemplo, patrón `ReentrancyGuard` / modifier `nonReentrant`), de modo que las reentradas originadas en callbacks `onERC1155Received` no permiten ejecutar funciones críticas (por ejemplo `withdrawFunds`) durante la operación de acuñado.

## Reivindicación 2 (dependiente de la 1) — Contador inmutable temporal

El sistema según la reivindicación 1, en el que `mintAllNFTs()` asigna explícitamente un valor final al contador de NFTs (`nftCounter = N`) antes de comenzar el bucle de acuñado, estableciendo así una condición de salida inalterable que evita modificaciones del límite de acuñado durante la operación.

## Reivindicación 3 (independiente) — Fallback ledger para reenvío de ETH en emergencias

Un contrato inteligente que comprende:

- una variable `projectWallet` que identifica la dirección destino prevista para recepciones de ETH en situaciones de emergencia; y
- una operación `emergencyWithdrawETH()` que intenta reenviar el saldo disponible mediante una llamada de bajo nivel `call{value: ...}()` al `projectWallet`, y cuando dicho reenvío falla registra el importe no enviado en un libro de saldos pendientes `pendingWithdrawals[projectWallet]`; además el contrato expone una operación `claimPendingWithdrawals()` que permite al propietario de la `projectWallet` reclamar los importes registrados.

## Reivindicación 4 (independiente) — Manejo resiliente de forwards en flujo de preventa

Un contrato de preventa que, al recibir pagos en valor nativo (ETH) por compras de activos, ejecuta la secuencia: (i) aplica validaciones y actualizaciones de estado (checks-effects), (ii) intenta reenviar el importe recibido a una `projectWallet` mediante `call{value:...}()`, y (iii) en caso de fallo de la operación de reenvío registra el importe en un libro de `pendingWithdrawals` asociado a la `projectWallet` para posterior reclamación mediante `claimPendingWithdrawals()`; todo ello preservando invariantes mediante protección `nonReentrant` y checks-precedentes.

## Reivindicación 5 (dependiente de 3 y 4) — Registro on-chain y trazabilidad de importes fallidos

El sistema según cualquiera de las reivindicaciones 3 o 4, en el que los importes registrados en `pendingWithdrawals` se almacenan on-chain en un mapeo indexable y se acompañan de eventos emitidos que permiten la auditoría y reconciliación off-chain por sistemas de indexación y monitorización.

## Reivindicación 6 (independiente) — Método combinado de análisis y mitigación de reentrancy

Un método para identificar y mitigar rutas de reentrancy en contratos que emiten tokens ERC-1155, que comprende:

1. ejecutar análisis estático del código fuente con herramientas automatizadas para detectar patrones de llamadas externas en bucles y escrituras de estado posteriores a llamadas externas; 
2. construir y ejecutar pruebas dinámicas de concepto (PoC) que actúen como receptores maliciosos (`onERC1155Received`) y contratos atacantes (por ejemplo, owner-attacker) para reproducir rutas de ataque teóricas; y
3. aplicar mitigaciones en el código y validar mediante las PoC: (a) escrituras-antes-de-call, (b) uso de `nonReentrant`, (c) guards temporales (por ejemplo `_mintingInProgress`) para bloquear operaciones críticas durante eventos sensibles, y (d) fallback ledger para transferencias fallidas.

## Reivindicación 7 (dependiente de 6) — Buenas prácticas de endurecimiento

El método según la reivindicación 6, en el que, adicionalmente, se contemplan medidas de endurecimiento tales como la adopción del patrón Pull-over-Push (pull payments) para transferencias de fondos sensibles, la separación de responsabilidades entre funciones de minting y funciones de retiro, y la publicación de un runbook operacional para recuperación en caso de incidentes.

---

## Mapeo a evidencia técnica (referencias de soporte)

- `contracts/BashoodMultiToken.sol::mintAllNFTs` — implementación de escritura-antes-de-call, asignación de `nftCounter` y uso de `nonReentrant`.
- `test/poc.multitoken.*` — PoC dinámicos que demuestran que los receptores maliciosos no consiguen ejecutar `withdrawFunds` durante `mintAllNFTs` (6 passing en la sesión local).
- `contracts/BashoodRescue.sol::emergencyWithdrawETH` y `::claimPendingWithdrawals` — lógica de reenvío y fallback ledger.
- `contracts/BashoodPresaleFinal.sol::purchaseWithETH` y `::claimPendingWithdrawals` — lógica de reenvío durante preventa y fallback ledger.
- `docs/anexos/poc_snippets.md` — logs resumidos de ejecución de PoC.
- `docs/anexos/slither_snippets.md` y `slither-run-latest.json` — extractos de análisis estático que muestran detección teórica de reentrancy y llamadas low-level (evidencia para la necesidad de mitigaciones).

---

## Observaciones y siguientes pasos

- Estas reivindicaciones son un borrador técnico; se sugiere que el equipo legal las revise y (si procede) las reformule en idioma formal de reivindicación de patente antes de su presentación.
- Se recomienda adjuntar al paquete provisional los extractos de código y los logs de PoC referenciados, así como una breve guía explicativa que relacione cada reivindicación con las evidencias (líneas de código, test case y detector Slither correspondiente).

---

Fin del borrador

