// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../IBashoodRescue.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title MaliciousRescue
 * @notice Mock rescue contract que soporta IBashoodRescue pero revierte sin Error(string)
 * @dev Usado para testing de catch blocks genéricos
 */
contract MaliciousRescue is IBashoodRescue, IERC1155Receiver {
    function rescueERC20(address, address, uint256) external pure override {
        // Revert sin mensaje (panic / generic catch)
        assembly {
            revert(0, 0)
        }
    }

    function rescueUnsoldNFTs(address, uint256, address, uint256) external pure override {
        // Revert sin mensaje (panic / generic catch)
        assembly {
            revert(0, 0)
        }
    }

    function emergencyWithdrawETH() external pure override {
        // Revert sin mensaje
        assembly {
            revert(0, 0)
        }
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) 
        external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) 
        external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(IBashoodRescue).interfaceId ||
               interfaceId == type(IERC1155Receiver).interfaceId ||
               interfaceId == type(IERC165).interfaceId;
    }
}
