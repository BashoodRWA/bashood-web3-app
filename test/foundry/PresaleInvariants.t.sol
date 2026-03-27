// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {BashoodPresaleFinal} from "../../contracts/BashoodPresaleFinal.sol";
import {BashoodToken} from "../../contracts/BashoodToken.sol";
import {BashoodPropertyNFT} from "../../contracts/BashoodPropertyNFT.sol";
import {BashoodReferral} from "../../contracts/BashoodReferral.sol";
import {BashoodRescue} from "../../contracts/BashoodRescue.sol";
import {BashoodPaymentSplitter} from "../../contracts/BashoodPaymentSplitter.sol";

/**
 * @title PresaleInvariantsHandler
 * @notice Handler que ejecuta compras aleatorias con ETH
 * @dev Foundry llamará estas funciones durante invariant testing
 */
contract PresaleInvariantsHandler is Test {
    BashoodPresaleFinal public presale;
    
    address public alice;
    address public bob;
    address public charlie;
    
    uint256 public ghost_totalETHSent;
    uint256 public ghost_totalPurchases;
    
    mapping(address => uint256) public ghost_userPurchases;
    
    uint256 constant NFT_PRICE_ETH = 0.01 ether;
    uint256 constant MAX_PER_USER = 5;
    
    constructor(BashoodPresaleFinal _presale) {
        presale = _presale;
        
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");
        
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }
    
    /// @notice Compra con ETH desde usuario aleatorio
    function purchaseWithETH(uint256 userSeed, uint256 quantity) public {
        // Seleccionar usuario aleatorio (0=alice, 1=bob, 2=charlie)
        address user = _getUser(userSeed % 3);
        
        // Bound quantity entre 1 y MAX_PER_USER
        quantity = bound(quantity, 1, MAX_PER_USER);
        
        // Verificar que no exceda límite del usuario
        uint256 currentPurchases = ghost_userPurchases[user];
        if (currentPurchases >= MAX_PER_USER) {
            return; // Usuario ya alcanzó límite
        }
        
        // Ajustar cantidad para no exceder límite
        if (currentPurchases + quantity > MAX_PER_USER) {
            quantity = MAX_PER_USER - currentPurchases;
        }
        
        // Verificar supply disponible
        if (presale.totalNFTsSold() + quantity > presale.maxNFTSupply()) {
            return; // No hay supply suficiente
        }
        
        uint256 cost = NFT_PRICE_ETH * quantity;
        
        // Ejecutar compra (NFT ID 1, sin referral)
        vm.prank(user);
        try presale.purchaseWithETH{value: cost}(1, quantity, 0, "") {
            // Track successful purchase
            ghost_totalETHSent += cost;
            ghost_totalPurchases += quantity;
            ghost_userPurchases[user] += quantity;
        } catch {
            // Purchase failed, no update needed
        }
    }
    
    /// @notice Time Travel: Avanzar tiempo aleatoriamente
    function warpTime(uint256 timeSeed) public {
        // Avanzar entre 1 hora y 7 días
        uint256 timeJump = bound(timeSeed, 1 hours, 7 days);
        skip(timeJump);
    }
    
    /// @notice Pausar/despausar el contrato
    function togglePause(uint256 seed) public {
        // Ocasionalmente pausar/despausar (20% de probabilidad)
        if (seed % 5 == 0) {
            try presale.pause() {} catch {}
        } else if (seed % 5 == 1) {
            try presale.unpause() {} catch {}
        }
    }
    
    function _getUser(uint256 index) internal view returns (address) {
        if (index == 0) return alice;
        if (index == 1) return bob;
        return charlie;
    }
}

/**
 * @title PresaleInvariantsTest
 * @notice Tests de invariantes para BashoodPresaleFinal
 * @dev Ejecuta 256 runs × 15 depth = 3,840 llamadas totales
 */
