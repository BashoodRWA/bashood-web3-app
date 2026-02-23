// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../BashoodToken.sol";

/**
 * @title EchidnaBashoodTokenTest
 * @notice Echidna property-based testing for BashoodToken (ERC20)
 * @dev BashoodToken uses Ownable + timelock pause (requestPause/executePause)
 *      Has burn rate (max 1%) and treasury fee (max 2%)
 */
contract EchidnaBashoodTokenTest {
    BashoodToken public token;
    
    uint256 public initialSupply;
    
    mapping(address => bool) public hasBalance;
    address[] public holders;
    
    constructor() {
        token = new BashoodToken(address(this));
        initialSupply = token.totalSupply();
    }
    
    // ==================== ECHIDNA PROPERTIES ====================
    
    /// @notice Total supply should only decrease (burns) never increase
    function echidna_total_supply_no_inflation() public view returns (bool) {
        return token.totalSupply() <= initialSupply;
    }
    
    /// @notice Balance should never exceed total supply
    function echidna_balance_not_exceed_supply() public view returns (bool) {
        return token.balanceOf(address(this)) <= token.totalSupply();
    }
    
    /// @notice Owner should maintain control
    function echidna_owner_preserved() public view returns (bool) {
        return token.owner() == address(this);
    }
    
    /// @notice Zero address should have zero balance
    function echidna_zero_address_empty() public view returns (bool) {
        return token.balanceOf(address(0)) == 0;
    }
    
    /// @notice Burn accounting is consistent
    function echidna_burn_accounting() public view returns (bool) {
        uint256 currentSupply = token.totalSupply();
        uint256 totalBurned = token.totalBurned();
        return initialSupply - currentSupply == totalBurned;
    }
    
    /// @notice Burn rate should never exceed max (1% = 100 bps)
    function echidna_burn_rate_within_max() public view returns (bool) {
        return token.burnRate() <= 100;
    }
    
    /// @notice Treasury fee should never exceed max (2% = 200 bps)
    function echidna_treasury_fee_within_max() public view returns (bool) {
        return token.treasuryFee() <= 200;
    }
    
    /// @notice Treasury wallet should never be zero address
    function echidna_treasury_wallet_not_zero() public view returns (bool) {
        return token.treasuryWallet() != address(0);
    }
    
    /// @notice Sum of known balances never exceeds total supply
    function echidna_conservation_of_tokens() public view returns (bool) {
        uint256 sumBalances = token.balanceOf(address(this));
        for (uint i = 0; i < holders.length && i < 10; i++) {
            sumBalances += token.balanceOf(holders[i]);
        }
        return sumBalances <= token.totalSupply();
    }
    
    /// @notice No overdraft possible
    function echidna_no_overdraft() public view returns (bool) {
        return token.balanceOf(address(this)) <= initialSupply;
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    function doTransfer(address to, uint256 amount) public {
        if (to != address(0) && amount > 0 && amount <= token.balanceOf(address(this))) {
            token.transfer(to, amount);
            if (!hasBalance[to] && holders.length < 100) {
                hasBalance[to] = true;
                holders.push(to);
            }
        }
    }
    
    function doApprove(address spender, uint256 amount) public {
        token.approve(spender, amount);
    }
    
    function trySetBurnRate(uint256 newRate) public {
        try token.setBurnRate(newRate) {} catch {}
    }
    
    function trySetTreasuryFee(uint256 newFee) public {
        try token.setTreasuryFee(newFee) {} catch {}
    }
    
    function tryRequestPause() public {
        try token.requestPause() {} catch {}
    }
    
    function tryExecutePause() public {
        try token.executePause() {} catch {}
    }
    
    receive() external payable {}
}
