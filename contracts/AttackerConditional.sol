// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

interface IBashoodMultiToken {
    function mintAllNFTs() external;
    function withdrawFunds() external;
}

contract AttackerConditional is IERC1155Receiver {
    IBashoodMultiToken public target;
    address public deployer;
    bool public withdrew;

    constructor() {
        deployer = msg.sender;
    }

    function setTarget(address _target) external {
        require(msg.sender == deployer, "only deployer");
        target = IBashoodMultiToken(_target);
    }

    // If calldata payload's first byte == 0x01, try withdraw
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata data
    ) external override returns (bytes4) {
        if (data.length > 0 && data[0] == 0x01) {
            try target.withdrawFunds() {
                withdrew = true;
            } catch {
                withdrew = false;
            }
        }
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return false;
    }

    function attack() external {
        require(address(target) != address(0), "target not set");
        target.mintAllNFTs();
    }
}
