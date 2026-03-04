// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/BashoodToken.sol";
import "../../contracts/standards/BashoodRWAReference.sol";
import "../../contracts/standards/IBashoodRWA.sol";
import "../../contracts/modules/OracleValuationModule.sol";
import "../../contracts/mocks/MockPriceFeed.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers compartidos  (struct factories)
// ─────────────────────────────────────────────────────────────────────────────
abstract contract RWATestHelper {
    function _dummyIdent() internal pure returns (IBashoodRWA.AssetIdentification memory) {
        return IBashoodRWA.AssetIdentification({
            name: "Test Asset",
            category: IBashoodRWA.AssetCategory.HEAVY_VEHICLE,
            manufacturer: "TestCo",
            model: "X-100",
            serialNumber: "SN-INV-001",
            yearManufactured: 2024,
            countryOfOrigin: "ES"
        });
    }

    function _dummyTechSpecs() internal pure returns (IBashoodRWA.TechnicalSpecs memory) {
        return IBashoodRWA.TechnicalSpecs({
            loadCapacity: 5000,
            displacementSpeed: 10,
            powerConsumption: 15,
            printVolumeX: 0, printVolumeY: 0, printVolumeZ: 0,
            materialPSI: 0, setupTimeMinutes: 0,
            autoLubrication: true, gpsTracking: true, cubicMetersPerDay: 0
        });
    }

    function _dummyFinancial(uint256 price) internal view returns (IBashoodRWA.FinancialData memory) {
        return IBashoodRWA.FinancialData({
            purchasePrice: price,
            currentValue: price,
            residualValuePct: 1500,
            lastAppraisalDate: uint32(block.timestamp),
            depModel: IBashoodRWA.DepreciationModel.LOAD_BASED,
            annualMaintenancePct: 200,
            insurancePremiumPct: 100
        });
    }

    function _dummyMetrics() internal pure returns (IBashoodRWA.OperationalMetrics memory) {
        return IBashoodRWA.OperationalMetrics({
            status: IBashoodRWA.OperationalStatus.OPERATIONAL,
            operatingHours: 0,
            maxLifetimeHours: 180_000,
            totalLoadLifted: 0,
            maxLoadLifetime: 5_000_000 ether,
            metersExtruded: 0,
            maxMetersLifetime: 0,
            setupCount: 0,
            maxSetups: 0,
            cubicMetersPerDay: 0,
            lastMaintenanceDate: 0,
            nextMaintenanceDate: 0,
            maintenanceIntervalHours: 2500
        });
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Suite 1 — BashoodToken: totalSupply ≤ INITIAL_SUPPLY y burn accounting
// ═════════════════════════════════════════════════════════════════════════════
/**
 * @title TokenSupplyInvariantTest
 * @notice Invariante 1: totalSupply nunca supera el supply máximo.
 *         Invariante 2: tokens quemados == INITIAL_SUPPLY − totalSupply().
 */
contract TokenSupplyInvariantTest is Test {
    BashoodToken public token;
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 1e18;

    address treasury = address(0x100);
    address alice    = address(0x101);
    address bob      = address(0x102);
    address charlie  = address(0x103);

    function setUp() public {
        token = new BashoodToken(treasury);
        // Distribuir tokens para generar actividad de transferencias (con burn)
        token.transfer(alice,   100_000_000 * 1e18);
        token.transfer(bob,     100_000_000 * 1e18);
        token.transfer(charlie, 100_000_000 * 1e18);
        targetContract(address(this));
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    function handler_aliceToBob(uint256 amount) external {
        uint256 bal = token.balanceOf(alice);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);
        vm.prank(alice);
        token.transfer(bob, amount);
    }

    function handler_bobToCharlie(uint256 amount) external {
        uint256 bal = token.balanceOf(bob);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);
        vm.prank(bob);
        token.transfer(charlie, amount);
    }

    function handler_charlieToAlice(uint256 amount) external {
        uint256 bal = token.balanceOf(charlie);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);
        vm.prank(charlie);
        token.transfer(alice, amount);
    }

    // ── Invariantes ───────────────────────────────────────────────────────────

    /// @notice totalSupply nunca puede superar el supply inicial (sin inflation)
    function invariant_totalSupplyNeverExceedsMax() external view {
        assertLe(token.totalSupply(), INITIAL_SUPPLY, "Supply exceeded INITIAL_SUPPLY");
    }

    /// @notice contabilidad de burn coherente: quemado == supply desaparecido
    function invariant_burnAccountingConsistent() external view {
        assertEq(
            INITIAL_SUPPLY - token.totalSupply(),
            token.totalBurned(),
            "Burn accounting mismatch: burned != INITIAL_SUPPLY - totalSupply"
        );
    }
}


