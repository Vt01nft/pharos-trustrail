# Pharos TrustRail

## One-Liner

Pharos TrustRail is a compliance-aware action gateway Skill that lets AI agents check policy before moving value on Pharos.

## Short Description

Autonomous agents can already call payment, escrow, swap, RWA, and contract Skills. The missing production layer is the control plane before those Skills execute: should this agent be allowed to perform this financial action, with this asset, for this counterparty, under this policy?

TrustRail solves that gap. It gives agents a reusable preflight Skill that returns `ALLOW`, `WARN`, or `BLOCK`, then creates an issuer-signed compliance receipt that can be verified, enforced in the wallet signing path, attached to a Pharos transaction hash, and registered on-chain.

## Problem

Agent economies cannot scale on generic transaction execution alone. RealFi agents need policy enforcement, credential checks, spend limits, jurisdiction controls, counterparty screening, x402 replay protection, and audit receipts before they can safely transact.

Most tools help agents do things. TrustRail helps agents know whether they should do them.

## What It Does

- Evaluates financial actions before signing or broadcasting
- Checks policy, agent identity, asset, amount, counterparty, jurisdiction, and credentials
- Returns agent-safe instructions: proceed, review, or stop
- Creates policy-bound x402 payment challenges
- Produces deterministic SHA-256 compliance receipt hashes
- Issues EIP-712 signed receipts with issuer recovery and expiry
- Blocks non-compliant transactions in the signing path before wallet send
- Attaches Pharos transaction hashes after execution
- Verifies receipt integrity
- Includes `TrustRailRegistryV2`, an authenticated Solidity registry for signed receipts

## Skill Tools

| Tool | Purpose |
| --- | --- |
| `trustrail_policy_manifest` | Returns policy-as-code manifest and registry metadata. |
| `trustrail_preflight` | Evaluates an agent action before signing or broadcasting. |
| `trustrail_attach_transaction` | Attaches a Pharos tx hash and re-hashes the receipt. |
| `trustrail_verify_receipt` | Verifies receipt integrity. |
| `trustrail_x402_challenge` | Creates a policy-bound x402-style challenge with idempotency metadata. |
| `trustrail_sign_receipt` | Signs a receipt as an authorized TrustRail issuer. |
| `trustrail_verify_signed_receipt` | Verifies receipt hash, issuer signature, expiry, and authorization. |
| `trustrail_guard_transaction` | Blocks invalid, expired, `BLOCK`, or mismatched transactions before signing. |
| `trustrail_registry_v2_input` | Builds calldata-ready input for the V2 registry. |

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

## Repository

https://github.com/Vt01nft/pharos-trustrail

## Demo Video

Local file: `demo/pharos-trustrail-demo.mp4`

Recommended upload title:

```text
Pharos TrustRail - Compliance Gateway Skill Demo
```

## Validation

- 17 automated tests, including tampered receipt, unauthorized issuer, calldata mismatch, post-transaction re-signing, and signing-path enforcement cases
- Direct CLI Skill calls verified
- Lint passes
- Production build passes
- `npm audit --omit=dev` passes with 0 vulnerabilities
- Demo video and generated logo assets included

## Future Work

- Deploy `TrustRailRegistryV2.sol` on Pharos Atlantic testnet
- Replace mock credentials with real Pharos ZK-KYC / AML attestation references
- Wrap the Skill as a formal MCP server
- Build a Phase 2 treasury/payment agent that calls TrustRail before every write action
