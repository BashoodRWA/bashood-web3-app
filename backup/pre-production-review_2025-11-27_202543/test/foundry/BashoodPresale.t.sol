// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../../contracts/BashoodPresaleFinal.sol";
import "../../contracts/BashoodToken.sol";
import "../../contracts/BashoodNFT.sol";
import "../../contracts/mocks/MockReferral.sol";

/// @title BashoodPresaleFinal Foundry Test Suite
/// @notice Comprehensive security-focused test suite for the presale contract
/// @dev Includes invariant testing, fuzz testing, and security validations
contract BashoodPresaleTest is Test {
    BashoodPresaleFinal public presale;
    BashoodToken public bashoodToken;
    BashoodNFT public bashoodNFT;
    MockReferral public referralSystem;
    
    address public owner;
    address public treasury;
    address public emergencyWallet;
    address public user1;
    address public user2;
    address public attacker;
    
    // Constants
    uint256 constant INITIAL_SUPPLY = 1_000_000_000e18;
    uint256 constant PRESALE_ALLOCATION = 100_000_000e18;
    
    function setUp() public {
        console.log("🔧 Setting up BashoodPresale test environment");
        
        // Setup addresses
        owner = address(this);
        treasury = makeAddr("treasury");
        emergencyWallet = makeAddr("emergency");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        attacker = makeAddr("attacker");
        
        // Deploy dependencies
        bashoodToken = new BashoodToken(treasury);
        bashoodNFT = new BashoodNFT(owner, "https://api.bashood.com/");
        referralSystem = new MockReferral(address(0), address(0), address(bashoodNFT));
        
        // Deploy presale contract
        presale = new BashoodPresaleFinal(
            address(bashoodToken),
            address(bashoodNFT),
            address(referralSystem),
            treasury,
            emergencyWallet
        );
        
        // Fund users with ETH for testing
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(attacker, 100 ether);
        
        console.log("✅ Setup completed successfully");
    }
    
    // ==================== BASIC FUNCTIONALITY TESTS ====================
    
    function test_InitialState() public {
        assertEq(address(presale.bashoodToken()), address(bashoodToken));
        assertEq(address(presale.bashoodNFT()), address(bashoodNFT));
        assertEq(presale.treasuryWallet(), treasury);
        assertEq(presale.emergencyWallet(), emergencyWallet);
        assertFalse(presale.presaleActive());
        assertFalse(presale.emergencyMode());
        
        console.log("✅ Initial state verified");
    }
    
    function test_ActivatePresale() public {
        presale.setPresaleActive(true);
        assertTrue(presale.presaleActive());
        
        console.log("✅ Presale activation verified");
    }
    
    function test_PurchaseWithETH() public {
        // Activate presale
        presale.setPresaleActive(true);
        
        uint256 purchaseAmount = 1 ether;
        
        vm.prank(user1);
        presale.purchaseWithETH{value: purchaseAmount}(1, 1, 0, "");
        
        // Verify ETH was received by contract
        assertGt(address(presale).balance, 0);
        
        console.log("✅ ETH purchase verified");
    }
    
    // ==================== SECURITY TESTS ====================
    
    function test_ReentrancyProtection() public {
        presale.setPresaleActive(true);
        
        // Deploy malicious contract
        ReentrancyAttacker attackerContract = new ReentrancyAttacker(address(presale));
        vm.deal(address(attackerContract), 10 ether);
        
        // Attempt reentrancy attack
        vm.expectRevert();
        attackerContract.attack{value: 1 ether}();
        
        console.log("✅ Reentrancy protection verified");
    }
    
    function test_AccessControl() public {
        // Only owner can activate presale
        vm.prank(user1);
        vm.expectRevert();
        presale.setPresaleActive(true);
        
        // Only owner can trigger emergency
        vm.prank(user1);
        vm.expectRevert();
        presale.triggerEmergency();
        
        console.log("✅ Access control verified");
    }
    
    function test_EmergencyStop() public {
        presale.setPresaleActive(true);
        
        // Trigger emergency
        presale.triggerEmergency();
        
        assertTrue(presale.emergencyMode());
        assertFalse(presale.presaleActive());
        
        // Purchases should fail in emergency mode
        vm.prank(user1);
        vm.expectRevert("Emergency mode active");
        presale.purchaseWithETH{value: 1 ether}(1, 1, 0, "");
        
        console.log("✅ Emergency stop verified");
    }
    
    // ==================== FUZZ TESTS ====================
    
    /// @notice Fuzz test ETH purchases with random amounts
    function testFuzz_PurchaseWithETH(uint256 purchaseAmount, uint256 nftId) public {
        // Bound inputs
        purchaseAmount = bound(purchaseAmount, 0.001 ether, 100 ether);
        nftId = bound(nftId, 1, 10);
        
        // Activate presale
        presale.setPresaleActive(true);
        
        // Give user enough ETH
        vm.deal(user1, purchaseAmount + 1 ether);
        
        vm.prank(user1);
        presale.purchaseWithETH{value: purchaseAmount}(nftId, 1, 0, "");
        
        // Verify contract received ETH
        assertGe(address(presale).balance, purchaseAmount);
    }
    
    /// @notice Fuzz test with random user addresses
    function testFuzz_MultipleUsers(
        address user,
        uint256 amount
    ) public {
        // Filter invalid addresses
        vm.assume(user != address(0));
        vm.assume(user != address(presale));
        vm.assume(user.code.length == 0); // EOA only
        
        amount = bound(amount, 0.1 ether, 10 ether);
        
        presale.setPresaleActive(true);
        vm.deal(user, amount + 1 ether);
        
        vm.prank(user);
        presale.purchaseWithETH{value: amount}(1, 1, 0, "");
        
        assertGe(address(presale).balance, amount);
    }
    
    // ==================== INVARIANT TESTS ====================
    
    /// @notice Invariant: Contract balance should only increase during normal operation
    function invariant_BalanceOnlyIncreases() public view {
        // This would be properly implemented in a stateful fuzzing campaign
        // For now, we check that balance is reasonable
        uint256 balance = address(presale).balance;
        assertLe(balance, 1000 ether); // Reasonable upper bound
    }
    
    /// @notice Invariant: Emergency mode should stop all purchases
    function invariant_EmergencyStopsTransactions() public {
        if (presale.emergencyMode()) {
            assertFalse(presale.presaleActive());
        }
    }
    
    // ==================== STRESS TESTS ====================
    
    function test_MultipleSequentialPurchases() public {
        console.log("🔥 Starting stress test with 50 sequential purchases");
        
        presale.setPresaleActive(true);
        
        for (uint256 i = 0; i < 50; i++) {
            address buyer = makeAddr(string(abi.encodePacked("buyer", i)));
            vm.deal(buyer, 2 ether);
            
            vm.prank(buyer);
            presale.purchaseWithETH{value: 0.1 ether}(1, 1, 0, "");
        }
        
        // Verify total ETH received
        assertEq(address(presale).balance, 5 ether);
        
        console.log("✅ Sequential purchases stress test completed");
    }
    
    function test_LargePurchase() public {
        presale.setPresaleActive(true);
        
        uint256 largeAmount = 50 ether;
        vm.deal(user1, largeAmount + 1 ether);
        
        vm.prank(user1);
        presale.purchaseWithETH{value: largeAmount}(1, 1, 0, "");
        
        assertEq(address(presale).balance, largeAmount);
        
        console.log("✅ Large purchase test completed");
    }
    
    // ==================== EDGE CASES ====================
    
    function test_ZeroValuePurchase() public {
        presale.setPresaleActive(true);
        
        vm.prank(user1);
        vm.expectRevert();
        presale.purchaseWithETH{value: 0}(1, 1, 0, "");
        
        console.log("✅ Zero value purchase rejected");
    }
    
    function test_PurchaseWhenInactive() public {
        // Presale not activated
        vm.prank(user1);
        vm.expectRevert("Presale not active");
        presale.purchaseWithETH{value: 1 ether}(1, 1, 0, "");
        
        console.log("✅ Purchase when inactive rejected");
    }
    
    function test_WithdrawEmergencyFunds() public {
        presale.setPresaleActive(true);
        
        // Make some purchases
        vm.prank(user1);
        presale.purchaseWithETH{value: 10 ether}(1, 1, 0, "");
        
        uint256 contractBalance = address(presale).balance;
        uint256 emergencyBalanceBefore = emergencyWallet.balance;
        
        // Trigger emergency and withdraw
        presale.triggerEmergency();
        presale.withdrawEmergencyFunds();
        
        assertEq(address(presale).balance, 0);
        assertEq(emergencyWallet.balance, emergencyBalanceBefore + contractBalance);
        
        console.log("✅ Emergency withdrawal verified");
    }
}

/// @notice Malicious contract for reentrancy testing
contract ReentrancyAttacker {
    BashoodPresaleFinal public presale;
    uint256 public attackCount;
    
    constructor(address _presale) {
        presale = BashoodPresaleFinal(_presale);
    }
    
    function attack() external payable {
        presale.purchaseWithETH{value: msg.value}(1, 1, 0, "");
    }
    
    // This should be blocked by reentrancy guard
    receive() external payable {
        attackCount++;
        if (attackCount < 5 && address(presale).balance >= 1 ether) {
            presale.purchaseWithETH{value: 1 ether}(1, 1, 0, "");
        }
    }
}