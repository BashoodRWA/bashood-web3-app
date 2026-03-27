// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/BashoodReferral.sol";
import "../../contracts/ReferralValidator.sol";
import "../../contracts/MockNFT1155.sol";

/**
 * @title ReferralSybilH03Test
 * @notice Proof-of-Security tests for H-03 (Sybil attack on referral system).
 *
 * Attack vector (pre-fix):
 *   An attacker creates N puppet wallets that call registerReferral(attacker).
 *   Each call incremented referralCount[attacker] without any real purchase.
 *   Once count >= REQUIRED_REFERRALS, attacker claimed a free NFT reward.
 *
 * Fix (verified here):
 *   registerReferral() no longer increments referralCount.
 *   Only rewardReferrer() (called by the presale on a real purchase) increments the counter.
 */
contract ReferralSybilH03Test is Test {

    BashoodReferral public referral;
    ReferralValidator public validator;
    MockNFT1155 public nft;

    address public presale = address(0xCAFE);
    address public attacker = address(0xA77AC4);
    address public puppet1 = address(0xB0B1);
    address public puppet2 = address(0xB0B2);
    address public puppet3 = address(0xB0B3);

    function setUp() public {
        nft = new MockNFT1155();
        validator = new ReferralValidator(address(this), address(0), 0, 0);
        referral = new BashoodReferral(presale, address(validator), address(nft));
    }

    // ─────────────────────────────────────────────────────────────
    // Core invariant: registerReferral must NEVER increment referralCount
    // ─────────────────────────────────────────────────────────────

    /// @notice Sybil: 3 puppet wallets register attacker as referrer.
    ///         referralCount must remain 0; claimNFT must revert.
    function test_sybil_registerDoesNotIncrementCount() public {
        vm.prank(puppet1);
        referral.registerReferral(attacker);

        vm.prank(puppet2);
        referral.registerReferral(attacker);

        vm.prank(puppet3);
        referral.registerReferral(attacker);

        assertEq(referral.referralCount(attacker), 0, "H-03: Sybil incremented referralCount");

        vm.prank(attacker);
        vm.expectRevert("Not enough referrals to claim");
        referral.claimNFT();
    }

    /// @notice Fuzz: any number of puppet registrations should not increment count.
    function testFuzz_sybilMassRegisterNoCount(uint8 puppetCount) public {
        vm.assume(puppetCount > 0 && puppetCount <= 200);

        for (uint256 i = 1; i <= puppetCount; i++) {
            address puppet = address(uint160(0x10000 + i));
            vm.prank(puppet);
            referral.registerReferral(attacker);
        }

        assertEq(referral.referralCount(attacker), 0, "H-03: mass Sybil incremented referralCount");
    }

    // ─────────────────────────────────────────────────────────────
    // Legitimate path: real purchases via rewardReferrer DO count
    // ─────────────────────────────────────────────────────────────

    /// @notice rewardReferrer (called by presale) still increments count correctly.
    function test_legitimate_rewardReferrerIncrementsCount() public {
        address buyer1 = address(0xBEEF1);
        address buyer2 = address(0xBEEF2);
        address buyer3 = address(0xBEEF3);

        vm.prank(presale);
        referral.rewardReferrer(buyer1, attacker);
        assertEq(referral.referralCount(attacker), 1);

        vm.prank(presale);
        referral.rewardReferrer(buyer2, attacker);
        assertEq(referral.referralCount(attacker), 2);

        vm.prank(presale);
        referral.rewardReferrer(buyer3, attacker);
        assertEq(referral.referralCount(attacker), 3);

        // claimNFT() calls nftContract.mint(msg.sender, ...) — mints directly to attacker.
        // No pre-funding of the referral contract needed.
        vm.prank(attacker);
        referral.claimNFT();
        assertTrue(referral.claimedNFT(attacker), "Should have claimed NFT after 3 real purchases");
    }

    /// @notice registerReferral only records intent; subsequent rewardReferrer counts correctly.
    function test_registerThenReward_onlyRewardCounts() public {
        // Puppet registers attacker as referrer (no count increment)
        vm.prank(puppet1);
        referral.registerReferral(attacker);
        assertEq(referral.referralCount(attacker), 0);

        // Real purchase from a different buyer via presale
        address buyer = address(0xBEEF5);
        vm.prank(presale);
        referral.rewardReferrer(buyer, attacker);
        assertEq(referral.referralCount(attacker), 1, "Only real purchase should count");
    }

    // ─────────────────────────────────────────────────────────────
    // No self-referral
    // ─────────────────────────────────────────────────────────────

    function test_registerReferral_noSelfReferral() public {
        vm.prank(attacker);
        vm.expectRevert("Cannot refer yourself");
        referral.registerReferral(attacker);
    }

    function test_rewardReferrer_noSelfReferral() public {
        vm.prank(presale);
        vm.expectRevert("Cannot refer yourself");
        referral.rewardReferrer(attacker, attacker);
    }

    // ─────────────────────────────────────────────────────────────
    // Double-register blocked
    // ─────────────────────────────────────────────────────────────

    function test_registerReferral_onlyOnce() public {
        vm.prank(puppet1);
        referral.registerReferral(attacker);

        vm.prank(puppet1);
        vm.expectRevert("Already referred");
        referral.registerReferral(attacker);
    }

    // ─────────────────────────────────────────────────────────────
    // ReferralValidator NFT-holder gate
    // ─────────────────────────────────────────────────────────────

    /// @notice Gate off (minNFTBalance == 0): any non-zero address is valid.
    function test_validator_gateOff_anyAddressValid() public view {
        assertTrue(validator.isValid(attacker));
        assertTrue(validator.isValid(address(0x1)));
    }

    /// @notice Gate off: zero address is rejected.
    function test_validator_gateOff_zeroIsInvalid() public view {
        assertFalse(validator.isValid(address(0)));
    }

    /// @notice Gate on: referrer without NFT is rejected; holder is accepted.
    function test_validator_gateOn_requiresNFTBalance() public {
        // Activate the gate: require ≥ 1 of NFT id=1
        validator.setNFTRequirement(address(nft), 1, 1);

        // Attacker holds no NFT → invalid
        assertFalse(validator.isValid(attacker));

        // Mint 1 NFT to attacker → valid
        nft.mintTo(attacker, 1, 1);
        assertTrue(validator.isValid(attacker));
    }

    /// @notice Gate activation/deactivation round-trip.
    function test_validator_gateToggle() public {
        // Gate off → any address valid
        assertTrue(validator.isValid(attacker));

        // Activate gate
        validator.setNFTRequirement(address(nft), 1, 1);
        assertFalse(validator.isValid(attacker));

        // Disable gate (minBalance = 0)
        validator.setNFTRequirement(address(0), 0, 0);
        assertTrue(validator.isValid(attacker));
    }

    /// @notice Only owner can set NFT requirement.
    function test_validator_onlyOwnerCanSetGate() public {
        vm.prank(attacker);
        vm.expectRevert("Only owner");
        validator.setNFTRequirement(address(nft), 1, 1);
    }

    // ─────────────────────────────────────────────────────────────
    // rewardReferrer: validator check active via contract guard
    // ─────────────────────────────────────────────────────────────

    /// @notice When validator is a real contract and gate is active,
    ///         rewardReferrer rejects referrers who don't hold the NFT.
    function test_rewardReferrer_contractValidatorEnforced() public {
        // Deploy BashoodReferral with real validator (code.length > 0)
        BashoodReferral realReferral = new BashoodReferral(
            presale, address(validator), address(nft)
        );
        validator.setNFTRequirement(address(nft), 1, 1);

        address buyer = address(0xBEEF9);
        // Attacker has no NFT → validator rejects
        vm.prank(presale);
        vm.expectRevert("Referrer not valid");
        realReferral.rewardReferrer(buyer, attacker);

        // Mint NFT to attacker → validator accepts
        nft.mintTo(attacker, 1, 1);
        vm.prank(presale);
        realReferral.rewardReferrer(buyer, attacker);
        assertEq(realReferral.referralCount(attacker), 1);
    }

    // ─────────────────────────────────────────────────────────────
    // Gate-from-birth: constructor activates gate at deployment time
    // ─────────────────────────────────────────────────────────────

    /// @notice ReferralValidator born with gate active (minBalance=1, nftContract set).
    ///         No setNFTRequirement() call needed — gate is live from construction.
    function test_validatorBornWithGateActive() public {
        ReferralValidator gatedValidator = new ReferralValidator(
            address(this), address(nft), 1, 1
        );

        // Gate is immediately active — attacker holds no NFT
        assertFalse(gatedValidator.isValid(attacker), "Gate must block non-holder at birth");

        // Mint NFT → now valid
        nft.mintTo(attacker, 1, 1);
        assertTrue(gatedValidator.isValid(attacker), "NFT holder must be valid");

        // State is readable
        assertEq(gatedValidator.minNFTBalance(), 1);
        assertEq(gatedValidator.nftContract(), address(nft));
    }

    /// @notice Gate-from-birth: owner can still disable the gate post-deploy.
    function test_validatorBornWithGate_canDisable() public {
        ReferralValidator gatedValidator = new ReferralValidator(
            address(this), address(nft), 1, 1
        );

        // Gate on → attacker (no NFT) is invalid
        assertFalse(gatedValidator.isValid(attacker));

        // Owner disables gate
        gatedValidator.setNFTRequirement(address(0), 0, 0);

        // Gate off → any non-zero address is valid
        assertTrue(gatedValidator.isValid(attacker));
        assertEq(gatedValidator.minNFTBalance(), 0);
    }

    /// @notice Fuzz: gate-from-birth rejects any address without NFT balance.
    function testFuzz_validatorBornWithGate_rejectsNonHolder(address candidate) public {
        vm.assume(candidate != address(0));
        ReferralValidator gatedValidator = new ReferralValidator(
            address(this), address(nft), 1, 1
        );
        // candidate has no NFT → must be rejected
        assertFalse(gatedValidator.isValid(candidate), "Gate-from-birth must reject non-holder");
    }
}
