# Anexo: Referencias de contratos y funciones

Este anexo lista las funciones y contratos priorizados, con la ruta del archivo, la firma de la función, y un fragmento de código o notas para evidenciar la implementación. Sirve para enlazar la memoria reorganizada con el código fuente.

## Índice rápido

- `contracts/BashoodRescue.sol::emergencyWithdrawETH`
- `contracts/BashoodRescue.sol::setProjectWallet`
- `contracts/BashoodRescue.sol::authorizeCaller` / `revokeCaller` / `authorizedCallers`
- `contracts/BashoodPresaleFinal.sol::purchaseWithETH`
- `contracts/BashoodPresaleFinal.sol::delegateEmergencyWithdrawEth` / `emergencyWithdrawETH` (delegación)
- `contracts/BashoodPresaleFinal.sol::setPriceFeed` / oracle checks
- `contracts/BashoodMultiToken.sol::mintAllNFTs`
- `contracts/oracles/IPriceFeed.sol::latestRoundData` and `contracts/oracles/ChainlinkPriceFeed.sol`
- `contracts/ReferralValidator.sol::isValid`

---

## BashoodRescue.sol

Ruta: `contracts/BashoodRescue.sol`

Funciones clave:

- emergencyWithdrawETH()
  - Firma: `function emergencyWithdrawETH() external onlyRole(EMERGENCY_ROLE) nonReentrant`
  - Fragmento relevante:

    (bool ok, ) = projectWallet.call{value: bal}("");
    require(ok, "Rescue: ETH transfer failed");

  - Notas: La función ahora depende de `projectWallet` almacenada por `setProjectWallet`. `nonReentrant` fue añadido como mitigación primaria. Slither sigue marcando la llamada low-level como "sends eth to arbitrary user"; se sugiere documentar este comportamiento en la memoria y proponer opciones (pull-payments / whitelist / contract-only).

- setProjectWallet(address payable _projectWallet)
  - Firma: `function setProjectWallet(address payable _projectWallet) external onlyRole(ADMIN_ROLE)`
  - Fragmento relevante:

    require(_projectWallet != address(0), "Rescue: invalid wallet");
    projectWallet = _projectWallet;

  - Notas: Setter administrativo usado en tests para proporcionar el address destino.

- authorizeCaller / revokeCaller / mapping authorizedCallers
  - Nota: Permite permitir que contratos (por ejemplo el presale) invoquen rescates sin ADMIN_ROLE.

---

## BashoodPresaleFinal.sol

Ruta: `contracts/BashoodPresaleFinal.sol`

Funciones clave:

- purchaseWithETH(uint256 nftId, uint256 quantity, uint256 nonce, bytes calldata signature)
  - Firma: `function purchaseWithETH(...) external payable nonReentrant onlyWhilePresaleActive whitelistCheck`
  - Fragmento relevante:

    // Checks passed, update state before external calls
    totalNFTsSold += quantity;
    userPurchases[msg.sender] += quantity;

    // Interactions
    (bool sent, ) = projectWallet.call{value: msg.value}("");
    require(sent, "ETH transfer failed");
    nftContract.safeTransferFrom(address(this), msg.sender, nftId, quantity, "");

  - Notas: Actualiza el estado antes de las llamadas externas (buena práctica). Sin embargo, el envío directo a `projectWallet` es un low-level call que Slither marca. Existe manejo de referidos llamando `referralContract.rewardReferrer(...)` después de transfer.

- delegateEmergencyWithdrawEth()
  - Firma: `function delegateEmergencyWithdrawEth() external onlyRole(EMERGENCY_ROLE) nonReentrant`
  - Fragmento relevante:

    try IBashoodRescue(rescueContract).emergencyWithdrawETH() {
        // success
    } catch Error(string memory reason) {
        revert(string(abi.encodePacked("Delegate rescue ETH failed: ", reason)));
    } catch {
        revert("Delegate rescue ETH failed");
    }

  - Notas: Delegación protegida por roles y `try/catch` para propagar razones cuando el contrato de rescue revierte.

