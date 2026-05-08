# Production patch suggestions (informational)

Este documento propone cambios mínimos y snippets para mitigar hallazgos prioritarios de Slither. Ningún cambio ha sido aplicado; estas son sugerencias para revisión y PR posterior.

## 1) BashoodRescue.sol — arbitrary-send-eth (High)

Problemática
- `emergencyWithdrawETH` hace `projectWallet.call{value: bal}("")` y requiere `ok`.
- Si `projectWallet` rechaza (por diseño o por fallback que revierte), la llamada revierte y la emergencia falla.

Propuesta (opcional)
- Usar pull-over-push: en vez de forzar el `call`, almacenar el saldo pendiente y permitir que el `projectWallet` retire (pull) o emitir un evento para que un guardian retire por otro mecanismo.
- Si se mantiene el push, envolver con reintentos limitados no es viable on-chain; preferir fallback a una `treasury` alternativa si `call` falla.

Snippet minimal (fallback to `operationsWallet` or `pendingWithdrawals`):

```solidity
// pseudo-code suggestion
mapping(address => uint256) public pendingWithdrawals;

function emergencyWithdrawETH(address payable projectWallet) external onlyRole(EMERGENCY_ROLE) {
    require(projectWallet != address(0), "Rescue: invalid wallet");
    uint256 bal = address(this).balance;
    require(bal > 0, "Rescue: no ETH");

    (bool ok, ) = projectWallet.call{value: bal}("");
    if (!ok) {
        // store for pull by project wallet or an admin
        pendingWithdrawals[projectWallet] += bal;
        emit EmergencyEthWithdrawFailed(projectWallet, bal);
        return;
    }
    emit EmergencyEthWithdrawn(projectWallet, bal);
}

function withdrawPending() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    require(amount > 0, "none");
    pendingWithdrawals[msg.sender] = 0;
    (bool ok, ) = payable(msg.sender).call{value: amount}("");
    require(ok, "withdraw failed");
}
```

Notas
- Este cambio altera comportamiento (introduce pull mechanism). Evaluar si aceptable para tu modelo operativo.

## 2) BashoodMultiToken.sol — reentrancy-no-eth (Medium)

Problemática
- `mintAllNFTs` puede realizar llamadas externas (transfer/mint) antes de actualizar estado, Slither marca riesgo de reentrancy.

Propuesta
- Aplicar Checks-Effects-Interactions: actualizar todos los estados antes de llamadas externas. Añadir `nonReentrant` desde OpenZeppelin ReentrancyGuard si procedente.

Snippet mínimo

```solidity
// before: external calls then state write
// after: state writes first
_mintLoop(...); // update storage counters
for (...) {
    nft.mint(...); // external call
}

// o usar ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
contract BashoodMultiToken is ReentrancyGuard { ...
function mintAllNFTs(...) external nonReentrant { ... }
}
```

## 3) BashoodPresaleFinal.sol — divide-before-multiply & unused-return (Medium)

Problemática 1: divide-before-multiply en `_payServiceWithBHT` / `_payMilestoneWithBHT` puede truncar y generar pérdida de precisión.

Propuesta 1
- Reordenar operaciones para multiplicar antes de dividir usando `mulDiv` where possible (OpenZeppelin Math.mulDiv) o (a*b)/c with checked order and rounding.

Snippet mínimo

```solidity
uint256 amount = Math.mulDiv(fiatAmount, rate, 10**decimals);
```

Problemática 2: Se ignora el valor retornado por `latestRoundData()` (Chainlink); Slither lo marca como `unused-return`.

Propuesta 2
- Usar las variables retornadas explícitamente (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData(); y validar `answeredInRound >= roundId` o verificar `updatedAt` para evitar usar datos stale.

Snippet mínimo

```solidity
(
    uint80 roundId,
    int256 answer,
    ,
    uint256 updatedAt,
    uint80 answeredInRound
) = priceFeed.latestRoundData();
require(answer > 0, "zero price");
require(block.timestamp - updatedAt <= maxPriceStaleness, "stale");
```

## Próximos pasos sugeridos
1. Revisar la aceptación de behavioral changes (pull vs push) antes de aplicar cambios en Rescue.
2. Implementar y testear PoC para reentrancy en `BashoodMultiToken` usando tests que provoquen reentrancy a través de un mock receptor.
3. Aplicar cambios de precisión en Presale y añadir tests que validen conversiones fiat->token y redondeos.

Nota: No apliqué estos cambios en el código; estos snippets se proponen como PRs separados que deben incluir tests y revisión de seguridad.
