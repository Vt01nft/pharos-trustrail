# Demo Video Script

Target length: 2 to 3 minutes.

## 0:00 - Hook

"AI agents can now pay, settle, and call contracts. But before an agent moves value, teams need to know whether it is allowed to perform that action. This is Pharos TrustRail, a compliance-aware action gateway Skill for RealFi agents on Pharos."

## 0:20 - Show The Skill Surface

Open `SKILL.md` and `skill.json`.

"This is not just a dashboard. The core deliverable is a reusable Skill with nine callable tools: policy manifest, preflight, attach transaction, verify receipt, x402 challenge, signed receipt issuance, signed receipt verification, signing-path guard, and registry V2 input."

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

## 2:10 - Signed Receipt Enforcement

"A receipt is not enough unless counterparties can prove who issued it and wallets can enforce it before signing. TrustRail signs the receipt with EIP-712, verifies the issuer, and blocks transactions that do not match the approved action."

Point out:

- `trustrail_sign_receipt`
- `trustrail_verify_signed_receipt`
- `trustrail_guard_transaction`
- BLOCK and mismatched transactions fail before wallet send

## 2:35 - On-Chain Integration

Open `contracts/TrustRailRegistryV2.sol`.

"After execution, agents can attach a Pharos transaction hash and register the signed receipt on-chain. The V2 registry checks issuer authorization, expiry, chain id, duplicate receipt hashes, and who is allowed to submit for the agent wallet."

## 2:55 - Close

"TrustRail is the control plane before agent financial execution. It makes payment, escrow, RWA, invoice, and contract Skills safer, composable, enforceable, and ready for Pharos' AI Agent economy."
