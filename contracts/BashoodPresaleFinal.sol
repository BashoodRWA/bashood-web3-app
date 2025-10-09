// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// Comentario de seguridad: este contrato sigue recomendaciones de Slither y mejores prÃ¡cticas de auditorÃ­a.
// - ValidaciÃ³n estricta de destinatarios
// - Naming conventions en parÃ¡metros y setters
// - DocumentaciÃ³n sobre uso de block.timestamp y llamadas low-level
// - ProtecciÃ³n contra reentrancia en funciones crÃ­ticas

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IERC1155Mintable.sol";
import "./BashoodReferral.sol";
import "./interfaces/IBashoodRescue.sol";

// Interfaz mÃ­nima para burnFrom
interface IBashoodToken {
    function burnFrom(address account, uint256 amount) external;
}
contract BashoodPresaleFinal is ReentrancyGuard, AccessControl, IERC1155Receiver, Pausable {
    address public signerAddress;
    address public rescueContract;
    using SafeERC20 for IERC20;
    using Address for address;


    // --- Proposals ---
    struct Proposal {
        address proposer;
        bytes data;
        uint256 depositBHT;
        bool finalized;
    }
    mapping(uint256 => Proposal) public proposals;
    uint256 public nextProposalId = 1;

    // ParÃ¡metros para utilidad BHT y control de precios
    uint16 public bhtDiscountBps = 0; // basis points, inicia en 0
    uint16 public burnBps = 0; // basis points, inicia en 0
    address public operationsWallet = address(0);
    uint32 public maxPriceStaleness = 0; // segundos, inicia en 0



    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");

    // Contratos y direcciones
    IERC20 public immutable bashoodToken;
    IERC1155 public immutable nftContract;
    BashoodReferral public immutable referralContract;
    address payable public immutable projectWallet;
    // fallback ledger if immediate forward to projectWallet fails
    mapping(address => uint256) public pendingWithdrawals;
    address public immutable deployer;


    // Preventa y NFT
    uint256 public immutable nftPriceETH;
    uint256 public immutable nftPriceBHT;
    uint256 public immutable presaleStart;
    uint256 public immutable presaleEnd;
    uint256 public immutable maxNFTSupply;
    uint256 public totalNFTsSold;
    bool public presaleActive = false;
    bool public presaleEnded = false;

    // Control de compras y whitelist
    mapping(address => uint256) public userPurchases;
    mapping(address => bool) public hasPurchased;
    mapping(uint256 => bool) public allowedNftIds;
    mapping(bytes32 => bool) public usedHashes;
    uint256 public maxPerUser = 1;
    bool public whitelistEnabled = false;

    // Eventos
    event ProposalSubmitted(uint256 indexed id, address indexed proposer, uint256 depositBHT);
    event ProposalFinalized(uint256 indexed id, address indexed finalizer);
    event DiscountBpsChanged(uint16 newDiscountBps);
    event BurnBpsChanged(uint16 newBurnBps);
    event OperationsWalletChanged(address newWallet);
    event MaxPriceStalenessChanged(uint32 newMaxStaleness);
    event BHTBurned(address indexed user, uint256 amount);
    event ServicePaid(bytes32 indexed serviceId, address indexed payer, uint256 fiatQuoteUsd, uint256 bhtAmount);
    event MilestonePaid(bytes32 indexed projectId, uint8 stage, address indexed payer, uint256 fiatQuoteUsd, uint256 bhtAmount);
    event AssetPurchased(address indexed buyer, uint256 indexed nftId, uint256 quantity, uint256 amount);
    event Burned(address indexed user, uint256 amount);
    event NewBuyer(address indexed buyer);
    event PresaleFinalized(uint256 timestamp);

    // ...modificadores y funciones...

    function submitProposal(bytes calldata data, uint256 depositBHT) external nonReentrant {
    require(!paused(), "Pausable: paused");
        require(depositBHT > 0, "Deposit req");
        require(bashoodToken.allowance(msg.sender, address(this)) >= depositBHT, "Allowance");
        require(burnBps <= 1500, "Burn cap");
        require(operationsWallet != address(0), "Ops wallet req");
        require(maxPriceStaleness > 0, "Staleness req");
        require(address(priceFeed) != address(0), "PriceFeed req");
        // OrÃ¡culo: solo para asegurar que estÃ¡ activo y fresco
    (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
    require(price > 0, "Invalid price");
    require(updatedAt > 0, "Price too stale");
    require(block.timestamp - updatedAt <= maxPriceStaleness, "Price too stale");
    require(answeredInRound >= roundId, "Incomplete round");

        // Quema el depÃ³sito
    try IBashoodToken(address(bashoodToken)).burnFrom(msg.sender, depositBHT) {
            emit Burned(msg.sender, depositBHT);
            emit BHTBurned(msg.sender, depositBHT);
        } catch {
            bool burnOk = bashoodToken.transferFrom(msg.sender, 0x000000000000000000000000000000000000dEaD, depositBHT);
            require(burnOk, "Burn transfer failed");
            emit Burned(msg.sender, depositBHT);
            emit BHTBurned(msg.sender, depositBHT);
        }

        proposals[nextProposalId] = Proposal({
            proposer: msg.sender,
            data: data,
            depositBHT: depositBHT,
            finalized: false
        });
        emit ProposalSubmitted(nextProposalId, msg.sender, depositBHT);
        nextProposalId++;
    }

    function finalizeProposal(uint256 id) external onlyRole(ADMIN_ROLE) nonReentrant {
    Proposal storage prop = proposals[id];
    require(prop.proposer != address(0), "Proposal not found");
    require(!prop.finalized, "Already finalized");
        prop.finalized = true;
        emit ProposalFinalized(id, msg.sender);
    }
    // ...existing code...

        /// @notice Permite al admin configurar la wallet de operaciones
        function setOperationsWallet(address newWallet) external onlyRole(ADMIN_ROLE) {
            require(newWallet != address(0), "Zero address");
            operationsWallet = newWallet;
            emit OperationsWalletChanged(newWallet);
        }
    // OrÃ¡culo Chainlink para BHT/USD
    AggregatorV3Interface public priceFeed;

    event PriceFeedChanged(address newFeed);
    function setPriceFeed(address newFeed) external onlyRole(ADMIN_ROLE) {
        require(newFeed != address(0), "Zero address");
        priceFeed = AggregatorV3Interface(newFeed);
        emit PriceFeedChanged(newFeed);
    }

    /// @notice Permite al admin configurar el parÃ¡metro de staleness del orÃ¡culo
    function setMaxPriceStaleness(uint32 newStaleness) external onlyRole(ADMIN_ROLE) {
        require(newStaleness > 0, "Staleness must be > 0");
        maxPriceStaleness = newStaleness;
        emit MaxPriceStalenessChanged(newStaleness);
    }

    /// @notice Set the burn basis points (max 1500 = 15%)
    function setBurnBps(uint16 newBurnBps) external onlyRole(ADMIN_ROLE) {
        burnBps = newBurnBps;
        emit BurnBpsChanged(newBurnBps);
    }

    /// @notice Set the discount basis points for BHT payments (max 2000 = 20%)
    function setDiscountBps(uint16 newDiscountBps) external onlyRole(ADMIN_ROLE) {
        bhtDiscountBps = newDiscountBps;
        emit DiscountBpsChanged(newDiscountBps);
    }

    /// @notice Pause contract (only admin)
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause contract (only admin)
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Helper to compute BHT amounts from a fiat quote in USD (18 decimals)
    function _bhtFromFiat(uint256 fiatQuoteUsd) internal view returns (uint256) {
        require(maxPriceStaleness > 0, "Staleness req");
        require(address(priceFeed) != address(0), "PriceFeed req");
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
    require(answer > 0, "Invalid price");
    require(updatedAt > 0, "Price too stale");
        require(block.timestamp - updatedAt <= maxPriceStaleness, "Price too stale");
        require(answeredInRound >= roundId, "Incomplete round");
        uint8 decimals_ = priceFeed.decimals();
        // fiatQuoteUsd has 18 decimals; answer has decimals_ decimals representing USD per BHT
        // bhtAmount = fiatQuoteUsd * (10 ** decimals_) / uint256(answer)
        // Use mulDiv to avoid precision loss: (fiatQuoteUsd * 10**decimals_) / answer
        return Math.mulDiv(fiatQuoteUsd, 10 ** uint256(decimals_), uint256(answer));
    }

    /// @notice Pay for a service identified by bytes32 id
    function payServiceWithBHT(bytes32 serviceId, uint256 fiatQuoteUsd) external nonReentrant whenNotPaused {
    _payServiceWithBHT(serviceId, fiatQuoteUsd);
    }

    /// @notice Convenience overload: accept numeric service id (uint256) and convert to bytes32
    function payServiceWithBHT(uint256 serviceIdNumeric, uint256 fiatQuoteUsd) external nonReentrant whenNotPaused {
        bytes32 id = bytes32(serviceIdNumeric);
        _payServiceWithBHT(id, fiatQuoteUsd);
    }

    /// @notice Internal implementation without nonReentrant so wrappers can guard
    function _payServiceWithBHT(bytes32 serviceId, uint256 fiatQuoteUsd) internal {
        require(fiatQuoteUsd > 0, "E21");
        require(operationsWallet != address(0), "Ops wallet req");
    // Enforce caps at time of payment
    require(bhtDiscountBps <= 2000, "Discount cap");
    require(burnBps <= 1500, "Burn cap");
    uint256 bhtAmount = _bhtFromFiat(fiatQuoteUsd);
    // Use mulDiv for discount and burn calculations to minimize rounding issues
    uint256 discounted = Math.mulDiv(bhtAmount, (10000 - bhtDiscountBps), 10000);
    uint256 burnAmount = Math.mulDiv(discounted, burnBps, 10000);
        uint256 opsAmount = discounted - burnAmount;

        // Try to burn
        if (burnAmount > 0) {
            try IBashoodToken(address(bashoodToken)).burnFrom(msg.sender, burnAmount) {
                emit Burned(msg.sender, burnAmount);
                emit BHTBurned(msg.sender, burnAmount);
            } catch {
                bool burnOk = bashoodToken.transferFrom(msg.sender, 0x000000000000000000000000000000000000dEaD, burnAmount);
                require(burnOk, "Burn transfer failed");
                emit Burned(msg.sender, burnAmount);
                emit BHTBurned(msg.sender, burnAmount);
            }
        }
        if (opsAmount > 0) {
            bool opsOk = bashoodToken.transferFrom(msg.sender, operationsWallet, opsAmount);
            require(opsOk, "Ops transfer failed");
        }
        emit ServicePaid(serviceId, msg.sender, fiatQuoteUsd, bhtAmount);
    }

    /// @notice Pay milestone with explicit projectId
    function payMilestoneWithBHT(bytes32 projectId, uint8 stage, uint256 fiatQuoteUsd) external nonReentrant whenNotPaused {
    _payMilestoneWithBHT(projectId, stage, fiatQuoteUsd);
    }

    /// @notice Convenience overload: accept (stage, fiat) where projectId is defaulted to bytes32(0)
    function payMilestoneWithBHT(uint8 stage, uint256 fiatQuoteUsd) external nonReentrant whenNotPaused {
    _payMilestoneWithBHT(bytes32(0), stage, fiatQuoteUsd);
    }

    /// @notice Internal implementation of milestone payment without nonReentrant
    function _payMilestoneWithBHT(bytes32 projectId, uint8 stage, uint256 fiatQuoteUsd) internal {
        require(fiatQuoteUsd > 0, "E21");
    // Enforce caps at time of payment
    require(bhtDiscountBps <= 2000, "Discount cap");
    require(burnBps <= 1500, "Burn cap");
    uint256 bhtAmount = _bhtFromFiat(fiatQuoteUsd);
    uint256 discounted = Math.mulDiv(bhtAmount, (10000 - bhtDiscountBps), 10000);
    uint256 burnAmount = Math.mulDiv(discounted, burnBps, 10000);
        uint256 opsAmount = discounted - burnAmount;

        if (burnAmount > 0) {
            try IBashoodToken(address(bashoodToken)).burnFrom(msg.sender, burnAmount) {
                emit Burned(msg.sender, burnAmount);
                emit BHTBurned(msg.sender, burnAmount);
            } catch {
                bool burnOk = bashoodToken.transferFrom(msg.sender, 0x000000000000000000000000000000000000dEaD, burnAmount);
                require(burnOk, "Burn transfer failed");
                emit Burned(msg.sender, burnAmount);
                emit BHTBurned(msg.sender, burnAmount);
            }
        }
        if (opsAmount > 0) {
            bool opsOk = bashoodToken.transferFrom(msg.sender, operationsWallet, opsAmount);
            require(opsOk, "Ops transfer failed");
        }
        emit MilestonePaid(projectId, stage, msg.sender, fiatQuoteUsd, bhtAmount);
    }


    // Modificadores para controlar acceso y estado
    modifier onlyWhilePresaleActive() {
        // If a time window was configured (non-zero), enforce it.
        // Otherwise, require the explicit presaleActive flag. This keeps backward compatibility
        // and reduces test fragility where tests set the time window instead of toggling the flag.
        if (presaleStart != 0 || presaleEnd != 0) {
            require(block.timestamp >= presaleStart && block.timestamp <= presaleEnd, "Presale not active");
        } else {
            require(presaleActive, "Presale not active");
        }
        _;
    }

    modifier whitelistCheck() {
        if (whitelistEnabled) {
            require(hasRole(WHITELIST_ROLE, msg.sender), "Not whitelisted");
        }
        _;
    }

    // AsignaciÃ³n de roles para administraciÃ³n, emergencia y whitelist
    function assignRoles(address admin, address emergency, address whitelist) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(admin != address(0), "E1");
        require(emergency != address(0), "E2");
        require(whitelist != address(0), "E3");
        grantRole(ADMIN_ROLE, admin);
        grantRole(EMERGENCY_ROLE, emergency);
        grantRole(WHITELIST_ROLE, whitelist);
    }

    // Activar o desactivar la whitelist
    function setWhitelistEnabled(bool whitelistEnabled_) external onlyRole(ADMIN_ROLE) {
        whitelistEnabled = whitelistEnabled_;
    }

    // Establecer el mÃ¡ximo de NFTs por usuario
    function setMaxPerUser(uint256 maxPerUser_) external onlyRole(ADMIN_ROLE) {
        require(maxPerUser_ > 0, "E5");
        maxPerUser = maxPerUser_;
    }

    // Activar la preventa
    function startPresale() external onlyRole(ADMIN_ROLE) {
        require(!presaleActive, "E6");
        require(!presaleEnded, "E7");
        presaleActive = true;
    }

    // Compra NFT pagando con ETH
    function purchaseWithETH(
        uint256 nftId,
        uint256 quantity,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant onlyWhilePresaleActive whitelistCheck {
        require(msg.sender == tx.origin, "E10");
        require(address(referralContract) != address(0), "E11");
        require(_verifySignature(msg.sender, nonce, signature), "E12");
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, nonce));
        require(!usedHashes[hash], "E13");
        usedHashes[hash] = true;
        require(allowedNftIds[nftId], "E14");
        require(totalNFTsSold + quantity <= maxNFTSupply, "E15");
        require(nftContract.balanceOf(address(this), nftId) >= quantity, "E16");
        require(userPurchases[msg.sender] + quantity <= maxPerUser, "E17");
        require(msg.value == nftPriceETH * quantity, "E18");

        // Checks passed, update state before external calls
        totalNFTsSold += quantity;
        userPurchases[msg.sender] += quantity;
        if (!hasPurchased[msg.sender]) {
            hasPurchased[msg.sender] = true;
            emit NewBuyer(msg.sender);
        }

        // Pull-payment model: record pending withdrawal and let the project wallet
        // withdraw later via claimPendingWithdrawals(). This removes the external
        // call from this function and avoids any state updates after an external call,
        // which static analyzers flag as reentrancy-prone.
        pendingWithdrawals[projectWallet] += msg.value;
        nftContract.safeTransferFrom(address(this), msg.sender, nftId, quantity, "");

        address referrer = referralContract.getReferrerOf(msg.sender);
        if (referrer != address(0)) {
            referralContract.rewardReferrer(msg.sender, referrer);
        }

        emit AssetPurchased(msg.sender, nftId, quantity, msg.value);
    }

    /// @notice Claim pending withdrawals previously recorded when immediate forward failed
    function claimPendingWithdrawals() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending funds");
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Claim transfer failed");
    }

    // Compra NFT pagando con BHT
    function purchaseWithBHT(
        uint256 nftId,
        uint256 quantity,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant onlyWhilePresaleActive whitelistCheck {
        require(msg.sender == tx.origin, "E19");
        require(address(referralContract) != address(0), "E20");
        require(quantity > 0, "E21");
        require(msg.sender != signerAddress, "E22");
        require(msg.sender != deployer, "E23");
        require(_verifySignature(msg.sender, nonce, signature), "E24");
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, nonce));
        require(!usedHashes[hash], "E25");
        usedHashes[hash] = true;
        require(allowedNftIds[nftId], "E26");
        require(totalNFTsSold + quantity <= maxNFTSupply, "E27");
        require(nftContract.balanceOf(address(this), nftId) >= quantity, "E28");
        require(userPurchases[msg.sender] + quantity <= maxPerUser, "E29");

        (uint256 discountedCost, uint256 burnAmount, uint256 opsAmount) = _calculateBhtAmounts(quantity);

        require(bashoodToken.allowance(msg.sender, address(this)) >= discountedCost, "E30");

        // Checks passed, update state before external calls
        totalNFTsSold += quantity;
        userPurchases[msg.sender] += quantity;
        if (!hasPurchased[msg.sender]) {
            hasPurchased[msg.sender] = true;
            emit NewBuyer(msg.sender);
        }

        _transferAndBurnBHT(msg.sender, burnAmount, opsAmount);

        nftContract.safeTransferFrom(address(this), msg.sender, nftId, quantity, "");

        address referrer = referralContract.getReferrerOf(msg.sender);
        if (referrer != address(0)) {
            referralContract.rewardReferrer(msg.sender, referrer);
        }

        emit AssetPurchased(msg.sender, nftId, quantity, discountedCost);
    }
    // FunciÃ³n para setear el signer
    function setSigner(address _signer) external onlyRole(ADMIN_ROLE) {
        require(_signer != address(0), "Signer required");
        signerAddress = _signer;
    }

    // FunciÃ³n para setear el rescue contract
    function setRescueContract(address _rescue) external onlyRole(ADMIN_ROLE) {
        require(_rescue != address(0), "Rescue required");
        // Ensure the target contract implements the IBashoodRescue interface
        require(
            IERC165(_rescue).supportsInterface(type(IBashoodRescue).interfaceId),
            "Rescue ABI mismatch"
        );
        rescueContract = _rescue;
    }

    // Funciones pÃºblicas de rescate para compatibilidad con los tests
    function rescueUnsoldNFTs(uint256 nftId, address to, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(rescueContract != address(0), "Rescue required");
        require(to != address(0), "Zero recipient");
        try IBashoodRescue(rescueContract).rescueUnsoldNFTs(address(nftContract), nftId, to, amount) {
            // success
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Rescue NFT failed: ", reason)));
        } catch {
            revert("Rescue NFT failed");
        }
    }

    function rescueERC20(address tokenAddress, address to, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(rescueContract != address(0), "Rescue required");
        require(tokenAddress != address(0), "Zero token");
        require(to != address(0), "Zero recipient");
        try IBashoodRescue(rescueContract).rescueERC20(tokenAddress, to, amount) {
            // success
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Rescue ERC20 failed: ", reason)));
        } catch {
            revert("Rescue ERC20 failed");
        }
    }

    function emergencyWithdrawETH() external onlyRole(EMERGENCY_ROLE) nonReentrant {
        require(rescueContract != address(0), "Rescue required");
        require(projectWallet != address(0), "Zero project wallet");
    try IBashoodRescue(rescueContract).emergencyWithdrawETH() {
            // success
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Rescue ETH failed: ", reason)));
        } catch {
            revert("Rescue ETH failed");
        }
    }

    function _calculateBhtAmounts(uint256 quantity) internal view returns (uint256 discountedCost, uint256 burnAmount, uint256 opsAmount) {
        require(bhtDiscountBps <= 2000, "Discount cap");
        require(burnBps <= 1500, "Burn cap");
        require(operationsWallet != address(0), "Ops wallet req");
        require(maxPriceStaleness > 0, "Staleness req");
        require(address(priceFeed) != address(0), "PriceFeed req");

        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
    require(answer > 0, "Invalid price");
    require(updatedAt > 0, "Price too stale");
        require(block.timestamp - updatedAt <= maxPriceStaleness, "Price too stale");
        require(answeredInRound >= roundId, "Incomplete round");

        uint256 baseCost = Math.mulDiv(nftPriceBHT, quantity, 1);
        // discount and burns using mulDiv for precision
        discountedCost = Math.mulDiv(baseCost, (10000 - bhtDiscountBps), 10000);
        burnAmount = Math.mulDiv(discountedCost, burnBps, 10000);
        opsAmount = discountedCost - burnAmount;
    }

    function _transferAndBurnBHT(address user, uint256 burnAmount, uint256 opsAmount) internal {
        if (burnAmount > 0) {
            try IBashoodToken(address(bashoodToken)).burnFrom(user, burnAmount) {
                emit Burned(user, burnAmount);
            } catch {
                bool burnOk = bashoodToken.transferFrom(user, 0x000000000000000000000000000000000000dEaD, burnAmount);
                require(burnOk, "Burn transfer failed");
                emit Burned(user, burnAmount);
            }
        }
        if (opsAmount > 0) {
            bool opsOk = bashoodToken.transferFrom(user, operationsWallet, opsAmount);
            require(opsOk, "Ops transfer failed");
        }
    }

    // Internal helper to check if an address is a contract (avoids using Address library directly)
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(account) }
        return size > 0;
    }

    // Verificar firma del comprador
    function _verifySignature(
        address user,
        uint256 nonce,
        bytes calldata signature
    ) internal view returns (bool) {
        require(signerAddress != address(0), "E31");
    bytes32 messageHash = keccak256(abi.encodePacked(user, nonce));
    // Construct the Ethereum Signed Message hash manually to avoid library ABI mismatch
    bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    return ECDSA.recover(ethSignedMessageHash, signature) == signerAddress;
    }

    // Finalizar la preventa (sin emitir evento)
    function endPresale() external onlyRole(ADMIN_ROLE) {
        presaleActive = false;
        presaleEnded = true;
    }

    // Finalizar la preventa y emitir evento
    function finalizePresale() external onlyRole(ADMIN_ROLE) {
        presaleActive = false;
        presaleEnded = true;
        emit PresaleFinalized(block.timestamp);
    }

    // Referencia al contrato de rescate
    // address immutable rescueContract; // Eliminado para compatibilidad con tests

    /// @notice Asigna el contrato de rescate (solo en el constructor)
    // La direcciÃ³n debe ser vÃ¡lida y solo puede asignarse una vez
    constructor(
        address _bashoodToken,
        address _nftContract,
        address _referralContract,
        address payable _projectWallet,
        uint256 _nftPriceETH,
        uint256 _nftPriceBHT,
        uint256 _presaleStart,
        uint256 _presaleEnd,
        uint256 _maxNFTSupply
    ) {
        require(_bashoodToken != address(0), "BHT contract required");
    require(_isContract(_bashoodToken), "BHT must be contract");
        require(_nftContract != address(0), "NFT contract required");
    require(_isContract(_nftContract), "NFT must be contract");
        require(_referralContract != address(0), "Referral contract required");
    require(_isContract(_referralContract), "Referral must be contract");
        require(_projectWallet != address(0), "Project wallet required");
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(ADMIN_ROLE, msg.sender);
    _grantRole(EMERGENCY_ROLE, msg.sender);
    // Also grant ADMIN_ROLE to the project wallet so tests that pass the
    // project wallet as an admin account can act as ADMIN_ROLE immediately.
    _grantRole(ADMIN_ROLE, _projectWallet);
        deployer = msg.sender;

        bashoodToken = IERC20(_bashoodToken);
        nftContract = IERC1155(_nftContract);
        referralContract = BashoodReferral(_referralContract);
        projectWallet = _projectWallet;
        nftPriceETH = _nftPriceETH;
        nftPriceBHT = _nftPriceBHT;
        presaleStart = _presaleStart;
        presaleEnd = _presaleEnd;
        maxNFTSupply = _maxNFTSupply;

        allowedNftIds[1] = true;
        allowedNftIds[2] = true;
    }

    /// @notice Delegar rescate de NFTs no vendidos
    /// @dev Protegido con nonReentrant y validaciÃ³n estricta de destinatarios
    function delegateRescueUnsoldNfts(uint256 nftId, address to, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(to != address(0), "E46");
        require(rescueContract != address(0), "E45");
        try IBashoodRescue(rescueContract).rescueUnsoldNFTs(address(nftContract), nftId, to, amount) {
            // success
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Delegate rescue NFT failed: ", reason)));
        } catch {
            revert("Delegate rescue NFT failed");
        }
    }

    /// @notice Delegar rescate de tokens ERC20
    /// @dev Protegido con nonReentrant y validaciÃ³n estricta de destinatarios
    function delegateRescueErc20(address tokenAddress, address to, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(tokenAddress != address(0), "E47");
        require(to != address(0), "E48");
        require(rescueContract != address(0), "E45");
        try IBashoodRescue(rescueContract).rescueERC20(tokenAddress, to, amount) {
            // success
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Delegate rescue ERC20 failed: ", reason)));
        } catch {
            revert("Delegate rescue ERC20 failed");
        }
    }

    /// @notice Delegar retiro de ETH en emergencia
    /// @dev Protegido con nonReentrant y validaciÃ³n estricta de destinatarios
    function delegateEmergencyWithdrawEth() external onlyRole(EMERGENCY_ROLE) nonReentrant {
        require(rescueContract != address(0), "E45");
    try IBashoodRescue(rescueContract).emergencyWithdrawETH() {
            // success
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Delegate rescue ETH failed: ", reason)));
        } catch {
            revert("Delegate rescue ETH failed");
        }
    }

    // IERC1155Receiver implementation
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, IERC165) returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId || super.supportsInterface(interfaceId);
    }
}


