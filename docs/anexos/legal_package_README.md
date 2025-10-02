Paquete provisional para revisión legal — Bashood

Fecha: 29/09/2025

Contenido y propósito

Este README acompaña al paquete provisional preparado para la revisión legal y técnica. El paquete contiene la memoria reorganizada, el borrador de reivindicaciones, los anexos técnicos (PoC, Slither), un mapa de evidencias y los contratos relevantes. Está diseñado para facilitar la comprobación por abogados, peritos y auditores técnicos.

Archivos incluidos (en la raíz del paquete):
- Bashood_Memoria_Patente_Reorganizada.md  — memoria técnica y contextual del proyecto.
- docs/anexos/reivindicaciones_borrador.md  — borrador de reivindicaciones (versión adaptada a OEPM incluida).
- docs/anexos/claim_evidence_map.md  — mapa de evidencia por reivindicación (fragmentos y rutas).
- docs/anexos/poc_snippets.md  — resúmenes y logs de PoC.
- docs/anexos/slither_snippets.md  — extractos de Slither y resumen de hallazgos.
- slither-run-latest.json (si existe en el repo) — salida cruda de Slither en formato JSON.
- contracts/  — (listado de rutas y archivos) copiado como referencia para peritos.

Instrucciones para el revisor legal

1) Revisar el archivo `reivindicaciones_borrador.md` y proponer ajustes formales para cumplimiento de la OEPM.
2) Revisar el `claim_evidence_map.md` para verificar que cada reivindicación está apoyada por evidencia técnica suficiente.
3) Si se solicita, el equipo técnico puede extraer fragmentos de código numerados (líneas) y generar un PDF técnico con anexos.

Contacto técnico

- Repositorio local: rama `fix/rescue-2025-09-25` (no tocar `main` sin autorización).
- Responsable técnico: equipo de desarrollo (disponible para preguntas técnicas y extracción de logs adicionales).

Notas

- El paquete incluye evidencias de PoC y ejecuciones de tests locales. Si el equipo legal necesita pruebas firmadas o timestamps verificables, se recomienda ejecutar un pipeline CI que archive los artefactos y genere firmas/time-stamps.
