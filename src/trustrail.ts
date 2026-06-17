export type Decision = 'ALLOW' | 'WARN' | 'BLOCK'
export type ActionType =
  | 'x402_payment'
  | 'rwa_purchase'
  | 'stablecoin_settlement'
  | 'treasury_payout'
  | 'contract_interaction'

export type CredentialKind = 'zk_kyc' | 'aml_screen' | 'agent_mandate_signature' | 'travel_rule_attestation'

export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked'

export type Counterparty = {
  id: string
  label: string
  address: string
  jurisdiction: string
  tags: string[]
  risk: RiskLevel
  sanctionsHit: boolean
  kycTier: 'none' | 'basic' | 'verified' | 'institutional'
}

export type AgentProfile = {
  id: string
  name: string
  operator: string
  wallet: string
  role: 'consumer' | 'treasury' | 'market-maker' | 'rwa-servicer'
  dailySpentUsd: number
  trustScore: number
}

export type Policy = {
  id: string
  name: string
  description: string
  maxSingleUsd: number
  dailyLimitUsd: number
  allowedAssets: string[]
  allowedActions: ActionType[]
  allowedJurisdictions: string[]
  blockedTags: string[]
  requiredCredentials: CredentialKind[]
  rwaRequiresInstitutionalKyc: boolean
}

export type PreflightAction = {
  action: ActionType
  amountUsd: number
  asset: string
  recipientId: string
  purpose: string
  contractAddress?: string
  credentials: CredentialKind[]
}

export type ReasonCode =
  | 'ACTION_ALLOWED'
  | 'ACTION_NOT_ALLOWED'
  | 'ASSET_ALLOWED'
  | 'ASSET_NOT_ALLOWED'
  | 'COUNTERPARTY_OK'
  | 'COUNTERPARTY_BLOCKED'
  | 'COUNTERPARTY_HIGH_RISK'
  | 'JURISDICTION_ALLOWED'
  | 'JURISDICTION_REVIEW'
  | 'SINGLE_LIMIT_OK'
  | 'SINGLE_LIMIT_EXCEEDED'
  | 'DAILY_LIMIT_OK'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'CREDENTIALS_PRESENT'
  | 'CREDENTIALS_MISSING'
  | 'RWA_INSTITUTIONAL_KYC_REQUIRED'
  | 'AGENT_TRUST_LOW'

export type ComplianceReceipt = {
  id: string
  policyId: string
  agentId: string
  action: PreflightAction
  counterparty: Counterparty
  decision: Decision
  reasonCodes: ReasonCode[]
  requiredProofs: CredentialKind[]
  safeExecutionPlan: string[]
  timestamp: string
  txHash?: string
  status: 'preflight' | 'broadcast' | 'confirmed' | 'failed'
  receiptHash: string
}

export const pharosChain = {
  chainId: 1672,
  network: 'Pharos',
  explorerBaseUrl: 'https://pharosscan.xyz',
}

export const policies: Policy[] = [
  {
    id: 'pharos-realfi-agent-v1',
    name: 'RealFi Agent Standard',
    description: 'Default rule set for agent-mediated payments, stablecoins, and RWA operations.',
    maxSingleUsd: 5000,
    dailyLimitUsd: 20000,
    allowedAssets: ['USDC', 'USDT', 'PHRS', 'PROS'],
    allowedActions: ['x402_payment', 'stablecoin_settlement', 'treasury_payout', 'contract_interaction'],
    allowedJurisdictions: ['US', 'SG', 'NG', 'GB', 'AE', 'EU'],
    blockedTags: ['sanctioned', 'mixer', 'stolen-funds', 'unverified-rwa'],
    requiredCredentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature'],
    rwaRequiresInstitutionalKyc: true,
  },
  {
    id: 'pharos-rwa-institutional-v1',
    name: 'RWA Institutional Rail',
    description: 'Strict policy for tokenized treasury, invoice, and private credit interactions.',
    maxSingleUsd: 25000,
    dailyLimitUsd: 75000,
    allowedAssets: ['USDC', 'USDT'],
    allowedActions: ['rwa_purchase', 'stablecoin_settlement', 'contract_interaction'],
    allowedJurisdictions: ['US', 'SG', 'GB', 'EU'],
    blockedTags: ['sanctioned', 'mixer', 'stolen-funds', 'unverified-rwa', 'retail-only'],
    requiredCredentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature', 'travel_rule_attestation'],
    rwaRequiresInstitutionalKyc: true,
  },
]

