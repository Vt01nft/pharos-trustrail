import { z } from 'zod'

export const credentialSchema = z.enum([
  'zk_kyc',
  'aml_screen',
  'agent_mandate_signature',
  'travel_rule_attestation',
])

export const preflightActionSchema = z.object({
  action: z.enum([
    'x402_payment',
    'rwa_purchase',
    'stablecoin_settlement',
    'treasury_payout',
    'contract_interaction',
  ]),
  amountUsd: z.number().nonnegative(),
  asset: z.string().min(1),
  recipientId: z.string().min(1),
  purpose: z.string().min(1).max(500),
  contractAddress: z.string().optional(),
  calldataHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  credentials: z.array(credentialSchema),
})

export const policyManifestInputSchema = z.object({
  policyId: z.string().default('pharos-realfi-agent-v1'),
})

export const preflightInputSchema = z.object({
  policyId: z.string().default('pharos-realfi-agent-v1'),
  agentId: z.string().default('agent-steward-01'),
  action: preflightActionSchema,
})

export const attachTransactionInputSchema = z.object({
  receipt: z.unknown(),
  txHash: z.string().min(3),
  status: z.enum(['broadcast', 'confirmed', 'failed']).default('confirmed'),
})

export const verifyReceiptInputSchema = z.object({
  receipt: z.unknown(),
})

export const x402ChallengeInputSchema = preflightInputSchema.extend({
  resource: z.string().url(),
  idempotencyKey: z.string().min(8),
})

export const signReceiptInputSchema = z.object({
  receipt: z.unknown(),
  agentWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  issuerPrivateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  chainId: z.number().int().positive().optional(),
  expiresInSeconds: z.number().int().positive().optional(),
  nonce: z.string().min(1).optional(),
})

export const verifySignedReceiptInputSchema = z.object({
  signedReceipt: z.unknown(),
  authorizedIssuers: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).optional(),
})

export const guardTransactionInputSchema = z.object({
  signedReceipt: z.unknown(),
  tx: z.object({
    from: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    chainId: z.number().int().positive(),
    valueUsd: z.number().nonnegative().optional(),
    data: z.string().regex(/^0x[a-fA-F0-9]*$/).optional(),
  }),
  authorizedIssuers: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).optional(),
  allowWarn: z.boolean().optional(),
})

export const registryV2InputSchema = z.object({
  signedReceipt: z.unknown(),
})
