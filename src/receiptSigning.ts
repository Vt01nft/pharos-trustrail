import { hashTypedData, keccak256, recoverTypedDataAddress, toBytes, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { pharosChain, verifyReceipt, type ComplianceReceipt, type Decision, type SignedComplianceReceipt } from './trustrail'

export function createTrustRailDomain(chainId = pharosChain.chainId) {
  return {
    name: 'Pharos TrustRail',
    version: '2',
    chainId,
  } as const
}

export const trustRailDomain = createTrustRailDomain()

export const trustRailReceiptTypes = {
  TrustRailReceipt: [
    { name: 'receiptHash', type: 'bytes32' },
    { name: 'policyHash', type: 'bytes32' },
    { name: 'agentIdHash', type: 'bytes32' },
    { name: 'agentWallet', type: 'address' },
    { name: 'decisionHash', type: 'bytes32' },
    { name: 'statusHash', type: 'bytes32' },
    { name: 'chainId', type: 'uint256' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'expiresAt', type: 'uint256' },
    { name: 'nonceHash', type: 'bytes32' },
  ],
} as const

export type ReceiptSigningOptions = {
  issuerPrivateKey?: Hex
  issuedAt?: number
  expiresInSeconds?: number
  nonce?: string
  chainId?: number
}

export async function signReceipt(
  receipt: ComplianceReceipt,
  agentWallet: `0x${string}`,
  options: ReceiptSigningOptions = {},
): Promise<SignedComplianceReceipt> {
  if (!(await verifyReceipt(receipt))) {
    throw new Error('Cannot sign receipt: receiptHash does not match receipt contents')
  }

  const issuerPrivateKey = resolveIssuerPrivateKey(options.issuerPrivateKey)
  const account = privateKeyToAccount(issuerPrivateKey)
  const chainId = options.chainId ?? pharosChain.chainId
  const issuedAt = options.issuedAt ?? Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + (options.expiresInSeconds ?? 900)
  const nonce = options.nonce ?? `${receipt.id}:${issuedAt}`
  const message = receiptTypedMessage(receipt, agentWallet, { issuedAt, expiresAt, nonce, chainId })
  const signature = await account.signTypedData({
    domain: createTrustRailDomain(chainId),
    types: trustRailReceiptTypes,
    primaryType: 'TrustRailReceipt',
    message,
  })
  const typedDataHash = hashTypedData({
    domain: createTrustRailDomain(chainId),
    types: trustRailReceiptTypes,
    primaryType: 'TrustRailReceipt',
    message,
  })

  return {
    ...receipt,
    issuer: account.address,
    agentWallet,
    chainId,
    issuedAt,
    expiresAt,
    nonce,
    signature,
    typedDataHash,
  }
}

export async function verifySignedReceipt(
  signedReceipt: SignedComplianceReceipt,
  authorizedIssuers: `0x${string}`[] = resolveAuthorizedIssuers(),
  now = Math.floor(Date.now() / 1000),
): Promise<{ valid: boolean; recoveredIssuer?: `0x${string}`; reasons: string[] }> {
  const reasons: string[] = []

  if (!(await verifyReceipt(signedReceipt))) {
    reasons.push('RECEIPT_HASH_MISMATCH')
  }

  if (signedReceipt.expiresAt < now) {
    reasons.push('RECEIPT_EXPIRED')
  }

  const chainId = signedReceipt.chainId ?? pharosChain.chainId
  const recoveredIssuer = await recoverTypedDataAddress({
    domain: createTrustRailDomain(chainId),
    types: trustRailReceiptTypes,
    primaryType: 'TrustRailReceipt',
    message: receiptTypedMessage(signedReceipt, signedReceipt.agentWallet, {
      issuedAt: signedReceipt.issuedAt,
      expiresAt: signedReceipt.expiresAt,
      nonce: signedReceipt.nonce,
      chainId,
    }),
    signature: signedReceipt.signature,
  })

  if (recoveredIssuer.toLowerCase() !== signedReceipt.issuer.toLowerCase()) {
    reasons.push('ISSUER_SIGNATURE_MISMATCH')
  }

  if (!authorizedIssuers.some((issuer) => issuer.toLowerCase() === recoveredIssuer.toLowerCase())) {
    reasons.push('ISSUER_NOT_AUTHORIZED')
  }

  return {
    valid: reasons.length === 0,
    recoveredIssuer,
    reasons,
  }
}

export function receiptTypedMessage(
  receipt: Pick<ComplianceReceipt, 'receiptHash' | 'policyId' | 'agentId' | 'decision' | 'status'>,
  agentWallet: `0x${string}`,
  options: { issuedAt: number; expiresAt: number; nonce: string; chainId?: number },
) {
  return {
    receiptHash: receipt.receiptHash as Hex,
    policyHash: hashString(receipt.policyId),
    agentIdHash: hashString(receipt.agentId),
    agentWallet,
    decisionHash: hashString(receipt.decision),
    statusHash: hashString(receipt.status),
    chainId: BigInt(options.chainId ?? pharosChain.chainId),
    issuedAt: BigInt(options.issuedAt),
    expiresAt: BigInt(options.expiresAt),
    nonceHash: hashString(options.nonce),
  }
}

export function toRegistryV2Input(signedReceipt: SignedComplianceReceipt) {
  const message = receiptTypedMessage(signedReceipt, signedReceipt.agentWallet, {
    issuedAt: signedReceipt.issuedAt,
    expiresAt: signedReceipt.expiresAt,
    nonce: signedReceipt.nonce,
    chainId: signedReceipt.chainId,
  })

  return {
    receiptHash: message.receiptHash,
    policyHash: message.policyHash,
    agentIdHash: message.agentIdHash,
    agentWallet: message.agentWallet,
    decisionHash: message.decisionHash,
    statusHash: message.statusHash,
    chainId: message.chainId.toString(),
    issuedAt: message.issuedAt.toString(),
    expiresAt: message.expiresAt.toString(),
    nonceHash: message.nonceHash,
    signature: signedReceipt.signature,
  }
}

export function hashPolicyId(policyId: string) {
  return hashString(policyId)
}

export function hashDecision(decision: Decision) {
  return hashString(decision)
}

export function resolveIssuerPrivateKey(explicitPrivateKey?: Hex): Hex {
  const privateKey = explicitPrivateKey ?? process.env.TRUSTRAIL_ISSUER_PRIVATE_KEY

  if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error('Missing TRUSTRAIL_ISSUER_PRIVATE_KEY or issuerPrivateKey for receipt signing')
  }

  return privateKey as Hex
}

export function resolveAuthorizedIssuers(explicitIssuers?: `0x${string}`[]) {
  if (explicitIssuers) {
    return explicitIssuers
  }

  const configuredIssuers = process.env.TRUSTRAIL_AUTHORIZED_ISSUERS
  if (configuredIssuers) {
    return configuredIssuers
      .split(',')
      .map((issuer) => issuer.trim())
      .filter((issuer): issuer is `0x${string}` => /^0x[a-fA-F0-9]{40}$/.test(issuer))
  }

  const configuredPrivateKey = process.env.TRUSTRAIL_ISSUER_PRIVATE_KEY
  if (configuredPrivateKey && /^0x[a-fA-F0-9]{64}$/.test(configuredPrivateKey)) {
    return [privateKeyToAccount(configuredPrivateKey as Hex).address]
  }

  return []
}

function hashString(value: string) {
  return keccak256(toBytes(value))
}