export const counterparties: Counterparty[] = [
  {
    id: 'atlas-data',
    label: 'Atlas Data SPN',
    address: '0x7a5dA7A00000000000000000000000000000DA7A',
    jurisdiction: 'US',
    tags: ['data-provider', 'x402'],
    risk: 'low',
    sanctionsHit: false,
    kycTier: 'verified',
  },
  {
    id: 'centra-rwa',
    label: 'Centrifuge-style RWA Pool',
    address: '0xCEeE00000000000000000000000000000000A557',
    jurisdiction: 'EU',
    tags: ['rwa', 'private-credit'],
    risk: 'medium',
    sanctionsHit: false,
    kycTier: 'institutional',
  },
  {
    id: 'global-payroll',
    label: 'Global Payroll Operator',
    address: '0x9a1A0000000000000000000000000000000A11CE',
    jurisdiction: 'NG',
    tags: ['payroll', 'stablecoin'],
    risk: 'low',
    sanctionsHit: false,
    kycTier: 'verified',
  },
  {
    id: 'shadow-vault',
    label: 'Shadow Vault Bridge',
    address: '0xB10C000000000000000000000000000000BADBAD',
    jurisdiction: 'KP',
    tags: ['mixer', 'sanctioned'],
    risk: 'blocked',
    sanctionsHit: true,
    kycTier: 'none',
  },
]

export const agents: AgentProfile[] = [
  {
    id: 'agent-steward-01',
    name: 'Steward Agent 01',
    operator: 'Pharos Builder Ops',
    wallet: '0xA6e1700000000000000000000000000000000001',
    role: 'treasury',
    dailySpentUsd: 4200,
    trustScore: 91,
  },
  {
    id: 'rwa-servicer-07',
    name: 'RWA Servicer 07',
    operator: 'RealFi Desk',
    wallet: '0xA6e1700000000000000000000000000000000007',
    role: 'rwa-servicer',
    dailySpentUsd: 18100,
    trustScore: 86,
  },
]

export const scenarioActions: Record<string, PreflightAction> = {
  'x402-data': {
    action: 'x402_payment',
    amountUsd: 42,
    asset: 'USDC',
    recipientId: 'atlas-data',
    purpose: 'Pay for verified market data through x402 before the agent publishes a research answer.',
    credentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature'],
  },
  'rwa-pool': {
    action: 'rwa_purchase',
    amountUsd: 12000,
    asset: 'USDC',
    recipientId: 'centra-rwa',
    purpose: 'Subscribe to a tokenized private-credit RWA pool on behalf of a verified treasury account.',
    contractAddress: '0xCEeE00000000000000000000000000000000A557',
    credentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature'],
  },
  payroll: {
    action: 'stablecoin_settlement',
    amountUsd: 2600,
    asset: 'USDT',
    recipientId: 'global-payroll',
    purpose: 'Settle an approved cross-border contractor invoice in stablecoins.',
    credentials: ['zk_kyc', 'aml_screen', 'agent_mandate_signature', 'travel_rule_attestation'],
  },
  blocked: {
    action: 'stablecoin_settlement',
    amountUsd: 600,
    asset: 'USDC',
    recipientId: 'shadow-vault',
    purpose: 'Attempted settlement to a blocked bridge address.',
    credentials: ['agent_mandate_signature'],
  },
}

