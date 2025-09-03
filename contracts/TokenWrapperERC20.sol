// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ComplianceRegistry.sol";

/**
 * @title TokenWrapperERC20
 * @dev ERC20 token with compliance checks using ComplianceRegistry
 * @notice POC wrapper token that enforces compliance before transfers
 */
contract TokenWrapperERC20 is ERC20, Ownable {
    // State variables
    ComplianceRegistry public complianceRegistry;
    bool public complianceEnabled;
    
    // Events
    event ComplianceRegistryUpdated(address indexed newRegistry);
    event ComplianceToggled(bool enabled);
    event TransferBlocked(address indexed from, address indexed to, uint256 amount, string reason);
    
    constructor(
        string memory _name,
        string memory _symbol,
        address _complianceRegistry,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
        complianceEnabled = true;
        
        // Mint initial supply to owner
        _mint(msg.sender, _initialSupply);
        
        emit ComplianceRegistryUpdated(_complianceRegistry);
    }
    
    /**
     * @dev Updates the compliance registry address
     * @param _newRegistry Address of the new compliance registry
     */
    function updateComplianceRegistry(address _newRegistry) external onlyOwner {
        complianceRegistry = ComplianceRegistry(_newRegistry);
        emit ComplianceRegistryUpdated(_newRegistry);
    }
    
    /**
     * @dev Toggles compliance checking on/off
     * @param _enabled Whether compliance should be enabled
     */
    function toggleCompliance(bool _enabled) external onlyOwner {
        complianceEnabled = _enabled;
        emit ComplianceToggled(_enabled);
    }
    
    /**
     * @dev Override transfer to include compliance checks
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        return transferWithProof(to, amount, new bytes32[](0), new bytes32[](0));
    }
    
    /**
     * @dev Override transferFrom to include compliance checks
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        return transferFromWithProof(from, to, amount, new bytes32[](0), new bytes32[](0));
    }
    
    /**
     * @dev Transfer with compliance proofs
     * @param to Recipient address
     * @param amount Amount to transfer
     * @param fromProof Merkle proof for sender (if not msg.sender)
     * @param toProof Merkle proof for recipient
     */
    function transferWithProof(
        address to,
        uint256 amount,
        bytes32[] calldata fromProof,
        bytes32[] calldata toProof
    ) public returns (bool) {
        if (complianceEnabled) {
            // Check sender compliance (msg.sender)
            if (!complianceRegistry.isCompliant(msg.sender, fromProof)) {
                emit TransferBlocked(msg.sender, to, amount, "Sender not compliant");
                return false;
            }
            
            // Check recipient compliance
            if (!complianceRegistry.isCompliant(to, toProof)) {
                emit TransferBlocked(msg.sender, to, amount, "Recipient not compliant");
                return false;
            }
        }
        
        return super.transfer(to, amount);
    }
    
    /**
     * @dev TransferFrom with compliance proofs
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @param fromProof Merkle proof for sender
     * @param toProof Merkle proof for recipient
     */
    function transferFromWithProof(
        address from,
        address to,
        uint256 amount,
        bytes32[] calldata fromProof,
        bytes32[] calldata toProof
    ) public returns (bool) {
        if (complianceEnabled) {
            // Check sender compliance
            if (!complianceRegistry.isCompliant(from, fromProof)) {
                emit TransferBlocked(from, to, amount, "Sender not compliant");
                return false;
            }
            
            // Check recipient compliance
            if (!complianceRegistry.isCompliant(to, toProof)) {
                emit TransferBlocked(from, to, amount, "Recipient not compliant");
                return false;
            }
        }
        
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Mint tokens to compliant address
     * @param to Address to mint to
     * @param amount Amount to mint
     * @param proof Merkle proof for recipient
     */
    function mintWithCompliance(
        address to,
        uint256 amount,
        bytes32[] calldata proof
    ) external onlyOwner {
        if (complianceEnabled) {
            require(
                complianceRegistry.isCompliant(to, proof),
                "Recipient not compliant"
            );
        }
        
        _mint(to, amount);
    }
}