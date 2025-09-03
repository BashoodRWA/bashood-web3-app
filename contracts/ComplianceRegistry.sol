// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title ComplianceRegistry
 * @dev Registry that manages compliance status using Merkle proofs
 * @notice This is a POC implementation for ERC-3643 style compliance without modifying production contracts
 */
contract ComplianceRegistry is Ownable {
    // Events
    event MerkleRootUpdated(bytes32 indexed newRoot, uint256 timestamp);
    event ComplianceChecked(address indexed user, bool isCompliant);
    
    // State variables
    bytes32 public merkleRoot;
    mapping(address => bool) public complianceOverrides;
    
    constructor(bytes32 _initialRoot) Ownable(msg.sender) {
        merkleRoot = _initialRoot;
        emit MerkleRootUpdated(_initialRoot, block.timestamp);
    }
    
    /**
     * @dev Updates the Merkle root for compliance verification
     * @param _newRoot The new Merkle root
     */
    function updateMerkleRoot(bytes32 _newRoot) external onlyOwner {
        merkleRoot = _newRoot;
        emit MerkleRootUpdated(_newRoot, block.timestamp);
    }
    
    /**
     * @dev Sets compliance override for specific address
     * @param _user Address to set override for
     * @param _compliant Compliance status to set
     */
    function setComplianceOverride(address _user, bool _compliant) external onlyOwner {
        complianceOverrides[_user] = _compliant;
    }
    
    /**
     * @dev Verifies if a user is compliant using Merkle proof
     * @param _user Address to verify
     * @param _proof Merkle proof for the user
     * @return true if user is compliant
     */
    function isCompliant(address _user, bytes32[] calldata _proof) external view returns (bool) {
        // Check for override first
        if (complianceOverrides[_user]) {
            return true;
        }
        
        // Verify Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(_user));
        bool compliant = MerkleProof.verify(_proof, merkleRoot, leaf);
        
        return compliant;
    }
    
    /**
     * @dev Checks compliance and emits event
     * @param _user Address to check
     * @param _proof Merkle proof for the user
     * @return true if user is compliant
     */
    function checkCompliance(address _user, bytes32[] calldata _proof) external returns (bool) {
        bool compliant = this.isCompliant(_user, _proof);
        emit ComplianceChecked(_user, compliant);
        return compliant;
    }
}