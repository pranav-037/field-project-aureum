// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AccessControlExtension
 * @dev Manages role-based permissions and emergency pausing for the Aureum Artchain system.
 */
abstract contract AccessControlExtension is AccessControl, Pausable {
    bytes32 public constant ARTCHAIN_ADMIN = keccak256("ARTCHAIN_ADMIN");
    bytes32 public constant AUTHENTICATOR = keccak256("AUTHENTICATOR");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event AdminRoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event AdminRoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    constructor(address initialAdmin) {
        address admin = initialAdmin == address(0) ? msg.sender : initialAdmin;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ARTCHAIN_ADMIN, admin);
        _grantRole(PAUSER_ROLE, admin);

        // ARTCHAIN_ADMIN can administer AUTHENTICATOR and PAUSER_ROLE
        _setRoleAdmin(AUTHENTICATOR, ARTCHAIN_ADMIN);
        _setRoleAdmin(PAUSER_ROLE, ARTCHAIN_ADMIN);
    }

    /**
     * @dev Emergency pause for transfer operations.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause transfer operations.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
