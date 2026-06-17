import { describe, expect, it } from 'vitest'
import {
  agents,
  attachTransaction,
  evaluatePreflight,
  policies,
  scenarioActions,
  verifyReceipt,
} from './trustrail'

describe('TrustRail policy engine', () => {
  it('allows a compliant x402 data payment and produces a verifiable receipt', async () => {
    const receipt = await evaluatePreflight(
      policies[0],
      agents[0],
      scenarioActions['x402-data'],
      new Date('2026-06-17T10:00:00.000Z'),
    )

    expect(receipt.decision).toBe('ALLOW')
    expect(receipt.reasonCodes).toContain('COUNTERPARTY_OK')
    expect(receipt.reasonCodes).toContain('CREDENTIALS_PRESENT')
    expect(receipt.receiptHash).toMatch(/^0x[a-f0-9]{64}$/)
    await expect(verifyReceipt(receipt)).resolves.toBe(true)
  })

  it('warns when an RWA purchase is missing strict institutional proofs', async () => {
    const receipt = await evaluatePreflight(
      policies[1],
      agents[1],
      scenarioActions['rwa-pool'],
      new Date('2026-06-17T10:00:00.000Z'),
    )

    expect(receipt.decision).toBe('WARN')
    expect(receipt.requiredProofs).toEqual(['travel_rule_attestation'])
    expect(receipt.reasonCodes).toContain('CREDENTIALS_MISSING')
  })

  it('blocks sanctioned or tagged counterparties before signing', async () => {
    const receipt = await evaluatePreflight(
      policies[0],
      agents[0],
      scenarioActions.blocked,
      new Date('2026-06-17T10:00:00.000Z'),
    )

    expect(receipt.decision).toBe('BLOCK')
    expect(receipt.reasonCodes).toContain('COUNTERPARTY_BLOCKED')
    expect(receipt.safeExecutionPlan.join(' ')).toContain('Do not sign')
  })

  it('rehashes receipts after a transaction is attached', async () => {
    const receipt = await evaluatePreflight(
      policies[0],
      agents[0],
      scenarioActions.payroll,
      new Date('2026-06-17T10:00:00.000Z'),
    )
    const attached = await attachTransaction(receipt, '0xabc123', 'confirmed')

    expect(attached.txHash).toBe('0xabc123')
    expect(attached.status).toBe('confirmed')
    expect(attached.receiptHash).not.toBe(receipt.receiptHash)
    await expect(verifyReceipt(attached)).resolves.toBe(true)
  })
})
