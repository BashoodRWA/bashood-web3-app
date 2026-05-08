Documentos y entregables requeridos – Proyecto Bashood

Código oficial de contratos

Contratos: BashoodToken, BashoodNFT, BashoodMultiToken, BashoodPresaleFinal, BashoodReferral

Responsable: Dev Core

---

Calendario y hitos (propuesta)

- Fase 1 (2 semanas): Finalizar código oficial de contratos y pruebas críticas (BashoodMultiToken, Referral) — prioridad Alta
- Fase 2 (2 semanas): Completar pruebas unitarias restantes, cobertura >90% en PresaleFinal y MultiToken — prioridad Alta
- Fase 3 (1 semana): Documentación técnica (API/ABIs) y Scripts Hardhat para entornos Base/Ondo — prioridad Alta
- Fase 4 (1 semana): Auditoría externa y ajustes de cumplimiento (si se requieren) — prioridad Alta
- Fase 5 (1 semana): Mapa de arquitectura y manuales de despliegue; limpieza del repositorio — prioridad Media

Dependencias

- La documentación técnica (API/ABIs) y los Scripts Hardhat dependen de tener el código de contratos definitivo y versionado en el repositorio.
- Las pruebas unitarias de integración (especialmente PresaleFinal) dependen de mocks y fixtures estables (no modificar contratos de producción durante pruebas).
- La auditoría externa requiere artefactos compilados y un snapshot del repositorio (tag o rama) para reproducibilidad.

Punto de contacto / Responsable general

- Coordinador: Lead Dev / Product Owner (por ejemplo: nombre@empresa)
- Rol: Recepcionar entregables, priorizar correcciones y coordinar auditoría y despliegues.


Pruebas unitarias con cobertura superior al 90%

Responsable: Dev QA

Documentación técnica

API y ABIs de BashoodPresaleFinal, BashoodToken y BashoodNFT

Responsable: Dev Core

Scripts Hardhat

Scripts de despliegue y test en Base y Ondo

Responsable: Dev Core

Auditoría externa

Seguridad y cumplimiento de estándares ERC-20, ERC-721 y ERC-1155

Responsable: Auditores

Informe de compatibilidad con Ondo

Adaptación a ERC-4626 (vaults) y ERC-3643 (compliance)

Responsable: Dev/Auditores

Mapa de arquitectura

Contratos y flujo de fraccionalización de activos

Responsable: Dev/Arquitecto

Manuales de despliegue

Guía paso a paso para validadores e inversores

Responsable: Dev QA

Repositorio GitHub

Código actualizado y documentación técnica completa

Responsable: Dev Core
