import {
  agents,
  attachTransaction,
  evaluatePreflight,
  policies,
  type AgentProfile,
  type ComplianceReceipt,
  type Policy,
  type PreflightAction,
  type SignedComplianceReceipt,
} from './trustrail'
import { signReceipt, verifySignedReceipt, type ReceiptSigningOptions } from './receiptSigning'
import {
  enforceSigningPath,
  guardedSendTransaction,
  type GuardedTransaction,
  type SigningGuardOptions,
} from './signingGuard'

export type TrustRailClientConfig = {
  chainId: number
  policyId: string
  agentId?: string
}

export class TrustRailClient {
  private chainId: number
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

    this.chainId = config.chainId
    this.policy = policy
    this.agent = agent
  }

  preflight(action: PreflightAction) {
    return evaluatePreflight(this.policy, this.agent, action)
  }

  recordSettlement(receipt: ComplianceReceipt, txHash: string) {
    return attachTransaction(receipt, txHash, 'confirmed')
  }

  signReceipt(receipt: ComplianceReceipt, options: Omit<ReceiptSigningOptions, 'chainId'> = {}) {
    return signReceipt(receipt, this.agent.wallet as `0x${string}`, {
      ...options,
      chainId: this.chainId,
    })
  }

  verifySignedReceipt(signedReceipt: SignedComplianceReceipt, authorizedIssuers?: `0x${string}`[]) {
    return verifySignedReceipt(signedReceipt, authorizedIssuers)
  }

  guardTransaction(
    signedReceipt: SignedComplianceReceipt,
    tx: Omit<GuardedTransaction, 'from' | 'chainId'> & Partial<Pick<GuardedTransaction, 'from' | 'chainId'>>,
    options?: SigningGuardOptions,
  ) {
    return enforceSigningPath(signedReceipt, {
      ...tx,
      from: tx.from ?? (this.agent.wallet as `0x${string}`),
      chainId: tx.chainId ?? this.chainId,
    }, options)
  }

  guardedSendTransaction<T>(
    signedReceipt: SignedComplianceReceipt,
    tx: Omit<GuardedTransaction, 'from' | 'chainId'> & Partial<Pick<GuardedTransaction, 'from' | 'chainId'>>,
    send: (tx: GuardedTransaction) => Promise<T>,
    options?: SigningGuardOptions,
  ) {
    return guardedSendTransaction(signedReceipt, {
      ...tx,
      from: tx.from ?? (this.agent.wallet as `0x${string}`),
      chainId: tx.chainId ?? this.chainId,
    }, send, options)
  }
}
