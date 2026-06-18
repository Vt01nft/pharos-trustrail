# Pharos TrustRail Skill

Pharos TrustRail is a compliance-aware action gateway Skill for autonomous agents transacting in RealFi on Pharos.

Repository: https://github.com/Vt01nft/pharos-trustrail

Demo video file: `demo/pharos-trustrail-demo.mp4`

It gives every agent a policy preflight before it moves value:

- x402-style payment and service-access checks
- policy-as-code spend, asset, jurisdiction, and counterparty rules
- mock zk-KYC, AML, mandate, and travel-rule credential gates
- deterministic compliance receipt hashes
- EIP-712 signed compliance receipts with issuer recovery
- signing-path guard SDK that blocks invalid, expired, BLOCK, or mismatched transactions before send
- CLI Skill tools that agents can call directly
- SDK-shaped client and authenticated on-chain receipt registry contracts

## Why This Matters

Pharos is positioning around RealFi, institutional-grade assets, stablecoins, cross-border settlement, built-in compliance, and AI agents. TrustRail sits between an agent's intent and financial execution so teams can answer:

> Is this agent allowed to perform this action, for this user, with this asset, to this counterparty, under this policy?

## Product Flow

1. Agent prepares a financial action.
2. Agent calls `trustrail_preflight`.
3. TrustRail returns `ALLOW`, `WARN`, or `BLOCK` with reason codes and required proofs.
4. Agent calls `trustrail_sign_receipt` to receive an issuer-signed EIP-712 receipt.
5. Agent wallet or counterparty calls `trustrail_guard_transaction` before signing.
6. If the signed receipt is valid and the transaction matches it, the agent executes its payment/contract Skill.
7. Agent calls `trustrail_attach_transaction` with the Pharos tx hash.
8. Agent re-signs the updated settlement receipt.
9. Agent stores the authenticated receipt in `TrustRailRegistryV2`.

## Local Development

```bash
npm install
npm run skill -- list
```

The Skill interface is the primary deliverable:

```bash
npm run skill -- list
npm run skill -- trustrail_preflight @examples/preflight-x402.json
npm run skill -- trustrail_x402_challenge @examples/x402-challenge.json
```

Receipt signing requires a configured issuer key, and verification requires an authorized issuer list:

```bash
TRUSTRAIL_ISSUER_PRIVATE_KEY=0x...
TRUSTRAIL_AUTHORIZED_ISSUERS=0xIssuerAddress
```

## Verification

```bash
npm run test
npm run build
```

## SDK Shape

```ts
import { TrustRailClient } from './src/trustrailClient'

const trustRail = new TrustRailClient({
  chainId: 1672,
  policyId: 'pharos-realfi-agent-v1',
  agentId: 'agent-steward-01',
})

const receipt = await trustRail.preflight({
  action: 'x402_payment',
  asset: 'USDC',
  amountUsd: 42,
  recipientId: 'atlas-data',
  purpose: 'Pay for verified market data through x402.',
  credentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature'],
})

const signedReceipt = await trustRail.signReceipt(receipt)
const guard = await trustRail.guardTransaction(signedReceipt, {
  to: signedReceipt.counterparty.address as `0x${string}`,
  valueUsd: signedReceipt.action.amountUsd,
})

if (!guard.allowed) {
  throw new Error(`TrustRail blocked signing: ${guard.reasons.join(', ')}`)
}
```

## Skill Tools

| Tool | Purpose |
| --- | --- |
| `trustrail_policy_manifest` | Returns policy-as-code manifest and registry metadata. |
| `trustrail_preflight` | Evaluates an agent action before signing or broadcasting. |
| `trustrail_attach_transaction` | Attaches a Pharos tx hash to a receipt and re-hashes it. |
| `trustrail_verify_receipt` | Verifies receipt integrity. |
| `trustrail_x402_challenge` | Creates a policy-bound x402-style payment challenge. |
| `trustrail_sign_receipt` | Issues an EIP-712 signature over a TrustRail receipt. |
| `trustrail_verify_signed_receipt` | Verifies receipt hash, issuer signature, expiry, and issuer authorization. |
| `trustrail_guard_transaction` | Enforces TrustRail in the signing path before an agent sends value. |
| `trustrail_registry_v2_input` | Builds calldata-ready fields for `TrustRailRegistryV2.recordSignedReceipt`. |

## Security Upgrade

The V2 flow closes the trust gaps that matter for auditors and counterparties:

- unsigned `ALLOW` receipts cannot be forged because the verifier recovers the EIP-712 issuer
- expired, tampered, or unauthorized receipts fail before signing
- `TrustRailRegistryV2` only accepts receipts signed by authorized issuers and submitted by the agent wallet, an authorized submitter, or the issuer
- the signing guard rejects `BLOCK`, unapproved `WARN`, wrong sender, wrong chain, wrong target, unbound/mismatched calldata, and value above the receipt amount

## Pharos Integration Path

- Replace mock credentials with Pharos ZK-KYC/AML attestations when available.
- Route x402 `/verify` and `/settle` calls through TrustRail preflight.
- Store authenticated signed receipts in `contracts/TrustRailRegistryV2.sol` on Pharos.
- Package `src/skill.ts` as an MCP adapter for Agent Center and Anvita Flow agents.

## Judging Criteria

See `docs/JUDGING.md` for the explicit mapping to originality, technical quality, practical agent use, reusability, Pharos integration, documentation, and ecosystem alignment.
