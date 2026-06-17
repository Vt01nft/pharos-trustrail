import {
  agents,
  attachTransaction,
  evaluatePreflight,
  policies,
  type AgentProfile,
  type ComplianceReceipt,
  type Policy,
  type PreflightAction,
} from './trustrail'

export type TrustRailClientConfig = {
  chainId: number
  policyId: string
  agentId?: string
}

export class TrustRailClient {
  private policy: Policy
  private agent: AgentProfile

  constructor(config: TrustRailClientConfig) {
    const policy = policies.find((item) => item.id === config.policyId)
    const agent = agents.find((item) => item.id === (config.agentId ?? agents[0].id))

    if (!policy) {
      throw new Error(`Unknown TrustRail policy: ${config.policyId}`)
    }

    if (!agent) {
      throw new Error(`Unknown TrustRail agent: ${config.agentId}`)
    }

    this.policy = policy
    this.agent = agent
  }

  preflight(action: PreflightAction) {
    return evaluatePreflight(this.policy, this.agent, action)
  }

  recordSettlement(receipt: ComplianceReceipt, txHash: string) {
    return attachTransaction(receipt, txHash, 'confirmed')
  }
}
