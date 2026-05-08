 # Borrador de reivindicaciones provisionales — Bashood

Fecha: 29/09/2025

Introducción breve

El siguiente borrador contiene reivindicaciones técnicas orientadas a una solicitud provisional. Se proponen 7 reivindicaciones principales (independientes y dependientes) redactadas en lenguaje técnico; se incluye al final un mapeo a la evidencia técnica disponible en el repositorio (contratos, PoC y salidas de Slither). Recomendado: revisión y ajuste por el equipo legal.

---

## Reivindicaciones formales para Solicitud Provisional (OEPM) — Versión propuesta

Las siguientes reivindicaciones se presentan como borrador técnico adaptado a formato de reivindicación para su revisión legal y posible inclusión en una solicitud provisional ante la Oficina Española de Patentes y Marcas (OEPM). Se incluyen reivindicaciones independientes y dependientes que cubren aspectos técnicos esenciales y variantes.

### Reivindicación 1 (independiente) — Procedimiento de acuñado masivo con mitigación de reentrada

1. Procedimiento implementado mediante un contrato inteligente ejecutable en una máquina virtual compatible con EVM, caracterizado porque comprende las etapas de:

a) fijar, antes de iniciar una secuencia de acuñado masivo, un valor final para un contador de tokens (`nftCounter`);

b) en cada iteración de la citada secuencia, almacenar de forma on-chain la titularidad del token correspondiente (por ejemplo mediante la asignación `nftOwners[i] = owner`) antes de invocar una operación de acuñado que puede ocasionar la ejecución de callbacks externos conforme al estándar ERC-1155; y

c) aplicar un mecanismo antirreentrada sobre la función que ejecuta la secuencia de acuñado, de modo que se impide que callbacks externos provoquen la ejecución de funciones críticas internas durante la operación de acuñado.

2. Procedimiento según la reivindicación 1, en donde el mecanismo antirreentrada es un modificador `nonReentrant` conforme al patrón `ReentrancyGuard`.

3. Procedimiento según la reivindicación 1, en donde la etapa (a) comprende la asignación de un valor constante `N` a `nftCounter` antes de iniciar el bucle de acuñado.

4. Procedimiento según la reivindicación 1, en donde, durante la secuencia de acuñado, se activa un indicador temporal (`_mintingInProgress`) que impide la ejecución de funciones sensibles (por ejemplo `withdrawFunds`) hasta la finalización de la secuencia de acuñado.

### Reivindicación 2 (dependiente) — Contador inmutable temporal

5. Procedimiento según la reivindicación 1, en el que `mintAllNFTs()` asigna explícitamente un valor final al contador de NFTs (`nftCounter = N`) antes de comenzar el bucle de acuñado, estableciendo así una condición de salida inalterable que evita modificaciones del límite de acuñado durante la operación.

### Reivindicación 3 (independiente) — Fallback ledger para reenvío de fondos en emergencia

6. Procedimiento implementado por un contrato inteligente ejecutable en una máquina virtual compatible con EVM, caracterizado porque comprende:

a) la existencia de una dirección destino denominada `projectWallet` para la recepción de valores en la unidad nativa del protocolo;

b) una operación de retirada de emergencia que intenta transferir la totalidad del saldo disponible del contrato a la `projectWallet` mediante llamada de bajo nivel; y

c) cuando la transferencia no se realiza con éxito, registrar el importe no transferido en un registro on-chain de saldos pendientes (`pendingWithdrawals`) asociado a la `projectWallet`, y exponer una operación `claimPendingWithdrawals()` que permite al titular de la `projectWallet` reclamar los importes registrados.

7. Procedimiento según la reivindicación 3, en donde la operación de retirada de emergencia está protegida mediante un mecanismo antirreentrada (`nonReentrant`).

### Reivindicación 4 (independiente) — Manejo resiliente de forwards en flujo de preventa

8. Procedimiento para la gestión de pagos en una preventa implementado por un contrato inteligente ejecutable en una máquina virtual compatible con EVM, caracterizado porque comprende:

a) la recepción por parte del contrato de un pago en la unidad nativa del sistema (por ejemplo ETH) como contraprestación por la adquisición de un activo tokenizado;

b) la ejecución de comprobaciones y la actualización del estado interno (checks-effects) antes de realizar interacciones externas;

c) un intento de reenvío inmediato del importe recibido a una dirección designada `projectWallet` mediante llamada de bajo nivel; y

d) en caso de fallo del reenvío, el registro del importe en un libro de saldos pendientes (`pendingWithdrawals`) asociado a la `projectWallet` y la exposición de una operación `claimPendingWithdrawals()` que permita la reclamación posterior por la `projectWallet`.