- setPriceFeed(address newFeed) / setMaxPriceStaleness / oracle checks
  - Uso de `priceFeed.latestRoundData()` en `_bhtFromFiat`, `submitProposal`, etc. Se realiza validación de `updatedAt`, `answer > 0`, y `answeredInRound >= roundId`.

---

## BashoodMultiToken.sol

Ruta: `contracts/BashoodMultiToken.sol`

Funciones clave:

- mintAllNFTs()
  - Firma: `function mintAllNFTs() external onlyOwner nonReentrant`
  - Fragmento relevante:

    require(nftCounter == 1, "NFTs ya han sido minteados");
    // defense-in-depth: mark nftCounter as final value before minting to avoid
    // potential reentrancy or callback-based re-entry relying on the precondition.
    nftCounter = 31;

    address contractOwner = owner();

    for (uint256 i = 1; i <= 30; i++) {
        nftOwners[i] = contractOwner;
        _mint(contractOwner, BASHOOD_NFT, 1, "");
    }

  - Notas: Se escribe `nftOwners[i]` antes de la llamada a `_mint` como mitigación; además la función es `nonReentrant`. Slither marcó un posible vector de reentrancy vía ERC1155 receiver callbacks — PoC existe en `contracts/mocks/ERC1155ReentrantReceiver.sol`.

---

## Oráculos: IPriceFeed / ChainlinkPriceFeed

- IPriceFeed.latestRoundData()
  - Ruta: `contracts/oracles/IPriceFeed.sol`
  - Firma: `function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);`

- ChainlinkPriceFeed (wrapper)
  - Ruta: `contracts/oracles/ChainlinkPriceFeed.sol`
  - Funciones: `getLatestPrice()`, `peekLatestPrice()`, `setFeed(...)`, `setStalenessThreshold(...)`, `setMaxChangePct(...)`
  - Fragmento relevante:

    (, int256 answer, , uint256 uAt, uint80 answeredInRound) = feed.latestRoundData();
    require(uAt != 0, "stale: updatedAt=0");
    require(answer > 0, "invalid: answer<=0");
    require(answeredInRound != 0, "invalid: answeredInRound=0");
    require(block.timestamp - uAt <= stalenessThreshold, "stale");

  - Notas: Wrapper aplica controles de estalecimiento y cambio porcentual máximo; útil como evidencia de control de oráculos en la memoria.

---

## ReferralValidator.sol

Ruta: `contracts/ReferralValidator.sol`

- isValid(address referrer)
  - Firma: `function isValid(address referrer) external view override returns (bool)`
  - Fragmento relevante:

    function isValid(address referrer) external view override returns (bool) {
        return referrer != address(0);
    }

  - Notas: Implementación de pruebas que considera cualquier dirección no-cero válida; se usa en PoC/tests para reproducir fallos de validación.

---

## Mocks y PoC

- `contracts/mocks/MockProjectWalletRevert.sol` — simula que `projectWallet` revierte al recibir ETH (usado en `test/poc.rescue.emergencyWithdraw.revert.test.cjs`).
- `contracts/mocks/ERC1155ReentrantReceiver.sol` — receptor que intenta reentrar durante `onERC1155Received` (PoC contra `mintAllNFTs`).
- `contracts/mocks/AttackerOwner.sol` — contrato que llama `mintAllNFTs` como owner para simular un owner-malicioso.

---

## Recomendaciones para la memoria

- Enlazar cada función listada arriba con el fragmento y el test PoC correspondiente (ej: `BashoodRescue.emergencyWithdrawETH` -> `test/poc.bashoodrescue.reentrancy.test.js` y `contracts/mocks/MockProjectWalletRevert.sol`).
- Incluir capturas de salida de las ejecuciones PoC (logs/reverts) en `docs/anexos/poc_snippets.md` (próximo anexo).
- Adjuntar `slither-run3.json` como evidencia de análisis estático en la memoria y enlazar los flags relevantes a las funciones indicadas.

---

(Generado automáticamente por el script de extracción. Si quieres que incluya números de línea exactos o fragmentos más largos, dime y lo actualizo.)
