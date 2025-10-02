PoC y Resumen de Slither
========================

Fecha: 29/09/2025

Objetivo
-------
Consolidar los PoC (pruebas de concepto) desarrollados en el repo y los principales hallazgos de Slither para adjuntar como evidencia técnica a la solicitud provisional.

Contenido
--------

1) PoC tests relevantes

- `test/poc.bashoodrescue.reentrancy.test.js`
  - Propósito: validar comportamiento de `BashoodRescue.emergencyWithdrawETH` cuando la `projectWallet` rechaza ETH y validar restricciones de rol.
  - Resultado: PoC pasa en el entorno local; demuestra ramas de revert y de éxito.
  - Cómo reproducir: `npx hardhat test test/poc.bashoodrescue.reentrancy.test.js`

- `test/poc.bashoodrescue.reentrancy.revert.test.cjs`
  - Propósito: caminos de revert cuando el receptor rechaza sin razón/reason.
  - Cómo reproducir: `npx hardhat test test/poc.bashoodrescue.reentrancy.revert.test.cjs`

- `test/poc.bashoodpresale.referralRevert.test.js`
  - Propósito: reproducir fallo por validación de referidos durante `purchaseWithETH`.
  - Cómo reproducir: `npx hardhat test test/poc.bashoodpresale.referralRevert.test.js`

- `test/poc.bashoodmultitoken.reentrancy.test.js`
  - Propósito: demostrar vector de reentrancy en `BashoodMultiToken.mintAllNFTs` mediante receptores maliciosos.
  - Cómo reproducir: `npx hardhat test test/poc.bashoodmultitoken.reentrancy.test.js`

2) Informes Slither

- Archivo principal: `slither-run3.json` (ubicación raíz del repo)
  - Hallazgos de interés:
    - Reentrancy en `contracts/BashoodMultiToken.sol::mintAllNFTs`
    - Low-level call en `contracts/BashoodPresaleFinal.sol::purchaseWithETH` hacia `projectWallet.call{value: msg.value}()`
    - Low-level call en `contracts/BashoodRescue.sol::emergencyWithdrawETH` hacia `projectWallet.call{value: bal}()`
    - Warnings sobre retornos de `latestRoundData()` no usados en ciertos wrappers/oráculos

- Comando para (re)ejecutar Slither localmente (si Slither está instalado):

```powershell
slither . --json slither-run3.json
```

3) Cobertura y resultados de tests

- Carpeta: `coverage/` contiene `coverage-final.json` y `lcov.info`.
- Ejecutar tests completos y generar coverage localmente:

```powershell
npx hardhat test ; npx hardhat coverage
```

4) Anexos sugeridos y próximos pasos

- Crear un archivo con recortes relevantes (extracts) de los PoC y de las secciones de Slither que se citan en las reivindicaciones (`docs/anexos/poc_snippets.md`).
- Adjuntar capturas de ejecución de los tests (logs) y el `slither-run3.json` comprimido si es necesario enviarlo a legal/auditoría.


