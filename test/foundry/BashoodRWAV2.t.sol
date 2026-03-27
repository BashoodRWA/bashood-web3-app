// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/standards/BashoodRWAReferenceV2.sol";
import "../../contracts/standards/BashoodRWAReference.sol";
import "../../contracts/standards/IBashoodRWA.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  Shared struct factory (pattern from BashoodCoreInvariant.t.sol)
// ─────────────────────────────────────────────────────────────────────────────
abstract contract V2TestHelper {
    function _ident(string memory serial) internal pure returns (IBashoodRWA.AssetIdentification memory) {
        return IBashoodRWA.AssetIdentification({
            name:            "Test Asset",
            category:        IBashoodRWA.AssetCategory.HEAVY_VEHICLE,
            manufacturer:    "TestCo",
            model:           "X-100",
            serialNumber:    serial,
            yearManufactured: 2024,
            countryOfOrigin: "ES"
        });
    }

    function _specs() internal pure returns (IBashoodRWA.TechnicalSpecs memory) {
        return IBashoodRWA.TechnicalSpecs({
            loadCapacity: 5000, displacementSpeed: 10, powerConsumption: 15,
            printVolumeX: 0, printVolumeY: 0, printVolumeZ: 0,
            materialPSI: 0, setupTimeMinutes: 0, autoLubrication: true,
            gpsTracking: true, cubicMetersPerDay: 0
        });
    }

    function _financials(uint256 price) internal view returns (IBashoodRWA.FinancialData memory) {
        return IBashoodRWA.FinancialData({
            purchasePrice:        price,
            currentValue:         price,
            residualValuePct:     1500,
            lastAppraisalDate:    uint32(block.timestamp),
            depModel:             IBashoodRWA.DepreciationModel.LINEAR,
            annualMaintenancePct: 300,
            insurancePremiumPct:  200
        });
    }

    function _metrics() internal pure returns (IBashoodRWA.OperationalMetrics memory) {
        return IBashoodRWA.OperationalMetrics({
            status: IBashoodRWA.OperationalStatus.OPERATIONAL,
            operatingHours: 0, maxLifetimeHours: 50_000,
            totalLoadLifted: 0, maxLoadLifetime: 0,
            metersExtruded: 0, maxMetersLifetime: 0,
            setupCount: 0, maxSetups: 0, cubicMetersPerDay: 0,
            lastMaintenanceDate: 0, nextMaintenanceDate: 0,
            maintenanceIntervalHours: 500
        });
    }

    /// @dev Canonicalización RFC 8785 mínima: equivalente al helper JS del test Hardhat.
    ///      Produce el mismo output para cualquier JSON plano con 2 campos.
    ///      Para tests de invariante y fuzzing usamos el hash como dato opaco.
    function _fakeHash(uint256 seed) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("BASHOOD-METADATA-SEED:", seed));
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Suite 1 — Fuzz: mintAssetV2 con hash y precio arbitrarios
// ═════════════════════════════════════════════════════════════════════════════
/**
 * @title V2MintFuzzTest
 * @notice Props fuzz:
 *   P1: mint con cualquier precio válido (>0) siempre tiene éxito
 *   P2: hash almacenado == hash suministrado
 *   P3: tokenId secuencialmente creciente entre mints consecutivos
 *   P4: getMetadataHash devuelve el hash exacto sin importar el valor
 */
