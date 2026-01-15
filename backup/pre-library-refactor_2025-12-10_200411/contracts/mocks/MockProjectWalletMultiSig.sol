// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IRescueClaim {
    function claimEmergencyWithdrawal() external;
}

/// @notice Minimal multisig-like mock used for testing: owners must call `approve()`
/// and when approvals >= threshold anyone can call `executeClaim` which calls
/// `claimEmergencyWithdrawal` on the configured rescue contract.
contract MockProjectWalletMultiSig {
    mapping(address => bool) public isOwner;
    mapping(address => bool) public approved;
    address[] public owners;
    uint256 public threshold;
    uint256 public approvalCount;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Multisig: not owner");
        _;
    }

    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length > 0, "Multisig: no owners");
        require(_threshold > 0 && _threshold <= _owners.length, "Multisig: invalid threshold");
        owners = _owners;
        threshold = _threshold;
        for (uint i = 0; i < _owners.length; i++) {
            isOwner[_owners[i]] = true;
        }
    }

    /// @notice Owner approves the next execution
    function approve() external onlyOwner {
        require(!approved[msg.sender], "Multisig: already approved");
        approved[msg.sender] = true;
        approvalCount += 1;
    }

    /// @notice Reset approvals (for tests convenience)
    function resetApprovals() external onlyOwner {
        for (uint i = 0; i < owners.length; i++) {
            if (approved[owners[i]]) {
                approved[owners[i]] = false;
            }
        }
        approvalCount = 0;
    }

    /// @notice Execute claim on rescue contract if threshold reached
    function executeClaim(address rescue) external {
        require(approvalCount >= threshold, "Multisig: insufficient approvals");
        // execute claim as this contract (msg.sender in rescue will be this contract)
        IRescueClaim(rescue).claimEmergencyWithdrawal();
    }

    /// @notice Allow owners to withdraw ETH from this multisig for testing distributions
    function withdrawTo(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Multisig: insufficient balance");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Multisig: transfer failed");
    }

    receive() external payable {}
}
