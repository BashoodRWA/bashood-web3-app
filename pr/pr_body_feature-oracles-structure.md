PR body backup: feature/oracles-structure

Título: feat: scaffold Chainlink oracles (adapter + mocks skeleton)

Cuerpo:

Resumen

Qué: Añade estructura mínima para oráculos en `contracts/oracles` y `contracts/mocks`: interfaz `IPriceFeed`, wrapper Chainlink (con staleness/answeredInRound/sanity checks), mock local y test básico. Incluye `OwnableLocal` para pruebas rápidas y README corto.
Por qué: permitir integrar el price feed verificable para la preventa sin tocar la PoC principal; facilita revisión y pruebas aisladas.

Resultado actual: branch `feature/oracles-structure` con un test básico que pasa (1 passing). El PR está en modo draft para revisión y ampliación de tests.

(Backup creado automáticamente para evitar pérdidas futuras.)
