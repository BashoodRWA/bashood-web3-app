# Compliance Registry POC - Merkle Implementation

## Overview

This POC implements a compliance registry system using Merkle trees for ERC-3643 style transfer controls without modifying existing production contracts.

## Architecture

### ComplianceRegistry.sol
- **Purpose**: Manages compliance status using Merkle proofs
- **Key Features**:
  - Merkle root based verification
  - Owner-controlled compliance overrides
  - Event logging for compliance checks
  - Upgradeable Merkle root

### TokenWrapperERC20.sol
- **Purpose**: ERC20 token wrapper with compliance checks
- **Key Features**:
  - Standard ERC20 functionality
  - Compliance-gated transfers
  - Merkle proof validation
  - Compliance toggle (emergency override)
  - Compliance-checked minting

## Key Components

### Merkle Tree Implementation
- Each compliant address is hashed using `keccak256(abi.encodePacked(address))`
- Merkle tree is constructed off-chain
- Proofs are provided with each transaction
- Root stored on-chain for verification

### Transfer Flow
1. User initiates transfer with Merkle proofs
2. Contract verifies sender compliance
3. Contract verifies recipient compliance
4. If both compliant, transfer proceeds
5. If either non-compliant, transfer is blocked and event emitted

## Usage Examples

### Deployment
```bash
npx hardhat run scripts/deploy-compliance-poc.js --network localhost
```

### Testing Compliance
```javascript
// Check if address is compliant
const isCompliant = await complianceRegistry.isCompliant(userAddress, merkleProof);

// Transfer with compliance check
await tokenWrapper.transferWithProof(recipient, amount, senderProof, recipientProof);
```

### Updating Compliance List
```javascript
// Owner can update Merkle root
await complianceRegistry.updateMerkleRoot(newMerkleRoot);

// Or set individual overrides
await complianceRegistry.setComplianceOverride(address, true);
```

## Security Considerations

### Strengths
- **Scalable**: O(log n) verification cost
- **Privacy-preserving**: Only reveals compliance status, not identity mapping
- **Upgradeable**: Merkle root can be updated
- **Override capability**: Emergency compliance overrides
- **Event logging**: Full audit trail

### Limitations
- **Merkle proof requirement**: Users must obtain proofs off-chain
- **Root update trust**: Owner controls compliance list
- **Gas costs**: Additional verification steps increase transaction costs

## Testing

### Local Testing
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Run specific test
npx hardhat test test/compliance.registry.test.js
```

### Test Coverage
- ✅ Merkle proof verification
- ✅ Compliant address transfers
- ✅ Non-compliant address blocking
- ✅ Compliance overrides
- ✅ Merkle root updates
- ✅ Emergency compliance toggle

## Deployment Networks

### Local Development
```bash
npx hardhat node
npx hardhat run scripts/deploy-compliance-poc.js --network localhost
```

### Testnet Deployment
```bash
# Set environment variables
export RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export PRIVATE_KEY="your_private_key"

# Deploy
npx hardhat run scripts/deploy-compliance-poc.js --network sepolia
```

## Integration Guide

### Frontend Integration
```javascript
// 1. Generate Merkle proof off-chain
const merkleProof = generateMerkleProof(userAddress, compliantAddressList);

// 2. Call transfer with proof
await tokenContract.transferWithProof(
  recipientAddress,
  amount,
  senderProof,
  recipientProof
);
```

### Backend Integration
```javascript
// Maintain compliance list and generate proofs
class ComplianceService {
  constructor(compliantAddresses) {
    this.updateComplianceList(compliantAddresses);
  }
  
  updateComplianceList(addresses) {
    const leaves = addresses.map(addr => 
      ethers.keccak256(ethers.solidityPacked(["address"], [addr]))
    );
    this.merkleTree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
  }
  
  getProof(address) {
    const leaf = ethers.keccak256(ethers.solidityPacked(["address"], [address]));
    return this.merkleTree.getHexProof(leaf);
  }
  
  getMerkleRoot() {
    return this.merkleTree.getHexRoot();
  }
}
```

## Future Enhancements

1. **Multi-tier Compliance**: Different compliance levels with different roots
2. **Time-based Compliance**: Expiring compliance with timestamp verification
3. **Batch Operations**: Efficient batch transfers with single proof
4. **Compliance Delegation**: Allow compliance verification delegates
5. **Compliance Metadata**: Store additional compliance data on-chain

## Gas Optimization

- Merkle proof verification: ~3,000-5,000 gas per proof
- Transfer overhead: ~10,000-15,000 gas
- Consider batch operations for multiple transfers
- Cache compliance results for frequent users

## Audit Checklist

- [ ] Merkle tree implementation correctness
- [ ] Access control on administrative functions
- [ ] Event emission for all state changes
- [ ] Proper error handling and revert messages
- [ ] Gas optimization review
- [ ] Integration test coverage