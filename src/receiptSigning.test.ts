import { describe, expect, it } from 'vitest'
import { privateKeyToAccount } from 'viem/accounts'
import {
  agents,
  attachTransaction,
  evaluatePreflight,
  policies,
  scenarioActions,
  verifyReceipt,
  type SignedComplianceReceipt,
} from './trustrail'
import { signReceipt, toRegistryV2Input, verifySignedReceipt } from './receiptSigning'
import { enforceSigningPath, guardedSendTransaction } from './signingGuard'

const issuedAt = 1_781_700_000
const verifyAt = issuedAt + 30
const testIssuerPrivateKey =
  '0x59c6995e998f97a5a0044976f5585b7d3c91a44b820f8b9e0000000000000001' as const
const testIssuer = privateKeyToAccount(testIssuerPrivateKey).address
const unauthorizedIssuerPrivateKey =
  '0x59c6995e998f97a5a0044976f5585b7d3c91a44b820f8b9e0000000000000002' as const

async function allowedSignedReceipt() {
  const receipt = await evaluatePreflight(
    policies[0],
    agents[0],
    scenarioActions['x402-data'],
    new Date('2026-06-17T10:00:00.000Z'),
  )

  return signReceipt(receipt, agents[0].wallet as `0x${string}`, {
    issuerPrivateKey: testIssuerPrivateKey,
    issuedAt,
    expiresInSeconds: 120,
    nonce: 'test-allow-001',
  })
}

