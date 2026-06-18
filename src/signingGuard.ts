import { keccak256, type Hex } from 'viem'
import { type SignedComplianceReceipt } from './trustrail'
import { resolveAuthorizedIssuers, verifySignedReceipt } from './receiptSigning'

export type GuardedTransaction = {
  from: `0x${string}`
  to: `0x${string}`
  chainId: number
  valueUsd?: number
  data?: `0x${string}`
}

export type SigningGuardOptions = {
  authorizedIssuers?: `0x${string}`[]
  allowWarn?: boolean
  now?: number
}

export type SigningGuardResult = {
  allowed: boolean
  reasons: string[]
  receiptHash: string
  issuer?: `0x${string}`
}

export async function enforceSigningPath(
  signedReceipt: SignedComplianceReceipt,
  tx: GuardedTransaction,
  options: SigningGuardOptions = {},
): Promise<SigningGuardResult> {
  const reasons: string[] = []
  const verification = await verifySignedReceipt(
    signedReceipt,
    resolveAuthorizedIssuers(options.authorizedIssuers),
    options.now,
  )

  if (!verification.valid) {
    reasons.push(...verification.reasons)
  }

  if (signedReceipt.decision === 'BLOCK') {
    reasons.push('RECEIPT_DECISION_BLOCK')
  }

  if (signedReceipt.decision === 'WARN' && !options.allowWarn) {
    reasons.push('RECEIPT_DECISION_REQUIRES_REVIEW')
  }

  if (tx.from.toLowerCase() !== signedReceipt.agentWallet.toLowerCase()) {
    reasons.push('TX_FROM_NOT_AGENT_WALLET')
  }

  if (tx.chainId !== signedReceipt.chainId) {
    reasons.push('CHAIN_ID_MISMATCH')
  }

  const expectedTo = signedReceipt.action.contractAddress ?? signedReceipt.counterparty.address
  if (tx.to.toLowerCase() !== expectedTo.toLowerCase()) {
    reasons.push('TX_TARGET_NOT_RECEIPT_COUNTERPARTY')
  }

  if (tx.valueUsd !== undefined && tx.valueUsd > signedReceipt.action.amountUsd) {
    reasons.push('TX_VALUE_EXCEEDS_RECEIPT_AMOUNT')
  }

  if (signedReceipt.action.calldataHash) {
    if (!tx.data) {
      reasons.push('TX_CALLDATA_MISSING')
    } else if (keccak256(tx.data as Hex).toLowerCase() !== signedReceipt.action.calldataHash.toLowerCase()) {
      reasons.push('TX_CALLDATA_HASH_MISMATCH')
    }
  } else if (signedReceipt.action.contractAddress && tx.data) {
    reasons.push('TX_CALLDATA_NOT_BOUND')
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    receiptHash: signedReceipt.receiptHash,
    issuer: verification.recoveredIssuer,
  }
}

export async function guardedSendTransaction<T>(
  signedReceipt: SignedComplianceReceipt,
  tx: GuardedTransaction,
  send: (tx: GuardedTransaction) => Promise<T>,
  options: SigningGuardOptions = {},
): Promise<T> {
  const guard = await enforceSigningPath(signedReceipt, tx, options)

  if (!guard.allowed) {
    throw new Error(`TrustRail blocked signing path: ${guard.reasons.join(', ')}`)
  }

  return send(tx)
}
