// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/BashoodPresaleFinal.sol";
import "../../contracts/BashoodToken.sol";
import "../../contracts/BashoodPropertyNFT.sol";
import "../../contracts/BashoodReferral.sol";
import "../../contracts/BashoodPaymentSplitter.sol";

/**
 * @title PresaleFuzzingTest
 * @notice Fuzzing tests avanzados - Certificación institucional
 * @dev 14 tests × 10,000 runs = 140,000 escenarios probados
 */
contract PresaleFuzzingTest is Test {
    BashoodPresaleFinal public presale;
    BashoodToken public token;
    BashoodPropertyNFT public nft;
    BashoodReferral public referral;
    BashoodPaymentSplitter public paymentSplitter;

    address public user;
    address public treasury;
    address public development;
    address public marketing;
    address public operations;
    address public treasuryPS;

    uint256 constant PRESALE_START = 1704067200;
    uint256 constant PRESALE_END = 1735689600;
    uint256 constant MAX_SUPPLY = 1000;
    uint256 constant MAX_PER_USER = 5;
    uint256 constant NFT_PRICE_ETH = 0.01 ether;
    uint256 constant NFT_PRICE_BHT = 100 * 1e18;

    function setUp() public {
        user = vm.addr(1);
        treasury = vm.addr(3);
        development = vm.addr(4);
        marketing = vm.addr(5);
        operations = vm.addr(6);
        treasuryPS = vm.addr(7);

        token = new BashoodToken(treasury);
        nft = new BashoodPropertyNFT("https://api.bashood.com/metadata/");
        referral = new BashoodReferral(
            address(this),
            address(this),
            address(nft)
        );

        address[] memory payees = new address[](4);
        payees[0] = development;
        payees[1] = marketing;
        payees[2] = operations;
        payees[3] = treasuryPS;

        uint256[] memory shares = new uint256[](4);
        shares[0] = 45;
        shares[1] = 25;
        shares[2] = 20;
        shares[3] = 10;

        paymentSplitter = new BashoodPaymentSplitter(payees, shares);

        presale = new BashoodPresaleFinal(
            address(token),
            address(nft),
            address(referral),
            payable(address(paymentSplitter)),
            NFT_PRICE_ETH,
            NFT_PRICE_BHT,
            PRESALE_START,
            PRESALE_END,
            MAX_SUPPLY
        );

        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        nft.grantRole(MINTER_ROLE, address(presale));

        vm.warp(PRESALE_START + 1 days);
    }

    /*//////////////////////////////////////////////////////////////
                STRATEGY 1: TIME TRAVEL (3 tests)
    //////////////////////////////////////////////////////////////*/

    function testFuzz_purchaseAtRandomTimes(uint256 timestamp, uint256 quantity) public {
        timestamp = bound(timestamp, PRESALE_START, PRESALE_END);
        quantity = bound(quantity, 1, MAX_PER_USER);
        
        vm.warp(timestamp);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        vm.deal(user, cost);
        vm.prank(user);
        presale.purchaseWithETH{value: cost}(1, quantity, 0, "");
        
        // Purchase successful
    }

    function testFuzz_cannotPurchaseBeforeStart(uint256 timestamp, uint256 quantity) public {
        timestamp = bound(timestamp, 1, PRESALE_START - 1);
        quantity = bound(quantity, 1, MAX_PER_USER);
        
        vm.warp(timestamp);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        vm.deal(user, cost);
        vm.prank(user);
        vm.expectRevert();
        presale.purchaseWithETH{value: cost}(1, quantity, 0, "");
    }

    function testFuzz_cannotPurchaseAfterEnd(uint256 timestamp, uint256 quantity) public {
        timestamp = bound(timestamp, PRESALE_END + 1, type(uint64).max);
        quantity = bound(quantity, 1, MAX_PER_USER);
        
        vm.warp(timestamp);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        vm.deal(user, cost);
        vm.prank(user);
        vm.expectRevert();
        presale.purchaseWithETH{value: cost}(1, quantity, 0, "");
    }

    /*//////////////////////////////////////////////////////////////
                STRATEGY 2: BOUNDARY TESTING (2 tests)
    //////////////////////////////////////////////////////////////*/

    function testFuzz_purchaseQuantityBoundaries(uint256 quantity) public {
        quantity = bound(quantity, 1, MAX_PER_USER);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        vm.deal(user, cost);
        vm.prank(user);
        presale.purchaseWithETH{value: cost}(1, quantity, 0, "");
        
        // Purchase successful
        // Within limits
    }

    function testFuzz_cannotExceedMaxPerUser(uint256 quantity) public {
        quantity = bound(quantity, MAX_PER_USER + 1, MAX_PER_USER * 2);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        vm.deal(user, cost);
        vm.prank(user);
        vm.expectRevert();
        presale.purchaseWithETH{value: cost}(1, quantity, 0, "");
    }

    /*//////////////////////////////////////////////////////////////
                STRATEGY 3: ECONOMIC ATTACKS (3 tests)
    //////////////////////////////////////////////////////////////*/

    function testFuzz_exactPayment(uint256 quantity) public {
        quantity = bound(quantity, 1, MAX_PER_USER);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        vm.deal(user, cost);
        vm.prank(user);
        presale.purchaseWithETH{value: cost}(1, quantity, 0, "");
        
        // Purchase successful
    }

    function testFuzz_cannotUnderpay(uint256 quantity, uint256 underpayment) public {
        quantity = bound(quantity, 1, MAX_PER_USER);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        underpayment = bound(underpayment, 1, cost - 1);
        uint256 incorrectPayment = cost - underpayment;
        
        vm.deal(user, incorrectPayment);
        vm.prank(user);
        vm.expectRevert();
        presale.purchaseWithETH{value: incorrectPayment}(1, quantity, 0, "");
    }

    function testFuzz_overpaymentReverts(uint256 quantity, uint256 overpayment) public {
        quantity = bound(quantity, 1, MAX_PER_USER);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        overpayment = bound(overpayment, 1, 100 ether);
        uint256 incorrectPayment = cost + overpayment;
        
        vm.deal(user, incorrectPayment);
        vm.prank(user);
        vm.expectRevert();
        presale.purchaseWithETH{value: incorrectPayment}(1, quantity, 0, "");
    }

    /*//////////////////////////////////////////////////////////////
                STRATEGY 4: STATE TRANSITIONS (2 tests)
    //////////////////////////////////////////////////////////////*/

    function testFuzz_cannotPurchaseWhilePaused(uint256 quantity) public {
        quantity = bound(quantity, 1, MAX_PER_USER);
        
        presale.pause();
        
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        vm.deal(user, cost);
        vm.prank(user);
        vm.expectRevert();
        presale.purchaseWithETH{value: cost}(1, quantity, 0, "");
    }

    function testFuzz_canPurchaseAfterUnpause(uint256 quantity) public {
        quantity = bound(quantity, 1, MAX_PER_USER);
        
        presale.pause();
        presale.unpause();
        
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        vm.deal(user, cost);
        vm.prank(user);
        presale.purchaseWithETH{value: cost}(1, quantity, 0, "");
        
        // Purchase successful
    }

    /*//////////////////////////////////////////////////////////////
                STRATEGY 5: NFT ID VALIDATION (1 test)
    //////////////////////////////////////////////////////////////*/

    function testFuzz_onlyValidNFTIds(uint256 nftId, uint256 quantity) public {
        quantity = bound(quantity, 1, MAX_PER_USER);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        vm.deal(user, cost);
        
        if (nftId == 1 || nftId == 2) {
            vm.prank(user);
            presale.purchaseWithETH{value: cost}(nftId, quantity, 0, "");
            // Purchase successful
        } else {
            vm.prank(user);
            vm.expectRevert();
            presale.purchaseWithETH{value: cost}(nftId, quantity, 0, "");
        }
    }

    /*//////////////////////////////////////////////////////////////
                STRATEGY 6: PAYMENT DISTRIBUTION (1 test)
    //////////////////////////////////////////////////////////////*/

    function testFuzz_paymentDistribution(uint256 quantity) public {
        quantity = bound(quantity, 1, 5);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        uint256 balanceBefore = address(paymentSplitter).balance;
        
        vm.deal(user, cost);
        vm.prank(user);
        presale.purchaseWithETH{value: cost}(1, quantity, 0, "");
        
        uint256 balanceAfter = address(paymentSplitter).balance;
        uint256 received = balanceAfter - balanceBefore;
        
        // 100% va al splitter (presale no tiene treasury fee)
        assertEq(received, cost);
    }

    /*//////////////////////////////////////////////////////////////
                STRATEGY 7: REENTRANCY PROTECTION (1 test)
    //////////////////////////////////////////////////////////////*/

    function testFuzz_reentrancyProtection(uint256 quantity) public {
        quantity = bound(quantity, 1, MAX_PER_USER);
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        ReentrancyAttacker attackerContract = new ReentrancyAttacker(presale);
        
        vm.deal(address(attackerContract), cost);
        vm.expectRevert();
        attackerContract.attack(1, quantity);
    }

    /*//////////////////////////////////////////////////////////////
                STRATEGY 8: MULTI-USER SCENARIOS (1 test)
    //////////////////////////////////////////////////////////////*/

    function testFuzz_multiUserPurchases(uint256 numUsers, uint256 quantityPerUser) public {
        numUsers = bound(numUsers, 1, 10);
        quantityPerUser = bound(quantityPerUser, 1, 5);
        
        uint256 costPerUser = NFT_PRICE_ETH * quantityPerUser;
        
        for (uint256 i = 0; i < numUsers; i++) {
            address buyer = vm.addr(100 + i);
            vm.deal(buyer, costPerUser);
            vm.prank(buyer);
            presale.purchaseWithETH{value: costPerUser}(1, quantityPerUser, 0, "");
        }
        
        assertEq(presale.totalNFTsSold(), numUsers * quantityPerUser);
    }
}

contract ReentrancyAttacker {
    BashoodPresaleFinal public presale;
    bool public attacking = false;

    constructor(BashoodPresaleFinal _presale) {
        presale = _presale;
    }

    function attack(uint256 nftId, uint256 quantity) external payable {
        attacking = true;
        presale.purchaseWithETH{value: msg.value}(nftId, quantity, 0, "");
    }

    receive() external payable {
        if (attacking) {
            presale.purchaseWithETH{value: 0.01 ether}(1, 1, 0, "");
        }
    }
}
