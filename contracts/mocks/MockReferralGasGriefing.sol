// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockReferralGasGriefing
 * @notice Simula un referral malicioso que consume gas arbitrario en rewardReferrer
 *         y luego revierte. La compra en el presale debe completarse igual
 *         porque el presale usa try/catch alrededor de rewardReferrer.
 *
 *         También simula gas griefing: el bucle consume aprox. 200k gas antes
 *         de revertir, lo que verifica que el try/catch del presale aísla el gasto.
 */
contract MockReferralGasGriefing {
    address public fixedReferrer;
    uint256 public rewardCallCount;

    constructor(address referrer_) {
        fixedReferrer = referrer_;
    }

    /// @notice Siempre devuelve un referidor para que el presale intente llamar rewardReferrer
    function getReferrerOf(address /*user*/) external view returns (address) {
        return fixedReferrer;
    }

    /// @notice Consume gas en un bucle y luego revierte — gas griefing
    function rewardReferrer(address /*user*/, address /*referrer*/) external {
        rewardCallCount++;
        // Consumir gas deliberadamente
        uint256 dummy;
        for (uint256 i = 0; i < 500; i++) {
            dummy += i;
        }
        revert("Referral: intentional griefing revert");
    }
}
