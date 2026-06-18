# Pharos TrustRail Skill

Use this Skill when an AI agent is about to pay, settle, buy data, touch an RWA contract, or invoke another Pharos financial Skill and needs a policy decision before signing or broadcasting.

TrustRail is a reusable control-plane Skill:

- checks agent identity, policy, asset, amount, counterparty, jurisdiction, and credentials
- returns `ALLOW`, `WARN`, or `BLOCK`
- produces deterministic compliance receipt hashes
- signs receipts with EIP-712 issuer signatures
- creates x402-style payment challenges bound to policy and purpose
- verifies receipt integrity after a transaction hash is attached
- blocks invalid or disallowed transactions in the wallet signing path

## Tools

### `trustrail_policy_manifest`

Returns a machine-readable policy manifest for a policy id.

```bash
npm run skill -- trustrail_policy_manifest '{"policyId":"pharos-realfi-agent-v1"}'
```

### `trustrail_preflight`

Main Skill call. Use it before any financial action.

```bash
npm run skill -- trustrail_preflight '{
  "policyId": "pharos-realfi-agent-v1",
  "agentId": "agent-steward-01",
  "action": {
    "action": "x402_payment",
    "amountUsd": 42,
    "asset": "USDC",
    "recipientId": "atlas-data",
    "purpose": "Pay for verified market data through x402.",
    "credentials": ["zk_kyc", "aml_screen", "agent_mandate_signature"]
  }
}'
```

Agents can also pass a JSON file, which is the safest cross-shell form:

```bash
npm run skill -- trustrail_preflight @examples/preflight-x402.json
```

The agent must not sign or broadcast if the result is `BLOCK`.

### `trustrail_sign_receipt`

Issue an EIP-712 signed receipt after preflight. Agents and counterparties use this to prove the decision came from an authorized TrustRail issuer.

```bash
npm run skill -- trustrail_sign_receipt '{"receipt":{...},"expiresInSeconds":900,"nonce":"agent-action-001"}'
```

Set `TRUSTRAIL_ISSUER_PRIVATE_KEY` in the signer environment, or pass `issuerPrivateKey` from a secured secret store. Do not hard-code production issuer keys in prompts, repositories, or agent memory.

### `trustrail_verify_signed_receipt`

Verify the receipt hash, issuer signature, expiry, and authorized issuer list.

```bash
npm run skill -- trustrail_verify_signed_receipt '{"signedReceipt":{...}}'
```

### `trustrail_guard_transaction`

Use this in the signing path before an agent wallet signs or broadcasts. It rejects invalid receipts, `BLOCK`, unapproved `WARN`, wrong sender, wrong chain, wrong target, unbound/mismatched calldata, and value above the receipt amount.

```bash
npm run skill -- trustrail_guard_transaction '{"signedReceipt":{...},"tx":{"from":"0xA6e1700000000000000000000000000000000001","to":"0x7a5dA7A00000000000000000000000000000DA7A","chainId":1672,"valueUsd":42}}'
```

### `trustrail_registry_v2_input`

Convert a signed receipt into calldata-ready fields for `TrustRailRegistryV2.recordSignedReceipt`.

```bash
npm run skill -- trustrail_registry_v2_input '{"signedReceipt":{...}}'
```

### `trustrail_attach_transaction`

Attach a Pharos transaction hash after a successful execution and re-hash the receipt.

```bash
npm run skill -- trustrail_attach_transaction '{"receipt":{...},"txHash":"0xabc","status":"confirmed"}'
```

### `trustrail_verify_receipt`

Verify the receipt hash still matches the receipt fields.

```bash
npm run skill -- trustrail_verify_receipt '{"receipt":{...}}'
```

### `trustrail_x402_challenge`

Create an x402-style challenge for a protected resource. The payment challenge is bound to the policy id, agent id, counterparty, amount, purpose, and idempotency key.

```bash
npm run skill -- trustrail_x402_challenge '{
  "policyId":"pharos-realfi-agent-v1",
  "agentId":"agent-steward-01",
  "resource": "https://api.example.com/alpha/report",
  "action": {
    "action": "x402_payment",
    "amountUsd": 42,
    "asset": "USDC",
    "recipientId": "atlas-data",
    "purpose": "Buy API access",
    "credentials": ["zk_kyc", "aml_screen", "agent_mandate_signature"]
  },
  "idempotencyKey": "report-2026-06-17-agent-steward-01"
}'
```

## Design Rules For Agents

- Call `trustrail_preflight` before write tools such as payment, transfer, escrow, RWA subscription, or contract execution.
- Call `trustrail_sign_receipt` after preflight and before asking a wallet to sign.
- After `trustrail_attach_transaction`, re-sign the updated receipt before registering the settlement state on-chain.
- Put `trustrail_guard_transaction` directly in the wallet/signing adapter, not only in a planner prompt.
- Treat `WARN` as requiring human or higher-level agent approval.
- Treat `BLOCK` as a hard stop.
- Store the returned `receiptHash` next to the transaction record.
- Do not include raw PII in `purpose`; use credential references instead.
- Reuse `idempotencyKey` for retried x402/resource requests to avoid duplicate settlement.

## Included RealFi Templates

- x402 data access
- RWA subscription
- stablecoin payroll / invoice settlement
- blocked counterparty settlement

## Repository Shape

The repository is intentionally Skill-first: runtime, schemas, examples, tests, docs, logo assets, demo video, and a minimal Pharos receipt registry contract.
