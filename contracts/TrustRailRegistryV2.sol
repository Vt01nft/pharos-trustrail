// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TrustRailRegistryV2
/// @notice Authenticated registry for signed Pharos TrustRail receipts.
/// @dev Verifies authorized EIP-712 issuers and restricts who may register for an agent wallet.
contract TrustRailRegistryV2 {
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId)");
    bytes32 public constant RECEIPT_TYPEHASH =
        keccak256(
            "TrustRailReceipt(bytes32 receiptHash,bytes32 policyHash,bytes32 agentIdHash,address agentWallet,bytes32 decisionHash,bytes32 statusHash,uint256 chainId,uint256 issuedAt,uint256 expiresAt,bytes32 nonceHash)"
        );

    bytes32 public immutable DOMAIN_SEPARATOR;
    address public owner;

    struct ReceiptRecord {
        bytes32 receiptHash;
        bytes32 policyHash;
        bytes32 agentIdHash;
        address agentWallet;
        address issuer;
        uint256 chainId;
        uint256 issuedAt;
        uint256 expiresAt;
        uint256 registeredAt;
        bytes32 decisionHash;
        bytes32 statusHash;
        bytes32 nonceHash;
    }

    struct SignedReceiptInput {
        bytes32 receiptHash;
        bytes32 policyHash;
        bytes32 agentIdHash;
        address agentWallet;
        bytes32 decisionHash;
        bytes32 statusHash;
        uint256 chainId;
        uint256 issuedAt;
        uint256 expiresAt;
        bytes32 nonceHash;
        bytes signature;
    }

    mapping(address => bool) public authorizedIssuers;
    mapping(address => mapping(address => bool)) public authorizedSubmitters;
    mapping(bytes32 => ReceiptRecord) public receipts;

    event IssuerUpdated(address indexed issuer, bool authorized);
    event SubmitterUpdated(address indexed agentWallet, address indexed submitter, bool authorized);
    event ReceiptRecorded(bytes32 indexed receiptHash, address indexed agentWallet, address indexed issuer);

    error NotOwner();
    error NotAuthorizedIssuer();
    error NotAuthorizedSubmitter();
    error ReceiptAlreadyRecorded();
    error ReceiptExpired();
    error WrongChain();
    error BadSignature();
    error EmptyReceiptHash();

    constructor(address initialIssuer) {
        owner = msg.sender;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("Pharos TrustRail")),
                keccak256(bytes("2")),
                block.chainid
            )
        );

        if (initialIssuer != address(0)) {
            authorizedIssuers[initialIssuer] = true;
            emit IssuerUpdated(initialIssuer, true);
        }
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function transferOwnership(address nextOwner) external onlyOwner {
        owner = nextOwner;
    }

    function setIssuer(address issuer, bool authorized) external onlyOwner {
        authorizedIssuers[issuer] = authorized;
        emit IssuerUpdated(issuer, authorized);
    }

    function setSubmitter(address submitter, bool authorized) external {
        authorizedSubmitters[msg.sender][submitter] = authorized;
        emit SubmitterUpdated(msg.sender, submitter, authorized);
    }

    function recordSignedReceipt(SignedReceiptInput calldata input) external {
        if (input.receiptHash == bytes32(0)) revert EmptyReceiptHash();
        if (receipts[input.receiptHash].registeredAt != 0) revert ReceiptAlreadyRecorded();
        if (input.chainId != block.chainid) revert WrongChain();
        if (input.expiresAt < block.timestamp) revert ReceiptExpired();

        address issuer = recoverIssuer(input);
        if (!authorizedIssuers[issuer]) revert NotAuthorizedIssuer();

        bool callerCanRegister =
            msg.sender == input.agentWallet ||
            authorizedSubmitters[input.agentWallet][msg.sender] ||
            authorizedIssuers[msg.sender];
        if (!callerCanRegister) revert NotAuthorizedSubmitter();

        receipts[input.receiptHash] = ReceiptRecord({
            receiptHash: input.receiptHash,
            policyHash: input.policyHash,
            agentIdHash: input.agentIdHash,
            agentWallet: input.agentWallet,
            issuer: issuer,
            chainId: input.chainId,
            issuedAt: input.issuedAt,
            expiresAt: input.expiresAt,
            registeredAt: block.timestamp,
            decisionHash: input.decisionHash,
            statusHash: input.statusHash,
            nonceHash: input.nonceHash
        });

        emit ReceiptRecorded(input.receiptHash, input.agentWallet, issuer);
    }

    function hasReceipt(bytes32 receiptHash) external view returns (bool) {
        return receipts[receiptHash].registeredAt != 0;
    }

    function recoverIssuer(SignedReceiptInput calldata input) public view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(
                RECEIPT_TYPEHASH,
                input.receiptHash,
                input.policyHash,
                input.agentIdHash,
                input.agentWallet,
                input.decisionHash,
                input.statusHash,
                input.chainId,
                input.issuedAt,
                input.expiresAt,
                input.nonceHash
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        return recover(digest, input.signature);
    }

    function recover(bytes32 digest, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) revert BadSignature();

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert BadSignature();
        return signer;
    }
}