describe('signed receipt enforcement', () => {
  it('issues EIP-712 receipts that verify against an authorized issuer', async () => {
    const signedReceipt = await allowedSignedReceipt()
    const result = await verifySignedReceipt(signedReceipt, [testIssuer], verifyAt)

    expect(await verifyReceipt(signedReceipt)).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.recoveredIssuer).toBe(testIssuer)
    expect(signedReceipt.chainId).toBe(1672)
    expect(signedReceipt.signature).toMatch(/^0x[a-fA-F0-9]+$/)
  })

  it('rejects tampered receipts even when the original signature is present', async () => {
    const signedReceipt = await allowedSignedReceipt()
    const tampered: SignedComplianceReceipt = {
      ...signedReceipt,
      decision: 'BLOCK',
    }
    const result = await verifySignedReceipt(tampered, [testIssuer], verifyAt)

    expect(result.valid).toBe(false)
    expect(result.reasons).toContain('RECEIPT_HASH_MISMATCH')
    expect(result.reasons).toContain('ISSUER_SIGNATURE_MISMATCH')
  })

  it('rejects signatures from issuers outside the authorized set', async () => {
    const receipt = await evaluatePreflight(
      policies[0],
      agents[0],
      scenarioActions['x402-data'],
      new Date('2026-06-17T10:00:00.000Z'),
    )
    const signedReceipt = await signReceipt(receipt, agents[0].wallet as `0x${string}`, {
      issuerPrivateKey: unauthorizedIssuerPrivateKey,
      issuedAt,
      expiresInSeconds: 120,
      nonce: 'test-allow-unauthorized',
    })
    const result = await verifySignedReceipt(signedReceipt, [testIssuer], verifyAt)

    expect(result.valid).toBe(false)
    expect(result.recoveredIssuer).toBe(privateKeyToAccount(unauthorizedIssuerPrivateKey).address)
    expect(result.reasons).toContain('ISSUER_NOT_AUTHORIZED')
  })

  it('allows only matching transactions through the signing path', async () => {
    const signedReceipt = await allowedSignedReceipt()
    const result = await enforceSigningPath(
      signedReceipt,
      {
        from: agents[0].wallet as `0x${string}`,
        to: signedReceipt.counterparty.address as `0x${string}`,
        chainId: signedReceipt.chainId,
        valueUsd: signedReceipt.action.amountUsd,
      },
      { now: verifyAt, authorizedIssuers: [testIssuer] },
    )

    expect(result.allowed).toBe(true)
    expect(result.reasons).toEqual([])
  })

  it('blocks risky decisions and mismatched transaction details before send', async () => {
    const blockReceipt = await evaluatePreflight(
      policies[0],
      agents[0],
      scenarioActions.blocked,
      new Date('2026-06-17T10:00:00.000Z'),
    )
    const signedReceipt = await signReceipt(blockReceipt, agents[0].wallet as `0x${string}`, {
      issuerPrivateKey: testIssuerPrivateKey,
      issuedAt,
      expiresInSeconds: 120,
      nonce: 'test-block-001',
    })
    const result = await enforceSigningPath(
      signedReceipt,
      {
        from: agents[1].wallet as `0x${string}`,
        to: agents[1].wallet as `0x${string}`,
        chainId: 688689,
        valueUsd: signedReceipt.action.amountUsd + 1,
      },
      { now: verifyAt, authorizedIssuers: [testIssuer] },
    )

    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain('RECEIPT_DECISION_BLOCK')
    expect(result.reasons).toContain('TX_FROM_NOT_AGENT_WALLET')
    expect(result.reasons).toContain('CHAIN_ID_MISMATCH')
    expect(result.reasons).toContain('TX_TARGET_NOT_RECEIPT_COUNTERPARTY')
    expect(result.reasons).toContain('TX_VALUE_EXCEEDS_RECEIPT_AMOUNT')
  })

  it('wraps transaction sending so BLOCK receipts cannot be ignored', async () => {
    const signedReceipt = await allowedSignedReceipt()
    const tx = {
      from: agents[0].wallet as `0x${string}`,
      to: signedReceipt.counterparty.address as `0x${string}`,
      chainId: signedReceipt.chainId,
      valueUsd: signedReceipt.action.amountUsd,
    }

    await expect(
      guardedSendTransaction(signedReceipt, tx, async () => 'sent', {
        now: verifyAt,
        authorizedIssuers: [testIssuer],
      }),
    ).resolves.toBe('sent')

    await expect(
      guardedSendTransaction(
        { ...signedReceipt, decision: 'BLOCK' },
        tx,
        async () => 'sent',
        { now: verifyAt, authorizedIssuers: [testIssuer] },
      ),
    ).rejects.toThrow('TrustRail blocked signing path')
  })

  it('enforces calldata hashes for contract interactions', async () => {
    const calldata = '0x1234abcd' as const
    const receipt = await evaluatePreflight(
      policies[0],
      agents[0],
      {
        action: 'contract_interaction',
        amountUsd: 10,
        asset: 'USDC',
        recipientId: 'atlas-data',
        purpose: 'Call approved contract function',
        contractAddress: '0x7a5dA7A00000000000000000000000000000DA7A',
        calldataHash: '0xfb89609961b35c222ceb5dacad207b44f9e09c11fa5f5f02a7cf958c030b7261',
        credentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature'],
      },
      new Date('2026-06-17T10:00:00.000Z'),
    )
    const signedReceipt = await signReceipt(receipt, agents[0].wallet as `0x${string}`, {
      issuerPrivateKey: testIssuerPrivateKey,
      issuedAt,
      expiresInSeconds: 120,
      nonce: 'test-calldata-001',
    })

    const allowed = await enforceSigningPath(
      signedReceipt,
      {
        from: agents[0].wallet as `0x${string}`,
        to: signedReceipt.counterparty.address as `0x${string}`,
        chainId: signedReceipt.chainId,
        valueUsd: signedReceipt.action.amountUsd,
        data: calldata,
      },
      { now: verifyAt, authorizedIssuers: [testIssuer] },
    )
    const blocked = await enforceSigningPath(
      signedReceipt,
      {
        from: agents[0].wallet as `0x${string}`,
        to: signedReceipt.counterparty.address as `0x${string}`,
        chainId: signedReceipt.chainId,
        valueUsd: signedReceipt.action.amountUsd,
        data: '0xdeadbeef',
      },
      { now: verifyAt, authorizedIssuers: [testIssuer] },
    )

    expect(allowed.allowed).toBe(true)
    expect(blocked.allowed).toBe(false)
    expect(blocked.reasons).toContain('TX_CALLDATA_HASH_MISMATCH')
  })

  it('builds calldata-ready input for TrustRailRegistryV2', async () => {
    const signedReceipt = await allowedSignedReceipt()
    const input = toRegistryV2Input(signedReceipt)

    expect(input.receiptHash).toBe(signedReceipt.receiptHash)
    expect(input.agentWallet).toBe(agents[0].wallet)
    expect(input.chainId).toBe('1672')
    expect(input.signature).toBe(signedReceipt.signature)
  })

  it('requires the updated settlement receipt to be signed after a tx hash is attached', async () => {
    const signedPreflight = await allowedSignedReceipt()
    const attached = await attachTransaction(signedPreflight, '0xabc123', 'confirmed')
    const signedSettlement = await signReceipt(attached, agents[0].wallet as `0x${string}`, {
      issuerPrivateKey: testIssuerPrivateKey,
      issuedAt,
      expiresInSeconds: 120,
      nonce: 'test-settlement-001',
    })
    const result = await verifySignedReceipt(signedSettlement, [testIssuer], verifyAt)

    expect('signature' in attached).toBe(false)
    expect(attached.receiptHash).not.toBe(signedPreflight.receiptHash)
    expect(signedSettlement.status).toBe('confirmed')
    expect(result.valid).toBe(true)
  })
})
