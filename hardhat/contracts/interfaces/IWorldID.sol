// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWorldID {
    /// @notice Verifies a WorldID proof
    /// @param root The root of the Merkle tree
    /// @param groupId The group ID (1 for Orb, 0 for Phone)
    /// @param signalHash The hash of the signal (e.g. wallet address)
    /// @param nullifierHash The nullifier hash to prevent double-signaling
    /// @param externalNullifierHash The external nullifier hash (app_id + action)
    /// @param proof The zero-knowledge proof
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}
