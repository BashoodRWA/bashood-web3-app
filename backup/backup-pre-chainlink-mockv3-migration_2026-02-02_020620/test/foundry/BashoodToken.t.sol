// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../../contracts/BashoodToken.sol";

/// @title BashoodToken Foundry Test Suite
/// @notice Comprehensive test suite for BashoodToken using Foundry framework
/// @dev Includes unit tests, fuzz tests, and invariant testing
contract BashoodTokenTest is Test {
    BashoodToken public bashoodToken;
    address public owner;
    address public treasuryWallet;
    address public user1;
    address public user2;
    
    // Constants
    uint256 constant INITIAL_SUPPLY = 1_000_000_000e18; // 1 billion tokens
    uint256 constant MAX_SUPPLY = 1_000_000_000e18;
    
    // Events to test
    event Transfer(address indexed from, address indexed to, uint256 value);
    event TaxHandlerUpdated(address oldHandler, address newHandler);
    
    function setUp() public {
        // Setup addresses
        owner = address(this);
        treasuryWallet = makeAddr("treasury");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        console.log("🔧 Setting up BashoodToken test environment");
        console.log("Owner:", owner);
        console.log("Treasury:", treasuryWallet);
        
        // Deploy BashoodToken
        bashoodToken = new BashoodToken(treasuryWallet);
        
        console.log("✅ BashoodToken deployed at:", address(bashoodToken));
        console.log("Total Supply:", bashoodToken.totalSupply());
    }
    
    // ==================== BASIC FUNCTIONALITY TESTS ====================
    
    function test_InitialState() public {
        assertEq(bashoodToken.name(), "BashoodToken");
        assertEq(bashoodToken.symbol(), "BHT");
        assertEq(bashoodToken.decimals(), 18);
        assertEq(bashoodToken.totalSupply(), INITIAL_SUPPLY);
        assertEq(bashoodToken.balanceOf(treasuryWallet), INITIAL_SUPPLY);
        assertEq(bashoodToken.owner(), owner);
        
        console.log("✅ Initial state verified");
    }
    
    function test_Transfer() public {
        // Fund user1 for testing
        vm.prank(treasuryWallet);
        bashoodToken.transfer(user1, 1000e18);
        
        // Test normal transfer
        vm.prank(user1);
        bashoodToken.transfer(user2, 100e18);
        
        assertEq(bashoodToken.balanceOf(user1), 900e18);
        assertEq(bashoodToken.balanceOf(user2), 100e18);
        
        console.log("✅ Transfer functionality verified");
    }
    
    function test_Approve() public {
        vm.prank(treasuryWallet);
        bashoodToken.approve(user1, 500e18);
        
        assertEq(bashoodToken.allowance(treasuryWallet, user1), 500e18);
        
        console.log("✅ Approval functionality verified");
    }
    
    function test_TransferFrom() public {
        // Setup approval
        vm.prank(treasuryWallet);
        bashoodToken.approve(user1, 1000e18);
        
        // Transfer from treasury to user2 via user1
        vm.prank(user1);
        bashoodToken.transferFrom(treasuryWallet, user2, 500e18);
        
        assertEq(bashoodToken.balanceOf(user2), 500e18);
        assertEq(bashoodToken.allowance(treasuryWallet, user1), 500e18);
        
        console.log("✅ TransferFrom functionality verified");
    }
    
    // ==================== ACCESS CONTROL TESTS ====================
    
    function test_OnlyOwnerCanSetTaxHandler() public {
        address newTaxHandler = makeAddr("newTaxHandler");
        
        // Should work as owner
        bashoodToken.setTaxHandler(newTaxHandler);
        
        // Should fail as non-owner
        vm.prank(user1);
        vm.expectRevert();
        bashoodToken.setTaxHandler(newTaxHandler);
        
        console.log("✅ Tax handler access control verified");
    }
    
    function test_OnlyOwnerCanPause() public {
        // Should work as owner
        bashoodToken.pause();
        assertTrue(bashoodToken.paused());
        
        bashoodToken.unpause();
        assertFalse(bashoodToken.paused());
        
        // Should fail as non-owner
        vm.prank(user1);
        vm.expectRevert();
        bashoodToken.pause();
        
        console.log("✅ Pause access control verified");
    }
    
    // ==================== FUZZ TESTS ====================
    
    /// @notice Fuzz test for transfer with random amounts
    function testFuzz_Transfer(uint256 amount) public {
        // Bound amount to reasonable range
        amount = bound(amount, 0, INITIAL_SUPPLY);
        
        vm.prank(treasuryWallet);
        
        if (amount <= bashoodToken.balanceOf(treasuryWallet)) {
            bashoodToken.transfer(user1, amount);
            assertEq(bashoodToken.balanceOf(user1), amount);
        } else {
            vm.expectRevert();
            bashoodToken.transfer(user1, amount);
        }
    }
    
    /// @notice Fuzz test for approval with random amounts
    function testFuzz_Approve(address spender, uint256 amount) public {
        vm.assume(spender != address(0));
        amount = bound(amount, 0, type(uint256).max);
        
        vm.prank(treasuryWallet);
        bashoodToken.approve(spender, amount);
        
        assertEq(bashoodToken.allowance(treasuryWallet, spender), amount);
    }
    
    /// @notice Fuzz test for multiple transfers maintaining total supply
    function testFuzz_MultipleTransfers(
        uint256 amount1,
        uint256 amount2,
        uint256 amount3
    ) public {
        // Bound amounts
        amount1 = bound(amount1, 0, INITIAL_SUPPLY / 3);
        amount2 = bound(amount2, 0, INITIAL_SUPPLY / 3);
        amount3 = bound(amount3, 0, INITIAL_SUPPLY / 3);
        
        uint256 totalTransferred = amount1 + amount2 + amount3;
        vm.assume(totalTransferred <= INITIAL_SUPPLY);
        
        uint256 initialSupply = bashoodToken.totalSupply();
        
        vm.startPrank(treasuryWallet);
        bashoodToken.transfer(user1, amount1);
        bashoodToken.transfer(user2, amount2);
        bashoodToken.transfer(makeAddr("user3"), amount3);
        vm.stopPrank();
        
        // Total supply should remain constant
        assertEq(bashoodToken.totalSupply(), initialSupply);
        
        // Individual balances should be correct
        assertEq(bashoodToken.balanceOf(user1), amount1);
        assertEq(bashoodToken.balanceOf(user2), amount2);
    }
    
    // ==================== INVARIANT TESTS ====================
    
    /// @notice Invariant: Total supply should never change
    function invariant_TotalSupplyConstant() public view {
        assertEq(bashoodToken.totalSupply(), INITIAL_SUPPLY);
    }
    
    /// @notice Invariant: Sum of all balances should equal total supply
    function invariant_BalanceSumEqualsSupply() public view {
        // This would require tracking all addresses with balances
        // For now, we'll test with known addresses
        uint256 treasuryBalance = bashoodToken.balanceOf(treasuryWallet);
        uint256 user1Balance = bashoodToken.balanceOf(user1);
        uint256 user2Balance = bashoodToken.balanceOf(user2);
        uint256 contractBalance = bashoodToken.balanceOf(address(bashoodToken));
        
        uint256 knownBalances = treasuryBalance + user1Balance + user2Balance + contractBalance;
        
        // Known balances should not exceed total supply
        assertLe(knownBalances, INITIAL_SUPPLY);
    }
    
    // ==================== STRESS TESTS ====================
    
    function test_StressTransfers() public {
        console.log("🔥 Starting stress test with 100 transfers");
        
        vm.startPrank(treasuryWallet);
        
        for (uint256 i = 0; i < 100; i++) {
            address recipient = makeAddr(string(abi.encodePacked("recipient", i)));
            bashoodToken.transfer(recipient, 1000e18);
        }
        
        vm.stopPrank();
        
        // Verify treasury balance decreased appropriately
        uint256 expectedBalance = INITIAL_SUPPLY - (100 * 1000e18);
        assertEq(bashoodToken.balanceOf(treasuryWallet), expectedBalance);
        
        console.log("✅ Stress test completed successfully");
    }
    
    // ==================== EDGE CASES ====================
    
    function test_TransferToSelf() public {
        uint256 initialBalance = bashoodToken.balanceOf(treasuryWallet);
        
        vm.prank(treasuryWallet);
        bashoodToken.transfer(treasuryWallet, 1000e18);
        
        // Balance should remain the same
        assertEq(bashoodToken.balanceOf(treasuryWallet), initialBalance);
        
        console.log("✅ Self-transfer handled correctly");
    }
    
    function test_ZeroTransfer() public {
        uint256 initialBalance = bashoodToken.balanceOf(treasuryWallet);
        
        vm.prank(treasuryWallet);
        bashoodToken.transfer(user1, 0);
        
        assertEq(bashoodToken.balanceOf(treasuryWallet), initialBalance);
        assertEq(bashoodToken.balanceOf(user1), 0);
        
        console.log("✅ Zero transfer handled correctly");
    }
    
    function test_TransferWhenPaused() public {
        vm.prank(treasuryWallet);
        bashoodToken.transfer(user1, 1000e18);
        
        // Pause the contract
        bashoodToken.pause();
        
        // Transfers should fail when paused
        vm.prank(user1);
        vm.expectRevert();
        bashoodToken.transfer(user2, 500e18);
        
        // Unpause and try again
        bashoodToken.unpause();
        
        vm.prank(user1);
        bashoodToken.transfer(user2, 500e18);
        
        assertEq(bashoodToken.balanceOf(user2), 500e18);
        
        console.log("✅ Pause functionality verified");
    }
}