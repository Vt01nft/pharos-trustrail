// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TrustRailRegistry
/// @notice Minimal receipt registry for Pharos TrustRail compliance decisions.
contract TrustRailRegistry {
    struct ReceiptRecord {
        bytes32 receiptHash;
        bytes32 policyHash;
        address agentWallet;
        uint256 chainId;
        uint256 createdAt;
        string status;
    }

    mapping(bytes32 => ReceiptRecord) public receipts;

    event ReceiptRecorded(
        bytes32 indexed receiptHash,
        bytes32 indexed policyHash,
        address indexed agentWallet,
        uint256 chainId,
        string status
    );

    function recordReceipt(
        bytes32 receiptHash,
        bytes32 policyHash,
        address agentWallet,
        uint256 chainId,
        string calldata status
    ) external {
        require(receiptHash != bytes32(0), "receipt hash required");
        require(receipts[receiptHash].createdAt == 0, "receipt already recorded");

        receipts[receiptHash] = ReceiptRecord({
            receiptHash: receiptHash,
            policyHash: policyHash,
            agentWallet: agentWallet,
            chainId: chainId,
            createdAt: block.timestamp,
            status: status
        });

        emit ReceiptRecorded(receiptHash, policyHash, agentWallet, chainId, status);
    }

    function hasReceipt(bytes32 receiptHash) external view returns (bool) {
        return receipts[receiptHash].createdAt != 0;
    }
}
