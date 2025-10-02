feat: scaffold Chainlink oracles (adapter + mocks skeleton)

Resumen

Qué: Añade estructura mínima para oráculos en `contracts/oracles` y `contracts/mocks`: interfaz `IPriceFeed`, wrapper Chainlink (con staleness/answeredInRound/sanity checks), mock local y test básico. Incluye `OwnableLocal` para pruebas rápidas y README corto.
Por qué: permitir integrar el price feed verificable para la preventa sin tocar la PoC principal; facilita revisión y pruebas aisladas.
Resultado actual: branch `feature/oracles-structure` con un test básico que pasa (1 passing). El PR está en modo draft para revisión y ampliación de tests.

Checklist (para reviewers)

 - Código oráculo aislado en `contracts/oracles`.
 - BashoodPresale preparado para inyectar `IPriceFeed` (si aplica).
 - Tests unitarios con mocks (no llamadas externas en CI).
 - Staleness: `updatedAt != 0` y `block.timestamp - updatedAt <= stalenessThreshold`.
 - Evitar datos incompletos: comprobar `answeredInRound >= roundId`.
 - Sanity checks: `answer > 0` y `maxChangePct` configurable.
 - Decimals: convención documentada y normalizada.
 - `setPriceFeed`/setters protegidos (`onlyOwner` / multisig).
 - README/docs: feeds y runbook de funding/monitoring añadido.
 - CI: job que corre tests con mocks está presente o planificado.

Qué hacer antes de merge (requisitos mínimos)

 - Añadir tests para stale, jump, decimals y permisos.
 - Integrar CI job que ejecute los tests con mocks.
 - Revisión por al menos 1 dev de contratos y 1 dev de presale/ops.
 - Documentación de feeds y procedimiento de funding en `docs/oracles.md`.
 - Reemplazar `OwnableLocal` con OpenZeppelin en PR separado si queréis mantener el scaffold mínimo ahora.

Asignad reviewers y labels sugeridos

Reviewers: @devA (owner contratos), @devB (tests), @devC (ops/CI).
Labels: feature, oracles, needs-review, draft

Notas operativas rápidas

 - Abrid el PR en draft y usadlo para discusión y comentarios.
 - No mergear hasta que los tests críticos y la policy de ownership/funding estén claros.