export async function evaluatePreflight(
  policy: Policy,
  agent: AgentProfile,
  action: PreflightAction,
  now = new Date(),
): Promise<ComplianceReceipt> {
  const counterparty = getCounterparty(action.recipientId)
  const reasonCodes: ReasonCode[] = []
  const requiredProofs = missingCredentials(policy, action.credentials)
  const safeExecutionPlan: string[] = []

  if (policy.allowedActions.includes(action.action)) {
    reasonCodes.push('ACTION_ALLOWED')
    safeExecutionPlan.push(`Action ${action.action} is within policy ${policy.id}.`)
  } else {
    reasonCodes.push('ACTION_NOT_ALLOWED')
  }

  if (policy.allowedAssets.includes(action.asset)) {
    reasonCodes.push('ASSET_ALLOWED')
  } else {
    reasonCodes.push('ASSET_NOT_ALLOWED')
  }

  if (counterparty.sanctionsHit || counterparty.tags.some((tag) => policy.blockedTags.includes(tag))) {
    reasonCodes.push('COUNTERPARTY_BLOCKED')
  } else if (counterparty.risk === 'high') {
    reasonCodes.push('COUNTERPARTY_HIGH_RISK')
  } else {
    reasonCodes.push('COUNTERPARTY_OK')
  }

  if (policy.allowedJurisdictions.includes(counterparty.jurisdiction)) {
    reasonCodes.push('JURISDICTION_ALLOWED')
  } else {
    reasonCodes.push('JURISDICTION_REVIEW')
  }

  reasonCodes.push(action.amountUsd <= policy.maxSingleUsd ? 'SINGLE_LIMIT_OK' : 'SINGLE_LIMIT_EXCEEDED')
  reasonCodes.push(agent.dailySpentUsd + action.amountUsd <= policy.dailyLimitUsd ? 'DAILY_LIMIT_OK' : 'DAILY_LIMIT_EXCEEDED')
  reasonCodes.push(requiredProofs.length === 0 ? 'CREDENTIALS_PRESENT' : 'CREDENTIALS_MISSING')

  if (action.action === 'rwa_purchase' && policy.rwaRequiresInstitutionalKyc && counterparty.kycTier !== 'institutional') {
    reasonCodes.push('RWA_INSTITUTIONAL_KYC_REQUIRED')
  }

  if (agent.trustScore < 70) {
    reasonCodes.push('AGENT_TRUST_LOW')
  }

  const decision = decide(reasonCodes)

  if (decision !== 'BLOCK') {
    safeExecutionPlan.push('Simulate transaction and estimate gas on Pharos before signing.')
    safeExecutionPlan.push('Bind user mandate, policy id, and calldata hash into the receipt.')
    safeExecutionPlan.push('Broadcast only after receipt hash is created and stored by the caller.')
  } else {
    safeExecutionPlan.push('Do not sign or broadcast. Escalate policy failure with evidence.')
  }

  const receiptBase = {
    id: `TRL-${now.getTime().toString(36).toUpperCase()}`,
    policyId: policy.id,
    agentId: agent.id,
    action,
    counterparty,
    decision,
    reasonCodes,
    requiredProofs,
    safeExecutionPlan,
    timestamp: now.toISOString(),
    status: 'preflight' as const,
  }

  return {
    ...receiptBase,
    receiptHash: await hashReceipt(receiptBase),
  }
}

export async function attachTransaction(
  receipt: ComplianceReceipt,
  txHash: string,
  status: ComplianceReceipt['status'] = 'broadcast',
): Promise<ComplianceReceipt> {
  const next = {
    ...receipt,
    txHash,
    status,
  }

  return {
    ...next,
    receiptHash: await hashReceipt({ ...next, receiptHash: undefined }),
  }
}

export async function verifyReceipt(receipt: ComplianceReceipt): Promise<boolean> {
  const { receiptHash, ...rest } = receipt
  const expected = await hashReceipt(rest)
  return expected === receiptHash
}

export function createSdkSnippet(policy: Policy, agent: AgentProfile, action: PreflightAction) {
  return `import { TrustRailClient } from "@pharos/trustrail";

const trustRail = new TrustRailClient({
  chainId: ${pharosChain.chainId},
  policyId: "${policy.id}",
});

const decision = await trustRail.preflight({
  agentId: "${agent.id}",
  action: "${action.action}",
  asset: "${action.asset}",
  amountUsd: ${action.amountUsd},
  recipient: "${getCounterparty(action.recipientId).address}",
  purpose: ${JSON.stringify(action.purpose)},
  credentials: ${JSON.stringify(action.credentials)},
});

if (decision.decision === "ALLOW") {
  await agent.execute(decision.safeExecutionPlan);
}`
}

export function createPolicyManifest(policy: Policy) {
  return {
    schema: 'pharos.trustrail.policy.v1',
    policy,
    registry: {
      chainId: pharosChain.chainId,
      receiptContract: '0xTru57Ra1100000000000000000000000000001672',
    },
  }
}

function getCounterparty(id: string) {
  const counterparty = counterparties.find((item) => item.id === id)
  if (!counterparty) {
    throw new Error(`Unknown counterparty: ${id}`)
  }
  return counterparty
}

function missingCredentials(policy: Policy, credentials: CredentialKind[]) {
  return policy.requiredCredentials.filter((credential) => !credentials.includes(credential))
}

function decide(reasonCodes: ReasonCode[]): Decision {
  const blockers: ReasonCode[] = [
    'ACTION_NOT_ALLOWED',
    'ASSET_NOT_ALLOWED',
    'COUNTERPARTY_BLOCKED',
    'SINGLE_LIMIT_EXCEEDED',
    'DAILY_LIMIT_EXCEEDED',
    'AGENT_TRUST_LOW',
  ]
  const warnings: ReasonCode[] = [
    'COUNTERPARTY_HIGH_RISK',
    'JURISDICTION_REVIEW',
    'CREDENTIALS_MISSING',
    'RWA_INSTITUTIONAL_KYC_REQUIRED',
  ]

  if (reasonCodes.some((code) => blockers.includes(code))) {
    return 'BLOCK'
  }

  if (reasonCodes.some((code) => warnings.includes(code))) {
    return 'WARN'
  }

  return 'ALLOW'
}

async function hashReceipt(value: unknown) {
  const normalized = stableStringify(value)
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(normalized))
  return `0x${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}
