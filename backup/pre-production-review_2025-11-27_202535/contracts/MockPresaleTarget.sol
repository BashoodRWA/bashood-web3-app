// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPresaleTarget {
    IERC20 public immutable bashoodToken;
    address public immutable nftContract;
    address public owner;
    bool public emergencyMode = false;
    mapping(address => bool) public hasAttacked;
    
    event Purchase(address indexed buyer, uint256 amount);
    event EmergencyWithdrawal(address indexed owner, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _nft, address _token) {
        nftContract = _nft;
        bashoodToken = IERC20(_token);
        owner = msg.sender;
    }
    
    // Función vulnerable a reentrancy
    function purchaseWithETH(uint256 amount, uint256 nftId, uint256 referralCode, bytes calldata data) external payable {
        require(msg.value > 0, "Must send ETH");
        require(amount > 0, "Invalid amount");
        
        // Marcar que intentó atacar (para detectar reentrancy)
        hasAttacked[msg.sender] = true;
        
        // Vulnerable: external call antes de cambio de estado
        if (msg.sender != tx.origin) {
            // Es un contrato, intentar callback
            try IERC1155Receiver(msg.sender).onERC1155Received(
                address(this),
                msg.sender,
                nftId,
                amount,
                data
            ) returns (bytes4) {
                // Callback exitoso
            } catch {
                // Ignorar errores de callback
            }
        }
        
        emit Purchase(msg.sender, amount);
    }
    
    // Función para comprar con tokens
    function purchaseWithBHT(uint256 amount, uint256 nftId, uint256 referralCode, bytes calldata data) external {
        require(amount > 0, "Invalid amount");
        
        // Transfer tokens from user
        bashoodToken.transferFrom(msg.sender, address(this), amount);
        
        emit Purchase(msg.sender, amount);
    }
    
    // Función de emergencia vulnerable
    function emergencyWithdrawETH() external onlyOwner {
        require(!emergencyMode, "Emergency mode active");
        emergencyMode = true;
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        emit EmergencyWithdrawal(owner, balance);
        
        // Vulnerable: external call
        (bool success,) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    // Función para recibir ETH
    receive() external payable {
        // Permite recibir ETH
    }
    
    // Función para obtener balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Función para resetear estado
    function resetAttackState(address user) external {
        hasAttacked[user] = false;
    }
}