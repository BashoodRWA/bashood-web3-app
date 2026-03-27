// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/**
 * @title MockNFT1155Reverting
 * @notice ERC1155 que revierte en safeTransferFrom para simular NFT malicioso/roto.
 *         Permite recibir tokens (mint + transferFrom hacia sí mismo funciona),
 *         pero revierte cuando el PRESALE intenta transferir al comprador.
 *         El presale-contract se configura como target del revert vía setRevertTarget.
 */
contract MockNFT1155Reverting is ERC1155 {
    address public revertFrom;
    bool public revertEnabled;

    constructor() ERC1155("") {}

    function mint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }

    /// @notice Configura la dirección desde la cual los transfers deben revertir
    function setRevertTarget(address from_) external {
        revertFrom = from_;
        revertEnabled = true;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        if (revertEnabled && from == revertFrom) {
            revert("NFT: transfer blocked");
        }
        super.safeTransferFrom(from, to, id, amount, data);
    }
}
