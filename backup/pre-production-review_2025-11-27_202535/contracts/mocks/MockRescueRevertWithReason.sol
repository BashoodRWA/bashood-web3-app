// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IBashoodRescue.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MockRescueRevertWithReason is ERC165, IBashoodRescue {
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IBashoodRescue).interfaceId || super.supportsInterface(interfaceId);
    }

    function rescueUnsoldNFTs(address, uint256, address, uint256) external pure override {
        revert("boom");
    }

    function rescueERC20(address, address, uint256) external pure override {
        revert("erc20-boom");
    }

    function emergencyWithdrawETH() external pure override {
        revert("eth-boom");
    }
}
