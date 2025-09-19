// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

interface IBashoodMultiToken {
    function mintAllNFTs() external;
    function withdrawFunds() external;
    function owner() external view returns (address);
    function nftCounter() external view returns (uint256);
}

contract AttackerReceiver is IERC1155Receiver {
    IBashoodMultiToken public target;
    address public deployer;
    bool public withdrawAttempted;
    bool public withdrawSucceeded;

    constructor() {
        deployer = msg.sender;
    }

    function setTarget(address _target) external {
        require(msg.sender == deployer, "only deployer");
        target = IBashoodMultiToken(_target);
    }

    // Initiates the attack by calling mintAllNFTs from this contract (this contract must be the owner of the token contract)
    function attack() external {
        // call into target as the contract (so msg.sender == address(this) inside target)
        target.mintAllNFTs();
    }

    // ERC1155Receiver hook: during mint this will be called if the recipient is a contract
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        // Attempt to withdraw funds while mintAllNFTs is still executing.
        // If ReentrancyGuard is effective, this call will revert and be caught below.
        withdrawAttempted = true;
        try target.withdrawFunds() {
            withdrawSucceeded = true;
        } catch {
            withdrawSucceeded = false;
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
}