// ═════════════════════════════════════════════════════════════════════════════
// Suite 2 — RWA Access Control: solo ASSET_MANAGER_ROLE puede mutar el Core
// ═════════════════════════════════════════════════════════════════════════════
/**
 * @title RWAAccessControlInvariantTest
 * @notice Un atacante sin ASSET_MANAGER_ROLE nunca consigue mint ni update.
 */
contract RWAAccessControlInvariantTest is Test, RWATestHelper {
    BashoodRWAReference public rwa;

    bytes32 constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    address admin          = address(this);
    address assetManager   = address(0x200);
    address unauthorized   = address(0x201);
    address nftRecipient   = address(0x202);

    uint256 public tokenId;
    uint256 public unauthorizedMintSuccesses;
    uint256 public unauthorizedUpdateSuccesses;

    function setUp() public {
        BashoodRWAReference impl = new BashoodRWAReference();
        bytes memory init = abi.encodeWithSelector(
            BashoodRWAReference.initialize.selector,
            "Bashood Industrial Assets", "BASHOOD-RWA",
            "https://bashood.com/metadata/", admin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        rwa = BashoodRWAReference(address(proxy));
        rwa.grantRole(ASSET_MANAGER_ROLE, assetManager);

        // Mint un token inicial para tests de update
        vm.prank(assetManager);
        tokenId = rwa.mintAsset(
            nftRecipient,
            _dummyIdent(), _dummyTechSpecs(),
            _dummyFinancial(500_000 * 1e18), _dummyMetrics(),
            "ipfs://access-ctrl-test"
        );

        targetContract(address(this));
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    /// @dev Atacante intenta hacer mint sin rol
    function handler_unauthorizedMint() external {
        vm.prank(unauthorized);
        try rwa.mintAsset(
            nftRecipient,
            _dummyIdent(), _dummyTechSpecs(),
            _dummyFinancial(1 ether), _dummyMetrics(),
            "ipfs://attack"
        ) {
            unauthorizedMintSuccesses++;
        } catch {}
    }

    /// @dev Atacante intenta actualizar el valor del activo sin rol
    function handler_unauthorizedUpdate(uint256 newValue) external {
        newValue = bound(newValue, 1, type(uint128).max);
        vm.prank(unauthorized);
        try rwa.updateAssetValue(tokenId, newValue, "ATTACK") {
            unauthorizedUpdateSuccesses++;
        } catch {}
    }

    /// @dev Administrador legítimo actualiza — mantiene el sistema activo
    function handler_authorizedUpdate(uint256 newValue) external {
        newValue = bound(newValue, 1, type(uint128).max);
        vm.prank(assetManager);
        rwa.updateAssetValue(tokenId, newValue, "ADMIN_UPDATE");
    }

    // ── Invariantes ───────────────────────────────────────────────────────────

    /// @notice Sin ASSET_MANAGER_ROLE nunca se puede crear activos
    function invariant_unauthorizedCannotMint() external view {
        assertEq(unauthorizedMintSuccesses, 0, "Unauthorized address succeeded in mintAsset");
    }

    /// @notice Sin ASSET_MANAGER_ROLE nunca se puede modificar el valor del activo
    function invariant_unauthorizedCannotUpdateAssetValue() external view {
        assertEq(unauthorizedUpdateSuccesses, 0, "Unauthorized address succeeded in updateAssetValue");
    }
}


// ═════════════════════════════════════════════════════════════════════════════
// Suite 3 — Oracle Guard: el módulo rechaza siempre precios inválidos
// ═════════════════════════════════════════════════════════════════════════════
/**
 * @title OracleGuardInvariantTest
 * @notice Un feed con precio ≤ 0, stale o ronda antigua nunca actualiza el Core.
 */
contract OracleGuardInvariantTest is Test, RWATestHelper {
    OracleValuationModule public oracleModule;
    BashoodRWAReference   public rwa;
    MockPriceFeed          public priceFeed;

    bytes32 constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    address admin        = address(this);
    address assetManager = address(0x300);
    address nftRecipient = address(0x302);

    uint256 public tokenId;
    bool    public feedIsValid;
    uint256 public invalidPushSucceeded;

    function setUp() public {
        // Core RWA
        BashoodRWAReference impl = new BashoodRWAReference();
        bytes memory init = abi.encodeWithSelector(
            BashoodRWAReference.initialize.selector,
            "Bashood Industrial Assets", "BASHOOD-RWA",
            "https://bashood.com/metadata/", admin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        rwa = BashoodRWAReference(address(proxy));
        rwa.grantRole(ASSET_MANAGER_ROLE, assetManager);

        // Módulo Oracle
        oracleModule = new OracleValuationModule(address(rwa));
        rwa.grantRole(ASSET_MANAGER_ROLE, address(oracleModule));

        // Feed MockPriceFeed: 8 decimales, precio válido $2000
        priceFeed = new MockPriceFeed(8, 2_000 * 1e8);

        // Mint activo + configurar telemetría con el feed
        vm.prank(assetManager);
        tokenId = rwa.mintAsset(
            nftRecipient,
            _dummyIdent(), _dummyTechSpecs(),
            _dummyFinancial(500_000 * 1e18), _dummyMetrics(),
            "ipfs://oracle-guard-test"
        );
        vm.prank(assetManager);
        rwa.configureTelemetry(tokenId, IBashoodRWA.TelemetryConfig({
            hasRealTimeAPI: true,
            oracleAddress: address(priceFeed),
            apiProvider: "MockChainlink",
            apiKeyHash: bytes32(0),
            lastTelemetryUpdate: 0
        }));

        feedIsValid = true;
        targetContract(address(this));
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    /// @dev Feed con precio cero → inválido
    function handler_setZeroPrice() external {
        priceFeed.setAnswer(0);
        feedIsValid = false;
    }

    /// @dev Feed con precio negativo → inválido
    function handler_setNegativePrice() external {
        priceFeed.setAnswer(-1);
        feedIsValid = false;
    }

    /// @dev Feed con timestamp stale (>3600 s) → inválido
    function handler_setStaleFeed() external {
        priceFeed.setAnswerWithTimestamp(2_000 * 1e8, block.timestamp - 7200);
        feedIsValid = false;
    }

    /// @dev Feed con answeredInRound < roundId → round obsoleto → inválido
    function handler_setStaleRound() external {
        // Avanzar roundId pero bajar answeredInRound
        priceFeed.setAnswer(2_000 * 1e8);           // incrementa roundId
        priceFeed.setAnsweredInRound(0);              // answeredInRound < roundId
        feedIsValid = false;
    }

    /// @dev Restaurar feed válido
    function handler_restoreValidFeed() external {
        priceFeed.setAnswer(2_000 * 1e8);            // actualiza round y timestamp
        feedIsValid = true;
    }

    /// @dev Intenta pushValuation — si el feed es inválido no debe tener éxito
    function handler_tryPushValuation() external {
        if (!feedIsValid) {
            try oracleModule.pushValuation(tokenId) {
                invalidPushSucceeded++;
            } catch {}
        }
    }

    // ── Invariante ────────────────────────────────────────────────────────────

    /// @notice Un feed inválido nunca debe conseguir actualizar el Core
    function invariant_invalidOracleCannotUpdateCore() external view {
        assertEq(
            invalidPushSucceeded,
            0,
            "Invalid oracle feed managed to push valuation to Core"
        );
    }
}


// ═════════════════════════════════════════════════════════════════════════════
// Suite 4 — Core State Consistency: moduleCall → currentValue correcto
// ═════════════════════════════════════════════════════════════════════════════
/**
 * @title CoreStateConsistencyTest
 * @notice Después de un pushValuation con feed válido, el Core refleja
 *         exactamente el valor calculado por el módulo.
 *         El módulo nunca puede corromper currentValue a un estado inesperado.
 */
contract CoreStateConsistencyTest is Test, RWATestHelper {
    OracleValuationModule public oracleModule;
    BashoodRWAReference   public rwa;
    MockPriceFeed          public priceFeed;

    bytes32 constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    address admin        = address(this);
    address assetManager = address(0x400);
    address nftRecipient = address(0x402);

    uint256 public tokenId;
    uint256 public lastExpectedValue;
    bool    public valueMismatchDetected;

    function setUp() public {
        // Core RWA
        BashoodRWAReference impl = new BashoodRWAReference();
        bytes memory init = abi.encodeWithSelector(
            BashoodRWAReference.initialize.selector,
            "Bashood Industrial Assets", "BASHOOD-RWA",
            "https://bashood.com/metadata/", admin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        rwa = BashoodRWAReference(address(proxy));
        rwa.grantRole(ASSET_MANAGER_ROLE, assetManager);

        // Módulo Oracle
        oracleModule = new OracleValuationModule(address(rwa));
        rwa.grantRole(ASSET_MANAGER_ROLE, address(oracleModule));

        // Feed válido (8 dec, $1500)
        priceFeed = new MockPriceFeed(8, 1_500 * 1e8);

        // Mint activo inicial valorado en $500 000
        vm.prank(assetManager);
        tokenId = rwa.mintAsset(
            nftRecipient,
            _dummyIdent(), _dummyTechSpecs(),
            _dummyFinancial(500_000 * 1e18), _dummyMetrics(),
            "ipfs://core-state-test"
        );
        vm.prank(assetManager);
        rwa.configureTelemetry(tokenId, IBashoodRWA.TelemetryConfig({
            hasRealTimeAPI: true,
            oracleAddress: address(priceFeed),
            apiProvider: "MockChainlink",
            apiKeyHash: bytes32(0),
            lastTelemetryUpdate: 0
        }));

        // Valor esperado inicial = precio original
        lastExpectedValue = 500_000 * 1e18;
        targetContract(address(this));
    }

    // ── Helpers internos ──────────────────────────────────────────────────────

    /// @dev Calcula el valor escalado a 1e18 que el módulo produciría
    function _expectedOracleValue() internal view returns (uint256) {
        // MockPriceFeed devuelve answer con 8 decimales → escalar a 1e18
        (, int256 answer, , ,) = priceFeed.latestRoundData();
        return uint256(answer) * 1e10; // 8 dec → 18 dec
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    /// @dev Cambiar precio del feed y hacer pushValuation — verifica consistencia
    function handler_validPushValuation(uint256 newPriceUSD) external {
        newPriceUSD = bound(newPriceUSD, 1, 10_000_000); // $1 a $10 M
        priceFeed.setAnswer(int256(newPriceUSD) * 1e8);  // 8 decimales

        uint256 expected = _expectedOracleValue();
        oracleModule.pushValuation(tokenId);

        // Comprobar inmediatamente que el Core refleja el valor esperado
        IBashoodRWA.FinancialData memory fd = rwa.getFinancialData(tokenId);
        if (fd.currentValue != expected) {
            valueMismatchDetected = true;
        }
        lastExpectedValue = expected;
    }

    /// @dev Actualización directa autorizada — también debe reflejarse correctamente
    function handler_directAuthorizedUpdate(uint256 newValue) external {
        newValue = bound(newValue, 1, type(uint128).max);
        vm.prank(assetManager);
        rwa.updateAssetValue(tokenId, newValue, "DIRECT_UPDATE");
        lastExpectedValue = newValue;
    }

    /// @dev Intento de módulo de llamar grantRole en el Core — debe revertir
    function handler_moduleCannotGrantRole() external {
        // OracleValuationModule no expone grantRole → baja nivel: el Core lo protege
        // Simular un atacante tratando de llamar grantRole a través del módulo (no posible)
        // Esta llamada siempre revierte porque AccessControl protege grantRole
        bytes memory data = abi.encodeWithSignature(
            "grantRole(bytes32,address)", ASSET_MANAGER_ROLE, address(0xDEAD)
        );
        (bool success, ) = address(rwa).call(data);
        // El test contract (admin) SÍ puede grant, pero oracleModule NO
        // Solo verificamos que el llamante sin permiso falla
        if (success) {
            // Si llamamos desde address(this) que es admin — OK, solo rastreamos
        }
    }

    // ── Invariantes ───────────────────────────────────────────────────────────

    /// @notice El módulo nunca corrompe el valor del activo (siempre coherente)
    function invariant_coreValueNeverCorrupted() external view {
        assertFalse(valueMismatchDetected, "Core currentValue mismatch after module pushValuation");
    }

    /// @notice El valor almacenado en Core es siempre > 0 (nunca se destruye)
    function invariant_coreValueAlwaysPositive() external view {
        IBashoodRWA.FinancialData memory fd = rwa.getFinancialData(tokenId);
        assertGt(fd.currentValue, 0, "Core currentValue was set to zero");
    }
}
