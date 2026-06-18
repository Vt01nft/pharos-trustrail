# Judging Fit

## Originality and Creativity

Most visible Pharos submissions cluster around payments, escrow, wallet analysis, DeFi, transaction safety, RWA diligence, and receipt rendering. TrustRail is different: it is the policy gate before those Skills execute. It answers whether an autonomous agent should be allowed to move value at all, then turns that decision into a signed control-plane artifact that wallets, counterparties, and registries can verify.

## Technical Quality and Completeness

- Typed TypeScript domain model
- Zod input validation
- Deterministic SHA-256 receipt hashing
- EIP-712 receipt signing and issuer recovery with `viem`
- Signing-path SDK guard for `ALLOW`, `WARN`, `BLOCK`, tx sender, chain, target, and value checks
- CLI Skill runtime
- SDK-style client
- Unit tests for policy engine and complete Skill flows
- `TrustRailRegistryV2` with authorized issuers and authenticated receipt registration

## Practical Use Case for AI Agents

An agent can call `trustrail_preflight` before payments, RWA purchases, payroll settlement, escrow release, contract writes, or x402 resource access. The signed receipt can then be checked by the wallet adapter before any transaction is signed, which prevents a blocked action from becoming an on-chain write.

## Reusability and Composability

TrustRail is transport-neutral. It can be called from:

- CLI/sandbox agents
- MCP wrappers
- OpenAI function calling wrappers
- Pharos Agent Center adapters
- UI/operator consoles

The core tools are small and composable: manifest, preflight, x402 challenge, attach transaction, verify receipt, sign receipt, verify signed receipt, signing-path guard, and V2 registry input.

## Successful Deployment or Integration on Pharos

The Skill is configured around Pharos chain IDs:

- Pharos mainnet: `1672`
- Pharos Atlantic testnet: `688689`

The included `TrustRailRegistryV2.sol` records signed receipt attestations on-chain and can be deployed on Pharos. It rejects expired receipts, wrong-chain receipts, unauthorized issuers, duplicate receipt hashes, and callers that are not the agent wallet, an authorized submitter, or the issuer.

## User Experience and Documentation

The primary user is another AI agent or Pharos team integrating agent financial controls. `SKILL.md`, `skill.json`, examples, and README explain exactly how to call the tools and where to place enforcement in the signing path.

## Alignment With Pharos AI Agent and On-Chain Economy Vision

Pharos wants agents that operate, transact, and interact on-chain across RealFi, stablecoins, RWA, and compliant finance. TrustRail provides the missing compliance-aware action gateway between agent intent and financial execution.
