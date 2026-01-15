// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

/**
 * @title MockPresaleTarget
 * @dev Mock simple para testing del atacante
 */
contract MockPresaleTarget {
    uint256 public constant PRICE = 0.1 ether;
    address public immutable nftContract;
    address public immutable tokenContract;
    mapping(address => uint256) public purchases;
    
    event Purchase(address buyer, uint256 amount);
    
    constructor(address _nftContract, address _tokenContract) {
        nftContract = _nftContract;
        tokenContract = _tokenContract;
    }
    
    function purchaseWithETH(uint256, uint256 quantity, uint256, bytes calldata) external payable {
        require(msg.value >= PRICE * quantity, "Insufficient payment");
        purchases[msg.sender] += quantity;
        
        // Trigger callback to test reentrancy
        if (msg.sender.code.length > 0) {
            try IERC1155Receiver(msg.sender).onERC1155Received(
                address(this), 
                msg.sender, 
                1, 
                quantity, 
                ""
            ) {} catch {}
        }
        
        emit Purchase(msg.sender, quantity);
    }
    
    function purchaseWithBHT(uint256, uint256 quantity, uint256, bytes calldata) external {
        purchases[msg.sender] += quantity;
        emit Purchase(msg.sender, quantity);
    }
    
    function emergencyWithdrawETH() external {
        require(msg.sender.code.length > 0, "Only contracts");
        // This would normally have access control
        payable(msg.sender).transfer(address(this).balance / 2); // Only transfer half for safety
    }
    
    receive() external payable {}
}