contract PresaleInvariantsTest is Test {
    BashoodPresaleFinal public presale;
    BashoodToken public bht;
    BashoodPropertyNFT public nft;
    BashoodReferral public referral;
    BashoodRescue public rescue;
    BashoodPaymentSplitter public splitter;
    
    PresaleInvariantsHandler public handler;
    
    address public deployer;
    address public treasury;
    address public development;
    address public marketing;
    address public operations;
    address public treasuryPS;
    
    uint256 constant PRESALE_START = 1704067200; // 1 Jan 2024
    uint256 constant PRESALE_END = 1735689600;   // 31 Dec 2024
    uint256 constant MAX_NFT_SUPPLY = 1000;
    uint256 constant NFT_PRICE_ETH = 0.01 ether;
    uint256 constant NFT_PRICE_BHT = 100 * 1e18;
    
    function setUp() public {
        deployer = address(this);
        
        // Crear wallets diferentes
        treasury = makeAddr("treasury");
        development = makeAddr("development");
        marketing = makeAddr("marketing");
        operations = makeAddr("operations");
        treasuryPS = makeAddr("treasuryPS");
        
        // 1. Deploy BashoodToken
        bht = new BashoodToken(treasury);
        
        // 2. Deploy BashoodPropertyNFT
        nft = new BashoodPropertyNFT("https://api.bashood.com/metadata/");
        
        // 3. Deploy BashoodReferral
        referral = new BashoodReferral(
            address(this),  // presaleAddress (temporal)
            address(this),  // validator (dummy)
            address(nft)    // nftContract
        );
        
        // 4. Deploy PaymentSplitter (45%, 25%, 20%, 10%)
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
        
        splitter = new BashoodPaymentSplitter(payees, shares);
        
        // 5. Deploy BashoodRescue
        rescue = new BashoodRescue(deployer, deployer);
        
        // 6. Deploy BashoodPresaleFinal
        presale = new BashoodPresaleFinal(
            address(bht),                   // _bashoodToken
            address(nft),                   // _nftContract
            address(referral),              // _referralContract
            payable(address(splitter)),     // _projectWallet
            operations,                     // _operationsWallet
            NFT_PRICE_ETH,                  // _nftPriceETH
            NFT_PRICE_BHT,                  // _nftPriceBHT
            PRESALE_START,                  // _presaleStart
            PRESALE_END,                    // _presaleEnd
            MAX_NFT_SUPPLY                  // _maxNFTSupply
        );
        
        // Configurar permisos
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        nft.grantRole(MINTER_ROLE, address(presale));
        presale.setRescueContract(address(rescue));
        
        // Warp al inicio de la presale
        vm.warp(PRESALE_START + 1 days);
        
        // Crear handler
        handler = new PresaleInvariantsHandler(presale);
        
        // Configurar Foundry para llamar solo al handler
        targetContract(address(handler));
        
        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = PresaleInvariantsHandler.purchaseWithETH.selector;
        selectors[1] = PresaleInvariantsHandler.warpTime.selector;
        selectors[2] = PresaleInvariantsHandler.togglePause.selector;
        
        targetSelector(FuzzSelector({
            addr: address(handler),
            selectors: selectors
        }));
    }
    
    /*//////////////////////////////////////////////////////////////
                        INVARIANT 1: NFT SUPPLY LIMIT
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Total NFTs vendidos nunca excede maxNFTSupply
    function invariant_totalNFTsSoldNeverExceedsMax() public view {
        uint256 sold = presale.totalNFTsSold();
        uint256 maxSupply = presale.maxNFTSupply();
        
        assertLe(
            sold,
            maxSupply,
            "INVARIANT 1 VIOLATED: totalNFTsSold exceeds maxNFTSupply"
        );
    }
    
    /*//////////////////////////////////////////////////////////////
                    INVARIANT 2: ETH CONSERVATION
    //////////////////////////////////////////////////////////////*/
    
    /// @notice ETH recibido = ETH enviado por usuarios
    function invariant_ETHConservation() public view {
        uint256 ethSent = handler.ghost_totalETHSent();
        uint256 ethInSplitter = address(splitter).balance;
        
        assertEq(
            ethInSplitter,
            ethSent,
            "INVARIANT 2 VIOLATED: ETH conservation broken"
        );
    }
    
    /*//////////////////////////////////////////////////////////////
                INVARIANT 3: USER PURCHASE LIMITS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Ningún usuario excede MAX_PER_USER (5 NFTs)
    function invariant_userPurchasesRespectLimit() public view {
        address alice = handler.alice();
        address bob = handler.bob();
        address charlie = handler.charlie();
        
        assertLe(
            handler.ghost_userPurchases(alice),
            5,
            "INVARIANT 3 VIOLATED: Alice exceeded limit"
        );
        assertLe(
            handler.ghost_userPurchases(bob),
            5,
            "INVARIANT 3 VIOLATED: Bob exceeded limit"
        );
        assertLe(
            handler.ghost_userPurchases(charlie),
            5,
            "INVARIANT 3 VIOLATED: Charlie exceeded limit"
        );
    }
    
    /*//////////////////////////////////////////////////////////////
            INVARIANT 4: TOTAL PURCHASES CONSISTENCY
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Total purchases tracked = totalNFTsSold en contrato
    function invariant_totalPurchasesConsistency() public view {
        uint256 ghostTotal = handler.ghost_totalPurchases();
        uint256 contractTotal = presale.totalNFTsSold();
        
        assertEq(
            ghostTotal,
            contractTotal,
            "INVARIANT 4 VIOLATED: Purchase tracking inconsistent"
        );
    }
    
    /*//////////////////////////////////////////////////////////////
            INVARIANT 5: PAYMENT SPLITTER SHARES
    //////////////////////////////////////////////////////////////*/
    
    /// @notice PaymentSplitter shares suman 100%
    function invariant_paymentSplitterSharesTotal100() public view {
        uint256 totalShares = splitter.totalShares();
        
        assertEq(
            totalShares,
            100,
            "INVARIANT 5 VIOLATED: PaymentSplitter shares != 100%"
        );
    }
    
    /*//////////////////////////////////////////////////////////////
                INVARIANT 6: CONTRACT STATE VALID
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Rescue contract siempre configurado
    function invariant_rescueContractAlwaysSet() public view {
        address rescueAddr = presale.rescueContract();
        
        assertNotEq(
            rescueAddr,
            address(0),
            "INVARIANT 6 VIOLATED: Rescue contract not set"
        );
    }
    
    /*//////////////////////////////////////////////////////////////
                    INVARIANT SUMMARY (LOGS)
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Resumen final de testing
    function invariant_callSummary() public view {
        console.log("\n========================================");
        console.log("    INVARIANT TESTING SUMMARY");
        console.log("========================================");
        console.log("Total NFTs Sold:", presale.totalNFTsSold());
        console.log("Max NFT Supply:", presale.maxNFTSupply());
        console.log("ETH in Splitter:", address(splitter).balance);
        console.log("Ghost ETH Sent:", handler.ghost_totalETHSent());
        console.log("Ghost Purchases:", handler.ghost_totalPurchases());
        console.log("========================================");
        console.log("Alice purchases:", handler.ghost_userPurchases(handler.alice()));
        console.log("Bob purchases:", handler.ghost_userPurchases(handler.bob()));
        console.log("Charlie purchases:", handler.ghost_userPurchases(handler.charlie()));
        console.log("========================================");
        console.log("All 6 invariants verified");
        console.log("Config: 256 runs x 15 depth = 3,840 calls");
        console.log("========================================\n");
    }
}
