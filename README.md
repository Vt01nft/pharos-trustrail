# Pharos TrustRail Skill

Pharos TrustRail is a compliance-aware action gateway Skill for autonomous agents transacting in RealFi on Pharos.

Repository: https://github.com/Vt01nft/pharos-trustrail

Demo video file: `demo/pharos-trustrail-demo.mp4`

It gives every agent a policy preflight before it moves value:

- x402-style payment and service-access checks
- policy-as-code spend, asset, jurisdiction, and counterparty rules
- mock zk-KYC, AML, mandate, and travel-rule credential gates
- deterministic compliance receipt hashes
- CLI Skill tools that agents can call directly
- SDK-shaped client and a minimal on-chain receipt registry contract

## Why This Matters

Pharos is positioning around RealFi, institutional-grade assets, stablecoins, cross-border settlement, built-in compliance, and AI agents. TrustRail sits between an agent's intent and financial execution so teams can answer:

> Is this agent allowed to perform this action, for this user, with this asset, to this counterparty, under this policy?

## Product Flow

1. Agent prepares a financial action.
2. Agent calls `trustrail_preflight`.
3. TrustRail returns `ALLOW`, `WARN`, or `BLOCK` with reason codes and required proofs.
4. If allowed, the agent can execute its payment/contract Skill.
5. Agent calls `trustrail_attach_transaction` with the Pharos tx hash.
6. Agent stores or registers the receipt hash on-chain.

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

const decision = await trustRail.preflight({
  action: 'x402_payment',
  asset: 'USDC',
  amountUsd: 42,
  recipientId: 'atlas-data',
  purpose: 'Pay for verified market data through x402.',
  credentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature'],
})
```

## Skill Tools

| Tool | Purpose |
| --- | --- |
| `trustrail_policy_manifest` | Returns policy-as-code manifest and registry metadata. |
| `trustrail_preflight` | Evaluates an agent action before signing or broadcasting. |
| `trustrail_attach_transaction` | Attaches a Pharos tx hash to a receipt and re-hashes it. |
| `trustrail_verify_receipt` | Verifies receipt integrity. |
| `trustrail_x402_challenge` | Creates a policy-bound x402-style payment challenge. |

## Pharos Integration Path

- Replace mock credentials with Pharos ZK-KYC/AML attestations when available.
- Route x402 `/verify` and `/settle` calls through TrustRail preflight.
- Store receipt hashes in `contracts/TrustRailRegistry.sol` on Pharos.
- Package `src/skill.ts` as an MCP adapter for Agent Center and Anvita Flow agents.

## Judging Criteria

See `docs/JUDGING.md` for the explicit mapping to originality, technical quality, practical agent use, reusability, Pharos integration, documentation, and ecosystem alignment.
