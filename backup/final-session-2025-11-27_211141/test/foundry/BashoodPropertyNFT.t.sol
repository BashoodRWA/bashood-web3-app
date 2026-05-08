// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../../contracts/BashoodPropertyNFT.sol";

/// @title BashoodPropertyNFT Foundry Test Suite
/// @notice Comprehensive testing for the Property NFT system
contract BashoodPropertyNFTTest is Test {
    BashoodPropertyNFT public propertyNFT;
    
    address public owner;
    address public minter;
    address public user1;
    address public user2;
    
    string constant BASE_URI = "https://api.bashood.com/nft/";
    uint256 constant MINTING_FEE = 0.01 ether;
    
    // Sample property for testing
    BashoodPropertyNFT.PropertyData sampleProperty;
    
    function setUp() public {
        console.log("🏠 Setting up BashoodPropertyNFT test environment");
        
        // Setup addresses
        owner = address(this);
        minter = makeAddr("minter");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        console.log("Owner:", owner);
        console.log("Minter:", minter);
        
        // Deploy PropertyNFT
        propertyNFT = new BashoodPropertyNFT(BASE_URI);
        
        // Add minter authorization
        propertyNFT.addMinter(minter);
        
        // Setup sample property data
        sampleProperty = BashoodPropertyNFT.PropertyData({
            name: "Golden Villa",
            description: "Luxury villa with golden accents",
            location: "Beverly Hills, CA",
            propertyType: 5, // VILLA
            area: 500,
            estimatedValue: 1000000 ether, // 1M USD
            mintTimestamp: 0,
            isActive: false,
            amenities: new string[](0),
            imageHash: "QmGoldenVilla123",
            originalOwner: address(0)
        });
        
        console.log("✅ BashoodPropertyNFT deployed at:", address(propertyNFT));
    }
    
    // ==================== BASIC FUNCTIONALITY TESTS ====================
    
    function test_InitialState() public {
        assertEq(propertyNFT.name(), "Bashood Property NFT");
        assertEq(propertyNFT.symbol(), "BPNFT");
        assertEq(propertyNFT.owner(), owner);
        assertTrue(propertyNFT.authorizedMinters(owner));
        assertTrue(propertyNFT.authorizedMinters(minter));
        assertFalse(propertyNFT.publicMintingEnabled());
        
        console.log("✅ Initial state verified");
    }
    
    function test_MintProperty() public {
        vm.prank(minter);
        uint256 tokenId = propertyNFT.mintProperty(user1, sampleProperty, "");
        
        assertEq(tokenId, 1);
        assertEq(propertyNFT.ownerOf(1), user1);
        assertEq(propertyNFT.balanceOf(user1), 1);
        
        BashoodPropertyNFT.PropertyData memory property = propertyNFT.getProperty(1);
        assertEq(property.name, sampleProperty.name);
        assertEq(property.propertyType, sampleProperty.propertyType);
        assertTrue(property.isActive);
        assertEq(property.originalOwner, user1);
        
        console.log("✅ Property minting verified");
    }
    
    function test_PublicMinting() public {
        // Should fail initially
        vm.prank(user1);
        vm.deal(user1, 1 ether);
        vm.expectRevert("Public minting not enabled");
        propertyNFT.publicMint{value: MINTING_FEE}(sampleProperty, "");
        
        // Enable public minting
        propertyNFT.setPublicMintingEnabled(true);
        
        // Should succeed now
        vm.prank(user1);
        uint256 tokenId = propertyNFT.publicMint{value: MINTING_FEE}(sampleProperty, "");
        
        assertEq(tokenId, 1);
        assertEq(propertyNFT.ownerOf(1), user1);
        
        console.log("✅ Public minting verified");
    }
    
    // ==================== PROPERTY MANAGEMENT TESTS ====================
    
    function test_UpdateProperty() public {
        // Mint property first
        vm.prank(minter);
        propertyNFT.mintProperty(user1, sampleProperty, "");
        
        // Update property data
        vm.prank(user1);
        propertyNFT.updateProperty(1, "Updated Villa", "Updated description", 1500000 ether);
        
        BashoodPropertyNFT.PropertyData memory property = propertyNFT.getProperty(1);
        assertEq(property.name, "Updated Villa");
        assertEq(property.description, "Updated description");
        assertEq(property.estimatedValue, 1500000 ether);
        
        console.log("✅ Property update verified");
    }
    
    function test_AddAmenities() public {
        vm.prank(minter);
        propertyNFT.mintProperty(user1, sampleProperty, "");
        
        string[] memory amenities = new string[](3);
        amenities[0] = "Pool";
        amenities[1] = "Garden";
        amenities[2] = "Gym";
        
        vm.prank(user1);
        propertyNFT.addAmenities(1, amenities);
        
        string[] memory propertyAmenities = propertyNFT.getPropertyAmenities(1);
        assertEq(propertyAmenities.length, 3);
        assertEq(propertyAmenities[0], "Pool");
        
        console.log("✅ Amenities addition verified");
    }
    
    // ==================== QUERY FUNCTIONS TESTS ====================
    
    function test_GetPropertiesByType() public {
        // Mint different property types
        BashoodPropertyNFT.PropertyData memory house = sampleProperty;
        house.name = "Test House";
        house.propertyType = 1; // HOUSE
        
        BashoodPropertyNFT.PropertyData memory apartment = sampleProperty;
        apartment.name = "Test Apartment";
        apartment.propertyType = 2; // APARTMENT
        
        vm.startPrank(minter);
        propertyNFT.mintProperty(user1, sampleProperty, ""); // Villa
        propertyNFT.mintProperty(user1, house, "");          // House
        propertyNFT.mintProperty(user1, apartment, "");      // Apartment
        vm.stopPrank();
        
        uint256[] memory villas = propertyNFT.getPropertiesByType(5);
        uint256[] memory houses = propertyNFT.getPropertiesByType(1);
        uint256[] memory apartments = propertyNFT.getPropertiesByType(2);
        
        assertEq(villas.length, 1);
        assertEq(houses.length, 1);
        assertEq(apartments.length, 1);
        
        console.log("✅ Properties by type query verified");
    }
    
    function test_GetTotalValueByOwner() public {
        // Mint multiple properties to same owner
        vm.startPrank(minter);
        propertyNFT.mintProperty(user1, sampleProperty, ""); // 1M
        
        BashoodPropertyNFT.PropertyData memory house = sampleProperty;
        house.estimatedValue = 500000 ether;
        propertyNFT.mintProperty(user1, house, ""); // 500K
        vm.stopPrank();
        
        uint256 totalValue = propertyNFT.getTotalValueByOwner(user1);
        assertEq(totalValue, 1500000 ether);
        
        console.log("✅ Total value calculation verified");
    }
    
    function test_GetCollectionStats() public {
        vm.startPrank(minter);
        
        // Mint villa
        propertyNFT.mintProperty(user1, sampleProperty, "");
        
        // Mint house
        BashoodPropertyNFT.PropertyData memory house = sampleProperty;
        house.propertyType = 1;
        propertyNFT.mintProperty(user1, house, "");
        
        // Mint apartment
        BashoodPropertyNFT.PropertyData memory apartment = sampleProperty;
        apartment.propertyType = 2;
        propertyNFT.mintProperty(user1, apartment, "");
        
        vm.stopPrank();
        
        (uint256 total, uint256 houses, uint256 apartments, uint256 commercial, uint256 land, uint256 villas) = 
            propertyNFT.getCollectionStats();
        
        assertEq(total, 3);
        assertEq(houses, 1);
        assertEq(apartments, 1);
        assertEq(villas, 1);
        assertEq(commercial, 0);
        assertEq(land, 0);
        
        console.log("✅ Collection stats verified");
    }
    
    // ==================== FUZZ TESTS ====================
    
    function testFuzz_MintProperty(address to, uint256 propertyType, uint256 estimatedValue) public {
        vm.assume(to != address(0));
        vm.assume(propertyType > 0 && propertyType <= 7);
        estimatedValue = bound(estimatedValue, 1 ether, 1000000 ether);
        
        BashoodPropertyNFT.PropertyData memory fuzzProperty = sampleProperty;
        fuzzProperty.propertyType = propertyType;
        fuzzProperty.estimatedValue = estimatedValue;
        
        vm.prank(minter);
        uint256 tokenId = propertyNFT.mintProperty(to, fuzzProperty, "");
        
        assertEq(propertyNFT.ownerOf(tokenId), to);
        
        BashoodPropertyNFT.PropertyData memory property = propertyNFT.getProperty(tokenId);
        assertEq(property.propertyType, propertyType);
        assertEq(property.estimatedValue, estimatedValue);
    }
    
    function testFuzz_PublicMinting(uint256 fee) public {
        fee = bound(fee, MINTING_FEE, 10 ether);
        
        propertyNFT.setPublicMintingEnabled(true);
        vm.deal(user1, fee);
        
        uint256 balanceBefore = user1.balance;
        
        vm.prank(user1);
        propertyNFT.publicMint{value: fee}(sampleProperty, "");
        
        uint256 balanceAfter = user1.balance;
        uint256 paidFee = balanceBefore - balanceAfter;
        
        // Should only pay the minting fee
        assertEq(paidFee, MINTING_FEE);
        assertEq(propertyNFT.ownerOf(1), user1);
    }
    
    function testFuzz_UpdateProperty(
        string memory newName,
        string memory newDescription,
        uint256 newValue
    ) public {
        vm.assume(bytes(newName).length > 0);
        newValue = bound(newValue, 1 ether, 10000000 ether);
        
        vm.prank(minter);
        propertyNFT.mintProperty(user1, sampleProperty, "");
        
        vm.prank(user1);
        propertyNFT.updateProperty(1, newName, newDescription, newValue);
        
        BashoodPropertyNFT.PropertyData memory property = propertyNFT.getProperty(1);
        assertEq(property.name, newName);
        assertEq(property.description, newDescription);
        assertEq(property.estimatedValue, newValue);
    }
    
    // ==================== INVARIANT TESTS ====================
    
    function invariant_TotalSupplyDoesNotExceedMax() public view {
        (uint256 total,,,,,) = propertyNFT.getCollectionStats();
        assertLe(total, propertyNFT.MAX_SUPPLY());
    }
    
    function invariant_PropertyTypeCountsMatchTotal() public view {
        (uint256 total, uint256 houses, uint256 apartments, uint256 commercial, uint256 land, uint256 villas) = 
            propertyNFT.getCollectionStats();
        
        // Note: This doesn't include all property types, so we check partial sum
        uint256 partialSum = houses + apartments + commercial + land + villas;
        assertLe(partialSum, total);
    }
    
    function invariant_OwnerBalanceMatchesTokenCount() public {
        uint256 balance = propertyNFT.balanceOf(user1);
        uint256[] memory ownedTokens = propertyNFT.getPropertiesByOwner(user1);
        assertEq(balance, ownedTokens.length);
    }
    
    // ==================== ACCESS CONTROL TESTS ====================
    
    function test_OnlyAuthorizedCanMint() public {
        vm.prank(user2);
        vm.expectRevert("Not authorized to mint");
        propertyNFT.mintProperty(user1, sampleProperty, "");
        
        console.log("✅ Minting authorization verified");
    }
    
    function test_OnlyOwnerCanAddMinters() public {
        vm.prank(user1);
        vm.expectRevert();
        propertyNFT.addMinter(user2);
        
        // Should work as owner
        propertyNFT.addMinter(user2);
        assertTrue(propertyNFT.authorizedMinters(user2));
        
        console.log("✅ Minter management authorization verified");
    }
    
    function test_OnlyPropertyOwnerCanUpdate() public {
        vm.prank(minter);
        propertyNFT.mintProperty(user1, sampleProperty, "");
        
        vm.prank(user2);
        vm.expectRevert("Not authorized");
        propertyNFT.updateProperty(1, "Hacked", "Hacked", 0);
        
        console.log("✅ Property update authorization verified");
    }
    
    // ==================== EDGE CASES ====================
    
    function test_MintToZeroAddress() public {
        vm.prank(minter);
        vm.expectRevert("Cannot mint to zero address");
        propertyNFT.mintProperty(address(0), sampleProperty, "");
        
        console.log("✅ Zero address minting protection verified");
    }
    
    function test_InvalidPropertyType() public {
        BashoodPropertyNFT.PropertyData memory invalidProperty = sampleProperty;
        invalidProperty.propertyType = 0;
        
        vm.prank(minter);
        vm.expectRevert("Invalid property type");
        propertyNFT.mintProperty(user1, invalidProperty, "");
        
        invalidProperty.propertyType = 8; // Beyond max type
        
        vm.prank(minter);
        vm.expectRevert("Invalid property type");
        propertyNFT.mintProperty(user1, invalidProperty, "");
        
        console.log("✅ Property type validation verified");
    }
    
    function test_EmptyPropertyName() public {
        BashoodPropertyNFT.PropertyData memory invalidProperty = sampleProperty;
        invalidProperty.name = "";
        
        vm.prank(minter);
        vm.expectRevert("Property name required");
        propertyNFT.mintProperty(user1, invalidProperty, "");
        
        console.log("✅ Property name validation verified");
    }
    
    function test_QueryNonExistentToken() public {
        vm.expectRevert("Token does not exist");
        propertyNFT.getProperty(999);
        
        console.log("✅ Non-existent token query protection verified");
    }
    
    function test_PauseUnpause() public {
        propertyNFT.pause();
        assertTrue(propertyNFT.paused());
        
        vm.prank(minter);
        vm.expectRevert();
        propertyNFT.mintProperty(user1, sampleProperty, "");
        
        propertyNFT.unpause();
        assertFalse(propertyNFT.paused());
        
        vm.prank(minter);
        propertyNFT.mintProperty(user1, sampleProperty, "");
        
        console.log("✅ Pause/unpause functionality verified");
    }
}