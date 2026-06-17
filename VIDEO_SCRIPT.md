# Demo Video Script

Target length: 2 to 3 minutes.

## 0:00 - Hook

"AI agents can now pay, settle, and call contracts. But before an agent moves value, teams need to know whether it is allowed to perform that action. This is Pharos TrustRail, a compliance-aware action gateway Skill for RealFi agents on Pharos."

## 0:20 - Show The Skill Surface

Open `SKILL.md` and `skill.json`.

"This is not just a dashboard. The core deliverable is a reusable Skill with five callable tools: policy manifest, preflight, attach transaction, verify receipt, and x402 challenge."

Run:

```bash
npm run skill -- list
```

## 0:45 - Allowed x402 Action

Open `examples/preflight-x402.json`.

"Here an agent wants to pay a verified data provider for API access through an x402-style flow."

Run:

```bash
npm run skill -- trustrail_preflight @examples/preflight-x402.json
```

Point out:

- `decision: ALLOW`
- `COUNTERPARTY_OK`
- `CREDENTIALS_PRESENT`
- `receiptHash`
- safe execution plan

## 1:15 - Blocked Counterparty

Open `examples/blocked-counterparty.json`.

"Now the same agent attempts stablecoin settlement to a blocked bridge tagged as sanctioned and mixer-related."

Run:

```bash
npm run skill -- trustrail_preflight @examples/blocked-counterparty.json
```

Point out:

- `decision: BLOCK`
- `COUNTERPARTY_BLOCKED`
- `CREDENTIALS_MISSING`
- agent instruction: do not sign or broadcast

## 1:45 - x402 Challenge

Run:

```bash
npm run skill -- trustrail_x402_challenge @examples/x402-challenge.json
```

Point out:

- policy-bound x402 challenge
- idempotency key
- TrustRail receipt headers
- Pharos chain ID

## 2:10 - On-Chain Integration

Open `contracts/TrustRailRegistry.sol`.

"After execution, agents can attach a Pharos transaction hash and register the receipt hash on-chain. This gives operators an audit trail without storing raw PII."

## 2:30 - Close

"TrustRail is the control plane before agent financial execution. It makes payment, escrow, RWA, invoice, and contract Skills safer, composable, and ready for Pharos' AI Agent economy."
