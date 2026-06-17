import { describe, expect, it } from 'vitest'
import { callTrustRailTool } from './skill'
import type { ComplianceReceipt } from './trustrail'

describe('TrustRail Skill tools', () => {
  it('exposes a policy manifest callable by agents', async () => {
    const result = await callTrustRailTool('trustrail_policy_manifest', {
      policyId: 'pharos-realfi-agent-v1',
    })

    expect(result.ok).toBe(true)
    expect(result.manifest.policy.id).toBe('pharos-realfi-agent-v1')
    expect(result.manifest.registry.chainId).toBe(1672)
  })

  it('runs the complete preflight, attach, and verify flow', async () => {
    const preflight = await callTrustRailTool('trustrail_preflight', {
      policyId: 'pharos-realfi-agent-v1',
      agentId: 'agent-steward-01',
      action: {
        action: 'x402_payment',
        amountUsd: 42,
        asset: 'USDC',
        recipientId: 'atlas-data',
        purpose: 'Pay for verified market data.',
        credentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature'],
      },
    })

    expect(preflight.decision).toBe('ALLOW')

    const attached = await callTrustRailTool('trustrail_attach_transaction', {
      receipt: preflight.receipt,
      txHash: '0xabc123',
      status: 'confirmed',
    })

    const verify = await callTrustRailTool('trustrail_verify_receipt', {
      receipt: attached.receipt as ComplianceReceipt,
    })

    expect(verify.valid).toBe(true)
  })

  it('creates a policy-bound x402 challenge', async () => {
    const result = await callTrustRailTool('trustrail_x402_challenge', {
      policyId: 'pharos-realfi-agent-v1',
      agentId: 'agent-steward-01',
      resource: 'https://api.example.com/alpha/report',
      idempotencyKey: 'alpha-report-2026-06-17',
      action: {
        action: 'x402_payment',
        amountUsd: 42,
        asset: 'USDC',
        recipientId: 'atlas-data',
        purpose: 'Buy API access',
        credentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature'],
      },
    })

    expect(result.challenge.headers['X-TrustRail-Policy']).toBe('pharos-realfi-agent-v1')
    expect(result.challenge.receiptHash).toMatch(/^0x[a-f0-9]{64}$/)
  })
})
