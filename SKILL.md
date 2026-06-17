# Pharos TrustRail Skill

Use this Skill when an AI agent is about to pay, settle, buy data, touch an RWA contract, or invoke another Pharos financial Skill and needs a policy decision before signing or broadcasting.

TrustRail is a reusable control-plane Skill:

- checks agent identity, policy, asset, amount, counterparty, jurisdiction, and credentials
- returns `ALLOW`, `WARN`, or `BLOCK`
- produces deterministic compliance receipt hashes
- creates x402-style payment challenges bound to policy and purpose
- verifies receipt integrity after a transaction hash is attached

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
