// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

interface IBashoodMultiToken {
    function mintAllNFTs() external;
    function withdrawFunds() external;
}

contract AttackerLoop is IERC1155Receiver {
    IBashoodMultiToken public target;
    address public deployer;
    uint256 public attempts;
    uint256 public successes;

    constructor() {
        deployer = msg.sender;
    }

    function setTarget(address _target) external {
        require(msg.sender == deployer, "only deployer");
        target = IBashoodMultiToken(_target);
    }

    // Attempt to call withdrawFunds multiple times
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        for (uint256 i = 0; i < 5; i++) {
            attempts++;
            try target.withdrawFunds() {
                successes++;
            } catch {
                // ignore
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
