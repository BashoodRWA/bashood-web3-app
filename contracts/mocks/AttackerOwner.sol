// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBashoodMultiToken {
    function mintAllNFTs() external;
    function withdrawFunds() external;
}

contract AttackerOwner {
    IBashoodMultiToken public target;
    bool public attemptedWithdraw;

    constructor(address _target) {
        target = IBashoodMultiToken(_target);
    }

    // Caller triggers mintAllNFTs from this contract (this contract is the owner of the token contract)
    function triggerMint() external {
        target.mintAllNFTs();
    }

    // ERC1155 receiver hook — called when tokens are minted to this contract
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external returns (bytes4) {
        // attempt to call withdrawFunds (onlyOwner + nonReentrant in target)
        attemptedWithdraw = false;
        try target.withdrawFunds() {
            attemptedWithdraw = true;
        } catch {
            attemptedWithdraw = false;
        }
        return this.onERC1155Received.selector;
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }
}
