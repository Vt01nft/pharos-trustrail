# Pharos TrustRail

## One-Liner

Pharos TrustRail is a compliance-aware action gateway Skill that lets AI agents check policy before moving value on Pharos.

## Short Description

Autonomous agents can already call payment, escrow, swap, RWA, and contract Skills. The missing production layer is the control plane before those Skills execute: should this agent be allowed to perform this financial action, with this asset, for this counterparty, under this policy?

TrustRail solves that gap. It gives agents a reusable preflight Skill that returns `ALLOW`, `WARN`, or `BLOCK`, then creates a deterministic compliance receipt that can be verified, attached to a Pharos transaction hash, and registered on-chain.

## Problem

Agent economies cannot scale on generic transaction execution alone. RealFi agents need policy enforcement, credential checks, spend limits, jurisdiction controls, counterparty screening, x402 replay protection, and audit receipts before they can safely transact.

Most tools help agents do things. TrustRail helps agents know whether they should do them.

## What It Does

- Evaluates financial actions before signing or broadcasting
- Checks policy, agent identity, asset, amount, counterparty, jurisdiction, and credentials
- Returns agent-safe instructions: proceed, review, or stop
- Creates policy-bound x402 payment challenges
- Produces deterministic SHA-256 compliance receipt hashes
- Attaches Pharos transaction hashes after execution
- Verifies receipt integrity
- Includes a Solidity registry for on-chain receipt hashes

## Skill Tools

| Tool | Purpose |
| --- | --- |
| `trustrail_policy_manifest` | Returns policy-as-code manifest and registry metadata. |
| `trustrail_preflight` | Evaluates an agent action before signing or broadcasting. |
| `trustrail_attach_transaction` | Attaches a Pharos tx hash and re-hashes the receipt. |
| `trustrail_verify_receipt` | Verifies receipt integrity. |
| `trustrail_x402_challenge` | Creates a policy-bound x402-style challenge with idempotency metadata. |

## Why It Fits Pharos

Pharos is built for the AI Agent economy, RealFi, stablecoin settlement, RWA workflows, and compliant finance. TrustRail is the missing control layer that lets agents safely use those rails.

It is designed to sit before existing and future Pharos Skills: payment Skills, escrow Skills, RWA diligence Skills, invoice settlement Skills, x402 data access Skills, and contract execution Skills.

## Differentiation

Many visible submissions focus on payments, wallet analytics, DeFi execution, escrow, transaction safety, RWA diligence, or receipt generation. TrustRail is different because it is the policy gateway before those actions happen.

It does not compete with payment or escrow Skills. It makes them safer and more institution-ready.

## Demo Commands

```bash
npm install
npm run skill -- list
npm run skill -- trustrail_preflight @examples/preflight-x402.json
npm run skill -- trustrail_preflight @examples/blocked-counterparty.json
npm run skill -- trustrail_x402_challenge @examples/x402-challenge.json
npm run test
```

## Validation

- 8 automated tests
- Direct CLI Skill calls verified
- Lint passes
- Production build passes
- Optional operator console runs locally

## Future Work

- Deploy `TrustRailRegistry.sol` on Pharos Atlantic testnet
- Replace mock credentials with real Pharos ZK-KYC / AML attestation references
- Wrap the Skill as a formal MCP server
- Build a Phase 2 treasury/payment agent that calls TrustRail before every write action