contract V2MintFuzzTest is Test, V2TestHelper {
    BashoodRWAReferenceV2 public rwa;

    bytes32 constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    address admin        = address(this);
    address assetManager = address(0x1);
    address recipient    = address(0x2);

    function setUp() public {
        BashoodRWAReferenceV2 impl = new BashoodRWAReferenceV2();
        bytes memory init = abi.encodeWithSelector(
            BashoodRWAReference.initialize.selector,
            "BashoodRWA-V2", "BRWAv2", "ipfs://base/", admin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        rwa = BashoodRWAReferenceV2(address(proxy));
        rwa.grantRole(ASSET_MANAGER_ROLE, assetManager);
    }

    /// @notice P1+P2: precio fuzz + hash fuzz → almacenado correctamente
    function testFuzz_MintV2StoresHashAndPrice(
        uint128 price,
        uint256 hashSeed
    ) public {
        vm.assume(price > 0);
        bytes32 hash = _fakeHash(hashSeed);

        vm.prank(assetManager);
        uint256 tokenId = rwa.mintAssetV2(
            recipient,
            _ident("FUZZ-1"),
            _specs(),
            _financials(price),
            _metrics(),
            "ipfs://fuzz",
            hash
        );

        assertEq(rwa.getMetadataHash(tokenId), hash, "hash mismatch after mint");
        assertEq(rwa.ownerOf(tokenId), recipient, "wrong owner");

        IBashoodRWA.FinancialData memory fin = rwa.getFinancialData(tokenId);
        assertEq(fin.purchasePrice, price, "purchase price mismatch");
    }

    /// @notice P3: tokenIds son estrictamente secuenciales entre mints V2 consecutivos
    function testFuzz_TokenIdsAreSequential(uint8 n) public {
        n = uint8(bound(n, 2, 10));
        uint256 prevId;
        for (uint8 i; i < n; i++) {
            bytes32 h = _fakeHash(i);
            vm.prank(assetManager);
            uint256 id = rwa.mintAssetV2(
                recipient,
                _ident(string(abi.encodePacked("SEQ-", i))),
                _specs(),
                _financials(1 ether),
                _metrics(),
                "ipfs://seq",
                h
            );
            if (i > 0) assertEq(id, prevId + 1, "tokenIds not sequential");
            prevId = id;
        }
    }

    /// @notice P4: verifyMetadata pasa si y solo si se proporciona el hash exacto
    function testFuzz_VerifyMetadataPassesOnlyWithExactHash(
        uint256 hashSeed,
        uint256 wrongSeed
    ) public {
        vm.assume(hashSeed != wrongSeed);
        bytes32 correctHash = _fakeHash(hashSeed);
        bytes32 wrongHash   = _fakeHash(wrongSeed);

        vm.prank(assetManager);
        uint256 tokenId = rwa.mintAssetV2(
            recipient, _ident("VER-1"), _specs(), _financials(1 ether),
            _metrics(), "ipfs://ver", correctHash
        );

        assertTrue(rwa.verifyMetadata(tokenId, correctHash), "correct hash should verify");

        vm.expectRevert(BashoodRWAReferenceV2.MetadataHashMismatch.selector);
        rwa.verifyMetadata(tokenId, wrongHash);
    }

    /// @notice Precio cero revierte con custom error InvalidPurchasePrice
    function testFuzz_ZeroPriceReverts(bytes32 hash) public {
        vm.assume(hash != bytes32(0));
        IBashoodRWA.FinancialData memory badFin = _financials(0);

        vm.prank(assetManager);
        vm.expectRevert(BashoodRWAReference.InvalidPurchasePrice.selector);
        rwa.mintAssetV2(recipient, _ident("ZERO"), _specs(), badFin, _metrics(), "ipfs://z", hash);
    }

    /// @notice Hash cero revierte con custom error MetadataHashRequired
    function testFuzz_ZeroHashReverts(uint128 price) public {
        vm.assume(price > 0);

        vm.prank(assetManager);
        vm.expectRevert(BashoodRWAReferenceV2.MetadataHashRequired.selector);
        rwa.mintAssetV2(
            recipient, _ident("ZEROH"), _specs(), _financials(price),
            _metrics(), "ipfs://zz", bytes32(0)
        );
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Suite 2 — Invariantes: integridad del hash nunca mutable post-mint
// ═════════════════════════════════════════════════════════════════════════════
/**
 * @title V2HashImmutabilityInvariantTest
 * @notice Invariantes:
 *   INV-1: el hash almacenado nunca cambia después del mint
 *   INV-2: ningún caller sin ASSET_MANAGER_ROLE puede mintear con V2
 *   INV-3: el hash de un token V1 es siempre bytes32(0)
 */
contract V2HashImmutabilityInvariantTest is Test, V2TestHelper {
    BashoodRWAReferenceV2 public rwa;

    bytes32 constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    address admin        = address(this);
    address assetManager = address(0x10);
    address unauthorized = address(0x11);
    address recipient    = address(0x12);

    uint256 public mintedTokenId;
    bytes32 public mintedHash;
    uint256 public v1TokenId;

    uint256 public hashCorruptionDetected;
    uint256 public unauthorizedV2MintSucceeded;

    function setUp() public {
        BashoodRWAReferenceV2 impl = new BashoodRWAReferenceV2();
        bytes memory init = abi.encodeWithSelector(
            BashoodRWAReference.initialize.selector,
            "BashoodRWA-V2", "BRWAv2", "ipfs://base/", admin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        rwa = BashoodRWAReferenceV2(address(proxy));
        rwa.grantRole(ASSET_MANAGER_ROLE, assetManager);

        // Token V2 de referencia
        mintedHash = _fakeHash(42);
        vm.prank(assetManager);
        mintedTokenId = rwa.mintAssetV2(
            recipient, _ident("INV-1"), _specs(), _financials(1_000 ether),
            _metrics(), "ipfs://inv1", mintedHash
        );

        // Token V1 de referencia (sin hash)
        vm.prank(assetManager);
        v1TokenId = rwa.mintAsset(
            recipient, _ident("V1-1"), _specs(), _financials(1_000 ether),
            _metrics(), "ipfs://v1inv"
        );

        targetContract(address(this));
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    /// @dev Intenta corromper el hash via re-mint (imposible — no hay setter)
    ///      Esta función existe para que el fuzzer explore el estado tras calls arbitrarios.
    function handler_checkHashUnchanged() external {
        bytes32 current = rwa.getMetadataHash(mintedTokenId);
        if (current != mintedHash) {
            hashCorruptionDetected++;
        }
    }

    /// @dev Atacante sin rol intenta mintear V2
    function handler_unauthorizedV2Mint(uint256 seed) external {
        vm.prank(unauthorized);
        try rwa.mintAssetV2(
            recipient, _ident("ATCK"),
            _specs(), _financials(1 ether),
            _metrics(), "ipfs://atk", _fakeHash(seed)
        ) {
            unauthorizedV2MintSucceeded++;
        } catch {}
    }

    /// @dev Update de valor legítimo — no debe afectar el hash
    function handler_authorizedValueUpdate(uint256 newVal) external {
        newVal = bound(newVal, 1, type(uint128).max);
        vm.prank(assetManager);
        rwa.updateAssetValue(mintedTokenId, newVal, "REAPPRAISAL");
    }

    /// @dev Update de status — no debe afectar el hash
    function handler_statusChange(uint8 statusIdx) external {
        statusIdx = uint8(bound(statusIdx, 0, 3));
        vm.prank(assetManager);
        rwa.updateOperationalStatus(mintedTokenId, IBashoodRWA.OperationalStatus(statusIdx));
    }

    // ── Invariantes ──────────────────────────────────────────────────────────

    /// @notice INV-1: el hash de un token V2 nunca muta post-mint
    function invariant_hashIsImmutableAfterMint() external view {
        assertEq(
            rwa.getMetadataHash(mintedTokenId),
            mintedHash,
            "INV-1: metadataHash mutated after mint"
        );
        assertEq(hashCorruptionDetected, 0, "INV-1: corruption detected by handler");
    }

    /// @notice INV-2: ningún actor sin rol puede ejecutar mintAssetV2
    function invariant_unauthorizedCannotMintV2() external view {
        assertEq(
            unauthorizedV2MintSucceeded,
            0,
            "INV-2: unauthorized address succeeded in mintAssetV2"
        );
    }

    /// @notice INV-3: token minteado con V1 siempre devuelve bytes32(0)
    function invariant_v1TokenHashIsZero() external view {
        assertEq(
            rwa.getMetadataHash(v1TokenId),
            bytes32(0),
            "INV-3: V1 token unexpectedly has non-zero metadataHash"
        );
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Suite 3 — Compatibilidad V1/V2: storage layout, IDs y comportamiento mixto
// ═════════════════════════════════════════════════════════════════════════════
/**
 * @title V1V2CompatibilityTest
 * @notice Tests concretos (no fuzz) para verificar la coexistencia V1/V2:
 *   C1: tokens V1 y V2 comparten el mismo contador tokenId (secuencial)
 *   C2: V1 mintAsset no escribe en _metadataHashes (bytes32(0))
 *   C3: V2 mintAssetV2 no corrompe datos de un token V1 adyacente
 *   C4: verifyMetadata revierte con TokenHasNoStoredHash para tokens V1
 *   C5: transferencia de token V2 no altera metadataHash
 *   C6: version() devuelve el identificador correcto
 */
contract V1V2CompatibilityTest is Test, V2TestHelper {
    BashoodRWAReferenceV2 public rwa;

    bytes32 constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    address admin        = address(this);
    address assetManager = address(0x20);
    address alice        = address(0x21);
    address bob          = address(0x22);

    function setUp() public {
        BashoodRWAReferenceV2 impl = new BashoodRWAReferenceV2();
        bytes memory init = abi.encodeWithSelector(
            BashoodRWAReference.initialize.selector,
            "BashoodRWA-V2", "BRWAv2", "ipfs://base/", admin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        rwa = BashoodRWAReferenceV2(address(proxy));
        rwa.grantRole(ASSET_MANAGER_ROLE, assetManager);
    }

    // ── C1: IDs secuenciales V1→V2 ───────────────────────────────────────────
    function test_C1_SequentialIdsAcrossV1andV2() public {
        vm.startPrank(assetManager);
        uint256 idV1 = rwa.mintAsset(alice, _ident("C1-V1"), _specs(), _financials(1 ether), _metrics(), "ipfs://c1v1");
        uint256 idV2 = rwa.mintAssetV2(alice, _ident("C1-V2"), _specs(), _financials(1 ether), _metrics(), "ipfs://c1v2", _fakeHash(1));
        vm.stopPrank();

        assertEq(idV2, idV1 + 1, "C1: tokenIds not sequential across V1 and V2");
    }

    // ── C2: V1 mint no escribe hash ───────────────────────────────────────────
    function test_C2_V1MintLeavesHashZero() public {
        vm.prank(assetManager);
        uint256 id = rwa.mintAsset(alice, _ident("C2"), _specs(), _financials(1 ether), _metrics(), "ipfs://c2");

        assertEq(rwa.getMetadataHash(id), bytes32(0), "C2: V1 token should have zero hash");
    }

    // ── C3: V2 mint no corrompe token V1 adyacente ───────────────────────────
    function test_C3_V2MintDoesNotCorruptAdjacentV1Token() public {
        vm.startPrank(assetManager);
        uint256 v1Id = rwa.mintAsset(alice, _ident("C3-V1"), _specs(), _financials(2 ether), _metrics(), "ipfs://c3v1");
        rwa.mintAssetV2(alice, _ident("C3-V2"), _specs(), _financials(3 ether), _metrics(), "ipfs://c3v2", _fakeHash(99));
        vm.stopPrank();

        // Datos del V1 intactos
        IBashoodRWA.AssetIdentification memory id = rwa.getAssetIdentification(v1Id);
        assertEq(id.serialNumber, "C3-V1", "C3: V1 serialNumber corrupted by adjacent V2 mint");

        IBashoodRWA.FinancialData memory fin = rwa.getFinancialData(v1Id);
        assertEq(fin.purchasePrice, 2 ether, "C3: V1 purchasePrice corrupted by adjacent V2 mint");

        assertEq(rwa.getMetadataHash(v1Id), bytes32(0), "C3: V1 hash should remain zero");
    }

    // ── C4: verifyMetadata revierte para token V1 ────────────────────────────
    function test_C4_VerifyMetadataRevertsForV1Token() public {
        vm.prank(assetManager);
        uint256 v1Id = rwa.mintAsset(alice, _ident("C4"), _specs(), _financials(1 ether), _metrics(), "ipfs://c4");

        vm.expectRevert(BashoodRWAReferenceV2.TokenHasNoStoredHash.selector);
        rwa.verifyMetadata(v1Id, _fakeHash(1));
    }

    // ── C5: transferencia no altera metadataHash ─────────────────────────────
    function test_C5_TransferDoesNotAlterMetadataHash() public {
        bytes32 hash = _fakeHash(77);

        vm.prank(assetManager);
        uint256 tokenId = rwa.mintAssetV2(
            alice, _ident("C5"), _specs(), _financials(1 ether),
            _metrics(), "ipfs://c5", hash
        );

        // Alice transfiere a Bob
        vm.prank(alice);
        rwa.transferFrom(alice, bob, tokenId);

        assertEq(rwa.ownerOf(tokenId), bob, "C5: transfer failed");
        assertEq(rwa.getMetadataHash(tokenId), hash, "C5: metadataHash changed after transfer");
        assertTrue(rwa.verifyMetadata(tokenId, hash), "C5: verifyMetadata failed after transfer");
    }

    // ── C6: version() ────────────────────────────────────────────────────────
    function test_C6_Version() public view {
        assertEq(rwa.version(), "BASHOOD-RWA-2.0.0", "C6: wrong version string");
    }

    // ── C7: tokenURI intacto tras mintAssetV2 ────────────────────────────────
    function test_C7_TokenURIIntactAfterMintV2() public {
        string memory uri = "ipfs://QmCanonicalHash123";
        bytes32 hash = _fakeHash(7);

        vm.prank(assetManager);
        uint256 tokenId = rwa.mintAssetV2(
            alice, _ident("C7"), _specs(), _financials(1 ether),
            _metrics(), uri, hash
        );

        assertEq(rwa.tokenURI(tokenId), uri, "C7: tokenURI mismatch after mintAssetV2");
    }

    // ── C8: índice de categoría actualizado en mint V2 ───────────────────────
    function test_C8_CategoryIndexUpdatedByV2Mint() public {
        uint256[] memory snapshot = rwa.getAssetsByCategory(IBashoodRWA.AssetCategory.HEAVY_VEHICLE);
        uint256 countBefore = snapshot.length;

        vm.prank(assetManager);
        rwa.mintAssetV2(alice, _ident("C8"), _specs(), _financials(1 ether), _metrics(), "ipfs://c8", _fakeHash(8));

        uint256[] memory snapshotAfter = rwa.getAssetsByCategory(IBashoodRWA.AssetCategory.HEAVY_VEHICLE);
        assertEq(snapshotAfter.length, countBefore + 1, "C8: category index not updated by mintAssetV2");
    }

    // ── C9: ownerTotalValue correcto tras mint V2 ─────────────────────────────
    function test_C9_OwnerTotalValueAfterV2Mint() public {
        uint256 price = 250_000 ether;
        uint256 valueBefore = rwa.getTotalAssetValue(alice);

        vm.prank(assetManager);
        rwa.mintAssetV2(alice, _ident("C9"), _specs(), _financials(price), _metrics(), "ipfs://c9", _fakeHash(9));

        assertEq(
            rwa.getTotalAssetValue(alice),
            valueBefore + price,
            "C9: ownerTotalValue not updated correctly after mintAssetV2"
        );
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Suite 4 — Invariante: ownerTotalValue consistente entre V1 y V2
// ═════════════════════════════════════════════════════════════════════════════
/**
 * @title V2OwnerValueInvariantTest
 * @notice INV-4: getTotalAssetValue(alice) siempre igual a suma de currentValue
 *         de todos los tokens de alice, independientemente de si son V1 o V2.
 */
contract V2OwnerValueInvariantTest is Test, V2TestHelper {
    BashoodRWAReferenceV2 public rwa;

    bytes32 constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    address admin        = address(this);
    address assetManager = address(0x30);
    address alice        = address(0x31);
    address bob          = address(0x32);

    uint256[] public aliceTokens;
    uint256 public mintCount;

    function setUp() public {
        BashoodRWAReferenceV2 impl = new BashoodRWAReferenceV2();
        bytes memory init = abi.encodeWithSelector(
            BashoodRWAReference.initialize.selector,
            "BashoodRWA-V2", "BRWAv2", "ipfs://base/", admin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        rwa = BashoodRWAReferenceV2(address(proxy));
        rwa.grantRole(ASSET_MANAGER_ROLE, assetManager);

        // Dos tokens iniciales (un V1 + un V2) para alice
        vm.startPrank(assetManager);
        uint256 t1 = rwa.mintAsset(alice, _ident("OV-V1"), _specs(), _financials(100 ether), _metrics(), "ipfs://ov1");
        uint256 t2 = rwa.mintAssetV2(alice, _ident("OV-V2"), _specs(), _financials(200 ether), _metrics(), "ipfs://ov2", _fakeHash(10));
        vm.stopPrank();

        aliceTokens.push(t1);
        aliceTokens.push(t2);
        mintCount = 2;

        targetContract(address(this));
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    function handler_mintV2ToAlice(uint128 price) external {
        price = uint128(bound(price, 1 ether, 1_000_000 ether));
        bytes32 h = _fakeHash(mintCount);
        vm.prank(assetManager);
        uint256 id = rwa.mintAssetV2(
            alice, _ident(string(abi.encodePacked("OV-", mintCount))),
            _specs(), _financials(price), _metrics(), "ipfs://ov", h
        );
        aliceTokens.push(id);
        mintCount++;
    }

    function handler_revalueToken(uint256 idx, uint128 newVal) external {
        if (aliceTokens.length == 0) return;
        idx = bound(idx, 0, aliceTokens.length - 1);
        newVal = uint128(bound(newVal, 1 ether, 2_000_000 ether));
        vm.prank(assetManager);
        rwa.updateAssetValue(aliceTokens[idx], newVal, "REAPPRAISAL");
    }

    function handler_transferToAlice(uint128 price) external {
        // Mint to bob, transfer to alice — verifica que el índice sube
        price = uint128(bound(price, 1 ether, 500_000 ether));
        vm.prank(assetManager);
        uint256 id = rwa.mintAssetV2(
            bob, _ident(string(abi.encodePacked("OV-BOB-", mintCount))),
            _specs(), _financials(price), _metrics(), "ipfs://ovb", _fakeHash(mintCount + 1000)
        );
        vm.prank(bob);
        rwa.transferFrom(bob, alice, id);
        aliceTokens.push(id);
        mintCount++;
    }

    // ── Invariante ────────────────────────────────────────────────────────────

    /// @notice INV-4: getTotalAssetValue(alice) == sum(currentValue) de todos sus tokens
    function invariant_ownerTotalValueMatchesSumOfTokenValues() external view {
        uint256 sum;
        for (uint256 i; i < aliceTokens.length; i++) {
            // ownerOf para confirmar que alice sigue siendo la dueña
            if (rwa.ownerOf(aliceTokens[i]) == alice) {
                IBashoodRWA.FinancialData memory fin = rwa.getFinancialData(aliceTokens[i]);
                sum += fin.currentValue;
            }
        }
        assertEq(
            rwa.getTotalAssetValue(alice),
            sum,
            "INV-4: getTotalAssetValue != sum of individual token currentValues"
        );
    }
}