9. Procedimiento según la reivindicación 4, en donde se aplican controles de acceso y protección antirreentrada para las operaciones críticas relacionadas con el reenvío de fondos.

### Reivindicación 5 (independiente) — Método combinado de análisis y mitigación de reentrada

10. Método implementado por ordenador para identificar y mitigar rutas de reentrada en contratos inteligentes que emiten tokens ERC-1155, caracterizado porque comprende las etapas de:

a) ejecutar análisis estático del código fuente mediante herramientas automatizadas que detectan patrones de llamadas externas en bucles y escrituras de estado posteriores a llamadas externas; 

b) construir y ejecutar pruebas dinámicas de concepto que implementan receptores maliciosos (`onERC1155Received`) y contratos atacante para reproducir rutas de ataque teóricas; y

c) aplicar mitigaciones en la implementación y validar mediante la ejecución de las pruebas dinámicas que las mitigaciones corrigen los hallazgos, siendo dichas mitigaciones seleccionadas entre: escrituras-antes-de-call, aplicación de modificadores antirreentrada (`nonReentrant`), guards temporales que bloquean operaciones sensibles durante ventanas críticas y un ledger fallback para transferencias fallidas.

11. Método según la reivindicación 5, en donde las pruebas dinámicas de concepto comprenden mocks y contratos de prueba que intentan reentrar durante callbacks ERC-1155.

### Reivindicación 6 (independiente) — Proceso de auditoría automática y verificación continua (Security-first)

12. Procedimiento automatizado de aseguramiento de la seguridad para un conjunto de contratos inteligentes desplegados en una máquina virtual compatible con EVM, que comprende:

a) integrar herramientas de análisis estático de seguridad, frameworks de pruebas y herramientas de fuzzing en un pipeline de integración continua que se ejecuta periódicamente o ante cada cambio de código; 

b) generar y almacenar informes estructurados y artefactos de ejecución (por ejemplo JSON, HTML, logs) derivados de la ejecución de las herramientas; y

c) correlacionar los resultados del análisis estático con pruebas dinámicas de concepto que reproducen vectores teóricos y comprobar que las mitigaciones aplicadas corrigen los hallazgos detectados.

13. Procedimiento según la reivindicación 6, en donde los artefactos generados se conservan como evidencia para auditoría y cumplimiento.

### Reivindicación 7 (dependiente) — Gobernanza, monitorización y compliance

14. Sistema conforme a cualquiera de las reivindicaciones anteriores, caracterizado adicionalmente por incorporar al menos uno de: 

a) un esquema de control de transacciones críticas mediante firmas múltiples (multisig) o módulo de gobernanza que requiere aprobaciones colectivas para ejecutar operaciones críticas; 

b) un sistema de monitorización off-chain que indexa eventos on-chain relevantes y genera alertas ante condiciones definidas; y

c) hooks o puntos de integración off-chain que permiten la verificación de requisitos de cumplimiento (por ejemplo KYC/AML) antes de permitir operaciones críticas.

15. Sistema según la reivindicación 7, en donde las actualizaciones de la lógica del contrato se someten a controles de gobernanza y/o firmas múltiples antes de su ejecución en producción.

---

## Checklist adicional y contenidos para cerrar el paquete provisional

Para preparar el paquete provisional de presentación se recomienda incluir los siguientes elementos en la memoria:

- Breve descripción general al inicio: qué es Bashood, objetivo del sistema (p. ej. gestión de preventas, custodia temporal y rescate de fondos, emisión de NFTs industriales), y caso de uso principal.
- Glosario de términos técnicos clave: EVM, ERC-1155, multisig, CI, PoC, pendingWithdrawals, on-chain events, etc.
- Enumeración de dependencias externas críticas: OpenZeppelin (bibliotecas y patterns), Chainlink (feed oracles), Hardhat (framework de pruebas), Slither/Mythril (análisis estático), y otros servicios de infraestructura (IPFS/web3storage si aplica).
- Referencias sobre propiedad y control de activos: notas sobre cómo se valida la propiedad de claves/addresses y procesos de custodia (si aplica describir procesos off-chain que vinculan activos físicos a tokens).
- Descripción de procesos de onboarding para empresas/partners y usuarios (whitelists, validadores de referidos, límites por usuario y KYC points si aplican).
- Vincular cada reivindicación con evidencia técnica: referencias a fragmentos de código, PoC y salidas de Slither incluidas en los anexos (`docs/anexos/poc_snippets.md`, `docs/anexos/slither_snippets.md`, `contracts/*`).
- Adjuntar resúmenes o extractos de auditorías previas y logs de CI (si existen) o, en su defecto, snapshots de las ejecuciones de Slither y PoC.
- Recomendar revisión legal final para ajustar lenguaje de las reivindicaciones y preparar la versión formal para presentación.

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

