// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ComplianceRegistry.sol";

/// @notice Simple wrapper that holds legacy ERC20 and mints a representation if allowed by registry
contract TokenWrapperERC20 is ERC20, Ownable {
    using SafeERC20 for IERC20;
    IERC20 public legacy;
    ComplianceRegistry public registry;
    address public issuer; // issuer whose root will be checked

    event Wrapped(address indexed user, uint256 amount);
    event Unwrapped(address indexed user, uint256 amount);

    constructor(address legacyToken, address registryAddr, address issuer_, string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) {
        legacy = IERC20(legacyToken);
        registry = ComplianceRegistry(registryAddr);
        issuer = issuer_;
    }

    /// @notice Wrap (lock legacy token in this contract and mint representation)
    function wrap(uint256 amount, bytes32 leaf, bytes32[] calldata proof) external {
        require(registry.isValidProof(issuer, leaf, proof), "Not compliant");
        // transfer legacy token to this contract
        legacy.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        emit Wrapped(msg.sender, amount);
    }

    /// @notice Unwrap (burn representation and release legacy token)
    function unwrap(uint256 amount) external {
        _burn(msg.sender, amount);
        legacy.safeTransfer(msg.sender, amount);
        emit Unwrapped(msg.sender, amount);
    }
}
