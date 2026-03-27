// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/BashoodPresaleFinal.sol";
import "../../contracts/BashoodToken.sol";
import "../../contracts/MockNFT1155.sol";
import "../../contracts/BashoodReferral.sol";
import "../../contracts/test/MockReferralValidator.sol";

/**
 * @title BashoodPresaleInvariantTest
 * @notice Foundry invariant (property-based) testing for BashoodPresaleFinal
 * @dev Run with: forge test --match-contract BashoodPresaleInvariantTest -vvv
 */
contract BashoodPresaleInvariantTest is Test {
    BashoodPresaleFinal public presale;
    BashoodToken public token;
    MockNFT1155 public nft;
    BashoodReferral public referral;
    MockReferralValidator public validator;
    PresaleHandler public handler;
    
    address constant TREASURY = address(0x1234);
    uint256 constant INITIAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 constant PRESALE_ALLOCATION = 200_000_000 * 10**18;
    uint256 constant SOFT_CAP = 5_000_000 * 10**18;
    uint256 constant HARD_CAP = 50_000_000 * 10**18;
    
    function setUp() public {
        // Deploy token
        token = new BashoodToken(address(this));
        
        // Deploy NFT
        nft = new MockNFT1155();
        
        // Deploy validator mock
        validator = new MockReferralValidator();
        
        // Deploy referral with dummy presale address (will update later)
        referral = new BashoodReferral(address(1), address(validator), address(nft));
        
        // Deploy presale
        presale = new BashoodPresaleFinal(
            address(token),
            address(nft),
            address(referral),
            payable(TREASURY),
            address(0x5678), // _operationsWallet
            0.1 ether,  // nftPriceETH
            1000 * 10**18, // nftPriceBHT
            block.timestamp,
            block.timestamp + 30 days,
            10000 // maxNFTSupply
        );
        
        // Update referral with real presale address
        referral.setPresaleContract(address(presale));
        
        // Transfer tokens to presale
        token.transfer(address(presale), PRESALE_ALLOCATION);
        
        // Deploy handler for bounded fuzzing
        handler = new PresaleHandler(presale, token);
        
        // Target handler for invariant tests
        targetContract(address(handler));
        
        // Fund handler for purchases
        vm.deal(address(handler), 1000 ether);
    }
    
    // ==================== INVARIANTS ====================
    
    /// @notice Token balance of presale should never exceed allocation
    function invariant_presale_balance_within_allocation() public {
        assertLe(
            token.balanceOf(address(presale)),
            PRESALE_ALLOCATION,
            "Presale balance exceeds allocation"
        );
    }
    
    /// @notice Total supply should only decrease (from burns), never increase
    function invariant_total_supply_no_inflation() public {
        assertLe(
            token.totalSupply(),
            INITIAL_SUPPLY,
            "Total supply increased beyond initial"
        );
        // Burn accounting must be consistent
        assertEq(
            INITIAL_SUPPLY - token.totalSupply(),
            token.totalBurned(),
            "Burn accounting inconsistent"
        );
    }
    
    /// @notice Hard cap is never exceeded
    function invariant_hard_cap_respected() public {
        uint256 sold = PRESALE_ALLOCATION - token.balanceOf(address(presale));
        assertLe(
            sold,
            HARD_CAP,
            "Hard cap exceeded"
        );
    }
    
    /// @notice ETH balance is reasonable
    function invariant_eth_balance_reasonable() public {
        assertLe(
            address(presale).balance,
            1000 ether,
            "ETH balance unreasonably high"
        );
    }
    
    /// @notice Conservation of tokens
    function invariant_conservation_of_tokens() public {
        uint256 presaleBalance = token.balanceOf(address(presale));
        uint256 handlerBalance = token.balanceOf(address(handler));
        uint256 thisBalance = token.balanceOf(address(this));
        
        uint256 sumBalances = presaleBalance + handlerBalance + thisBalance;
        
        assertLe(
            sumBalances,
            INITIAL_SUPPLY,
            "Token conservation violated"
        );
    }
    
    /// @notice Owner control preserved
    function invariant_owner_control_preserved() public {
        bytes32 ADMIN_ROLE = keccak256("ADMIN_ROLE");
        assertTrue(
            presale.hasRole(ADMIN_ROLE, address(this)),
            "Admin role lost"
        );
    }
}

/**
 * @title PresaleHandler
 * @notice Handler contract to perform bounded actions for invariant testing
 */
contract PresaleHandler is Test {
    BashoodPresaleFinal public presale;
    BashoodToken public token;
    
    uint256 public totalPurchases;
    uint256 public totalEthSpent;
    uint256 public totalTokensReceived;
    
    constructor(BashoodPresaleFinal _presale, BashoodToken _token) {
        presale = _presale;
        token = _token;
    }
    
    /// @notice Bounded token purchase
    function buyTokens(uint256 amount) public {
        // Bound amount between 0.01 and 10 ETH
        amount = bound(amount, 0.01 ether, 10 ether);
        
        // Only buy if presale is active
        if (block.timestamp <= presale.presaleEnd() && !presale.paused()) {
            uint256 balanceBefore = token.balanceOf(address(this));
            
            (bool success,) = address(presale).call{value: amount}("");
            
            if (success) {
                uint256 balanceAfter = token.balanceOf(address(this));
                uint256 tokensReceived = balanceAfter - balanceBefore;
                
                totalPurchases++;
                totalEthSpent += amount;
                totalTokensReceived += tokensReceived;
            }
        }
    }
    
    /// @notice Skip time forward
    function skipTime(uint256 seconds_) public {
        seconds_ = bound(seconds_, 1, 7 days);
        vm.warp(block.timestamp + seconds_);
    }
    
    /// @notice Try to finalize
    function tryFinalize() public {
        if (block.timestamp > presale.presaleEnd()) {
            try presale.finalizePresale() {} catch {}
        }
    }
    
    receive() external payable {}
}
