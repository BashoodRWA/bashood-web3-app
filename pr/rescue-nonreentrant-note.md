Resumen: Verificación/dupe

- La mitigación mínima (OpenZeppelin ReentrancyGuard + modifier nonReentrant en emergencyWithdrawETH) ya está presente en `contracts/BashoodRescue.sol`.
- Se creó la rama `feature/rescue-nonreentrant-2025-09-29` para registrar la validación y preparar PR si lo deseas.
- Siguientes pasos propuestos: ejecutar tests focales, coverage y slither; si todo OK, abrir PR con esta nota y referencias de Slither/Coverage.
