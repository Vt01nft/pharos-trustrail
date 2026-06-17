import {
  agents,
  attachTransaction,
  counterparties,
  createPolicyManifest,
  evaluatePreflight,
  pharosChain,
  policies,
  verifyReceipt,
  type ComplianceReceipt,
} from './trustrail'
import {
  attachTransactionInputSchema,
  policyManifestInputSchema,
  preflightInputSchema,
  verifyReceiptInputSchema,
  x402ChallengeInputSchema,
} from './schemas'

export type TrustRailToolName =
  | 'trustrail_policy_manifest'
  | 'trustrail_preflight'
  | 'trustrail_attach_transaction'
  | 'trustrail_verify_receipt'
  | 'trustrail_x402_challenge'

export async function callTrustRailTool(toolName: TrustRailToolName, input: unknown) {
  switch (toolName) {
    case 'trustrail_policy_manifest':
      return trustrailPolicyManifest(input)
    case 'trustrail_preflight':
      return trustrailPreflight(input)
    case 'trustrail_attach_transaction':
      return trustrailAttachTransaction(input)
    case 'trustrail_verify_receipt':
      return trustrailVerifyReceipt(input)
    case 'trustrail_x402_challenge':
      return trustrailX402Challenge(input)
    default:
      throw new Error(`Unknown TrustRail tool: ${toolName satisfies never}`)
  }
}

export function listTrustRailTools() {
  return [
    {
      name: 'trustrail_policy_manifest',
      description: 'Return policy-as-code manifest and registry metadata for a TrustRail policy.',
    },
    {
      name: 'trustrail_preflight',
      description: 'Evaluate agent action against policy before signing or broadcasting a Pharos transaction.',
    },
    {
      name: 'trustrail_attach_transaction',
      description: 'Attach a Pharos transaction hash to a compliance receipt and re-hash it.',
    },
    {
      name: 'trustrail_verify_receipt',
      description: 'Verify that a TrustRail compliance receipt has not been tampered with.',
    },
    {
      name: 'trustrail_x402_challenge',
      description: 'Create a policy-bound x402-style payment challenge with replay protection metadata.',
    },
  ]
}

async function trustrailPolicyManifest(input: unknown) {
  const parsed = policyManifestInputSchema.parse(input)
  const policy = getPolicy(parsed.policyId)

  return {
    ok: true,
    tool: 'trustrail_policy_manifest',
    manifest: createPolicyManifest(policy),
  }
}

async function trustrailPreflight(input: unknown) {
  const parsed = preflightInputSchema.parse(input)
  const policy = getPolicy(parsed.policyId)
  const agent = getAgent(parsed.agentId)
  const receipt = await evaluatePreflight(policy, agent, parsed.action)

  return {
    ok: true,
    tool: 'trustrail_preflight',
    decision: receipt.decision,
    receipt,
    agentInstruction:
      receipt.decision === 'BLOCK'
        ? 'Do not sign or broadcast this action.'
        : receipt.decision === 'WARN'
          ? 'Require review or higher-level approval before execution.'
          : 'Action can proceed after normal transaction simulation.',
  }
}

async function trustrailAttachTransaction(input: unknown) {
  const parsed = attachTransactionInputSchema.parse(input)
  const receipt = parsed.receipt as ComplianceReceipt
  const nextReceipt = await attachTransaction(receipt, parsed.txHash, parsed.status)

  return {
    ok: true,
    tool: 'trustrail_attach_transaction',
    receipt: nextReceipt,
  }
}

async function trustrailVerifyReceipt(input: unknown) {
  const parsed = verifyReceiptInputSchema.parse(input)
  const receipt = parsed.receipt as ComplianceReceipt
  const valid = await verifyReceipt(receipt)

  return {
    ok: true,
    tool: 'trustrail_verify_receipt',
    valid,
    receiptHash: receipt.receiptHash,
  }
}

async function trustrailX402Challenge(input: unknown) {
  const parsed = x402ChallengeInputSchema.parse(input)
  const policy = getPolicy(parsed.policyId)
  const agent = getAgent(parsed.agentId)
  const receipt = await evaluatePreflight(policy, agent, parsed.action)
  const counterparty = counterparties.find((item) => item.id === parsed.action.recipientId)

  if (!counterparty) {
    throw new Error(`Unknown counterparty: ${parsed.action.recipientId}`)
  }

  return {
    ok: true,
    tool: 'trustrail_x402_challenge',
    decision: receipt.decision,
    challenge: {
      x402Version: '1',
      resource: parsed.resource,
      method: 'GET',
      chainId: pharosChain.chainId,
      asset: parsed.action.asset,
      amountUsd: parsed.action.amountUsd,
      payTo: counterparty.address,
      policyId: policy.id,
      agentId: agent.id,
      idempotencyKey: parsed.idempotencyKey,
      receiptHash: receipt.receiptHash,
      headers: {
        'X-TrustRail-Policy': policy.id,
        'X-TrustRail-Agent': agent.id,
        'X-TrustRail-Receipt': receipt.receiptHash,
        'X-TrustRail-Idempotency-Key': parsed.idempotencyKey,
      },
    },
    receipt,
  }
}

function getPolicy(id: string) {
  const policy = policies.find((item) => item.id === id)
  if (!policy) {
    throw new Error(`Unknown policy: ${id}`)
  }
  return policy
}

function getAgent(id: string) {
  const agent = agents.find((item) => item.id === id)
  if (!agent) {
    throw new Error(`Unknown agent: ${id}`)
  }
  return agent
}
