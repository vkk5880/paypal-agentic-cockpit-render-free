import { z } from 'zod';

/**
 * Jules Task 1: Shared Types & Schema Parity
 * Fully verified parity with .development/packages/shared-types/src/index.ts.
 * Exports PrimaryBadgeSchema, ProductBadgeSchema, complete ACP & x402 contracts,
 * AcpMcpToolArgumentsSchema, and hardened dispute schemas.
 */

/**
 * Float-Safe Money and Basis Points Primitives
 * Direct TypeScript port from Custodian (custodian.money and custodian.bp).
 * Floating-point numbers have no canonical byte form and lead to rounding drift.
 * All amounts are integer cents (paise) and all scores are integer basis points.
 */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export class BpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BpError';
  }
}

/**
 * Refuse floats explicitly so the failure names the real problem.
 * In JS runtime, Number.isInteger distinguishes whole numbers from fractional floats.
 */
export function rejectFloat(value: unknown, context: string = 'value'): asserts value is number {
  if (typeof value === 'boolean') {
    throw new MoneyError(`bool is not a valid ${context}: ${value}`);
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new MoneyError(
      `float or non-integer is not a valid ${context}: ${value}. ` +
      `Pass an integer count of cents/paise or basis points.`
    );
  }
}

/**
 * CentsSchema: Strict integer cents validation (custodian.money).
 * Rejects floating-point numbers and negative values.
 */
export const CentsSchema = z
  .number({
    required_error: 'Amount in cents is required',
    invalid_type_error: 'Amount in cents must be an integer number',
  })
  .int('Amount in cents must be an integer; floats are strictly rejected')
  .nonnegative('Amount in cents must be non-negative');

export type Cents = z.infer<typeof CentsSchema>;

export const PositiveCentsSchema = CentsSchema.refine((v) => v > 0, {
  message: 'Amount in cents must be strictly positive',
});

export type PositiveCents = z.infer<typeof PositiveCentsSchema>;

/**
 * Parse a dollar/rupee amount string or integer into integer cents without float math.
 */
export function parseCents(raw: string | number): number {
  if (typeof raw === 'number') {
    if (typeof raw === 'boolean' || !Number.isInteger(raw)) {
      throw new MoneyError(`float is not a valid money input: ${raw}. Pass a str or integer cents.`);
    }
    if (raw < 0) {
      throw new MoneyError(`negative amount: ${raw}`);
    }
    return raw;
  }

  if (typeof raw !== 'string') {
    throw new MoneyError(`unparseable amount: ${String(raw)}`);
  }

  const trimmed = raw.trim();
  const match = trimmed.match(/^(?:[\$₹]|rs\.?|usd|inr)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:\/-)?$/i);
  if (!match) {
    throw new MoneyError(`unparseable amount: ${raw}`);
  }

  const cleanNumStr = match[1].replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleanNumStr)) {
    throw new MoneyError(`unparseable amount: ${raw}`);
  }

  const parts = cleanNumStr.split('.');
  const whole = parseInt(parts[0], 10);
  if (isNaN(whole) || whole < 0) {
    throw new MoneyError(`negative amount: ${raw}`);
  }

  let cents = whole * 100;
  if (parts.length > 1) {
    const fractionStr = parts[1].slice(0, 3);
    if (fractionStr.length === 1) {
      cents += parseInt(fractionStr, 10) * 10;
    } else if (fractionStr.length === 2) {
      cents += parseInt(fractionStr, 10);
    } else {
      const twoDec = parseInt(fractionStr.slice(0, 2), 10);
      const thirdDec = parseInt(fractionStr[2], 10);
      cents += twoDec + (thirdDec >= 5 ? 1 : 0);
    }
  }

  return cents;
}

/**
 * Format integer cents for humans ($1,299.50 or ₹1,299.50). Never parse back.
 */
export function formatCents(cents: number, currency: string = 'USD'): string {
  if (typeof cents !== 'number' || !Number.isInteger(cents)) {
    throw new MoneyError(`expected int cents, got ${typeof cents === 'number' ? 'float' : typeof cents}`);
  }
  const sign = cents < 0 ? '-' : '';
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remCents = absCents % 100;
  const remCentsStr = remCents.toString().padStart(2, '0');
  const formattedDollars = dollars.toLocaleString('en-US');

  if (currency === 'INR') {
    return `${sign}₹${formattedDollars}.${remCentsStr}`;
  }
  return `${sign}$${formattedDollars}.${remCentsStr}`;
}

/**
 * Line item total: integer multiplication with strict float rejection and no rounding.
 */
export function lineTotal(unitPriceCents: number, quantity: number): number {
  if (typeof unitPriceCents !== 'number' || !Number.isInteger(unitPriceCents)) {
    throw new MoneyError(`float is not a valid money input for unitPriceCents: ${unitPriceCents}`);
  }
  if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
    throw new MoneyError(`float is not a valid quantity input: ${quantity}`);
  }
  if (unitPriceCents < 0) {
    throw new MoneyError(`negative unit price: ${unitPriceCents}`);
  }
  if (quantity < 0) {
    throw new MoneyError(`negative quantity: ${quantity}`);
  }
  return unitPriceCents * quantity;
}

/**
 * BasisPointsSchema: Integer basis points (0 to 10,000 bp, custodian.bp).
 * 0 = 0.00%, 10,000 = 100.00%, 1 bp = 0.01%.
 * Strict float rejection: floats have no canonical byte form and are rejected.
 */
export const BasisPointsSchema = z
  .number({
    required_error: 'Basis points value is required',
    invalid_type_error: 'Basis points must be an integer number',
  })
  .int('Basis points must be an integer; floats are strictly rejected')
  .min(0, 'Basis points out of range [0, 10000]: must be >= 0')
  .max(10000, 'Basis points out of range [0, 10000]: must be <= 10000');

export type BasisPoints = z.infer<typeof BasisPointsSchema>;

export const FULL_BP = 10_000;
export const ZERO_BP = 0;

export function validateBasisPoints(score: number): number {
  if (typeof score !== 'number' || !Number.isInteger(score)) {
    throw new BpError(`basis points must be int, got ${typeof score}: ${score}`);
  }
  if (score < ZERO_BP || score > FULL_BP) {
    throw new BpError(`basis points out of range [0, ${FULL_BP}]: ${score}`);
  }
  return score;
}

/**
 * Convert a ratio to basis points, rounding half up in integer arithmetic.
 */
export function basisPointsFromRatio(numerator: number, denominator: number): number {
  if (typeof numerator !== 'number' || !Number.isInteger(numerator) ||
      typeof denominator !== 'number' || !Number.isInteger(denominator)) {
    throw new BpError('basisPointsFromRatio takes ints; floats cannot enter a score');
  }
  if (denominator === 0) {
    throw new BpError('basisPointsFromRatio: zero denominator — the caller must decide what empty means');
  }
  if (numerator < 0 || denominator < 0) {
    throw new BpError(`basisPointsFromRatio: negative input ${numerator}/${denominator}`);
  }
  const score = Math.floor((numerator * FULL_BP + Math.floor(denominator / 2)) / denominator);
  return validateBasisPoints(Math.min(FULL_BP, score));
}

/**
 * Parse human percentage like "85" or "85.5" into integer basis points.
 */
export function basisPointsFromPercent(percent: string): number {
  const trimmed = percent.trim().replace(/%$/, '');
  const match = trimmed.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new BpError(`unparseable percentage: ${percent}`);
  }
  const whole = parseInt(match[1], 10);
  let bp = whole * 100;
  if (match[2]) {
    const fractionStr = match[2].slice(0, 3);
    if (fractionStr.length === 1) {
      bp += parseInt(fractionStr, 10) * 10;
    } else if (fractionStr.length === 2) {
      bp += parseInt(fractionStr, 10);
    } else {
      const twoDec = parseInt(fractionStr.slice(0, 2), 10);
      const thirdDec = parseInt(fractionStr[2], 10);
      bp += twoDec + (thirdDec >= 5 ? 1 : 0);
    }
  }
  return validateBasisPoints(bp);
}

/**
 * Weighted mean of [scoreBp, weight] pairs in integer arithmetic (round half up).
 */
export function weightedBasisPoints(parts: Array<[number, number]>): number {
  const pairs = parts.map(([score, weight]) => {
    return [validateBasisPoints(score), weight] as [number, number];
  });
  if (pairs.some(([, w]) => typeof w !== 'number' || !Number.isInteger(w) || w < 0)) {
    throw new BpError('negative or float weight');
  }
  const totalWeight = pairs.reduce((sum, [, w]) => sum + w, 0);
  if (totalWeight === 0) {
    return ZERO_BP;
  }
  const numerator = pairs.reduce((sum, [score, weight]) => sum + score * weight, 0);
  const rounded = Math.floor((numerator + Math.floor(totalWeight / 2)) / totalWeight);
  return validateBasisPoints(rounded);
}

/**
 * Render basis points for humans: 8500 -> "85.00%".
 */
export function formatBasisPoints(score: number): string {
  validateBasisPoints(score);
  const whole = Math.floor(score / 100);
  const part = score % 100;
  return `${whole}.${part.toString().padStart(2, '0')}%`;
}

export const SpendMandateSchema = z.object({
  mandate_id: z.string().trim().min(1, 'mandate_id is required').max(64).regex(/^[a-zA-Z0-9_-]+$/, 'mandate_id must be alphanumeric with dashes or underscores'),
  buyer_id: z.string().trim().min(1, 'buyer_id is required').max(64),
  max_total_spend_cents: z.number({
    required_error: 'max_total_spend_cents is required',
    invalid_type_error: 'max_total_spend_cents must be an integer number',
  }).int('max_total_spend_cents must be an integer; floats are strictly rejected').positive('max_total_spend_cents must be strictly positive'),
  max_single_merchant_cents: z.number({
    required_error: 'max_single_merchant_cents is required',
    invalid_type_error: 'max_single_merchant_cents must be an integer number',
  }).int('max_single_merchant_cents must be an integer; floats are strictly rejected').positive('max_single_merchant_cents must be strictly positive'),
  cumulative_spent_cents: z.number({
    invalid_type_error: 'cumulative_spent_cents must be an integer number',
  }).int('cumulative_spent_cents must be an integer; floats are strictly rejected').nonnegative('cumulative_spent_cents must be non-negative').default(0),
  currency_code: z.string().trim().length(3, 'currency_code must be 3 characters').toUpperCase().default('USD'),
  allowed_category_ids: z.array(z.string().trim().min(1).max(64)),
  allowed_merchant_domains: z.array(z.string().trim().min(1).max(128)).optional(),
  public_key_hex: z.string().trim().min(32, 'public_key_hex too short').max(128).regex(/^[0-9a-fA-F]+$/, 'public_key_hex must be valid hex'),
  ed25519_signature_hex: z.string().trim().min(64, 'ed25519_signature_hex too short').regex(/^[0-9a-fA-F]+$/, 'ed25519_signature_hex must be valid hex'),
  expires_at: z.union([z.date(), z.string().datetime()]).transform(v => typeof v === 'string' ? new Date(v) : v),
  status: z.enum(['ACTIVE', 'EXHAUSTED', 'REVOKED', 'EXPIRED']).default('ACTIVE'),
  created_at: z.union([z.date(), z.string().datetime()]).optional().transform(v => typeof v === 'string' ? new Date(v) : (v || new Date())),
}).refine(
  data => data.max_single_merchant_cents <= data.max_total_spend_cents,
  {
    message: 'max_single_merchant_cents must not exceed max_total_spend_cents',
  }
);

export const SessionMandateSchema = SpendMandateSchema;

export const SyntheticIntentVoucherSchema = z.object({
  voucher_id: z.string().max(32),
  mandate_id: z.string().max(32),
  paypal_vault_setup_token_id: z.string().max(64),
  paypal_payment_token_id: z.string().max(64).nullable().optional(),
  channel3_product_id: z.string().max(64),
  merchant_domain: z.string().max(128),
  retail_offer_cents: z.number().int().nonnegative(),
  buyer_bid_cents: z.number().int().nonnegative(),
  commission_rebate_rate: z.number().min(0).max(1),
  merchant_min_floor_cents: z.number().int().nonnegative(),
  negotiation_status: z.enum(['OPEN_BID', 'COUNTERED', 'ACCEPTED_AND_CAPTURED', 'EXPIRED']).default('OPEN_BID'),
  resulting_paypal_order_id: z.string().max(64).nullable().optional(),
  expires_at: z.date(),
  created_at: z.date().default(() => new Date()),
});

export const EscrowOrderSchema = z.object({
  id: z.string().uuid().optional(),
  paypal_order_id: z.string().max(64),
  paypal_request_id: z.string().max(64),
  mandate_id: z.string().max(32),
  gross_authorized_cents: z.number().int().nonnegative(),
  commission_rebate_cents: z.number().int().nonnegative().default(0),
  shipping_saved_cents: z.number().int().nonnegative().default(0),
  currency_code: z.string().length(3).default('USD'),
  server_readback_verified: z.boolean().default(false),
  order_status: z.enum(['AUTHORIZED', 'PRICE_DROP_CAPTURED', 'COMPLETED', 'VOIDED']),
  created_at: z.date().default(() => new Date()),
});

export const PurchaseUnitHoldSchema = z.object({
  id: z.string().uuid().optional(),
  escrow_order_id: z.string().uuid(),
  invoice_id: z.string().max(64),
  paypal_authorization_id: z.string().max(64).nullable().optional(),
  paypal_capture_id: z.string().max(64).nullable().optional(),
  paypal_tracking_number: z.string().max(64).nullable().optional(),
  channel3_product_id: z.string().max(64),
  channel3_cleaned_image_url: z.string().url(),
  merchant_domain: z.string().max(128),
  merchant_anomaly_score: z.number().min(0).max(1000),
  authorized_cents: z.number().int().nonnegative(),
  target_price_drop_cents: z.number().int().nonnegative(),
  final_captured_cents: z.number().int().nonnegative().nullable().optional(),
  honor_period_expires_at: z.date(),
  auth_valid_until: z.date(),
  hold_status: z.enum(['WATCHING_PRICE']).default('WATCHING_PRICE'),
  tax_cents: z.number().int().nonnegative().default(0),
  zip_code: z.string().max(10).nullable().optional(),
  stock_reservation_status: z.string().max(32).default('CONFIRMED'),
});

export const DisputeArbitrationSchema = z.object({
  paypal_dispute_id: z.string().trim().min(1, 'paypal_dispute_id is required').max(64),
  purchase_unit_id: z.string().uuid().nullable().optional(),
  dispute_reason: z.string().trim().max(64),
  dispute_state: z.string().trim().max(64),
  dispute_amount_cents: z.number({
    required_error: 'dispute_amount_cents is required',
    invalid_type_error: 'dispute_amount_cents must be an integer number',
  }).int('dispute_amount_cents must be an integer; floats are strictly rejected').nonnegative('dispute_amount_cents must be non-negative'),
  liability_score_l: z.number().min(0).max(1).finite(),
  abuse_risk_score_r: z.number().min(0).max(1).finite(),
  exif_tamper_flag: z.boolean().default(false),
  defect_bounding_box: z.array(z.number().finite()).length(4).nullable().optional(),
  hateoas_allowed_actions: z.array(z.string().trim()),
  selected_tier_action: z.enum(['TIER1_REFUND', 'TIER2_PARTIAL_OFFER', 'TIER3_RETURN_OFFER', 'TIER4_CONTEST_PDF', 'TIER5_SLA_ESCALATE']),
  seller_response_due_date: z.date(),
  assigned_analyst_id: z.string().trim().max(64).nullable().optional(),
  scheduled_review_start: z.date().nullable().optional(),
  scheduled_review_end: z.date().nullable().optional(),
  compiled_evidence_pdf_base64: z.string().nullable().optional(),
  return_tracking_id: z.string().trim().max(64).nullable().optional(),
  return_label_url: z.string().trim().nullable().optional(),
  updated_at: z.date().default(() => new Date()),
});

export const DisputeEvidenceSchema = z.object({
  paypal_dispute_id: z.string().trim().min(1, 'paypal_dispute_id is required').max(64),
  carrier_tracking_number: z.string().trim().max(128).optional(),
  policy_proof_text: z.string().trim().max(5000).optional(),
  vision_defect_mask: z.array(z.number().finite()).length(4).optional(), // [ymin, xmin, ymax, xmax]
  evidence_type: z.enum(['PROOF_OF_DELIVERY', 'PROOF_OF_REFUND', 'CUSTOM_POLICY', 'DAMAGE_INSPECTION', 'OTHER']).optional(),
  document_url: z.string().url().optional(),
  notes: z.string().trim().max(2000).optional(),
  submitted_at: z.union([z.date(), z.string().datetime()]).optional().transform(v => typeof v === 'string' ? new Date(v) : (v || new Date())),
});

export type DisputeEvidence = z.infer<typeof DisputeEvidenceSchema>;
export const SubmitDisputeEvidenceSchema = DisputeEvidenceSchema;
export type SubmitDisputeEvidence = DisputeEvidence;

export const ReturnLabelInfoSchema = z.object({
  label_url: z.string(),
  tracking_number: z.string(),
  carrier: z.string(),
  qr_code_base64: z.string(),
});

export const AutonomyDialModeSchema = z.enum(['COPILOT', 'SUPERVISED', 'AUTONOMOUS']);

export const DisputeAnalysisResultSchema = z.object({
  identity_match_score: z.number().min(0).max(1),
  defect_severity_score: z.number().min(0).max(1),
  defect_bounding_box: z.array(z.number()).length(4).nullable().optional(),
  liability_score_l: z.number().min(0).max(1),
  abuse_risk_score_r: z.number().min(0).max(1),
});

export const Channel3ItemSchema = z.object({
  product_id: z.string(),
  price: z.number(),
  compare_at_price: z.number(),
  max_commission_rate: z.number(),
  domain: z.string(),
  cleaned_url: z.string().url(),
  dimensions: z.object({
    weight: z.number().optional(),
  }).optional(),
});

export const PayPalOrderIntentSchema = z.enum(['AUTHORIZE', 'CAPTURE']);

export const ShoppingActionTypeSchema = z.enum(['DISCOVER', 'COMPARE', 'DETAILS', 'BUY']);

export const PrimaryBadgeSchema = z.object({
  tier: z.enum(['tier1', 'tier2', 'tier3', 'tier4', 'eliminated']),
  label: z.string(),
  color: z.string(),
  icon: z.string(),
  description: z.string(),
  trust_multiplier: z.number(),
  suspicious_override: z.boolean().default(false),
  original_tier: z.string().optional(),
});
export type PrimaryBadge = z.infer<typeof PrimaryBadgeSchema>;

export const ProductBadgeSchema = z.object({
  label: z.string(),
  color: z.string().optional().default('#06b6d4'),
  badge_color: z.string().optional(),
  badge_type: z.string().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
});
export type ProductBadge = z.infer<typeof ProductBadgeSchema>;

export const ProductVariantOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  price_cents: z.number().int().nonnegative().optional(),
  stock_status: z.enum(['IN_STOCK', 'OUT_OF_STOCK']).optional().default('IN_STOCK'),
  sku: z.string().optional(),
});
export type ProductVariantOption = z.infer<typeof ProductVariantOptionSchema>;

export const RecoveryPillActionSchema = z.enum([
  'ALTERNATIVE_PRODUCT',
  'ADJUST_BUDGET',
  'SWITCH_SHIPPING',
  'CUSTOM',
]);
export type RecoveryPillAction = z.infer<typeof RecoveryPillActionSchema>;

export const RecoveryPillSchema = z.object({
  id: z.string(),
  label: z.string(),
  action: RecoveryPillActionSchema,
  product_id: z.string().optional(),
  suggested_budget_cents: z.number().int().positive().optional(),
  shipping_type: z.string().optional(),
  message_prompt: z.string(),
});
export type RecoveryPill = z.infer<typeof RecoveryPillSchema>;

export const ProductCardDataSchema = z.object({
  product_id: z.string(),
  title: z.string(),
  description: z.string(),
  category_id: z.string(),
  price_cents: z.number().int().nonnegative(),
  compare_at_price_cents: z.number().int().nonnegative(),
  commission_rebate_cents: z.number().int().nonnegative().optional().default(0),
  commission_rate: z.number().min(0).max(1).optional().default(0),
  currency: z.string().default('USD').optional(),
  rating: z.number().min(0).max(5).optional().default(4.8),
  review_count: z.number().int().nonnegative().optional().default(120),
  shipping_fee_cents: z.number().int().nonnegative().optional().default(0),
  shipping_waiver_threshold_cents: z.number().int().nonnegative().optional(),
  free_shipping: z.boolean().optional().default(false),
  merchant_domain: z.string(),
  merchant_credibility_score: z.number().min(0).max(100).optional().default(95),
  stock_status: z.enum(['IN_STOCK', 'OUT_OF_STOCK']).optional().default('IN_STOCK'),
  delivery_window: z.string().optional().default('2-3 Business Days'),
  delivery_window_days: z.number().optional(),
  store_tier: z.string().optional(),
  composite_score: z.number().optional(),
  score_breakdown: z.record(z.string(), z.number()).optional(),
  image_url: z.string().optional(),
  cleaned_image_url: z.string().optional(),
  cleaned_url: z.string().optional(),
  specs: z.record(z.string(), z.string()).optional(),
  images: z.array(z.object({
    url: z.string(),
    cleaned_url: z.string(),
  })).optional(),
  primary_badge: PrimaryBadgeSchema.optional(),
  secondary_badges: z.array(ProductBadgeSchema).optional(),
  badges: z.array(ProductBadgeSchema).optional(),
  rating_verified: z.boolean().optional(),
  adjusted_rating: z.number().optional(),
  verdict: z.string().optional(),
  verdict_colour: z.string().optional(),
  variants: z.array(ProductVariantOptionSchema).optional(),
  selected_variant_id: z.string().optional(),
});

export const ComparisonMatrixRowSchema = z.object({
  attribute: z.string(),
  values: z.record(z.string(), z.string()), // map productId -> display value
  highlighted_product_id: z.string().optional(),
});

export const ComparisonMatrixSchema = z.object({
  product_ids: z.array(z.string()),
  products: z.array(ProductCardDataSchema),
  rows: z.array(ComparisonMatrixRowSchema),
  winner_product_id: z.string().optional(),
  rationale: z.string().optional(),
  battle_report: z.string().optional(),
});

export const ExplainableCartItemSchema = z.object({
  product_id: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
  unit_price_cents: z.number().int().nonnegative(),
  unit_compare_price_cents: z.number().int().nonnegative(),
  commission_rate: z.number().min(0).max(1),
  cleaned_url: z.string(),
});

export const ExplainableCartMerchantGroupSchema = z.object({
  merchant_domain: z.string(),
  items: z.array(ExplainableCartItemSchema),
  subtotal_cents: z.number().int().nonnegative(),
  commission_rebate_cents: z.number().int().nonnegative(),
  shipping_fee_cents: z.number().int().nonnegative(),
  shipping_waived: z.boolean(),
  merchant_anomaly_penalty_cents: z.number().int().nonnegative().default(0),
  tax_cents: z.number().int().nonnegative().default(0),
  tax_rate_bps: z.number().int().nonnegative().default(0),
  net_merchant_cents: z.number().int().nonnegative(),
  merchant_retail_authorized_cents: z.number().int().nonnegative(),
  platform_subsidy_cents: z.number().int().nonnegative(),
});

export const ExplainableCartPayloadSchema = z.object({
  assigned_merchants: z.array(ExplainableCartMerchantGroupSchema),
  gross_subtotal_cents: z.number().int().nonnegative(),
  total_commission_rebate_cents: z.number().int().nonnegative(),
  total_shipping_cents: z.number().int().nonnegative(),
  total_shipping_saved_cents: z.number().int().nonnegative(),
  total_tax_cents: z.number().int().nonnegative(),
  net_buyer_expenditure_cents: z.number().int().nonnegative(),
  total_merchant_authorized_cents: z.number().int().nonnegative().optional(),
  total_platform_subsidy_credit_cents: z.number().int().nonnegative().optional(),
  savings_percentage: z.number().min(0).max(100),
  is_within_budget: z.boolean(),
  budget_cap_cents: z.number().int().positive().optional(),
  overage_percentage: z.number().optional(),
  zip_code: z.string().optional(),
  paypal_purchase_units: z.array(z.any()).optional(),
});

export const ChatResponsePayloadSchema = z.object({
  action: ShoppingActionTypeSchema,
  markdown: z.string(),
  products: z.array(ProductCardDataSchema).optional(),
  comparison: ComparisonMatrixSchema.optional(),
  product_detail: ProductCardDataSchema.optional(),
  cart: ExplainableCartPayloadSchema.optional().or(z.any()), // KnapsackOptimizationResult / ExplainableCartPayload
  stock_reservation: z.any().optional(), // TwoPhaseStockReservationResult
  follow_up_suggestions: z.array(z.string()).optional(),
  thought_trace: z.array(z.string()).optional(),
  active_model: z.string().optional(),
  requires_human_confirmation: z.boolean().optional(),
  recovery_pills: z.array(RecoveryPillSchema).optional(),
});

/**
 * Upgrade B: Turn-Level Active Product Context & Multi-Product Binding Schemas
 * Derives from assistant_ui_agentic_chat_upgrade_plan.md Section 3.2
 */
export const ActiveTurnProductSchema = z.object({
  index: z.number().int().nonnegative(),
  product_id: z.string().min(1),
  title: z.string(),
  price_cents: z.number().int().nonnegative(),
  merchant_domain: z.string(),
  rating: z.number(),
  free_shipping: z.boolean(),
  specs: z.record(z.string()).optional(),
});

export const ChatMessageTurnSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  attached_products: z.array(ProductCardDataSchema).optional(),
  focused_product_id: z.string().optional(),
  selected_product_ids: z.array(z.string()).optional(),
  timestamp: z.string(),
  action: ShoppingActionTypeSchema.optional(),
  products: z.array(ProductCardDataSchema).optional(),
  comparison: ComparisonMatrixSchema.optional(),
  product_detail: ProductCardDataSchema.optional(),
  cart: z.any().optional(),
  stock_reservation: z.any().optional(),
  thought_trace: z.array(z.string()).optional(),
  follow_up_suggestions: z.array(z.string()).optional(),
  recovery_pills: z.array(RecoveryPillSchema).optional(),
});

export const ConversationalChatPayloadSchema = z.object({
  session_id: z.string(),
  message: z.string(),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  selected_product_ids: z.array(z.string()).optional(),
  active_turn_products: z.array(ActiveTurnProductSchema).optional(),
  budget_cap_cents: z.number().int().positive().optional(),
  zip_code: z.string().optional(),
  action: ShoppingActionTypeSchema.optional(),
  product_ids: z.array(z.string()).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  user_api_key: z.string().max(256).optional(),
  allowed_category_ids: z.array(z.string()).optional(),
  allowed_merchants: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
});

/**
 * Phase 1 / Upgrade D: Mastra 4-Tool Suite & Fastify Data Stream Protocol Contracts
 * Derives from assistant_ui_agentic_chat_upgrade_plan.md Section 3.3 & Section 3.4
 */

export const FilterTurnProductsInputSchema = z.object({
  criteria: z.string().optional().describe('Filter criteria keyword or intent'),
  max_price_usd: z.number().positive().optional().describe('Maximum budget ceiling in USD'),
  top_n: z.number().int().positive().optional().describe('Number of items to keep'),
  sort_by: z.enum(['price_asc', 'rating_desc', 'trust_desc']).optional(),
  active_turn_products: z.array(ActiveTurnProductSchema).optional(),
});
export type FilterTurnProductsInput = z.infer<typeof FilterTurnProductsInputSchema>;

export const FilterTurnProductsOutputSchema = z.object({
  products: z.array(ProductCardDataSchema),
  filtered_count: z.number().int().nonnegative(),
  applied_criteria: z.string().optional(),
});
export type FilterTurnProductsOutput = z.infer<typeof FilterTurnProductsOutputSchema>;

export const CompareProductsInputSchema = z.object({
  product_ids: z.array(z.string()).min(1),
  active_turn_products: z.array(ActiveTurnProductSchema).optional(),
});
export type CompareProductsInput = z.infer<typeof CompareProductsInputSchema>;

export const CompareProductsOutputSchema = z.object({
  comparison: ComparisonMatrixSchema,
  products: z.array(ProductCardDataSchema),
  winner_product_id: z.string().optional(),
});
export type CompareProductsOutput = z.infer<typeof CompareProductsOutputSchema>;

export const PrepareCheckoutInputSchema = z.object({
  product_id: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(5).default(1),
  budget_cap_cents: z.number().int().positive().optional(),
  zip_code: z.string().optional(),
});
export type PrepareCheckoutInput = z.infer<typeof PrepareCheckoutInputSchema>;

export const PrepareCheckoutOutputSchema = z.object({
  all_held: z.boolean(),
  reservation_id: z.string(),
  product: ProductCardDataSchema.optional(),
  cart: ExplainableCartPayloadSchema.optional(),
  total_expenditure_cents: z.number().int().nonnegative(),
  hitl_required: z.boolean(),
  requires_approval: z.boolean(),
  recovery_pills: z.array(RecoveryPillSchema).optional(),
});
export type PrepareCheckoutOutput = z.infer<typeof PrepareCheckoutOutputSchema>;

export const SearchCatalogInputSchema = z.object({
  query: z.string(),
  category: z.string().optional(),
  max_price_usd: z.number().positive().optional(),
  limit: z.number().int().positive().optional().default(50),
});
export type SearchCatalogInput = z.infer<typeof SearchCatalogInputSchema>;

export const SearchCatalogOutputSchema = z.object({
  products: z.array(ProductCardDataSchema),
  total_found: z.number().int().nonnegative(),
});
export type SearchCatalogOutput = z.infer<typeof SearchCatalogOutputSchema>;

export const DataStreamFrameSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    delta: z.string(),
  }),
  z.object({
    type: z.literal('tool_call'),
    toolCallId: z.string(),
    toolName: z.string(),
    args: z.any(),
  }),
  z.object({
    type: z.literal('tool_result'),
    toolCallId: z.string(),
    result: z.any(),
  }),
  z.object({
    type: z.literal('finish'),
    finishReason: z.string().default('stop'),
    usage: z
      .object({
        promptTokens: z.number().default(0),
        completionTokens: z.number().default(0),
      })
      .optional(),
  }),
  z.object({
    type: z.literal('error'),
    error: z.string(),
  }),
]);
export type DataStreamFrame = z.infer<typeof DataStreamFrameSchema>;

export function formatDataStreamText(delta: string): string {
  return `0:${JSON.stringify(delta)}\n`;
}

export function formatDataStreamToolCall(toolCallId: string, toolName: string, args: any): string {
  return `9:${JSON.stringify({ toolCallId, toolName, args })}\n`;
}

export function formatDataStreamToolResult(toolCallId: string, result: any): string {
  return `a:${JSON.stringify({ toolCallId, result })}\n`;
}

export function formatDataStreamFinish(
  finishReason = 'stop',
  usage = { promptTokens: 0, completionTokens: 0 }
): string {
  return `d:${JSON.stringify({ finishReason, usage })}\n`;
}

export function formatDataStreamError(error: string): string {
  return `3:${JSON.stringify(error)}\n`;
}

export type SpendMandate = z.infer<typeof SpendMandateSchema>;
export type SessionMandate = z.infer<typeof SessionMandateSchema>;
export type SyntheticIntentVoucher = z.infer<typeof SyntheticIntentVoucherSchema>;
export type EscrowOrder = z.infer<typeof EscrowOrderSchema>;
export type PurchaseUnitHold = z.infer<typeof PurchaseUnitHoldSchema>;
export type DisputeArbitration = z.infer<typeof DisputeArbitrationSchema>;
export type ReturnLabelInfo = z.infer<typeof ReturnLabelInfoSchema>;
export type AutonomyDialMode = z.infer<typeof AutonomyDialModeSchema>;
export type DisputeAnalysisResult = z.infer<typeof DisputeAnalysisResultSchema>;
export type Channel3Item = z.infer<typeof Channel3ItemSchema>;
export type PayPalOrderIntent = z.infer<typeof PayPalOrderIntentSchema>;
export type ShoppingActionType = z.infer<typeof ShoppingActionTypeSchema>;
export type ProductCardData = z.infer<typeof ProductCardDataSchema>;
export type ComparisonMatrixRow = z.infer<typeof ComparisonMatrixRowSchema>;
export type ComparisonMatrix = z.infer<typeof ComparisonMatrixSchema>;
export type ExplainableCartItem = z.infer<typeof ExplainableCartItemSchema>;
export type ExplainableCartMerchantGroup = z.infer<typeof ExplainableCartMerchantGroupSchema>;
export type ExplainableCartPayload = z.infer<typeof ExplainableCartPayloadSchema>;
export type ChatResponsePayload = z.infer<typeof ChatResponsePayloadSchema>;
export type ActiveTurnProduct = z.infer<typeof ActiveTurnProductSchema>;
export type ChatMessageTurn = z.infer<typeof ChatMessageTurnSchema>;
export type ConversationalChatPayload = z.infer<typeof ConversationalChatPayloadSchema>;

/**
 * Custodian Reason Codes and Violation Taxonomies
 * Derived from AP2 Intent Mandates and Custodian Gate verification architecture
 */
export const CustodianReasonCodeSchema = z.enum([
  // Price Integrity
  'PRICE_MATCHES_CATALOG',
  'PRICE_MISMATCH',
  'ITEM_NOT_IN_CATALOG',
  'ITEM_OUT_OF_STOCK',
  'SNAPSHOT_STALE',
  'LINE_ITEM_SUM_MISMATCH',

  // Budget
  'BUDGET_SATISFIED',
  'BUDGET_EXCEEDED',
  'BUDGET_UNSET',
  'UNIT_PRICE_CEILING_EXCEEDED',
  'INVALID_SPEND_AMOUNT',

  // Merchant Scope & Anomaly
  'MERCHANT_IN_SCOPE',
  'MERCHANT_OUT_OF_SCOPE',
  'MERCHANT_UNNAMED_BY_HUMAN',
  'MERCHANT_ANOMALY_THRESHOLD_EXCEEDED',

  // Category Scope
  'CATEGORY_IN_SCOPE',
  'CATEGORY_OUT_OF_SCOPE',

  // Mandate & Cryptographic Authority
  'MANDATE_SATISFIED',
  'MANDATE_TOTAL_EXCEEDED',
  'MANDATE_PER_TXN_EXCEEDED',
  'MANDATE_EXPIRED',
  'MANDATE_NOT_YET_VALID',
  'MANDATE_REVOKED',
  'MANDATE_MERCHANT_NOT_ALLOWED',
  'MANDATE_CATEGORY_NOT_ALLOWED',
  'MANDATE_CURRENCY_MISMATCH',
  'MANDATE_NOT_FOUND',
  'ED25519_SIGNATURE_VERIFICATION_FAILED',
  'MANDATE_UNSIGNED_OR_TAMPERED',

  // Hard constraints
  'HARD_CONSTRAINT_VIOLATED'
]);

export type CustodianReasonCode = z.infer<typeof CustodianReasonCodeSchema>;

export const CUSTODIAN_REASON_CODES = CustodianReasonCodeSchema.options;

export const CUSTODIAN_BLOCKING_REASON_CODES: readonly CustodianReasonCode[] = [
  'PRICE_MISMATCH',
  'ITEM_NOT_IN_CATALOG',
  'ITEM_OUT_OF_STOCK',
  'LINE_ITEM_SUM_MISMATCH',
  'BUDGET_EXCEEDED',
  'UNIT_PRICE_CEILING_EXCEEDED',
  'INVALID_SPEND_AMOUNT',
  'MERCHANT_OUT_OF_SCOPE',
  'MERCHANT_ANOMALY_THRESHOLD_EXCEEDED',
  'CATEGORY_OUT_OF_SCOPE',
  'MANDATE_TOTAL_EXCEEDED',
  'MANDATE_PER_TXN_EXCEEDED',
  'MANDATE_EXPIRED',
  'MANDATE_NOT_YET_VALID',
  'MANDATE_REVOKED',
  'MANDATE_MERCHANT_NOT_ALLOWED',
  'MANDATE_CATEGORY_NOT_ALLOWED',
  'MANDATE_CURRENCY_MISMATCH',
  'MANDATE_NOT_FOUND',
  'ED25519_SIGNATURE_VERIFICATION_FAILED',
  'MANDATE_UNSIGNED_OR_TAMPERED',
  'HARD_CONSTRAINT_VIOLATED',
] as const;

export function isBlockingReasonCode(code: CustodianReasonCode): boolean {
  return (CUSTODIAN_BLOCKING_REASON_CODES as readonly string[]).includes(code);
}

export const CustodianViolationTaxonomySchema = z.object({
  code: CustodianReasonCodeSchema,
  message: z.string(),
  stage: z.enum(['STAGE_1_SCHEMA', 'STAGE_2_CRYPTOGRAPHIC', 'STAGE_3_MERCHANT_ANOMALY', 'STAGE_4_REDIS_LUA_PRE_RESERVATION']),
  is_blocking: z.boolean().default(true),
  observed_value: z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.any()), z.array(z.any()), z.null()]).optional(),
  expected_ceiling: z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.any()), z.array(z.any()), z.null()]).optional(),
});

export type CustodianViolationTaxonomy = z.infer<typeof CustodianViolationTaxonomySchema>;
export const ViolationTaxonomySchema = CustodianViolationTaxonomySchema;
export type ViolationTaxonomy = CustodianViolationTaxonomy;

export const CUSTODIAN_TAXONOMY_REGISTRY: Record<CustodianReasonCode, CustodianViolationTaxonomy> = {
  PRICE_MATCHES_CATALOG: {
    code: 'PRICE_MATCHES_CATALOG',
    message: 'Every price quoted by the agent matches the verified catalog.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: false,
  },
  PRICE_MISMATCH: {
    code: 'PRICE_MISMATCH',
    message: 'The agent quoted a price the catalog does not have.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: true,
  },
  ITEM_NOT_IN_CATALOG: {
    code: 'ITEM_NOT_IN_CATALOG',
    message: 'The cart contains an item this catalog does not sell.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: true,
  },
  ITEM_OUT_OF_STOCK: {
    code: 'ITEM_OUT_OF_STOCK',
    message: 'The cart contains an item that is out of stock.',
    stage: 'STAGE_4_REDIS_LUA_PRE_RESERVATION',
    is_blocking: true,
  },
  SNAPSHOT_STALE: {
    code: 'SNAPSHOT_STALE',
    message: 'The catalog snapshot is older than this decision allows.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: false,
  },
  LINE_ITEM_SUM_MISMATCH: {
    code: 'LINE_ITEM_SUM_MISMATCH',
    message: 'Sum of item prices does not equal the claimed subtotal.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: true,
  },
  BUDGET_SATISFIED: {
    code: 'BUDGET_SATISFIED',
    message: 'The verified total is within the stated budget ceiling.',
    stage: 'STAGE_4_REDIS_LUA_PRE_RESERVATION',
    is_blocking: false,
  },
  BUDGET_EXCEEDED: {
    code: 'BUDGET_EXCEEDED',
    message: 'The verified total exceeds the stated budget ceiling.',
    stage: 'STAGE_4_REDIS_LUA_PRE_RESERVATION',
    is_blocking: true,
  },
  BUDGET_UNSET: {
    code: 'BUDGET_UNSET',
    message: 'No budget was stated; the mandate caps govern instead.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: false,
  },
  UNIT_PRICE_CEILING_EXCEEDED: {
    code: 'UNIT_PRICE_CEILING_EXCEEDED',
    message: 'An item costs more per unit than was allowed for it.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: true,
  },
  INVALID_SPEND_AMOUNT: {
    code: 'INVALID_SPEND_AMOUNT',
    message: 'Spend amount is non-integer, negative, or invalid.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: true,
  },
  MERCHANT_IN_SCOPE: {
    code: 'MERCHANT_IN_SCOPE',
    message: 'The merchant is one the human named in scope.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: false,
  },
  MERCHANT_OUT_OF_SCOPE: {
    code: 'MERCHANT_OUT_OF_SCOPE',
    message: 'The purchase is from a merchant outside the permitted scope.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: true,
  },
  MERCHANT_UNNAMED_BY_HUMAN: {
    code: 'MERCHANT_UNNAMED_BY_HUMAN',
    message: 'No merchant named by human; mandate allowlist applies.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: false,
  },
  MERCHANT_ANOMALY_THRESHOLD_EXCEEDED: {
    code: 'MERCHANT_ANOMALY_THRESHOLD_EXCEEDED',
    message: 'Merchant anomaly risk score exceeds the allowed threshold.',
    stage: 'STAGE_3_MERCHANT_ANOMALY',
    is_blocking: true,
  },
  CATEGORY_IN_SCOPE: {
    code: 'CATEGORY_IN_SCOPE',
    message: 'Every item falls in a category the human authorized.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: false,
  },
  CATEGORY_OUT_OF_SCOPE: {
    code: 'CATEGORY_OUT_OF_SCOPE',
    message: 'An item falls outside authorized merchandise categories.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: true,
  },
  MANDATE_SATISFIED: {
    code: 'MANDATE_SATISFIED',
    message: 'The spend is inside the authorized payment mandate.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: false,
  },
  MANDATE_TOTAL_EXCEEDED: {
    code: 'MANDATE_TOTAL_EXCEEDED',
    message: 'The spend exceeds the mandate lifetime ceiling.',
    stage: 'STAGE_4_REDIS_LUA_PRE_RESERVATION',
    is_blocking: true,
  },
  MANDATE_PER_TXN_EXCEEDED: {
    code: 'MANDATE_PER_TXN_EXCEEDED',
    message: 'The spend exceeds the mandate per-transaction cap.',
    stage: 'STAGE_4_REDIS_LUA_PRE_RESERVATION',
    is_blocking: true,
  },
  MANDATE_EXPIRED: {
    code: 'MANDATE_EXPIRED',
    message: 'The payment mandate has expired.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: true,
  },
  MANDATE_NOT_YET_VALID: {
    code: 'MANDATE_NOT_YET_VALID',
    message: 'The payment mandate is not valid yet.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: true,
  },
  MANDATE_REVOKED: {
    code: 'MANDATE_REVOKED',
    message: 'The payment mandate has been revoked by the owner.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: true,
  },
  MANDATE_MERCHANT_NOT_ALLOWED: {
    code: 'MANDATE_MERCHANT_NOT_ALLOWED',
    message: 'The mandate does not authorize payment to this merchant.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: true,
  },
  MANDATE_CATEGORY_NOT_ALLOWED: {
    code: 'MANDATE_CATEGORY_NOT_ALLOWED',
    message: 'The mandate does not cover this category of spending.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: true,
  },
  MANDATE_CURRENCY_MISMATCH: {
    code: 'MANDATE_CURRENCY_MISMATCH',
    message: 'The mandate is denominated in a different currency.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: true,
  },
  MANDATE_NOT_FOUND: {
    code: 'MANDATE_NOT_FOUND',
    message: 'The referenced spend mandate could not be found.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: true,
  },
  ED25519_SIGNATURE_VERIFICATION_FAILED: {
    code: 'ED25519_SIGNATURE_VERIFICATION_FAILED',
    message: 'Ed25519 cryptographic signature verification failed.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: true,
  },
  MANDATE_UNSIGNED_OR_TAMPERED: {
    code: 'MANDATE_UNSIGNED_OR_TAMPERED',
    message: 'The mandate payload is unsigned or has been tampered with.',
    stage: 'STAGE_2_CRYPTOGRAPHIC',
    is_blocking: true,
  },
  HARD_CONSTRAINT_VIOLATED: {
    code: 'HARD_CONSTRAINT_VIOLATED',
    message: 'A non-negotiable hard constraint was violated.',
    stage: 'STAGE_1_SCHEMA',
    is_blocking: true,
  },
};

/**
 * Custodian AP2 Policy Evaluation Verdict Schema
 * Models multi-dimensional decision gates, basis-point alignment scores, and reason codes
 */
export const PolicyEvaluationVerdictSchema = z.object({
  mandate_id: z.string(),
  outcome: z.enum(['APPROVE', 'HOLD', 'REJECT']),
  decision_id: z.string(),
  total_score_bp: BasisPointsSchema, // float-rejected integer basis points
  reasons: z.array(CustodianReasonCodeSchema),
  dimensions: z.array(z.object({
    dimension: z.enum([
      'PRICE_INTEGRITY',
      'BUDGET',
      'MERCHANT_SCOPE',
      'CATEGORY_SCOPE',
      'MANDATE',
      'SUBSTITUTION',
      'SCOPE_CREEP',
      'SANITIZATION'
    ]),
    status: z.enum(['PASS', 'FAIL', 'UNCERTAIN']),
    score_bp: BasisPointsSchema, // float-rejected integer basis points
    reason_codes: z.array(CustodianReasonCodeSchema).min(1, 'Dimension must provide at least one reason code'),
  })),
  verified_total_cents: CentsSchema.optional(),
  verified_total_paise: CentsSchema.optional(),
  bindings: z.array(z.object({
    cart_line_id: z.string(),
    requested_line_id: z.string().nullable().optional(),
    kind: z.enum(['EXACT', 'SUBSTITUTION', 'BUNDLE_MEMBER', 'UNBOUND']),
    score_bp: BasisPointsSchema,
    reason_codes: z.array(CustodianReasonCodeSchema).optional().default([]),
  })).optional(),
  snapshot_digest: z.string().length(64).optional(),
  thresholds_version: z.string().optional(),
  thresholds_digest: z.string().length(64).optional(),
  escalated_line_ids: z.array(z.string()).optional(),
  disposition_codes: z.array(CustodianReasonCodeSchema).optional(),
  audit_hash: z.string().length(64).optional(),
  evaluated_at: z.union([z.date(), z.string().datetime()]).transform(v => typeof v === 'string' ? new Date(v) : v),
}).refine(
  (data) => {
    // Invariant: An APPROVE outcome cannot contain any blocking violation codes
    if (data.outcome === 'APPROVE') {
      const allReasons = [
        ...data.reasons,
        ...data.dimensions.flatMap((d) => d.reason_codes),
        ...(data.disposition_codes || []),
      ];
      return !allReasons.some((r) => CUSTODIAN_BLOCKING_REASON_CODES.includes(r));
    }
    return true;
  },
  {
    message: 'An APPROVE outcome cannot contain blocking violation reason codes',
  }
);

export type PolicyEvaluationVerdict = z.infer<typeof PolicyEvaluationVerdictSchema>;

/**
 * CustodianVerdictSchema: Exported alongside PolicyEvaluationVerdictSchema
 * Canonical representation of Custodian multi-dimensional alignment decision gate.
 */
export const CustodianVerdictSchema = PolicyEvaluationVerdictSchema;
export type CustodianVerdict = z.infer<typeof CustodianVerdictSchema>;

/**
 * Agentic Commerce Protocol (ACP) Interoperability Schemas
 * RFC-compliant checkout sessions, carts, discount extensions, and payment delegates
 */
export const AcpDiscountExtensionSchema = z.object({
  code: z.string().optional(),
  title: z.string().optional(),
  amount_cents: z.number().int().nonnegative(),
  type: z.enum(['coupon', 'promo', 'commission_rebate', 'voucher']).default('coupon'),
  applied_to: z.enum(['order', 'item', 'shipping']).default('order'),
  item_id: z.string().optional(),
});

export type AcpDiscountExtension = z.infer<typeof AcpDiscountExtensionSchema>;

export const AcpCartItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
  unit_price_cents: z.number().int().nonnegative(),
  total_price_cents: z.number().int().nonnegative(),
  currency: z.string().default('USD'),
  merchant_id: z.string().optional(),
  merchant_domain: z.string().optional(),
  image_url: z.string().url().optional(),
  discounts: z.array(AcpDiscountExtensionSchema).optional().default([]),
});

export type AcpCartItem = z.infer<typeof AcpCartItemSchema>;

export const AcpCartPayloadSchema = z.object({
  cart_id: z.string(),
  items: z.array(AcpCartItemSchema).min(1, 'Cart items array must not be empty'),
  currency: z.string().default('USD'),
  subtotal_cents: z.number().int().nonnegative(),
  tax_cents: z.number().int().nonnegative().default(0),
  shipping_cents: z.number().int().nonnegative().default(0),
  discount_cents: z.number().int().nonnegative().default(0),
  total_cents: z.number().int().nonnegative(),
  discounts: z.array(AcpDiscountExtensionSchema).optional().default([]),
}).refine(
  (cart) => {
    const calculatedSum = cart.items.reduce((sum, it) => sum + it.total_price_cents, 0);
    return Math.abs(cart.subtotal_cents - calculatedSum) === 0;
  },
  {
    message: 'Cart subtotal_cents must equal sum of item total_price_cents',
  }
);

export type AcpCartPayload = z.infer<typeof AcpCartPayloadSchema>;

export const AcpAddressSchema = z.object({
  name: z.string().optional(),
  line_one: z.string(),
  line_two: z.string().optional().default(''),
  city: z.string(),
  state: z.string(),
  country: z.string().length(2).default('US'),
  postal_code: z.string(),
});

export type AcpAddress = z.infer<typeof AcpAddressSchema>;

export const AcpCheckoutSessionSchema = z.object({
  id: z.string(),
  status: z.enum(['created', 'in_progress', 'ready_for_payment', 'not_ready_for_payment', 'completed', 'canceled']).default('created'),
  cart: AcpCartPayloadSchema,
  shipping_address: AcpAddressSchema.optional(),
  billing_address: AcpAddressSchema.optional(),
  buyer_email: z.string().email().optional(),
  buyer_mandate_id: z.string().optional(),
  expires_at: z.union([z.date(), z.string().datetime()]).transform(v => typeof v === 'string' ? new Date(v) : v),
  created_at: z.union([z.date(), z.string().datetime()]).optional().transform(v => typeof v === 'string' ? new Date(v) : (v || new Date())),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export type AcpCheckoutSession = z.infer<typeof AcpCheckoutSessionSchema>;

export const AcpPaymentHandlerRequestSchema = z.object({
  checkout_session_id: z.string(),
  mandate_id: z.string().optional(),
  payment_method: z.object({
    type: z.enum(['vault_token', 'card', 'ed25519_mandate', 'paypal_wallet']),
    token: z.string().optional(),
    mandate_signature: z.string().optional(),
    public_key_hex: z.string().optional(),
  }),
  amount_cents: z.number().int().positive(),
  currency: z.string().default('USD'),
  merchant_domain: z.string(),
  risk_signals: z.array(z.object({
    type: z.string(),
    score: z.number().int(),
    action: z.enum(['blocked', 'manual_review', 'authorized']),
  })).optional().default([]),
  metadata: z.record(z.string(), z.string()).optional().default({}),
});

export type AcpPaymentHandlerRequest = z.infer<typeof AcpPaymentHandlerRequestSchema>;

export const AcpPaymentHandlerResponseSchema = z.object({
  payment_id: z.string(),
  status: z.enum(['AUTHORIZED', 'CAPTURED', 'DECLINED', 'REQUIRES_ACTION']),
  amount_cents: z.number().int().positive(),
  currency: z.string().default('USD'),
  transaction_reference: z.string(),
  paypal_order_id: z.string().optional(),
  challenge_url: z.string().url().optional(),
  error_code: z.string().optional(),
  created_at: z.union([z.date(), z.string().datetime()]).transform(v => typeof v === 'string' ? new Date(v) : v),
});

export type AcpPaymentHandlerResponse = z.infer<typeof AcpPaymentHandlerResponseSchema>;

/**
 * x402 Core Protocol Schemas
 * Standardized HTTP 402 payment requirements, contracts, and cryptographic receipts
 * Matching x402 payment specifications (v2) and AegisPay autonomous execution
 */
export const X402ResourceInfoSchema = z.object({
  url: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  serviceName: z.string().optional(),
  tags: z.array(z.string()).optional(),
  iconUrl: z.string().optional(),
});

export type X402ResourceInfo = z.infer<typeof X402ResourceInfoSchema>;

export const X402PaymentRequirementsSchema = z.object({
  scheme: z.string().default('exact'),
  network: z.string().default('paypal-sandbox'),
  asset: z.string().default('USD'),
  amount: z.union([z.string(), z.number()]),
  payTo: z.string(),
  maxTimeoutSeconds: z.number().int().positive().default(86400),
  extra: z.record(z.string(), z.any()).optional().default({}),
});

export type X402PaymentRequirements = z.infer<typeof X402PaymentRequirementsSchema>;

export const X402SpendPolicySchema = z.object({
  currency: z.string().default('USD'),
  mandate_protocol: z.string().default('Ed25519-SessionMandate-v1'),
  atomic_settlement: z.string().default('REDIS_LUA_PRE_RESERVED'),
  max_allowed_spend_cents: z.number().int().positive().optional(),
});

export type X402SpendPolicy = z.infer<typeof X402SpendPolicySchema>;

export const X402PaymentContractSchema = z.object({
  x402Version: z.number().int().default(2),
  error: z.string().optional(),
  payment_contract_id: z.string().optional(),
  pay_to: z.string().optional(),
  resource: X402ResourceInfoSchema.optional(),
  accepts: z.array(X402PaymentRequirementsSchema).optional().default([]),
  vault_setup_url: z.string().optional(),
  accepted_headers: z.array(z.string()).optional(),
  spend_policy: X402SpendPolicySchema.optional(),
  extensions: z.record(z.string(), z.any()).optional().default({}),
  created_at: z.union([z.date(), z.string().datetime()]).optional().transform(v => typeof v === 'string' ? new Date(v) : (v || new Date())),
});

export type X402PaymentContract = z.infer<typeof X402PaymentContractSchema>;

/**
 * x402 Challenge Response Schema (HTTP 402 Payment Required)
 * Interoperable with RFC/L402 challenge response payload specifications
 */
export const X402ChallengeResponseSchema = z.object({
  status: z.literal(402).default(402),
  message: z.string().default('Payment Required'),
  contract: X402PaymentContractSchema,
  pay_to: z.string().optional(),
  payment_contract_id: z.string().optional(),
  challenge_token: z.string().optional(),
});

export type X402ChallengeResponse = z.infer<typeof X402ChallengeResponseSchema>;

export const X402PaymentReceiptSchema = z.object({
  contractId: z.string().trim().min(1, 'contractId is required').max(128),
  amountCents: z.number({
    required_error: 'amountCents is required',
    invalid_type_error: 'amountCents must be an integer number',
  }).int('amountCents must be an integer; floats are strictly rejected').nonnegative('amountCents must be non-negative'),
  currency: z.string().trim().length(3, 'currency must be 3 characters').toUpperCase().default('USD'),
  timestamp: z.number({
    required_error: 'timestamp is required',
    invalid_type_error: 'timestamp must be a number',
  }).int('timestamp must be an integer').positive('timestamp must be positive'),
  hmac: z.string().trim().min(32, 'HMAC must be at least 32 characters').max(256),
  receipt_token: z.string().trim().optional(),
  x402Version: z.number().int().default(2).optional(),
});

export type X402PaymentReceipt = z.infer<typeof X402PaymentReceiptSchema>;

export const PaymentReceiptSchema = X402PaymentReceiptSchema;
export type PaymentReceipt = X402PaymentReceipt;


// ============================================================================
// Google A2A x402 Payments Protocol Extension (RFC / Parity Specification)
// ============================================================================

/**
 * Extension URIs for Agent-to-Agent (A2A) protocol x402 integration
 */
export const X402_EXTENSION_URI_V1 = "https://github.com/google-a2a/a2a-x402/v0.1";
export const X402_EXTENSION_URI_V2 = "https://github.com/google-agentic-commerce/a2a-x402/blob/main/spec/v0.2";
export const X402_EXTENSION_URI = X402_EXTENSION_URI_V2;

export const HEADER_X_A2A_EXTENSIONS = "X-A2A-Extensions";
export const HEADER_X_A2A_VERSION = "X-A2A-Version";

/**
 * Standard metadata keys per A2A x402 payment extension specification
 */
export const X402_METADATA_KEYS = {
  STATUS_KEY: "x402.payment.status",
  REQUIRED_KEY: "x402.payment.required",
  PAYLOAD_KEY: "x402.payment.payload",
  RECEIPTS_KEY: "x402.payment.receipts",
  ERROR_KEY: "x402.payment.error",
} as const;

/**
 * A2A Task State Enum
 */
export const A2ATaskStateSchema = z.enum([
  "submitted",
  "working",
  "input-required",
  "completed",
  "failed",
  "canceled",
]);

export type A2ATaskState = z.infer<typeof A2ATaskStateSchema>;

/**
 * A2A Payment Lifecycle Status Enum
 */
export const A2APaymentStatusSchema = z.enum([
  "payment-required",
  "payment-submitted",
  "payment-verified",
  "payment-completed",
  "payment-failed",
  "payment-rejected",
]);

export type A2APaymentStatus = z.infer<typeof A2APaymentStatusSchema>;

/**
 * Standard x402 Error Codes taxonomy
 */
export const X402ErrorCode = {
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  EXPIRED_PAYMENT: "EXPIRED_PAYMENT",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  NETWORK_MISMATCH: "NETWORK_MISMATCH",
  ASSET_MISMATCH: "ASSET_MISMATCH",
  AMOUNT_MISMATCH: "AMOUNT_MISMATCH",
  RECIPIENT_MISMATCH: "RECIPIENT_MISMATCH",
  FACILITATOR_ERROR: "FACILITATOR_ERROR",
  SETTLEMENT_FAILED: "SETTLEMENT_FAILED",
  UNEXPECTED_ERROR: "UNEXPECTED_ERROR",
} as const;

export type X402ErrorCodeType = (typeof X402ErrorCode)[keyof typeof X402ErrorCode];

/**
 * Custom Error classes matching reference python/x402_a2a/types/errors.py
 */
export class X402Error extends Error {
  public code: string;
  constructor(message: string, code: string = X402ErrorCode.UNEXPECTED_ERROR) {
    super(message);
    this.name = "X402Error";
    this.code = code;
  }
}

export class X402PaymentRequiredException extends X402Error {
  public paymentRequirements: any[];
  constructor(message: string = "Payment is required for this service", paymentRequirements: any[] = []) {
    super(message, "PAYMENT_REQUIRED");
    this.name = "X402PaymentRequiredException";
    this.paymentRequirements = paymentRequirements;
  }

  static forService(params: {
    price: string | number;
    payToAddress: string;
    resource?: string;
    network?: string;
    description?: string;
    message?: string;
    mimeType?: string;
  }): X402PaymentRequiredException {
    const amountStr = typeof params.price === "string" ? params.price.replace(/^\$/, "") : params.price.toString();
    const req = {
      scheme: "exact",
      network: params.network || "base",
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      payTo: params.payToAddress,
      maxAmountRequired: amountStr,
      resource: params.resource || "/service",
      description: params.description || "Payment required for service",
      mimeType: params.mimeType || "application/json",
      maxTimeoutSeconds: 600,
    };
    return new X402PaymentRequiredException(
      params.message || params.description || "Payment required for service",
      [req]
    );
  }
}

/**
 * EIP-712 Domain and EIP-3009 TransferWithAuthorization Typed Data Schemas
 */
export const EIP712DomainSchema = z.object({
  name: z.string(),
  version: z.string(),
  chainId: z.number().int(),
  verifyingContract: z.string(),
});

export type EIP712Domain = z.infer<typeof EIP712DomainSchema>;

export const EIP3009AuthorizationSchema = z.object({
  from: z.string(),
  to: z.string(),
  value: z.union([z.string(), z.number()]),
  validAfter: z.union([z.string(), z.number()]).optional(),
  valid_after: z.union([z.string(), z.number()]).optional(),
  validBefore: z.union([z.string(), z.number()]).optional(),
  valid_before: z.union([z.string(), z.number()]).optional(),
  nonce: z.string(),
});

export type EIP3009Authorization = z.infer<typeof EIP3009AuthorizationSchema>;

export const ExactPaymentPayloadSchema = z.object({
  signature: z.string(),
  authorization: EIP3009AuthorizationSchema,
});

export type ExactPaymentPayload = z.infer<typeof ExactPaymentPayloadSchema>;

export const X402PaymentPayloadSchema = z.object({
  x402Version: z.number().int().default(2),
  scheme: z.string().default("exact"),
  network: z.string(),
  payload: z.union([ExactPaymentPayloadSchema, z.record(z.string(), z.any())]),
});

export type X402PaymentPayload = z.infer<typeof X402PaymentPayloadSchema>;

export const X402VerifyResponseSchema = z.object({
  is_valid: z.boolean(),
  invalid_reason: z.string().optional(),
});

export type X402VerifyResponse = z.infer<typeof X402VerifyResponseSchema>;

export const X402SettleResponseSchema = z.object({
  success: z.boolean(),
  transaction: z.string().optional(),
  network: z.string().optional(),
  payer: z.string().optional(),
  error_reason: z.string().optional(),
});

export type X402SettleResponse = z.infer<typeof X402SettleResponseSchema>;

/**
 * A2A AgentCard and Capabilities Schemas
 */
export const A2AExtensionDeclarationSchema = z.object({
  uri: z.string(),
  description: z.string().default("Supports x402 payments"),
  required: z.boolean().default(true),
});

export type A2AExtensionDeclaration = z.infer<typeof A2AExtensionDeclarationSchema>;

export const A2ACapabilitiesSchema = z.object({
  streaming: z.boolean().default(true),
  extensions: z.array(A2AExtensionDeclarationSchema).default([]),
});

export type A2ACapabilities = z.infer<typeof A2ACapabilitiesSchema>;

export const A2ASkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()).optional(),
});

export type A2ASkill = z.infer<typeof A2ASkillSchema>;

export const A2AAgentCardSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string(),
  version: z.string().default("1.0.0"),
  default_input_modes: z.array(z.string()).default(["text", "text/plain"]),
  default_output_modes: z.array(z.string()).default(["text", "text/plain"]),
  capabilities: A2ACapabilitiesSchema,
  skills: z.array(A2ASkillSchema).default([]),
  instructions: z.array(z.string()).optional(),
  model: z.string().optional(),
});

export type A2AAgentCard = z.infer<typeof A2AAgentCardSchema>;

/**
 * Builds an A2A AgentCard with canonical x402 extension capabilities
 */
export function createX402AgentCard(params: {
  name: string;
  description: string;
  url: string;
  version?: string;
  skills?: A2ASkill[];
  instructions?: string[];
  model?: string;
  streaming?: boolean;
}): A2AAgentCard {
  return {
    name: params.name,
    description: params.description,
    url: params.url,
    version: params.version || "1.0.0",
    default_input_modes: ["text", "text/plain"],
    default_output_modes: ["text", "text/plain"],
    capabilities: {
      streaming: params.streaming ?? true,
      extensions: [
        {
          uri: X402_EXTENSION_URI,
          description: "Supports payments using the x402 protocol for on-chain settlement.",
          required: true,
        },
      ],
    },
    skills: params.skills || [],
    instructions: params.instructions,
    model: params.model,
  };
}

/**
 * A2A Message and Task Structure Schemas
 */
export const A2APartSchema = z.object({
  kind: z.string().default("text"),
  text: z.string().optional(),
}).passthrough();

export type A2APart = z.infer<typeof A2APartSchema>;

export const A2AMessageSchema = z.object({
  message_id: z.string(),
  task_id: z.string().optional(),
  role: z.enum(["user", "agent", "system"]),
  parts: z.array(A2APartSchema).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
});

export type A2AMessage = z.infer<typeof A2AMessageSchema>;

export const A2ATaskStatusSchema = z.object({
  state: A2ATaskStateSchema,
  message: A2AMessageSchema.optional(),
});

export type A2ATaskStatus = z.infer<typeof A2ATaskStatusSchema>;

export const A2ATaskSchema = z.object({
  id: z.string(),
  context_id: z.string().optional(),
  status: A2ATaskStatusSchema,
  artifacts: z.array(z.any()).default([]),
  history: z.array(A2AMessageSchema).default([]),
});

export type A2ATask = z.infer<typeof A2ATaskSchema>;

/**
 * Creates a correlated payment submission message per A2A x402 spec
 */
export function createPaymentSubmissionMessage(
  taskId: string,
  paymentPayload: X402PaymentPayload,
  text: string = "Payment authorization provided",
  messageId?: string
): A2AMessage {
  return {
    message_id: messageId || `msg_${Math.random().toString(36).slice(2, 11)}`,
    task_id: taskId,
    role: "user",
    parts: [{ kind: "text", text }],
    metadata: {
      [X402_METADATA_KEYS.STATUS_KEY]: "payment-submitted",
      [X402_METADATA_KEYS.PAYLOAD_KEY]: paymentPayload,
    },
  };
}

/**
 * Extracts task ID from payment message
 */
export function extractTaskId(message: A2AMessage | Record<string, any>): string | undefined {
  return message.task_id || (message as any)?.taskId;
}

/**
 * X402A2AUtils: State management utility for A2A x402 protocol tasks and messages
 */
export class X402A2AUtils {
  static readonly STATUS_KEY = X402_METADATA_KEYS.STATUS_KEY;
  static readonly REQUIRED_KEY = X402_METADATA_KEYS.REQUIRED_KEY;
  static readonly PAYLOAD_KEY = X402_METADATA_KEYS.PAYLOAD_KEY;
  static readonly RECEIPTS_KEY = X402_METADATA_KEYS.RECEIPTS_KEY;
  static readonly ERROR_KEY = X402_METADATA_KEYS.ERROR_KEY;

  static getPaymentStatus(source: A2ATask | A2AMessage): A2APaymentStatus | undefined {
    const metadata = (source as A2ATask).status?.message?.metadata || (source as A2AMessage).metadata;
    return metadata?.[this.STATUS_KEY] as A2APaymentStatus | undefined;
  }

  static getPaymentRequirements(source: A2ATask | A2AMessage): any | undefined {
    const metadata = (source as A2ATask).status?.message?.metadata || (source as A2AMessage).metadata;
    return metadata?.[this.REQUIRED_KEY];
  }

  static getPaymentPayload(source: A2ATask | A2AMessage): X402PaymentPayload | undefined {
    const metadata = (source as A2ATask).status?.message?.metadata || (source as A2AMessage).metadata;
    return metadata?.[this.PAYLOAD_KEY] as X402PaymentPayload | undefined;
  }

  static createPaymentRequiredTask(task: A2ATask, paymentRequired: any): A2ATask {
    task.status = {
      state: "input-required",
      message: {
        message_id: `${task.id}-status`,
        role: "agent",
        parts: [{ kind: "text", text: "Payment is required for this service." }],
        metadata: {
          [this.STATUS_KEY]: "payment-required",
          [this.REQUIRED_KEY]: paymentRequired,
        },
      },
    };
    return task;
  }

  static recordPaymentVerified(task: A2ATask): A2ATask {
    if (!task.status.message) {
      task.status.message = {
        message_id: `${task.id}-status`,
        role: "agent",
        parts: [{ kind: "text", text: "Payment verification recorded." }],
        metadata: {},
      };
    }
    task.status.message.metadata[this.STATUS_KEY] = "payment-verified";
    return task;
  }

  static recordPaymentSuccess(task: A2ATask, settleResponse: X402SettleResponse): A2ATask {
    if (!task.status.message) {
      task.status.message = {
        message_id: `${task.id}-status`,
        role: "agent",
        parts: [{ kind: "text", text: "Payment completed successfully." }],
        metadata: {},
      };
    }
    task.status.message.metadata[this.STATUS_KEY] = "payment-completed";
    if (!Array.isArray(task.status.message.metadata[this.RECEIPTS_KEY])) {
      task.status.message.metadata[this.RECEIPTS_KEY] = [];
    }
    task.status.message.metadata[this.RECEIPTS_KEY].push(settleResponse);
    delete task.status.message.metadata[this.PAYLOAD_KEY];
    delete task.status.message.metadata[this.REQUIRED_KEY];
    return task;
  }

  static recordPaymentFailure(task: A2ATask, errorCode: string, settleResponse?: X402SettleResponse): A2ATask {
    if (!task.status.message) {
      task.status.message = {
        message_id: `${task.id}-status`,
        role: "agent",
        parts: [{ kind: "text", text: "Payment failed." }],
        metadata: {},
      };
    }
    task.status.message.metadata[this.STATUS_KEY] = "payment-failed";
    task.status.message.metadata[this.ERROR_KEY] = errorCode;
    if (settleResponse) {
      if (!Array.isArray(task.status.message.metadata[this.RECEIPTS_KEY])) {
        task.status.message.metadata[this.RECEIPTS_KEY] = [];
      }
      task.status.message.metadata[this.RECEIPTS_KEY].push(settleResponse);
    }
    delete task.status.message.metadata[this.PAYLOAD_KEY];
    return task;
  }

  static getPaymentReceipts(source: A2ATask | A2AMessage): X402SettleResponse[] {
    const metadata = (source as A2ATask).status?.message?.metadata || (source as A2AMessage).metadata;
    return (metadata?.[this.RECEIPTS_KEY] || []) as X402SettleResponse[];
  }

  static getLatestReceipt(task: A2ATask): X402SettleResponse | undefined {
    const receipts = this.getPaymentReceipts(task);
    return receipts[receipts.length - 1];
  }
}

/**
 * Creates EIP-712 typed data structure for EIP-3009 transferWithAuthorization
 */
export function getTransferWithAuthTypedData(params: {
  from: string;
  to: string;
  value: string | number;
  validAfter: number;
  validBefore: number;
  nonce: string;
  chainId: number;
  contractAddress: string;
  tokenName: string;
  tokenVersion: string;
}) {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    domain: {
      name: params.tokenName,
      version: params.tokenVersion,
      chainId: params.chainId,
      verifyingContract: params.contractAddress,
    },
    message: {
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
    },
  };
}

/**
 * Merchant Tiered Payment Options Generator
 */
export function createTieredPaymentOptions(params: {
  basePrice: string | number;
  payToAddress: string;
  resource: string;
  tiers?: Array<{ multiplier: number; suffix: string; description: string }>;
  network?: string;
}) {
  const tiers = params.tiers || [
    { multiplier: 1, suffix: "basic", description: "Basic tier service" },
    { multiplier: 2, suffix: "premium", description: "Premium tier service" },
  ];

  const basePriceNum = typeof params.basePrice === "string" && params.basePrice.startsWith("$")
    ? parseFloat(params.basePrice.slice(1))
    : Number(params.basePrice);

  return tiers.map(tier => {
    const tierPrice = `$${(basePriceNum * tier.multiplier).toFixed(2)}`;
    const tierResource = tier.suffix ? `${params.resource}/${tier.suffix}` : params.resource;
    return {
      scheme: "exact",
      network: params.network || "base",
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      payTo: params.payToAddress,
      maxAmountRequired: tierPrice,
      resource: tierResource,
      description: tier.description,
      mimeType: "application/json",
      maxTimeoutSeconds: 600,
    };
  });
}

/**
 * Helper function to require payment dynamically in merchant agents
 */
export function requirePayment(params: {
  price: string | number;
  payToAddress: string;
  resource?: string;
  network?: string;
  description?: string;
  message?: string;
}): X402PaymentRequiredException {
  return X402PaymentRequiredException.forService(params);
}

/**
 * Helper function to require choice between multiple payment options
 */
export function requirePaymentChoice(
  paymentOptions: any[],
  message: string = "Multiple payment options available"
): X402PaymentRequiredException {
  return new X402PaymentRequiredException(message, paymentOptions);
}

/**
 * Helper to check payment context for existing settlement
 */
export function checkPaymentContext(context: any): string | undefined {
  if (context?.current_task) {
    return X402A2AUtils.getPaymentStatus(context.current_task);
  }
  if (context?.status?.message?.metadata) {
    return X402A2AUtils.getPaymentStatus(context);
  }
  return undefined;
}





// ============================================================================
// Agentic Commerce Protocol (ACP) - Extended Parity Schemas
// ============================================================================

/**
 * RFC: Agentic Checkout — Affiliate Attribution
 * Standardized privacy-preserving, fraud-resistant affiliate attribution schema.
 * Supports multi-touch attribution models (first-touch at create, last-touch at complete).
 */
export const AffiliateAttributionSourceSchema = z.object({
  type: z.enum(['url', 'platform', 'unknown']),
  url: z.string().url().optional(),
});

export type AffiliateAttributionSource = z.infer<typeof AffiliateAttributionSourceSchema>;

export const AffiliateAttributionMetadataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()])
);

export type AffiliateAttributionMetadata = z.infer<typeof AffiliateAttributionMetadataSchema>;

export const AffiliateAttributionSchema = z
  .object({
    provider: z.string().min(1, 'Provider identifier is required (e.g. impact.com, channel3.ai)'),
    token: z.string().optional(),
    publisher_id: z.string().optional(),
    campaign_id: z.string().optional(),
    creative_id: z.string().optional(),
    sub_id: z.string().optional(),
    touchpoint: z.enum(['first', 'last']).optional(),
    source: AffiliateAttributionSourceSchema.optional(),
    issued_at: z.string().datetime().optional(),
    expires_at: z.string().datetime().optional(),
    metadata: AffiliateAttributionMetadataSchema.optional(),
  })
  .refine(
    (data) => Boolean(data.token || data.publisher_id),
    {
      message: 'At least one of token or publisher_id must be provided for affiliate attribution verification',
    }
  );

export type AffiliateAttribution = z.infer<typeof AffiliateAttributionSchema>;

/**
 * SEP #187 / RFC Cart: Pre-Checkout Basket Building
 * Lightweight CRUD resource for pre-checkout exploration with estimated pricing and session persistence.
 */
export const AcpCartLineItemInputSchema = z.object({
  id: z.string(),
  quantity: z.number().int().positive('Quantity must be an integer greater than zero'),
  unit_price_cents: z.number().int().nonnegative('Unit price must be non-negative integer cents').optional(),
  name: z.string().optional(),
  item_id: z.string().optional(),
  image_url: z.string().url().optional(),
});

export type AcpCartLineItemInput = z.infer<typeof AcpCartLineItemInputSchema>;

export const AcpCartBuyerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
});

export type AcpCartBuyer = z.infer<typeof AcpCartBuyerSchema>;

export const AcpCartTotalsSchema = z.object({
  subtotal_cents: z.number().int().nonnegative(),
  tax_cents: z.number().int().nonnegative().default(0),
  shipping_cents: z.number().int().nonnegative().default(0),
  discount_cents: z.number().int().nonnegative().default(0),
  total_cents: z.number().int().nonnegative(),
});

export type AcpCartTotals = z.infer<typeof AcpCartTotalsSchema>;

export const AcpCartMessageSchema = z.object({
  type: z.enum(['info', 'warning', 'error']),
  code: z.string(),
  message: z.string(),
  param: z.string().optional(),
});

export type AcpCartMessage = z.infer<typeof AcpCartMessageSchema>;

export const AcpCartResponseSchema = z.object({
  id: z.string(),
  line_items: z.array(AcpCartLineItemInputSchema),
  buyer: AcpCartBuyerSchema.optional(),
  currency: z.string().default('usd'),
  totals: AcpCartTotalsSchema,
  messages: z.array(AcpCartMessageSchema).optional().default([]),
  continue_url: z.string().url().optional(),
  expires_at: z.string().optional(),
});

export type AcpCartResponse = z.infer<typeof AcpCartResponseSchema>;

export const CartCreateRequestSchema = z.object({
  items: z.array(AcpCartLineItemInputSchema).min(1, 'Cart must contain at least one item'),
  buyer: AcpCartBuyerSchema.optional(),
  currency: z.string().optional().default('usd'),
});

export type CartCreateRequest = z.infer<typeof CartCreateRequestSchema>;

export const CartUpdateRequestSchema = z.object({
  items: z.array(AcpCartLineItemInputSchema).min(1, 'Updated cart items cannot be empty'),
  buyer: AcpCartBuyerSchema.optional(),
});

export type CartUpdateRequest = z.infer<typeof CartUpdateRequestSchema>;

/**
 * Schema.cart.json (2026-04-17) - Exact Invariant & Property Parity
 */
export const CartItemInputSchema = z.object({
  id: z.string(),
  quantity: z.number().int().positive(),
  name: z.string().optional(),
  unit_amount: z.number().int().nonnegative().optional(),
  unit_price_cents: z.number().int().nonnegative().optional(),
});

export type CartItemInput = z.infer<typeof CartItemInputSchema>;

export const StrictCartCreateRequestSchema = z.object({
  line_items: z.array(CartItemInputSchema).min(1).optional(),
  items: z.array(CartItemInputSchema).min(1).optional(),
  buyer: AcpCartBuyerSchema.optional(),
  currency: z.string().optional().default('usd'),
  locale: z.string().optional().default('en-US'),
}).refine(data => Boolean(data.line_items || data.items), {
  message: 'Cart must contain at least one line item in line_items or items array',
});

export type StrictCartCreateRequest = z.infer<typeof StrictCartCreateRequestSchema>;

export const StrictCartUpdateRequestSchema = z.object({
  line_items: z.array(CartItemInputSchema).min(1).optional(),
  items: z.array(CartItemInputSchema).min(1).optional(),
  buyer: AcpCartBuyerSchema.optional(),
}).refine(data => Boolean(data.line_items || data.items), {
  message: 'Updated cart must contain at least one line item in line_items or items array',
});

export type StrictCartUpdateRequest = z.infer<typeof StrictCartUpdateRequestSchema>;


/**
 * RFC: Agentic Checkout — Merchant REST API Schemas
 * Authoritative checkout session lifecycle schemas matching ACS specification.
 */
export const CheckoutSessionItemSchema = z.object({
  id: z.string(),
  quantity: z.number().int().positive(),
  unit_price_cents: z.number().int().nonnegative().optional(),
  name: z.string().optional(),
  image_url: z.string().url().optional(),
});

export type CheckoutSessionItem = z.infer<typeof CheckoutSessionItemSchema>;

export const CheckoutSessionCreateRequestSchema = z.object({
  currency: z.string().default('usd'),
  items: z.array(CheckoutSessionItemSchema).min(1, 'Items list cannot be empty'),
  buyer: AcpCartBuyerSchema.optional(),
  fulfillment_details: z.object({
    address: AcpAddressSchema.optional(),
    shipping_option_id: z.string().optional(),
  }).optional(),
  affiliate_attribution: AffiliateAttributionSchema.optional(),
  order_notes: z.string().optional(),
  mandate_id: z.string().optional(),
});

export type CheckoutSessionCreateRequest = z.infer<typeof CheckoutSessionCreateRequestSchema>;

export const CheckoutSessionUpdateRequestSchema = z.object({
  items: z.array(CheckoutSessionItemSchema).optional(),
  buyer: AcpCartBuyerSchema.optional(),
  fulfillment_details: z.object({
    address: AcpAddressSchema.optional(),
    shipping_option_id: z.string().optional(),
  }).optional(),
  order_notes: z.string().optional(),
});

export type CheckoutSessionUpdateRequest = z.infer<typeof CheckoutSessionUpdateRequestSchema>;

export const CheckoutSessionCompleteRequestSchema = z.object({
  payment_method: z.object({
    type: z.enum(['vault_token', 'card', 'ed25519_mandate', 'paypal_wallet']),
    token: z.string().optional(),
    mandate_signature: z.string().optional(),
    public_key_hex: z.string().optional(),
  }),
  affiliate_attribution: AffiliateAttributionSchema.optional(),
  mandate_id: z.string().optional(),
});

export type CheckoutSessionCompleteRequest = z.infer<typeof CheckoutSessionCompleteRequestSchema>;

export const CancelSessionRequestSchema = z.object({
  reason: z.string().optional(),
  intent_trace: z.record(z.string(), z.any()).optional(),
});

export type CancelSessionRequest = z.infer<typeof CancelSessionRequestSchema>;

/**
 * MCP Transport Binding Schemas for Agentic Checkout (docs/mcp-binding.md)
 * JSON-RPC 2.0 tool argument structure with { meta, id, payload } envelope and standard errors.
 */
export const AcpMcpMetaSchema = z.object({
  api_version: z.string().min(1, 'meta.api_version is required (e.g. 2026-01-30, 2026-04-17)'),
  idempotency_key: z.string().optional(),
  request_id: z.string().optional(),
  user_agent: z.string().optional(),
  accept_language: z.string().optional(),
  signature: z.string().optional(),
  timestamp: z.string().optional(),
}).passthrough();

export type AcpMcpMeta = z.infer<typeof AcpMcpMetaSchema>;

export const AcpMcpToolArgumentsSchema = z.object({
  meta: AcpMcpMetaSchema,
  id: z.string().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

export type AcpMcpToolArguments = z.infer<typeof AcpMcpToolArgumentsSchema>;

export const McpToolCallSchema = z.object({
  id: z.string().trim().min(1, 'id is required').max(128),
  toolName: z.string().trim().min(1, 'toolName is required').max(128),
  agentSummary: z.string().trim().max(2000).optional(),
  args: z.record(z.string(), z.any()).optional().default({}),
}).passthrough();

export type McpToolCall = z.infer<typeof McpToolCallSchema>;

export const LocalReasonerProposalSchema = z.object({
  toolCall: McpToolCallSchema,
  rationale: z.string().trim().min(1, 'rationale is required').max(4000),
  modelUsed: z.string().trim().min(1, 'modelUsed is required').max(128),
  confidence: z.number({
    required_error: 'confidence is required',
    invalid_type_error: 'confidence must be a number',
  }).min(0, 'confidence must be >= 0').max(1, 'confidence must be <= 1').finite('confidence must be finite'),
  thinking: z.string().trim().max(10000).optional(),
  category: z.string().trim().max(128).optional(),
  merchant: z.string().trim().max(256).optional(),
  urgency: z.enum(['immediate', 'high', 'normal', 'low']).optional(),
});

export type LocalReasonerProposal = z.infer<typeof LocalReasonerProposalSchema>;

export const AcpRpcErrorDataSchema = z.object({
  type: z.enum(['invalid_request', 'request_not_idempotent', 'processing_error', 'service_unavailable']),
  code: z.string(),
  message: z.string(),
  param: z.string().optional(),
});

export type AcpRpcErrorData = z.infer<typeof AcpRpcErrorDataSchema>;

export const AcpRpcErrorSchema = z.object({
  code: z.number().int().default(-32000),
  message: z.string(),
  data: AcpRpcErrorDataSchema,
});

export type AcpRpcError = z.infer<typeof AcpRpcErrorSchema>;


// ============================================================================
// BATCH 2: Protocol Extensions & Delegation Contracts
// ============================================================================

/**
 * RFC: Agentic Checkout — Capability Negotiation (rfc.capability_negotiation.md)
 */
export const InterventionDisplayContextSchema = z.enum(['native', 'webview', 'modal', 'redirect']);
export const InterventionRedirectContextSchema = z.enum(['in_app', 'external_browser', 'none']);
export const InterventionEnforcementSchema = z.enum(['always', 'conditional', 'optional']);

export const AgentInterventionsCapabilitySchema = z.object({
  supported: z.array(z.string()).default([]),
  display_context: InterventionDisplayContextSchema.optional().default('webview'),
  redirect_context: InterventionRedirectContextSchema.optional().default('in_app'),
  max_redirects: z.number().int().nonnegative().optional().default(1),
  max_interaction_depth: z.number().int().positive().optional().default(1),
});

export const AgentCapabilitiesSchema = z.object({
  interventions: AgentInterventionsCapabilitySchema.optional(),
  extensions: z.array(z.string()).optional().default([]),
});

export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;

export const SellerInterventionsCapabilitySchema = z.object({
  supported: z.array(z.string()),
  required: z.array(z.string()).optional().default([]),
  enforcement: InterventionEnforcementSchema.optional().default('conditional'),
});

export const PaymentMethodBrandSchema = z.enum([
  'visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'eftpos', 'interac'
]);

export const PaymentMethodFundingTypeSchema = z.enum(['credit', 'debit', 'prepaid']);

export const PaymentMethodObjectSchema = z.object({
  method: z.string(),
  brands: z.array(PaymentMethodBrandSchema).optional(),
  funding_types: z.array(PaymentMethodFundingTypeSchema).optional(),
});

export const ExtensionDeclarationSchema = z.object({
  name: z.string(),
  extends: z.array(z.string()),
  schema: z.string().url().optional(),
});

export const SellerCapabilitiesSchema = z.object({
  payment_methods: z.array(z.union([z.string(), PaymentMethodObjectSchema])),
  payment_handlers: z.array(z.any()).optional(),
  interventions: SellerInterventionsCapabilitySchema.optional(),
  extensions: z.array(ExtensionDeclarationSchema).optional().default([]),
  fulfillment_types: z.array(z.string()).optional().default(['shipping']),
});

export type SellerCapabilities = z.infer<typeof SellerCapabilitiesSchema>;

/**
 * RFC: Agentic Commerce — Delegate Authentication API (3DS2) (rfc.delegate_authentication.md)
 */
export const DelegateAuthPaymentMethodSchema = z.object({
  type: z.literal('card').default('card'),
  number: z.string().min(12).max(19),
  exp_month: z.string().min(1).max(2),
  exp_year: z.string().min(2).max(4),
  name: z.string().optional(),
  cvc: z.string().optional(),
});

export const DelegateAuthBrowserDataSchema = z.object({
  accept_header: z.string().optional(),
  ip_address: z.string().optional(),
  javascript_enabled: z.boolean().optional().default(true),
  language: z.string().optional().default('en-US'),
  user_agent: z.string().optional(),
  color_depth: z.number().int().optional().default(24),
  java_enabled: z.boolean().optional().default(false),
  screen_height: z.number().int().optional().default(1080),
  screen_width: z.number().int().optional().default(1920),
  timezone_offset: z.number().int().optional().default(0),
});

export const DelegateAuthChannelSchema = z.object({
  type: z.literal('browser').default('browser'),
  browser: DelegateAuthBrowserDataSchema.optional(),
});

export const DelegateAuthCreateRequestSchema = z.object({
  merchant_id: z.string().min(1),
  payment_method: DelegateAuthPaymentMethodSchema,
  amount: z.object({
    value: z.number().int().positive('Amount in minor units must be positive integer'),
    currency: z.string().default('USD'),
  }),
  acquirer_details: z.object({
    acquirer_bin: z.string().optional(),
    acquirer_merchant_id: z.string().optional(),
  }).optional(),
  channel: DelegateAuthChannelSchema.optional(),
  checkout_session_id: z.string().optional(),
  flow_preference: z.object({
    type: z.enum(['challenge', 'frictionless']),
  }).optional(),
  challenge_notification_url: z.string().url().optional(),
  shopper_details: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone_number: z.string().optional(),
    address: AcpAddressSchema.optional(),
  }).optional(),
});

export type DelegateAuthCreateRequest = z.infer<typeof DelegateAuthCreateRequestSchema>;

export const DelegateAuthAuthenticateRequestSchema = z.object({
  fingerprint_completion: z.enum(['Y', 'N', 'U']),
  channel: DelegateAuthChannelSchema.optional(),
  checkout_session_id: z.string().optional(),
  challenge_notification_url: z.string().url().optional(),
  shopper_details: z.any().optional(),
});

export type DelegateAuthAuthenticateRequest = z.infer<typeof DelegateAuthAuthenticateRequestSchema>;

export const ThreeDSAuthenticationResultSchema = z.object({
  trans_status: z.enum(['Y', 'N', 'U', 'A', 'C', 'R']),
  electronic_commerce_indicator: z.string(),
  three_ds_cryptogram: z.string(),
  transaction_id: z.string(),
  three_ds_server_trans_id: z.string(),
  version: z.string().default('2.2.0'),
  authentication_value: z.string().optional(),
  trans_status_reason: z.string().optional(),
  cardholder_info: z.string().optional(),
});

export type ThreeDSAuthenticationResult = z.infer<typeof ThreeDSAuthenticationResultSchema>;

/**
 * RFC: Agentic Commerce — Delegate Payment API (rfc.delegate_payment.md)
 */
export const DelegatePaymentCardSchema = z.object({
  type: z.literal('card').default('card'),
  card_number_type: z.enum(['fpan', 'network_token']),
  virtual: z.boolean(),
  number: z.string().min(12).max(19),
  exp_month: z.string().min(1).max(2),
  exp_year: z.string().min(2).max(4),
  name: z.string().optional(),
  cvc: z.string().optional(),
  checks_performed: z.array(z.enum(['avs', 'cvv', 'ani', 'auth0'])).optional(),
  iin: z.string().optional(),
  display_card_funding_type: z.enum(['credit', 'debit', 'prepaid']),
  display_wallet_type: z.string().optional(),
  display_brand: z.string().optional(),
  display_last4: z.string().max(4).optional(),
  metadata: z.record(z.string(), z.string()).optional().default({}),
});

export const DelegatePaymentAllowanceSchema = z.object({
  reason: z.literal('one_time').default('one_time'),
  max_amount: z.number().int().positive('max_amount must be positive integer cents'),
  currency: z.string().toLowerCase(),
  checkout_session_id: z.string(),
  merchant_id: z.string(),
  expires_at: z.string().datetime(),
});

export const DelegatePaymentRiskSignalSchema = z.object({
  type: z.literal('card_testing').default('card_testing'),
  score: z.number().int(),
  action: z.enum(['blocked', 'manual_review', 'authorized']),
});

export const DelegatePaymentRequestSchema = z.object({
  payment_method: DelegatePaymentCardSchema,
  allowance: DelegatePaymentAllowanceSchema,
  billing_address: AcpAddressSchema.optional(),
  risk_signals: z.array(DelegatePaymentRiskSignalSchema).min(1),
  metadata: z.record(z.string(), z.string()),
});

export type DelegatePaymentRequest = z.infer<typeof DelegatePaymentRequestSchema>;

export const DelegatePaymentResponseSchema = z.object({
  id: z.string(),
  created: z.string().datetime(),
  metadata: z.record(z.string(), z.string()).optional().default({}),
});

export type DelegatePaymentResponse = z.infer<typeof DelegatePaymentResponseSchema>;

/**
 * RFC: Discount Extension (rfc.discount_extension.md)
 */
export const DiscountCouponSchema = z.object({
  id: z.string(),
  name: z.string(),
  percent_off: z.number().min(0).max(100).optional(),
  amount_off: z.number().int().positive().optional(),
  currency: z.string().optional(),
  duration: z.enum(['once', 'repeating', 'forever']).optional().default('once'),
  duration_in_months: z.number().int().positive().optional(),
  max_redemptions: z.number().int().positive().optional(),
  times_redeemed: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).refine(
  (c) => (c.percent_off !== undefined) !== (c.amount_off !== undefined),
  { message: 'percent_off and amount_off are mutually exclusive and exactly one must be provided' }
);

export type DiscountCoupon = z.infer<typeof DiscountCouponSchema>;

export const DiscountAllocationSchema = z.object({
  path: z.string(),
  amount: z.number().int().positive(),
});

export type DiscountAllocation = z.infer<typeof DiscountAllocationSchema>;

export const AppliedDiscountSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  coupon: DiscountCouponSchema,
  amount: z.number().int().positive(),
  automatic: z.boolean().optional().default(false),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  method: z.enum(['each', 'across']).optional().default('across'),
  priority: z.number().int().positive().optional().default(1),
  allocations: z.array(DiscountAllocationSchema).optional().default([]),
});

export type AppliedDiscount = z.infer<typeof AppliedDiscountSchema>;

export const RejectedDiscountReasonSchema = z.enum([
  'invalid_code',
  'expired_code',
  'usage_limit_reached',
  'minimum_not_met',
  'not_combinable',
  'customer_ineligible',
  'item_ineligible',
  'already_applied',
]);

export const RejectedDiscountSchema = z.object({
  code: z.string(),
  reason: RejectedDiscountReasonSchema,
  message: z.string().optional(),
});

export type RejectedDiscount = z.infer<typeof RejectedDiscountSchema>;

export const DiscountsPayloadSchema = z.object({
  codes: z.array(z.string()).optional().default([]),
  applied: z.array(AppliedDiscountSchema).optional().default([]),
  rejected: z.array(RejectedDiscountSchema).optional().default([]),
});

export type DiscountsPayload = z.infer<typeof DiscountsPayloadSchema>;


// ============================================================================
// BATCH 3: Discovery, Extensions Framework, Intent Traces, Marketing Consent & Enhanced Orders
// ============================================================================

/**
 * RFC: Agentic Checkout — Discovery (rfc.discovery.md)
 */
export const DiscoveryProtocolSchema = z.object({
  name: z.literal('acp').default('acp'),
  version: z.string(),
  supported_versions: z.array(z.string()).min(1),
  documentation_url: z.string().url().optional(),
});

export type DiscoveryProtocol = z.infer<typeof DiscoveryProtocolSchema>;

export const DiscoveryExtensionSchema = z.object({
  name: z.string(),
  spec: z.string().url().optional(),
  schema: z.string().url().optional(),
});

export type DiscoveryExtension = z.infer<typeof DiscoveryExtensionSchema>;

export const DiscoveryCapabilitiesSchema = z.object({
  services: z.array(z.string()).min(1),
  extensions: z.array(DiscoveryExtensionSchema).optional().default([]),
  intervention_types: z.array(z.string()).optional().default([]),
  supported_currencies: z.array(z.string()).min(1),
  supported_locales: z.array(z.string()).optional().default(['en-US']),
  payment_handlers: z.array(z.any()).optional().default([]),
});

export type DiscoveryCapabilities = z.infer<typeof DiscoveryCapabilitiesSchema>;

export const AcpDiscoveryDocumentSchema = z.object({
  protocol: DiscoveryProtocolSchema,
  api_base_url: z.string().url(),
  transports: z.array(z.string()).min(1),
  capabilities: DiscoveryCapabilitiesSchema,
});

export type AcpDiscoveryDocument = z.infer<typeof AcpDiscoveryDocumentSchema>;

/**
 * RFC: Agentic Checkout — Intent Traces (rfc.intent_traces.md)
 */
export const IntentTraceReasonCodeSchema = z.enum([
  'price_sensitivity',
  'shipping_cost',
  'shipping_speed',
  'product_fit',
  'trust_security',
  'returns_policy',
  'payment_options',
  'comparison',
  'timing_deferred',
  'other',
]);

export type IntentTraceReasonCode = z.infer<typeof IntentTraceReasonCodeSchema>;

export const IntentTraceSchema = z.object({
  reason_code: IntentTraceReasonCodeSchema,
  trace_summary: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type IntentTrace = z.infer<typeof IntentTraceSchema>;

export const EnhancedCancelSessionRequestSchema = z.object({
  reason: z.string().optional(),
  intent_trace: IntentTraceSchema.optional(),
});

export type EnhancedCancelSessionRequest = z.infer<typeof EnhancedCancelSessionRequestSchema>;

/**
 * RFC: Marketing Consent (rfc.marketing_consent.md)
 */
export const MarketingConsentOptionSchema = z.object({
  channel: z.string().min(1), // e.g. 'email', 'sms', 'whatsapp'
  display_text: z.string().min(1),
  privacy_policy_url: z.string().url(),
  is_subscribed: z.boolean().optional().default(false),
});

export type MarketingConsentOption = z.infer<typeof MarketingConsentOptionSchema>;

export const MarketingConsentSchema = z.object({
  channel: z.string().min(1),
  opted_in: z.boolean(),
});

export type MarketingConsent = z.infer<typeof MarketingConsentSchema>;

/**
 * RFC: Enhanced Order Support (rfc.orders.md)
 */
export const OrderLineItemQuantitySchema = z.object({
  ordered: z.number().int().min(1),
  current: z.number().int().min(0),
  fulfilled: z.number().int().min(0).optional().default(0),
});

export type OrderLineItemQuantity = z.infer<typeof OrderLineItemQuantitySchema>;

export const OrderLineItemStatusSchema = z.enum(['processing', 'partial', 'fulfilled', 'removed']);
export type OrderLineItemStatus = z.infer<typeof OrderLineItemStatusSchema>;

export const EnhancedOrderLineItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  product_id: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  url: z.string().url().optional(),
  quantity: OrderLineItemQuantitySchema,
  unit_price: z.number().int().nonnegative().optional(),
  subtotal: z.number().int().nonnegative().optional(),
  status: OrderLineItemStatusSchema.optional(),
});

export type EnhancedOrderLineItem = z.infer<typeof EnhancedOrderLineItemSchema>;

export const FulfillmentTypeSchema = z.enum(['shipping', 'pickup', 'digital']);
export type FulfillmentType = z.infer<typeof FulfillmentTypeSchema>;

export const FulfillmentSchema = z.object({
  id: z.string(),
  type: FulfillmentTypeSchema,
  status: z.string().optional().default('processing'),
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
  tracking_url: z.string().url().optional(),
  line_items: z.array(z.object({ id: z.string(), quantity: z.number().int().positive() })).optional(),
});

export type Fulfillment = z.infer<typeof FulfillmentSchema>;

export const OrderAdjustmentSchema = z.object({
  id: z.string(),
  type: z.enum(['refund', 'return', 'credit', 'dispute']),
  amount: z.number().int().positive(),
  currency: z.string().default('USD'),
  status: z.string().default('completed'),
  reason: z.string().optional(),
  created_at: z.string().datetime().optional(),
});

export type OrderAdjustment = z.infer<typeof OrderAdjustmentSchema>;

export const EnhancedOrderSchema = z.object({
  type: z.literal('order').default('order'),
  id: z.string(),
  checkout_session_id: z.string(),
  permalink_url: z.string().url(),
  order_number: z.string().optional(),
  status: z.enum(['created', 'confirmed', 'manual_review', 'processing', 'shipped', 'completed', 'canceled']),
  line_items: z.array(EnhancedOrderLineItemSchema).optional(),
  fulfillments: z.array(FulfillmentSchema).optional().default([]),
  adjustments: z.array(OrderAdjustmentSchema).optional().default([]),
  totals: z.array(z.object({ type: z.string(), amount: z.number().int() })).optional(),
  created_at: z.string().datetime(),
});

export type EnhancedOrder = z.infer<typeof EnhancedOrderSchema>;


// ============================================================================
// BATCH 4 & 5: Payment Handlers, Seller-Backed Handlers, and Product Feeds
// ============================================================================

/**
 * RFC: Agentic Commerce — Payment Handlers (rfc.payment_handlers.md)
 */
export const PaymentHandlerDescriptorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1), // reverse-DNS format e.g. dev.acp.tokenized.card
  version: z.string().min(1), // YYYY-MM-DD
  spec: z.string().url(),
  requires_delegate_payment: z.boolean().default(true),
  requires_pci_compliance: z.boolean().default(false),
  psp: z.string().min(1),
  config_schema: z.string().url().optional(),
  instrument_schemas: z.array(z.string().url()).optional().default([]),
  config: z.record(z.string(), z.any()),
  display_order: z.number().int().optional(),
});

export type PaymentHandlerDescriptor = z.infer<typeof PaymentHandlerDescriptorSchema>;

export const PaymentInstrumentSchema = z.object({
  id: z.string().min(1),
  handler_id: z.string().min(1),
  type: z.string().min(1),
  credential: z.record(z.string(), z.any()),
});

export type PaymentInstrument = z.infer<typeof PaymentInstrumentSchema>;

/**
 * RFC: Seller-Backed Payment Handler (rfc.seller_backed_payment_handler.md)
 */
export const SellerBackedTypeSchema = z.enum([
  'saved_card',
  'gift_card',
  'points',
  'store_credit',
]);

export type SellerBackedType = z.infer<typeof SellerBackedTypeSchema>;

export const SellerBackedPaymentHandlerConfigSchema = z.object({
  type: SellerBackedTypeSchema,
  merchant_id: z.string(),
  display_name: z.string(),
  balance_cents: z.number().int().nonnegative().optional(),
  currency: z.string().default('USD'),
  last4: z.string().max(4).optional(),
});

export type SellerBackedPaymentHandlerConfig = z.infer<typeof SellerBackedPaymentHandlerConfigSchema>;

/**
 * RFC: Agentic Commerce — Product Feeds (rfc.product_feeds.md)
 */
export const FeedVariantOptionSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export type FeedVariantOption = z.infer<typeof FeedVariantOptionSchema>;

export const FeedMediaSchema = z.object({
  type: z.enum(['image', 'video']).default('image'),
  url: z.string().url(),
  alt_text: z.string().optional(),
});

export type FeedMedia = z.infer<typeof FeedMediaSchema>;

export const FeedVariantPriceSchema = z.object({
  amount_cents: z.number().int().nonnegative(),
  currency: z.string().default('USD'),
  compare_at_cents: z.number().int().nonnegative().optional(),
});

export type FeedVariantPrice = z.infer<typeof FeedVariantPriceSchema>;

export const FeedVariantAvailabilitySchema = z.enum(['in_stock', 'out_of_stock', 'preorder', 'backorder']);
export type FeedVariantAvailability = z.infer<typeof FeedVariantAvailabilitySchema>;

export const FeedVariantConditionSchema = z.enum(['new', 'refurbished', 'used']);
export type FeedVariantCondition = z.infer<typeof FeedVariantConditionSchema>;

export const FeedVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  price: FeedVariantPriceSchema,
  availability: FeedVariantAvailabilitySchema.default('in_stock'),
  condition: FeedVariantConditionSchema.optional().default('new'),
  variant_options: z.array(FeedVariantOptionSchema).optional().default([]),
  media: z.array(FeedMediaSchema).optional().default([]),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  seller: z.object({ id: z.string(), name: z.string() }).optional(),
});

export type FeedVariant = z.infer<typeof FeedVariantSchema>;

export const FeedProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  brand: z.string().optional(),
  categories: z.array(z.string()).optional().default([]),
  media: z.array(FeedMediaSchema).optional().default([]),
  variants: z.array(FeedVariantSchema).min(1),
});

export type FeedProduct = z.infer<typeof FeedProductSchema>;

export const ProductFeedMetadataSchema = z.object({
  id: z.string(),
  target_country: z.string().length(2).optional().default('US'),
  updated_at: z.string().datetime(),
});

export type ProductFeedMetadata = z.infer<typeof ProductFeedMetadataSchema>;

export const ProductFeedSchema = ProductFeedMetadataSchema.extend({
  products: z.array(FeedProductSchema).default([]),
});

export type ProductFeed = z.infer<typeof ProductFeedSchema>;

export const FeedCreateRequestSchema = z.object({
  target_country: z.string().length(2).optional().default('US'),
});

export type FeedCreateRequest = z.infer<typeof FeedCreateRequestSchema>;

export const FeedUpsertItemsRequestSchema = z.object({
  items: z.array(FeedProductSchema).min(1),
});

export type FeedUpsertItemsRequest = z.infer<typeof FeedUpsertItemsRequestSchema>;


// ============================================================================
// BATCH 6 & 7: Webhooks, OpenRPC 1.3 & Unreleased Schema Parity
// ============================================================================

/**
 * OpenAPI: Agentic Checkout Webhook Specification (openapi.agentic_checkout_webhook.yaml)
 */
export const WebhookEventTypeSchema = z.enum([
  'order_create',
  'order_update',
]);

export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const OrderCreatedWebhookPayloadSchema = z.object({
  event: z.literal('order_create').default('order_create'),
  event_id: z.string(),
  created_at: z.string().datetime(),
  order: EnhancedOrderSchema,
});

export type OrderCreatedWebhookPayload = z.infer<typeof OrderCreatedWebhookPayloadSchema>;

export const OrderUpdatedWebhookPayloadSchema = z.object({
  event: z.literal('order_update').default('order_update'),
  event_id: z.string(),
  updated_at: z.string().datetime(),
  order_id: z.string(),
  status: z.string(),
  fulfillments: z.array(FulfillmentSchema).optional(),
  adjustments: z.array(OrderAdjustmentSchema).optional(),
});

export type OrderUpdatedWebhookPayload = z.infer<typeof OrderUpdatedWebhookPayloadSchema>;

export const AcpWebhookEventSchema = z.discriminatedUnion('event', [
  OrderCreatedWebhookPayloadSchema,
  OrderUpdatedWebhookPayloadSchema,
]);

export type AcpWebhookEvent = z.infer<typeof AcpWebhookEventSchema>;

/**
 * OpenRPC 1.3 Specification Metadata (openrpc.agentic_checkout.json)
 */
export const OpenRPCMethodSchema = z.object({
  name: z.string(),
  description: z.string(),
  params: z.array(z.any()),
  result: z.object({
    name: z.string(),
    schema: z.any(),
  }),
});

export const OpenRPCDocumentSchema = z.object({
  openrpc: z.string().default('1.3.2'),
  info: z.object({
    title: z.string(),
    version: z.string(),
  }),
  methods: z.array(OpenRPCMethodSchema),
});

export type OpenRPCDocument = z.infer<typeof OpenRPCDocumentSchema>;


// ============================================================================
// BATCH 5: Formal Active 2026-04-17 JSON Schema Parity (spec/2026-04-17/json-schema/*)
// ============================================================================

/**
 * Formal Active Discount Error Codes (schema.discount.json)
 */
export const CanonicalDiscountErrorCodeSchema = z.enum([
  'discount_code_expired',
  'discount_code_invalid',
  'discount_code_already_applied',
  'discount_code_combination_disallowed',
  'discount_code_minimum_not_met',
  'discount_code_user_not_logged_in',
  'discount_code_user_ineligible',
  'discount_code_usage_limit_reached',
  // Shorthand aliases for backwards compatibility
  'invalid_code',
  'expired_code',
  'usage_limit_reached',
  'minimum_not_met',
  'not_combinable',
  'customer_ineligible',
  'item_ineligible',
  'already_applied',
]);

export type CanonicalDiscountErrorCode = z.infer<typeof CanonicalDiscountErrorCodeSchema>;

/**
 * Formal Extension Declaration Pattern (schema.extension.json)
 */
export const ExtensionIdentifierRegex = /^[a-z][a-z0-9_-]*(@\d{4}-\d{2}-\d{2})?$|^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_-]*)+(@\d{4}-\d{2}-\d{2})?$/;
export const ExtendsTargetRegex = /^\$\.[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9_]*)*$/;

export const StrictExtensionDeclarationSchema = z.object({
  name: z.string().regex(ExtensionIdentifierRegex, 'Extension name must be simple identifier, reverse-DNS, or include @YYYY-MM-DD version suffix'),
  extends: z.array(z.string().regex(ExtendsTargetRegex, 'extends must be valid JSONPath (e.g. $.CheckoutSession.discounts)')).optional().default([]),
  schema: z.string().url().optional(),
  spec: z.string().url().optional(),
});

export type StrictExtensionDeclaration = z.infer<typeof StrictExtensionDeclarationSchema>;

/**
 * Formal Delegate Authentication Session Status & Action (schema.delegate_authentication.json)
 */
export const DelegateAuthSessionStatusSchema = z.enum([
  'action_required',
  'pending',
  'not_supported',
  'authenticated',
  'attempted',
  'not_authenticated',
  'rejected',
  'unavailable',
  'expired',
  'challenge_abandoned',
]);

export type DelegateAuthSessionStatus = z.infer<typeof DelegateAuthSessionStatusSchema>;

export const FingerprintActionDataSchema = z.object({
  three_ds_method_url: z.string().url(),
  three_ds_server_trans_id: z.string(),
});

export const ChallengeActionDataSchema = z.object({
  acs_url: z.string().url(),
  acs_trans_id: z.string(),
  three_ds_server_trans_id: z.string(),
  message_version: z.string().default('2.2.0'),
});

export const DelegateAuthActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('fingerprint'), fingerprint: FingerprintActionDataSchema }),
  z.object({ type: z.literal('challenge'), challenge: ChallengeActionDataSchema }),
]);

export type DelegateAuthAction = z.infer<typeof DelegateAuthActionSchema>;

/**
 * Formal Feed Models (schema.feed.json)
 */
export const FeedMultiFormatDescriptionSchema = z.union([
  z.string(),
  z.object({
    plain: z.string(),
    html: z.string().optional(),
    markdown: z.string().optional(),
  }),
]);

export const FeedPriceModelSchema = z.object({
  amount: z.number().int().nonnegative().optional(),
  amount_cents: z.number().int().nonnegative().optional(),
  currency: z.string().default('USD'),
  compare_at_cents: z.number().int().nonnegative().optional(),
}).refine(p => p.amount !== undefined || p.amount_cents !== undefined, {
  message: 'Price must provide either amount or amount_cents',
});

export const FeedAvailabilityModelSchema = z.union([
  z.enum(['in_stock', 'out_of_stock', 'preorder', 'backorder']),
  z.object({
    available: z.boolean(),
    status: z.string().optional(),
  }),
]);

export const CanonicalFeedVariantSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: FeedMultiFormatDescriptionSchema.optional(),
  url: z.string().url().optional(),
  barcodes: z.array(z.string()).optional(),
  price: FeedPriceModelSchema,
  list_price: FeedPriceModelSchema.optional(),
  unit_price: z.any().optional(),
  availability: FeedAvailabilityModelSchema.optional().default('in_stock'),
  categories: z.array(z.string()).optional().default([]),
  condition: z.enum(['new', 'refurbished', 'used']).optional().default('new'),
  variant_options: z.array(FeedVariantOptionSchema).optional().default([]),
  media: z.array(FeedMediaSchema).optional().default([]),
  seller: z.object({ id: z.string(), name: z.string() }).optional(),
});

export type CanonicalFeedVariant = z.infer<typeof CanonicalFeedVariantSchema>;

export const CanonicalFeedProductSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  description: FeedMultiFormatDescriptionSchema.optional(),
  url: z.string().url().optional(),
  media: z.array(FeedMediaSchema).optional().default([]),
  variants: z.array(CanonicalFeedVariantSchema).min(1, 'Product must contain at least one variant'),
});

export type CanonicalFeedProduct = z.infer<typeof CanonicalFeedProductSchema>;


// ============================================================================
// BATCH 7: Unreleased Provenance Models (SuggestedPrice & PriceSource)
// ============================================================================

export const PriceSourceSchema = z.object({
  feed_id: z.string().optional(),
  variant_id: z.string().optional(),
  url: z.string().url().optional(),
});

export type PriceSource = z.infer<typeof PriceSourceSchema>;

export const SuggestedPriceSchema = z.object({
  amount: z.number().int().nonnegative('Suggested price amount must be non-negative integer cents'),
  currency: z.string().default('USD'),
  source: PriceSourceSchema.optional(),
  observed_at: z.string().datetime().optional(),
});

export type SuggestedPrice = z.infer<typeof SuggestedPriceSchema>;


// ============================================================================
// FINAL BATCH: UpsertProductsResponse (schema.feed.json unreleased)
// ============================================================================

export const UpsertProductsResponseSchema = z.object({
  id: z.string(),
  accepted: z.boolean().default(true),
  feed_update_id: z.string().optional(),
});

export type UpsertProductsResponse = z.infer<typeof UpsertProductsResponseSchema>;



// ============================================================================
// BATCH 2: Configuration, Errors, Server Executor & Payment Schemes (Lightning/Spark)
// ============================================================================

/**
 * A2A x402 Extension Configuration Schema
 */
export const X402ExtensionConfigSchema = z.object({
  extension_uri: z.string().default(X402_EXTENSION_URI),
  version: z.string().default("0.2"),
  x402_version: z.number().int().default(2),
  required: z.boolean().default(true),
});

export type X402ExtensionConfig = z.infer<typeof X402ExtensionConfigSchema>;

/**
 * A2A x402 Server Configuration Schema
 */
export const X402ServerConfigSchema = z.object({
  price: z.union([z.string(), z.number()]),
  pay_to_address: z.string(),
  network: z.string().default("base"),
  description: z.string().default("Payment required..."),
  mime_type: z.string().default("application/json"),
  max_timeout_seconds: z.number().int().default(600),
  resource: z.string().optional(),
  asset_address: z.string().optional(),
});

export type X402ServerConfig = z.infer<typeof X402ServerConfigSchema>;

/**
 * Specialized A2A Error Subclasses
 */
export class X402MessageError extends X402Error {
  constructor(message: string) {
    super(message, X402ErrorCode.UNEXPECTED_ERROR);
    this.name = "X402MessageError";
  }
}

export class X402ValidationError extends X402Error {
  constructor(message: string) {
    super(message, X402ErrorCode.INVALID_SIGNATURE);
    this.name = "X402ValidationError";
  }
}

export class X402PaymentError extends X402Error {
  constructor(message: string) {
    super(message, X402ErrorCode.SETTLEMENT_FAILED);
    this.name = "X402PaymentError";
  }
}

export class X402StateError extends X402Error {
  constructor(message: string) {
    super(message, X402ErrorCode.UNEXPECTED_ERROR);
    this.name = "X402StateError";
  }
}

/**
 * Maps exception types to spec error codes
 */
export function mapErrorToX402Code(error: unknown): string {
  if (error instanceof X402ValidationError) return X402ErrorCode.INVALID_SIGNATURE;
  if (error instanceof X402PaymentError) return X402ErrorCode.SETTLEMENT_FAILED;
  if (error instanceof X402Error && error.code) return error.code;
  return X402ErrorCode.UNEXPECTED_ERROR;
}

/**
 * PaymentStatus object mapping for direct python parity
 */
export const PaymentStatus = {
  PAYMENT_REQUIRED: "payment-required",
  PAYMENT_SUBMITTED: "payment-submitted",
  PAYMENT_VERIFIED: "payment-verified",
  PAYMENT_REJECTED: "payment-rejected",
  PAYMENT_COMPLETED: "payment-completed",
  PAYMENT_FAILED: "payment-failed",
} as const;

/**
 * x402Metadata namespace for direct python parity
 */
export const x402Metadata = X402_METADATA_KEYS;

/**
 * Lightning Scheme Schemas (scheme_exact_lightning.md)
 */
export const LightningExactPaymentRequirementsSchema = z.object({
  scheme: z.literal("exact"),
  network: z.literal("lightning"),
  asset: z.literal("BTC"),
  maxAmountRequired: z.string(), // in millisatoshis (msat)
  payTo: z.string(), // Lightning node public key
  resource: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().default("application/json"),
  maxTimeoutSeconds: z.number().int().default(60),
  extra: z.object({
    invoice: z.string(), // BOLT11 invoice
  }),
});

export type LightningExactPaymentRequirements = z.infer<typeof LightningExactPaymentRequirementsSchema>;

export const LightningPaymentPayloadSchema = z.object({
  x402Version: z.number().int().default(1),
  scheme: z.literal("exact"),
  network: z.literal("lightning"),
  payload: z.object({
    invoice: z.string(),
    signature: z.string(),
    from: z.string(),
  }),
});

export type LightningPaymentPayload = z.infer<typeof LightningPaymentPayloadSchema>;

/**
 * Spark Scheme Schemas (scheme_exact_spark.md)
 */
export const SparkExactPaymentRequirementsSchema = z.object({
  scheme: z.literal("exact"),
  network: z.literal("spark"),
  asset: z.literal("BTC"),
  maxAmountRequired: z.string(), // in satoshis
  payTo: z.string(), // spark1... address
  resource: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().default("application/json"),
  maxTimeoutSeconds: z.number().int().default(60),
  outputSchema: z.any().nullable().optional(),
  extra: z.object({
    lightningInvoice: z.string().optional(),
    depositAddress: z.string().optional(),
  }).optional(),
});

export type SparkExactPaymentRequirements = z.infer<typeof SparkExactPaymentRequirementsSchema>;

export const SparkPaymentPayloadSchema = z.object({
  x402Version: z.number().int().default(1),
  scheme: z.literal("exact"),
  network: z.literal("spark"),
  payload: z.object({
    paymentType: z.enum(["SPARK", "LIGHTNING", "L1"]),
    transfer_id: z.string().optional(),
    preimage: z.string().optional(),
    txid: z.string().optional(),
  }),
});

export type SparkPaymentPayload = z.infer<typeof SparkPaymentPayloadSchema>;

/**
 * Base Executor Interface & Class (executors/base.py)
 */
export class X402BaseExecutor {
  public config: X402ExtensionConfig;

  constructor(config?: Partial<X402ExtensionConfig>) {
    this.config = X402ExtensionConfigSchema.parse(config || {});
  }

  isActive(headers: Record<string, any>): boolean {
    const extensionsHeader = (headers["x-a2a-extensions"] || headers["X-A2A-Extensions"] || "") as string;
    return extensionsHeader.includes(this.config.extension_uri) || extensionsHeader.includes(X402_EXTENSION_URI_V1);
  }
}

/**
 * Server Executor (executors/server.py)
 * Implements 3-phase flow: verify -> delegate execution -> settle
 */
export class X402ServerExecutor extends X402BaseExecutor {
  private paymentRequirementsStore = new Map<string, any[]>();

  async executePaymentFlow(params: {
    task: A2ATask;
    message?: A2AMessage;
    verifyPayment: (payload: X402PaymentPayload, requirements: any) => Promise<X402VerifyResponse>;
    settlePayment: (payload: X402PaymentPayload, requirements: any) => Promise<X402SettleResponse>;
    executeDelegate: () => Promise<void>;
  }): Promise<A2ATask> {
    const { task, message, verifyPayment, settlePayment, executeDelegate } = params;
    const paymentStatus = X402A2AUtils.getPaymentStatus(task) || (message ? X402A2AUtils.getPaymentStatus(message) : undefined);

    if (paymentStatus === "payment-submitted") {
      const payload = X402A2AUtils.getPaymentPayload(task) || (message ? X402A2AUtils.getPaymentPayload(message) : undefined);
      if (!payload) {
        return X402A2AUtils.recordPaymentFailure(task, X402ErrorCode.INVALID_SIGNATURE);
      }

      const requirements = X402A2AUtils.getPaymentRequirements(task) || this.paymentRequirementsStore.get(task.id);
      if (!requirements) {
        return X402A2AUtils.recordPaymentFailure(task, X402ErrorCode.INVALID_SIGNATURE);
      }

      // 1. Verify
      const verification = await verifyPayment(payload, requirements);
      if (!verification.is_valid) {
        return X402A2AUtils.recordPaymentFailure(task, X402ErrorCode.INVALID_SIGNATURE);
      }
      X402A2AUtils.recordPaymentVerified(task);

      // 2. Delegate service execution
      try {
        await executeDelegate();
      } catch (err) {
        return X402A2AUtils.recordPaymentFailure(task, X402ErrorCode.SETTLEMENT_FAILED);
      }

      // 3. Settle
      const settlement = await settlePayment(payload, requirements);
      if (settlement.success) {
        X402A2AUtils.recordPaymentSuccess(task, settlement);
        this.paymentRequirementsStore.delete(task.id);
      } else {
        const errCode = (settlement.error_reason || "").toLowerCase().includes("insufficient")
          ? X402ErrorCode.INSUFFICIENT_FUNDS
          : X402ErrorCode.SETTLEMENT_FAILED;
        X402A2AUtils.recordPaymentFailure(task, errCode, settlement);
        this.paymentRequirementsStore.delete(task.id);
      }
      return task;
    }

    return task;
  }
}



// ============================================================================
// BATCH 3: UMA Scheme Schemas (scheme_exact_uma.md)
// ============================================================================

export const UmaExactPaymentRequirementsSchema = z.object({
  scheme: z.literal("exact"),
  network: z.literal("uma"),
  asset: z.string().default("USD"),
  maxAmountRequired: z.string(),
  payTo: z.string(),
  resource: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().default("application/json"),
  maxTimeoutSeconds: z.number().int().default(300),
  extra: z.object({
    umaInvoice: z.string().optional(),
  }).optional(),
});

export type UmaExactPaymentRequirements = z.infer<typeof UmaExactPaymentRequirementsSchema>;

export const UmaPaymentPayloadSchema = z.object({
  x402Version: z.number().int().default(1),
  scheme: z.literal("exact"),
  network: z.literal("uma"),
  payload: z.object({
    preimage: z.string(),
  }),
});

export type UmaPaymentPayload = z.infer<typeof UmaPaymentPayloadSchema>;

// ============================================================================
// BATCH 4: Core x402 V1 & V2 Protocol Schemas, Types, and Facilitator Models
// (typescript/packages/core/src/schemas/index.ts, facilitator/pendingSettlementStore.ts)
// ============================================================================

export const NonEmptyString = z.string().min(1);
export type NonEmptyString = z.infer<typeof NonEmptyString>;

export const Any = z.record(z.string(), z.unknown());
export type Any = z.infer<typeof Any>;

export const OptionalAny = z.record(z.string(), z.unknown()).optional().nullable();
export type OptionalAny = z.infer<typeof OptionalAny>;

export const NetworkSchemaV1 = NonEmptyString;
export type NetworkV1 = z.infer<typeof NetworkSchemaV1>;

export const NetworkSchemaV2 = z.string().regex(/^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$/, {
  message: "Network must be in CAIP-2 format (e.g., 'eip155:84532')",
});
export type NetworkV2 = z.infer<typeof NetworkSchemaV2>;

export const NetworkSchema = z.union([NetworkSchemaV1, NetworkSchemaV2]);
export type Network = z.infer<typeof NetworkSchema>;

export const ResourceInfoSchema = z.object({
  url: z.string().url(),
  description: z.string().default(""),
  mimeType: z.string().default(""),
  parameters: z.record(z.string(), z.unknown()).optional().nullable(),
  method: z.string().default(""),
});
export type ResourceInfo = z.infer<typeof ResourceInfoSchema>;

export const PaymentRequirementsV1Schema = z.object({
  scheme: NonEmptyString,
  network: NetworkSchemaV1,
  amount: NonEmptyString,
  payTo: NonEmptyString,
  maxTimeoutSeconds: z.number().int().positive(),
  asset: NonEmptyString,
  extra: OptionalAny,
});
export type PaymentRequirementsV1 = z.infer<typeof PaymentRequirementsV1Schema>;

export const PaymentRequiredV1Schema = z.object({
  x402Version: z.literal(1),
  resource: ResourceInfoSchema.optional(),
  accepts: z.array(PaymentRequirementsV1Schema).min(1),
  extensions: OptionalAny,
});
export type PaymentRequiredV1 = z.infer<typeof PaymentRequiredV1Schema>;

export const PaymentPayloadV1Schema = z.object({
  x402Version: z.literal(1),
  scheme: NonEmptyString,
  network: NetworkSchemaV1,
  payload: Any,
  extensions: OptionalAny,
});
export type PaymentPayloadV1 = z.infer<typeof PaymentPayloadV1Schema>;

export const PaymentRequirementsV2Schema = z.object({
  scheme: NonEmptyString,
  network: NetworkSchemaV2,
  amount: NonEmptyString,
  payTo: NonEmptyString,
  maxTimeoutSeconds: z.number().int().positive(),
  asset: NonEmptyString,
  extra: OptionalAny,
});
export type PaymentRequirementsV2 = z.infer<typeof PaymentRequirementsV2Schema>;

export const PaymentRequiredV2Schema = z.object({
  x402Version: z.literal(2),
  resource: ResourceInfoSchema,
  accepts: z.array(PaymentRequirementsV2Schema).min(1),
  extensions: OptionalAny,
});
export type PaymentRequiredV2 = z.infer<typeof PaymentRequiredV2Schema>;

export const PaymentPayloadV2Schema = z.object({
  x402Version: z.literal(2),
  accepted: PaymentRequirementsV2Schema,
  payload: Any,
  extensions: OptionalAny,
});
export type PaymentPayloadV2 = z.infer<typeof PaymentPayloadV2Schema>;

export const UniversalPaymentRequirementsSchema = z.union([
  PaymentRequirementsV1Schema,
  PaymentRequirementsV2Schema,
]);
export type UniversalPaymentRequirements = z.infer<typeof UniversalPaymentRequirementsSchema>;

export const UniversalPaymentRequiredSchema = z.discriminatedUnion("x402Version", [
  PaymentRequiredV1Schema,
  PaymentRequiredV2Schema,
]);
export type UniversalPaymentRequired = z.infer<typeof UniversalPaymentRequiredSchema>;

export const UniversalPaymentPayloadSchema = z.discriminatedUnion("x402Version", [
  PaymentPayloadV1Schema,
  PaymentPayloadV2Schema,
]);
export type UniversalPaymentPayload = z.infer<typeof UniversalPaymentPayloadSchema>;

export function parsePaymentRequired(value: unknown) {
  return UniversalPaymentRequiredSchema.safeParse(value);
}

export function validatePaymentRequired(value: unknown): UniversalPaymentRequired {
  return UniversalPaymentRequiredSchema.parse(value);
}

export function isPaymentRequired(value: unknown): value is UniversalPaymentRequired {
  return UniversalPaymentRequiredSchema.safeParse(value).success;
}

export function parsePaymentRequirements(value: unknown) {
  return UniversalPaymentRequirementsSchema.safeParse(value);
}

export function validatePaymentRequirements(value: unknown): UniversalPaymentRequirements {
  return UniversalPaymentRequirementsSchema.parse(value);
}

export function isPaymentRequirements(value: unknown): value is UniversalPaymentRequirements {
  return UniversalPaymentRequirementsSchema.safeParse(value).success;
}

export function parsePaymentPayload(value: unknown) {
  return UniversalPaymentPayloadSchema.safeParse(value);
}

export function validatePaymentPayload(value: unknown): UniversalPaymentPayload {
  return UniversalPaymentPayloadSchema.parse(value);
}

export function isPaymentPayload(value: unknown): value is UniversalPaymentPayload {
  return UniversalPaymentPayloadSchema.safeParse(value).success;
}

export function isPaymentRequiredV1(value: unknown): value is PaymentRequiredV1 {
  return PaymentRequiredV1Schema.safeParse(value).success;
}

export function isPaymentRequiredV2(value: unknown): value is PaymentRequiredV2 {
  return PaymentRequiredV2Schema.safeParse(value).success;
}

export function isPaymentRequirementsV1(value: unknown): value is PaymentRequirementsV1 {
  return PaymentRequirementsV1Schema.safeParse(value).success;
}

export function isPaymentRequirementsV2(value: unknown): value is PaymentRequirementsV2 {
  return PaymentRequirementsV2Schema.safeParse(value).success;
}

export function isPaymentPayloadV1(value: unknown): value is PaymentPayloadV1 {
  return PaymentPayloadV1Schema.safeParse(value).success;
}

export function isPaymentPayloadV2(value: unknown): value is PaymentPayloadV2 {
  return PaymentPayloadV2Schema.safeParse(value).success;
}

export const PENDING_SETTLEMENT_TTL_MS = 5 * 60 * 1000;

export interface PendingSettlementStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, txHash: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface PendingSettlementEntry {
  txHash: string;
  storedAt: number;
}

export class InMemoryPendingSettlementStore implements PendingSettlementStore {
  private readonly entries = new Map<string, PendingSettlementEntry>();

  async get(key: string): Promise<string | undefined> {
    this.prune();
    return this.entries.get(key)?.txHash;
  }

  async set(key: string, txHash: string): Promise<void> {
    this.entries.set(key, { txHash, storedAt: Date.now() });
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  entriesSnapshot(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, entry] of this.entries) {
      out[key] = entry.txHash;
    }
    return out;
  }

  private prune(): void {
    const cutoff = Date.now() - PENDING_SETTLEMENT_TTL_MS;
    for (const [key, entry] of this.entries) {
      if (entry.storedAt < cutoff) {
        this.entries.delete(key);
      }
    }
  }
}

export class RedisPendingSettlementStore implements PendingSettlementStore {
  private readonly redisClient: any;
  private readonly keyPrefix: string;
  private readonly ttlSeconds: number;

  constructor(redisClient: any, keyPrefix = 'aegis:settlement:pending:', ttlSeconds = 300) {
    this.redisClient = redisClient;
    this.keyPrefix = keyPrefix;
    this.ttlSeconds = ttlSeconds;
  }

  async get(key: string): Promise<string | undefined> {
    if (!this.redisClient) return undefined;
    const res = await this.redisClient.get(`${this.keyPrefix}${key}`);
    return res || undefined;
  }

  async set(key: string, txHash: string): Promise<void> {
    if (!this.redisClient) return;
    await this.redisClient.set(`${this.keyPrefix}${key}`, txHash, 'EX', this.ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    if (!this.redisClient) return;
    await this.redisClient.del(`${this.keyPrefix}${key}`);
  }
}

export class FacilitatorCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FacilitatorCapabilityError";
  }
}

export class RouteConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteConfigurationError";
  }
}

export class RouteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteValidationError";
  }
}

export class ResponseBodyTooLargeError extends Error {
  constructor(limit: number) {
    super(`http response body too large: limit ${limit} bytes`);
    this.name = "ResponseBodyTooLargeError";
  }
}

// ============================================================================
// BATCH 2: Interoperability Contracts, Mechanisms, Facilitator & DeepReadonly Models
// (extensions.ts, facilitator.ts, mechanisms.ts, payments.ts, readonly.ts, v1/index.ts, utils/index.ts)
// ============================================================================

export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export interface ResourceInfoCore {
  url: string;
  description?: string;
  mimeType?: string;
  serviceName?: string;
  tags?: string[];
  iconUrl?: string;
}

export type PaymentRequirementsCore = {
  scheme: string;
  network: Network;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
};

export type PaymentRequiredCore = {
  x402Version: number;
  error?: string;
  resource: ResourceInfoCore;
  accepts: PaymentRequirementsCore[];
  extensions?: Record<string, unknown>;
};

export type PaymentPayloadCore = {
  x402Version: number;
  resource?: ResourceInfoCore;
  accepted: PaymentRequirementsCore;
  payload: Record<string, unknown>;
  extensions?: Record<string, unknown>;
};

export type PaymentRequirementsV1Core = {
  scheme: string;
  network: Network;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  outputSchema: Record<string, unknown>;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: Record<string, unknown>;
};

export type PaymentRequiredV1Core = {
  x402Version: 1;
  error?: string;
  accepts: PaymentRequirementsV1Core[];
};

export type PaymentPayloadV1Core = {
  x402Version: 1;
  scheme: string;
  network: Network;
  payload: Record<string, unknown>;
};

export type VerifyRequestV1 = {
  x402Version: number;
  paymentPayload: PaymentPayloadV1Core;
  paymentRequirements: PaymentRequirementsV1Core;
};

export type SettleRequestV1 = {
  x402Version: number;
  paymentPayload: PaymentPayloadV1Core;
  paymentRequirements: PaymentRequirementsV1Core;
};

export type SettleResponseV1 = {
  success: boolean;
  errorReason?: string;
  errorMessage?: string;
  payer?: string;
  transaction: string;
  network: Network;
};

export type SupportedResponseV1 = {
  kinds: {
    x402Version: number;
    scheme: string;
    network: Network;
    extra?: Record<string, unknown>;
  }[];
};

export type VerifyRequest = {
  x402Version: number;
  paymentPayload: any;
  paymentRequirements: any;
};

export type VerifyResponse = {
  isValid: boolean;
  invalidReason?: string;
  invalidMessage?: string;
  payer?: string;
  extensions?: Record<string, unknown>;
  extensionResponses?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

export type SettleRequest = {
  x402Version: number;
  paymentPayload: any;
  paymentRequirements: any;
};

export type SettleResponse = {
  success: boolean;
  errorReason?: string;
  errorMessage?: string;
  payer?: string;
  transaction: string;
  network: Network;
  amount?: string;
  extensions?: Record<string, unknown>;
  extensionResponses?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

export type SupportedKind = {
  x402Version: number;
  scheme: string;
  network: Network;
  extra?: Record<string, unknown>;
};

export type SupportedResponse = {
  kinds: SupportedKind[];
  extensions: string[];
  signers: Record<string, string[]>;
};

export class VerifyError extends Error {
  readonly invalidReason?: string;
  readonly invalidMessage?: string;
  readonly payer?: string;
  readonly statusCode: number;

  constructor(statusCode: number, response: VerifyResponse) {
    const reason = response.invalidReason || "unknown reason";
    const message = response.invalidMessage;
    super(message ? `${reason}: ${message}` : reason);
    this.name = "VerifyError";
    this.statusCode = statusCode;
    this.invalidReason = response.invalidReason;
    this.invalidMessage = response.invalidMessage;
    this.payer = response.payer;
  }
}

export class SettleError extends Error {
  readonly errorReason?: string;
  readonly errorMessage?: string;
  readonly payer?: string;
  readonly transaction: string;
  readonly network: Network;
  readonly statusCode: number;

  constructor(statusCode: number, response: SettleResponse) {
    const reason = response.errorReason || "unknown reason";
    const message = response.errorMessage;
    super(message ? `${reason}: ${message}` : reason);
    this.name = "SettleError";
    this.statusCode = statusCode;
    this.errorReason = response.errorReason;
    this.errorMessage = response.errorMessage;
    this.payer = response.payer;
    this.transaction = response.transaction;
    this.network = response.network;
  }
}

export class FacilitatorResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FacilitatorResponseError";
  }
}

export class FacilitatorTimeoutError extends FacilitatorResponseError {
  readonly operation: string;
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`Facilitator ${operation} request timed out after ${timeoutMs}ms`);
    this.name = "FacilitatorTimeoutError";
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

export function getFacilitatorResponseError(error: unknown): FacilitatorResponseError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof FacilitatorResponseError) {
      return current;
    }
    current = (current as any).cause;
  }
  return null;
}

export type MoneyParser = (
  amount: string | number,
  network: Network,
) => Promise<{ amount: string; asset?: string } | null>;

export type PaymentPayloadResult = {
  x402Version: number;
  payload: Record<string, unknown>;
  extensions?: Record<string, unknown>;
};

export interface PaymentPayloadContext {
  extensions?: Record<string, unknown>;
  maxAmountPerPayment?: string;
}

export interface SchemeClientHooks {
  onBeforePaymentCreation?: any;
  onAfterPaymentCreation?: any;
  onPaymentCreationFailure?: any;
}

export interface DefaultAsset {
  symbol: string;
  decimals: number;
  address?: string;
}

export type DefaultAssetTable<T extends DefaultAsset = DefaultAsset> = Record<string, readonly T[]>;

export interface SchemeNetworkClient {
  scheme: string;
  createPaymentPayload(
    requirements: any,
    context?: PaymentPayloadContext,
  ): Promise<PaymentPayloadResult>;
}

export interface FacilitatorContext {
  store?: any;
}

export interface SchemeNetworkFacilitator {
  scheme: string;
  caipFamily: string;
  extra?: Record<string, unknown>;
  getSigners(network: Network): string[];
  getExtra(network: Network): Record<string, unknown> | undefined;
  verify(payload: any, requirements: any): Promise<VerifyResponse>;
  settle(payload: any, requirements: any): Promise<SettleResponse>;
}

export type PaymentFlowName = "authorization" | "upfront" | "escrow";

export interface PaymentFlowPhases {
  verifyBeforeHandler: boolean;
  settleBeforeHandler: boolean;
  settleAfterHandler: boolean;
}

export interface PaymentFlowConfig {
  default: PaymentFlowName;
  supported: readonly PaymentFlowName[];
}

export interface SchemeNetworkServer {
  scheme: string;
  defaultAssetTransferMethod: string;
  paymentFlows: Record<string, PaymentFlowConfig>;
  buildPaymentRequirements(resourceConfig: any): Promise<any[]>;
  verifyPayment?(payload: any, requirements: any): Promise<VerifyResponse>;
  settlePayment?(payload: any, requirements: any): Promise<SettleResponse>;
}

export interface FacilitatorExtension {
  key: string;
}

export interface ResourceServerExtensionHooks {
  onBeforeVerify?: (
    declaration: unknown,
    context: any,
  ) => Promise<void | { abort: true; reason: string; message?: string } | { skip: true; result: VerifyResponse }>;
  onAfterVerify?: (
    declaration: unknown,
    context: any,
  ) => Promise<void | { skipHandler: true; response?: any } | { abort: true; reason: string; message?: string }>;
  onVerifyFailure?: (
    declaration: unknown,
    context: any,
  ) => Promise<void | { recovered: true; result: VerifyResponse }>;
  onBeforeSettle?: (
    declaration: unknown,
    context: any,
  ) => Promise<void | { abort: true; reason: string; message?: string } | { skip: true; result: SettleResponse }>;
  onAfterSettle?: (declaration: unknown, context: any) => Promise<void>;
  onSettleFailure?: (
    declaration: unknown,
    context: any,
  ) => Promise<void | { recovered: true; result: SettleResponse }>;
  onVerifiedPaymentCanceled?: (
    declaration: unknown,
    context: any,
  ) => Promise<void>;
}

export interface ResourceServerExtension {
  key: string;
  dynamicInfoFields?: string[];
  enrichDeclaration?: (declaration: unknown, transportContext: unknown) => unknown;
  enrichPaymentRequiredResponse?: (declaration: unknown, context: any) => Promise<unknown>;
  enrichSettlementResponse?: (declaration: unknown, context: any) => Promise<unknown>;
  hooks?: ResourceServerExtensionHooks;
  transportHooks?: any;
}

export function numberToDecimalString(n: number): string {
  const str = n.toString();
  if (!/[eE]/.test(str)) return str;
  const [significand, exponentStr] = str.split(/[eE]/);
  const exp = parseInt(exponentStr, 10);
  const negative = significand.startsWith("-");
  const abs = negative ? significand.slice(1) : significand;
  const [intDigits, fracDigits = ""] = abs.split(".");
  const allDigits = intDigits + fracDigits;
  const decimalPos = intDigits.length + exp;

  let result: string;
  if (decimalPos <= 0) {
    result = "0." + "0".repeat(-decimalPos) + allDigits;
  } else if (decimalPos >= allDigits.length) {
    result = allDigits + "0".repeat(decimalPos - allDigits.length);
  } else {
    result = allDigits.slice(0, decimalPos) + "." + allDigits.slice(decimalPos);
  }
  return (negative ? "-" : "") + result;
}

export function parseMoneyString(money: string): string {
  const cleaned = money.replace(/^\$/, "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(cleaned) || /[eE]/.test(cleaned)) {
    throw new Error(`Invalid money format: ${money}`);
  }
  return cleaned;
}

export function parseMoney(money: string | number): { amount: string; symbol?: string } {
  if (typeof money === "number") {
    return { amount: numberToDecimalString(money) };
  }
  const str = money.trim();
  const match = str.match(/^(\s*\$?\d+(?:\.\d+)?)\s*([A-Za-z]+)?$/);
  if (!match) {
    return { amount: parseMoneyString(str) };
  }
  const amount = parseMoneyString(match[1]);
  const symbol = match[2]?.toUpperCase();
  return { amount, ...(symbol && symbol !== "USD" ? { symbol } : {}) };
}

export function convertToTokenAmount(decimalAmount: string, decimals: number): string {
  const [intPart, fracPart = ""] = decimalAmount.split(".");
  const paddedFrac = fracPart.padEnd(decimals, "0").slice(0, decimals);
  const combined = (intPart + paddedFrac).replace(/^0+/, "");
  return combined === "" ? "0" : combined;
}

export const networkMatchesPattern = (pattern: string, network: string): boolean => {
  if (pattern === network || pattern === "*") return true;
  if (pattern.endsWith(":*")) {
    const prefix = pattern.slice(0, -1);
    return network.startsWith(prefix);
  }
  return false;
};

export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
    return false;
  }
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  const keys1 = Object.keys(obj1 as Record<string, unknown>);
  const keys2 = Object.keys(obj2 as Record<string, unknown>);
  if (keys1.length !== keys2.length) return false;
  for (const k of keys1) {
    if (!Object.prototype.hasOwnProperty.call(obj2, k)) return false;
    if (!deepEqual((obj1 as any)[k], (obj2 as any)[k])) return false;
  }
  return true;
}

export function toComparableArray(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return [...value].sort();
}

export const ADDITIVE_ARRAY_INFO_FIELDS: Record<string, ReadonlySet<string>> = {
  bazaar: new Set(["endpoints", "tools"]),
};

export const SERVER_OWNED_INFO_FIELDS: Record<string, ReadonlySet<string>> = {
  bazaar: new Set(["manifestUrl"]),
};

export const ADDITIVE_ARRAY_MAX_LENGTHS: Record<string, Record<string, number>> = {
  bazaar: { endpoints: 100, tools: 100 },
};

// ============================================================================
// BATCH 3 (FILES 21-30): EXTENSIONS & HTTP PROTOCOL INTEGRATION
// Bazaar Discovery, Offer-Receipt, Payment-Identifier, SIWX, Axios & Express
// ============================================================================

// ----------------------------------------------------------------------------
// File 21 & 22: Bazaar Discovery Extension (bazaar/index.ts & bazaar/types.ts)
// ----------------------------------------------------------------------------

export const BAZAAR_EXTENSION_KEY = 'bazaar';
export const BAZAAR = { key: 'bazaar' } as const;

export const QueryParamMethodsSchema = z.enum(['GET', 'HEAD', 'DELETE']);
export type QueryParamMethods = z.infer<typeof QueryParamMethodsSchema>;

export const BodyMethodsSchema = z.enum(['POST', 'PUT', 'PATCH']);
export type BodyMethods = z.infer<typeof BodyMethodsSchema>;

export const QueryDiscoveryInfoSchema = z.object({
  input: z.object({
    type: z.literal('http'),
    method: QueryParamMethodsSchema.optional(),
    queryParams: z.record(z.unknown()).optional(),
    pathParams: z.record(z.unknown()).optional(),
    headers: z.record(z.string()).optional(),
  }),
  output: z.object({
    type: z.string().optional(),
    format: z.string().optional(),
    example: z.unknown().optional(),
  }).optional(),
});
export type QueryDiscoveryInfo = z.infer<typeof QueryDiscoveryInfoSchema>;

export const BodyDiscoveryInfoSchema = z.object({
  input: z.object({
    type: z.literal('http'),
    method: BodyMethodsSchema.optional(),
    bodyType: z.enum(['json', 'form-data', 'x-www-form-urlencoded']).default('json').optional(),
    bodySchema: z.record(z.unknown()).optional(),
    pathParams: z.record(z.unknown()).optional(),
    headers: z.record(z.string()).optional(),
  }),
  output: z.object({
    type: z.string().optional(),
    format: z.string().optional(),
    example: z.unknown().optional(),
  }).optional(),
});
export type BodyDiscoveryInfo = z.infer<typeof BodyDiscoveryInfoSchema>;

export const McpDiscoveryInfoSchema = z.object({
  input: z.object({
    type: z.literal('mcp'),
    toolName: z.string(),
    description: z.string().optional(),
    transport: z.string().optional(),
    inputSchema: z.record(z.unknown()),
    example: z.record(z.unknown()).optional(),
  }),
  output: z.object({
    type: z.string().optional(),
    format: z.string().optional(),
    example: z.unknown().optional(),
  }).optional(),
});
export type McpDiscoveryInfo = z.infer<typeof McpDiscoveryInfoSchema>;

export const DiscoveryInfoSchema = z.union([
  QueryDiscoveryInfoSchema,
  BodyDiscoveryInfoSchema,
  McpDiscoveryInfoSchema,
]);
export type DiscoveryInfo = z.infer<typeof DiscoveryInfoSchema>;

export const QueryDiscoveryExtensionSchema = z.object({
  info: QueryDiscoveryInfoSchema,
  schema: z.record(z.unknown()),
});
export type QueryDiscoveryExtension = z.infer<typeof QueryDiscoveryExtensionSchema>;

export const BodyDiscoveryExtensionSchema = z.object({
  info: BodyDiscoveryInfoSchema,
  schema: z.record(z.unknown()),
});
export type BodyDiscoveryExtension = z.infer<typeof BodyDiscoveryExtensionSchema>;

export const McpDiscoveryExtensionSchema = z.object({
  info: McpDiscoveryInfoSchema,
  schema: z.record(z.unknown()),
});
export type McpDiscoveryExtension = z.infer<typeof McpDiscoveryExtensionSchema>;

export const BazaarDiscoveryExtensionSchema = z.union([
  QueryDiscoveryExtensionSchema,
  BodyDiscoveryExtensionSchema,
  McpDiscoveryExtensionSchema,
]);
export type BazaarDiscoveryExtension = z.infer<typeof BazaarDiscoveryExtensionSchema>;

export const DiscoveredHTTPResourceSchema = z.object({
  type: z.literal('http'),
  url: z.string(),
  method: z.string(),
  queryParams: z.record(z.unknown()).optional(),
  pathParams: z.record(z.unknown()).optional(),
  headers: z.record(z.string()).optional(),
  bodySchema: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
});
export type DiscoveredHTTPResource = z.infer<typeof DiscoveredHTTPResourceSchema>;

export const DiscoveredMCPResourceSchema = z.object({
  type: z.literal('mcp'),
  toolName: z.string(),
  description: z.string().optional(),
  transport: z.string().optional(),
  inputSchema: z.record(z.unknown()),
  output: z.record(z.unknown()).optional(),
});
export type DiscoveredMCPResource = z.infer<typeof DiscoveredMCPResourceSchema>;

export const DiscoveredResourceSchema = z.union([
  DiscoveredHTTPResourceSchema,
  DiscoveredMCPResourceSchema,
]);
export type DiscoveredResource = z.infer<typeof DiscoveredResourceSchema>;

export function isQueryExtensionConfig(config: any): boolean {
  return config && typeof config === 'object' && config.input && config.input.type === 'http' &&
    (!config.input.method || ['GET', 'HEAD', 'DELETE'].includes(config.input.method));
}

export function isBodyExtensionConfig(config: any): boolean {
  return config && typeof config === 'object' && config.input && config.input.type === 'http' &&
    (config.input.method && ['POST', 'PUT', 'PATCH'].includes(config.input.method));
}

export function isMcpExtensionConfig(config: any): boolean {
  return config && typeof config === 'object' && (config.toolName !== undefined || (config.input && config.input.type === 'mcp'));
}

export function isValidRouteTemplate(template: string): boolean {
  if (!template || typeof template !== 'string') return false;
  const paramMatches = template.match(/\{[^}]*\}/g) || [];
  for (const m of paramMatches) {
    if (m === '{}' || m.includes(' ') || m.includes('/')) return false;
  }
  return true;
}

export function declareDiscoveryExtension(config: any): BazaarDiscoveryExtension {
  if (isMcpExtensionConfig(config)) {
    const info: McpDiscoveryInfo = {
      input: {
        type: 'mcp',
        toolName: config.toolName || config.input?.toolName,
        description: config.description || config.input?.description,
        transport: config.transport || config.input?.transport || 'stdio',
        inputSchema: config.inputSchema || config.input?.inputSchema || {},
        example: config.example || config.input?.example,
      },
      output: config.output,
    };
    return {
      info,
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: { type: 'object', required: ['type', 'toolName', 'inputSchema'] },
        },
        required: ['input'],
      },
    };
  }

  if (isBodyExtensionConfig(config)) {
    const info: BodyDiscoveryInfo = {
      input: {
        type: 'http',
        method: config.input?.method || 'POST',
        bodyType: config.input?.bodyType || 'json',
        bodySchema: config.input?.bodySchema,
        pathParams: config.input?.pathParams,
        headers: config.input?.headers,
      },
      output: config.output,
    };
    return {
      info,
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: { type: 'object', required: ['type', 'method'] },
        },
        required: ['input'],
      },
    };
  }

  const info: QueryDiscoveryInfo = {
    input: {
      type: 'http',
      method: config.input?.method || 'GET',
      queryParams: config.input?.queryParams,
      pathParams: config.input?.pathParams,
      headers: config.input?.headers,
    },
    output: config.output,
  };
  return {
    info,
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        input: { type: 'object', required: ['type'] },
      },
      required: ['input'],
    },
  };
}

export function extractDiscoveryInfo(paymentPayload: any, paymentRequirements?: any): DiscoveryInfo | undefined {
  if (paymentPayload?.extensions?.[BAZAAR_EXTENSION_KEY]?.info) {
    return paymentPayload.extensions[BAZAAR_EXTENSION_KEY].info;
  }
  if (paymentRequirements?.outputSchema) {
    return {
      input: { type: 'http', method: 'GET' },
      output: { example: paymentRequirements.outputSchema },
    };
  }
  return undefined;
}


// ----------------------------------------------------------------------------
// File 23 & 24: Offer/Receipt Extension (offer-receipt/index.ts & types.ts)
// ----------------------------------------------------------------------------

export const OFFER_RECEIPT = 'offer-receipt';

export const SignatureFormatSchema = z.enum(['jws', 'eip712']);
export type SignatureFormat = z.infer<typeof SignatureFormatSchema>;

export const OfferPayloadSchema = z.object({
  version: z.number().int().default(1),
  resourceUrl: z.string(),
  scheme: z.string().default('exact'),
  network: z.string(),
  asset: z.string(),
  payTo: z.string(),
  amount: z.string().regex(/^\d+$/, 'Atomic amount string required'),
  validUntil: z.number().int().optional(),
});
export type OfferPayload = z.infer<typeof OfferPayloadSchema>;

export const JWSSignedOfferSchema = z.object({
  format: z.literal('jws'),
  acceptIndex: z.number().int().optional(),
  signature: z.string(),
});
export type JWSSignedOffer = z.infer<typeof JWSSignedOfferSchema>;

export const EIP712SignedOfferSchema = z.object({
  format: z.literal('eip712'),
  acceptIndex: z.number().int().optional(),
  payload: OfferPayloadSchema,
  signature: z.string(),
});
export type EIP712SignedOffer = z.infer<typeof EIP712SignedOfferSchema>;

export const SignedOfferSchema = z.union([JWSSignedOfferSchema, EIP712SignedOfferSchema]);
export type SignedOffer = z.infer<typeof SignedOfferSchema>;

export const ReceiptPayloadSchema = z.object({
  version: z.number().int().default(1),
  network: z.string(),
  resourceUrl: z.string(),
  payer: z.string(),
  issuedAt: z.number().int(),
  transaction: z.string().optional(),
});
export type ReceiptPayload = z.infer<typeof ReceiptPayloadSchema>;

export const JWSSignedReceiptSchema = z.object({
  format: z.literal('jws'),
  signature: z.string(),
});
export type JWSSignedReceipt = z.infer<typeof JWSSignedReceiptSchema>;

export const EIP712SignedReceiptSchema = z.object({
  format: z.literal('eip712'),
  payload: ReceiptPayloadSchema,
  signature: z.string(),
});
export type EIP712SignedReceipt = z.infer<typeof EIP712SignedReceiptSchema>;

export const SignedReceiptSchema = z.union([JWSSignedReceiptSchema, EIP712SignedReceiptSchema]);
export type SignedReceipt = z.infer<typeof SignedReceiptSchema>;

export const OfferReceiptDeclarationSchema = z.object({
  includeTxHash: z.boolean().default(false),
  offerValiditySeconds: z.number().int().default(300),
});
export type OfferReceiptDeclaration = z.infer<typeof OfferReceiptDeclarationSchema>;

export function isJWSSignedOffer(offer: SignedOffer): offer is JWSSignedOffer {
  return offer.format === 'jws';
}

export function isEIP712SignedOffer(offer: SignedOffer): offer is EIP712SignedOffer {
  return offer.format === 'eip712';
}

export function isJWSSignedReceipt(receipt: SignedReceipt): receipt is JWSSignedReceipt {
  return receipt.format === 'jws';
}

export function isEIP712SignedReceipt(receipt: SignedReceipt): receipt is EIP712SignedReceipt {
  return receipt.format === 'eip712';
}

export function verifyReceiptMatchesOffer(receiptPayload: ReceiptPayload, offerPayload: OfferPayload): boolean {
  if (receiptPayload.resourceUrl !== offerPayload.resourceUrl) return false;
  if (receiptPayload.network !== offerPayload.network) return false;
  return true;
}


// ----------------------------------------------------------------------------
// File 25 & 26: Payment Identifier Extension (payment-identifier/index.ts & types.ts)
// ----------------------------------------------------------------------------

export const PAYMENT_IDENTIFIER = 'payment-identifier';
export const PAYMENT_ID_MIN_LENGTH = 16;
export const PAYMENT_ID_MAX_LENGTH = 128;
export const PAYMENT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const PaymentIdentifierInfoSchema = z.object({
  required: z.boolean(),
  id: z.string()
    .min(PAYMENT_ID_MIN_LENGTH, `Payment identifier must be at least ${PAYMENT_ID_MIN_LENGTH} characters`)
    .max(PAYMENT_ID_MAX_LENGTH, `Payment identifier cannot exceed ${PAYMENT_ID_MAX_LENGTH} characters`)
    .regex(PAYMENT_ID_PATTERN, 'Payment identifier must contain only alphanumeric, dash, or underscore characters')
    .optional(),
});
export type PaymentIdentifierInfo = z.infer<typeof PaymentIdentifierInfoSchema>;

export const PaymentIdentifierExtensionSchema = z.object({
  info: PaymentIdentifierInfoSchema,
  schema: z.object({
    $schema: z.literal('https://json-schema.org/draft/2020-12/schema'),
    type: z.literal('object'),
    properties: z.record(z.unknown()),
    required: z.array(z.string()),
  }),
});
export type PaymentIdentifierExtension = z.infer<typeof PaymentIdentifierExtensionSchema>;

export function generatePaymentId(prefix = 'pay_'): string {
  const chars = '0123456789abcdef';
  let rand = '';
  for (let i = 0; i < 32; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${rand}`;
}

export function isValidPaymentId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.length < PAYMENT_ID_MIN_LENGTH || id.length > PAYMENT_ID_MAX_LENGTH) return false;
  return PAYMENT_ID_PATTERN.test(id);
}

export function isPaymentIdentifierExtension(extension: unknown): extension is PaymentIdentifierExtension {
  if (!extension || typeof extension !== 'object') return false;
  const ext = extension as any;
  return ext.info && typeof ext.info.required === 'boolean';
}

export function validatePaymentIdentifier(info: unknown): { isValid: boolean; error?: string } {
  const res = PaymentIdentifierInfoSchema.safeParse(info);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

export function extractPaymentIdentifier(payload: any): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  return payload.extensions?.[PAYMENT_IDENTIFIER]?.info?.id || payload.paymentIdentifier || payload.idempotencyKey;
}

export function appendPaymentIdentifierToExtensions(extensions: Record<string, any>, id?: string): Record<string, any> {
  const paymentId = id || generatePaymentId();
  extensions[PAYMENT_IDENTIFIER] = {
    info: {
      required: false,
      id: paymentId,
    },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        required: { type: 'boolean' },
        id: { type: 'string', minLength: PAYMENT_ID_MIN_LENGTH, maxLength: PAYMENT_ID_MAX_LENGTH, pattern: '^[a-zA-Z0-9_-]+$' },
      },
      required: ['required'],
    },
  };
  return extensions;
}

export function declarePaymentIdentifierExtension(required = false): PaymentIdentifierExtension {
  return {
    info: { required },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        required: { type: 'boolean' },
        id: { type: 'string', minLength: PAYMENT_ID_MIN_LENGTH, maxLength: PAYMENT_ID_MAX_LENGTH, pattern: '^[a-zA-Z0-9_-]+$' },
      },
      required: ['required'],
    },
  };
}


// ----------------------------------------------------------------------------
// File 27 & 28: Sign-In-With-X (SIWX) Extension (sign-in-with-x/index.ts & types.ts)
// ----------------------------------------------------------------------------

export const SIGN_IN_WITH_X = 'sign-in-with-x';
export const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
export const SOLANA_DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
export const SOLANA_TESTNET = 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z';

export const SignatureSchemeSchema = z.enum(['eip191', 'eip1271', 'eip6492', 'siws']);
export type SignatureScheme = z.infer<typeof SignatureSchemeSchema>;

export const SignatureTypeSchema = z.enum(['eip191', 'ed25519']);
export type SignatureType = z.infer<typeof SignatureTypeSchema>;

export const SupportedChainSchema = z.object({
  chainId: z.string(),
  type: SignatureTypeSchema,
  signatureScheme: SignatureSchemeSchema.optional(),
});
export type SupportedChain = z.infer<typeof SupportedChainSchema>;

export const SIWxExtensionInfoSchema = z.object({
  domain: z.string(),
  uri: z.string(),
  statement: z.string().optional(),
  version: z.string().default('1'),
  nonce: z.string(),
  issuedAt: z.string(),
  expirationTime: z.string().optional(),
  notBefore: z.string().optional(),
  requestId: z.string().optional(),
  resources: z.array(z.string()).max(1024).optional(),
});
export type SIWxExtensionInfo = z.infer<typeof SIWxExtensionInfoSchema>;

export const SIWxPayloadSchema = z.object({
  domain: z.string(),
  address: z.string(),
  statement: z.string().optional(),
  uri: z.string(),
  version: z.string(),
  chainId: z.string(),
  type: z.enum(['eip191', 'ed25519']),
  nonce: z.string(),
  issuedAt: z.string(),
  expirationTime: z.string().optional(),
  notBefore: z.string().optional(),
  requestId: z.string().optional(),
  resources: z.array(z.string()).max(1024).optional(),
  signatureScheme: z.enum(['eip191', 'eip1271', 'eip6492', 'siws']).optional(),
  signature: z.string(),
});
export type SIWxPayload = z.infer<typeof SIWxPayloadSchema>;

export const SIWxValidationResultSchema = z.discriminatedUnion('isValid', [
  z.object({ isValid: z.literal(true) }),
  z.object({
    isValid: z.literal(false),
    invalidReason: z.string(),
    invalidMessage: z.string(),
  }),
]);
export type SIWxValidationResult = z.infer<typeof SIWxValidationResultSchema>;

export const SIWxVerifyResultSchema = z.discriminatedUnion('isValid', [
  z.object({ isValid: z.literal(true), payer: z.string() }),
  z.object({
    isValid: z.literal(false),
    invalidReason: z.string(),
    invalidMessage: z.string(),
  }),
]);
export type SIWxVerifyResult = z.infer<typeof SIWxVerifyResultSchema>;

export async function validateSIWxMessage(
  message: SIWxPayload,
  expectedOrigin: URL,
  options?: {
    maxAge?: number;
    checkNonce?: (nonce: string) => boolean | Promise<boolean>;
  }
): Promise<SIWxValidationResult> {
  const maxAge = options?.maxAge ?? 5 * 60 * 1000; // 5 mins

  if (message.domain !== expectedOrigin.host) {
    return {
      isValid: false,
      invalidReason: 'invalid_siwx_domain_mismatch',
      invalidMessage: `Domain ${message.domain} does not match expected origin host ${expectedOrigin.host}`,
    };
  }

  try {
    const msgUrl = new URL(message.uri);
    if (msgUrl.origin !== expectedOrigin.origin) {
      return {
        isValid: false,
        invalidReason: 'invalid_siwx_uri_mismatch',
        invalidMessage: `URI origin ${msgUrl.origin} does not match expected origin ${expectedOrigin.origin}`,
      };
    }
  } catch {
    return {
      isValid: false,
      invalidReason: 'invalid_siwx_uri_mismatch',
      invalidMessage: `Invalid URI format: ${message.uri}`,
    };
  }

  const issuedAtTime = Date.parse(message.issuedAt);
  if (isNaN(issuedAtTime)) {
    return {
      isValid: false,
      invalidReason: 'invalid_siwx_issued_at',
      invalidMessage: 'Invalid issuedAt timestamp format',
    };
  }

  const now = Date.now();
  if (now - issuedAtTime > maxAge) {
    return {
      isValid: false,
      invalidReason: 'invalid_siwx_issued_at_too_old',
      invalidMessage: `issuedAt is older than maximum allowed age (${maxAge}ms)`,
    };
  }
  if (issuedAtTime > now + 60000) {
    return {
      isValid: false,
      invalidReason: 'invalid_siwx_issued_at_in_future',
      invalidMessage: 'issuedAt is in the future',
    };
  }

  if (message.expirationTime) {
    const expTime = Date.parse(message.expirationTime);
    if (isNaN(expTime)) {
      return {
        isValid: false,
        invalidReason: 'invalid_siwx_expiration_time',
        invalidMessage: 'Invalid expirationTime timestamp format',
      };
    }
    if (now >= expTime) {
      return {
        isValid: false,
        invalidReason: 'invalid_siwx_expired',
        invalidMessage: 'Signature has expired',
      };
    }
  }

  if (message.notBefore) {
    const notBeforeTime = Date.parse(message.notBefore);
    if (!isNaN(notBeforeTime) && now < notBeforeTime) {
      return {
        isValid: false,
        invalidReason: 'invalid_siwx_not_yet_valid',
        invalidMessage: 'Signature not yet valid',
      };
    }
  }

  if (options?.checkNonce) {
    const nonceOk = await options.checkNonce(message.nonce);
    if (!nonceOk) {
      return {
        isValid: false,
        invalidReason: 'invalid_siwx_nonce',
        invalidMessage: 'Nonce has already been used or is invalid',
      };
    }
  }

  return { isValid: true };
}


// ----------------------------------------------------------------------------
// File 29 & 30: HTTP 402 Paywall & Settlement Overrides (axios & express)
// ----------------------------------------------------------------------------

export const HEADER_PAYMENT_SIGNATURE = 'PAYMENT-SIGNATURE';
export const HEADER_PAYMENT_RESPONSE = 'PAYMENT-RESPONSE';
export const SETTLEMENT_OVERRIDES_HEADER = 'X-Settlement-Overrides';
export const MAX_CONTROL_PLANE_RESPONSE_BYTES = 100_000;

export const SettlementOverridesSchema = z.object({
  amount: z.string().optional(),
  asset: z.string().optional(),
}).passthrough();
export type SettlementOverrides = z.infer<typeof SettlementOverridesSchema>;

export function setSettlementOverrides(target: { setHeader?: (k: string, v: string) => void; header?: (k: string, v: string) => void }, overrides: SettlementOverrides): void {
  const jsonStr = JSON.stringify(overrides);
  if (typeof target.setHeader === 'function') {
    target.setHeader(SETTLEMENT_OVERRIDES_HEADER, jsonStr);
  } else if (typeof target.header === 'function') {
    target.header(SETTLEMENT_OVERRIDES_HEADER, jsonStr);
  }
}

export function extractSettlementOverrides(headers: Record<string, any>): SettlementOverrides | undefined {
  const raw = headers[SETTLEMENT_OVERRIDES_HEADER] || headers[SETTLEMENT_OVERRIDES_HEADER.toLowerCase()];
  if (!raw || typeof raw !== 'string') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}


// ============================================================================
// BATCH 4 (FILES 31-36): HTTP CLIENT/EDGE MIDDLEWARE, PAYWALL & EVM MECHANISMS
// Fastify, Fetch, Hono, Next.js, Paywall & EVM (EIP-3009, Permit2, Upto)
// ============================================================================

// ----------------------------------------------------------------------------
// File 35: Paywall Presentation & Configuration (http/paywall/src/types.ts)
// ----------------------------------------------------------------------------

export const PaywallConfigSchema = z.object({
  appName: z.string().optional(),
  appLogo: z.string().url().optional(),
  currentUrl: z.string().url().optional(),
  testnet: z.boolean().default(false),
  faucetUrls: z.record(z.string().url()).optional(),
  rpcUrls: z.record(z.string().url()).optional(),
  theme: z.enum(['light', 'dark', 'auto']).default('auto').optional(),
  customHtml: z.string().optional(),
});
export type PaywallConfig = z.infer<typeof PaywallConfigSchema>;

export interface PaywallProvider {
  getHtml(challenge: any, config?: PaywallConfig): Promise<string> | string;
}

// ----------------------------------------------------------------------------
// File 36: EVM Payment Mechanism Types & Invariants (mechanisms/evm/src/types.ts)
// ----------------------------------------------------------------------------

export const AssetTransferMethodSchema = z.enum(['eip3009', 'permit2']);
export type AssetTransferMethod = z.infer<typeof AssetTransferMethodSchema>;

export const StrictEIP3009AuthorizationSchema = z.object({
  from: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
  value: z.string().regex(/^[0-9]{1,78}$/, 'uint256 decimal string required'),
  validAfter: z.string().regex(/^[0-9]+$/, 'uint256 decimal string required'),
  validBefore: z.string().regex(/^[0-9]+$/, 'uint256 decimal string required'),
  nonce: z.string().regex(/^0x[0-9a-fA-F]{64}$/, '32-byte hex nonce required'),
});
export type StrictEIP3009Authorization = z.infer<typeof StrictEIP3009AuthorizationSchema>;

export const ExactEIP3009PayloadSchema = z.object({
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/, '65-byte hex signature required').optional(),
  authorization: StrictEIP3009AuthorizationSchema,
});
export type ExactEIP3009Payload = z.infer<typeof ExactEIP3009PayloadSchema>;

export const Permit2WitnessSchema = z.object({
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
  validAfter: z.string().regex(/^[0-9]+$/, 'uint256 decimal string required'),
});
export type Permit2Witness = z.infer<typeof Permit2WitnessSchema>;

export const Permit2AuthorizationSchema = z.object({
  from: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
  permitted: z.object({
    token: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
    amount: z.string().regex(/^[0-9]{1,78}$/, 'uint256 decimal string required'),
  }),
  spender: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
  nonce: z.string().regex(/^[0-9]+$/, 'uint256 decimal string required'),
  deadline: z.string().regex(/^[0-9]+$/, 'uint256 decimal string required'),
  witness: Permit2WitnessSchema,
});
export type Permit2Authorization = z.infer<typeof Permit2AuthorizationSchema>;

export const ExactPermit2PayloadSchema = z.object({
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/, '65-byte hex signature required'),
  permit2Authorization: Permit2AuthorizationSchema,
});
export type ExactPermit2Payload = z.infer<typeof ExactPermit2PayloadSchema>;

export const ExactEvmPayloadSchema = z.union([ExactEIP3009PayloadSchema, ExactPermit2PayloadSchema]);
export type ExactEvmPayload = z.infer<typeof ExactEvmPayloadSchema>;

export const UptoPermit2WitnessSchema = z.object({
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
  facilitator: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
  validAfter: z.string().regex(/^[0-9]+$/, 'uint256 decimal string required'),
});
export type UptoPermit2Witness = z.infer<typeof UptoPermit2WitnessSchema>;

export const UptoPermit2AuthorizationSchema = z.object({
  from: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
  permitted: z.object({
    token: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
    amount: z.string().regex(/^[0-9]{1,78}$/, 'uint256 decimal string required'),
  }),
  spender: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Valid 20-byte EVM address required'),
  nonce: z.string().regex(/^[0-9]+$/, 'uint256 decimal string required'),
  deadline: z.string().regex(/^[0-9]+$/, 'uint256 decimal string required'),
  witness: UptoPermit2WitnessSchema,
});
export type UptoPermit2Authorization = z.infer<typeof UptoPermit2AuthorizationSchema>;

export const UptoPermit2PayloadSchema = z.object({
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/, '65-byte hex signature required'),
  permit2Authorization: UptoPermit2AuthorizationSchema,
});
export type UptoPermit2Payload = z.infer<typeof UptoPermit2PayloadSchema>;

export function isPermit2Payload(payload: any): payload is ExactPermit2Payload {
  return payload && typeof payload === 'object' && 'permit2Authorization' in payload;
}

export function isEIP3009Payload(payload: any): payload is ExactEIP3009Payload {
  return payload && typeof payload === 'object' && 'authorization' in payload;
}

export function isUptoPermit2Payload(payload: any): payload is UptoPermit2Payload {
  if (!isPermit2Payload(payload)) return false;
  const auth = (payload as any).permit2Authorization;
  return auth && auth.witness && typeof auth.witness.facilitator === 'string';
}

export function validateEip3009Payload(payload: unknown): string | undefined {
  const res = ExactEIP3009PayloadSchema.safeParse(payload);
  if (!res.success) {
    return res.error.issues[0]?.message;
  }
  return undefined;
}

export function validateExactEvmPayload(payload: unknown): string | undefined {
  if (isPermit2Payload(payload)) {
    const res = ExactPermit2PayloadSchema.safeParse(payload);
    if (!res.success) return res.error.issues[0]?.message;
    return undefined;
  }
  return validateEip3009Payload(payload);
}

export function validateUptoPermit2Payload(payload: unknown): string | undefined {
  const res = UptoPermit2PayloadSchema.safeParse(payload);
  if (!res.success) {
    return res.error.issues[0]?.message;
  }
  return undefined;
}

export function getExactEvmPayloadPayer(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const p = payload as any;
  if (isPermit2Payload(p)) {
    return p.permit2Authorization?.from;
  }
  if (isEIP3009Payload(p)) {
    return p.authorization?.from;
  }
  return undefined;
}

/**
 * Safe HTTP/HTTPS URL schema preventing javascript:, data:, or file: protocol exploits.
 */
export const SafeHttpUrlSchema = z.string().url().refine(
  (urlStr) => {
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  },
  { message: 'URL must use http: or https: scheme' }
);

/**
 * CommonMark content schema rejecting raw HTML tags (<script>, <iframe>, <img onerror=...>)
 */
export const CommonMarkContentSchema = z.string().refine(
  (content) => !/<[a-z][\s\S]*>/i.test(content),
  { message: 'Raw HTML tags are prohibited in CommonMark content' }
);

/**
 * ACP RFC 9535 Compliant Conversational Message Error Schema
 */
export const AcpMessageErrorSchema = z.object({
  type: z.literal('error').default('error'),
  code: z.enum([
    'invalid',
    'out_of_stock',
    'address_unsupported',
    'three_ds_required',
    'declined',
    'missing',
    'expired',
  ]),
  message: z.string(),
  param: z.string().regex(/^\$\.[a-zA-Z0-9_.[\]]+$/, 'Must be a valid RFC 9535 JSONPath starting with $.'),
});

export type AcpMessageError = z.infer<typeof AcpMessageErrorSchema>;

/**
 * Category Smuggling & Prohibited Asset Interception Schemas
 */
export const ProhibitedAssetTokenSchema = z.enum([
  'gift card',
  'gift_card',
  'prepaid',
  'prepaid debit',
  'crypto',
  'cryptocurrency',
  'bitcoin',
  'usdt',
  'wire transfer',
  'wire',
  'casino',
  'gambling',
  'lottery',
  'reloadable voucher',
]);

export const CategorySmugglingItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  price_cents: z.number().int().nonnegative(),
});

export const CategorySmugglingCheckResultSchema = z.object({
  is_smuggled: z.boolean(),
  verdict: z.enum(['ALLOW', 'HOLD', 'BLOCK']),
  detected_tokens: z.array(z.string()),
  reason: z.string(),
  scanned_items_count: z.number().int().nonnegative(),
});

export type CategorySmugglingItem = z.infer<typeof CategorySmugglingItemSchema>;
export type CategorySmugglingCheckResult = z.infer<typeof CategorySmugglingCheckResultSchema>;

/**
 * Visa Compelling Evidence 3.0 (Rule 10.4) Evidence Schemas
 */
export const VisaCe3QualifyingTransactionSchema = z.object({
  order_id: z.string(),
  settled_at: z.string(),
  amount_cents: z.number().int().positive(),
  currency: z.string().default('USD'),
  matched_qualifiers: z.array(z.enum([
    'IP_ADDRESS',
    'DEVICE_FINGERPRINT',
    'SHIPPING_ADDRESS',
    'CUSTOMER_ACCOUNT_ID'
  ])),
});

export const VisaCe3EvidenceSchema = z.object({
  dispute_id: z.string(),
  buyer_id: z.string(),
  eligible: z.boolean(),
  reason: z.string().optional(),
  qualifying_transactions: z.array(VisaCe3QualifyingTransactionSchema),
  correlation_confidence: z.number().min(0).max(100),
  rebuttal_brief: z.string().optional(),
  exhibit_hashes: z.array(z.object({
    name: z.string(),
    sha256: z.string().length(64),
  })).optional(),
});

export type VisaCe3QualifyingTransaction = z.infer<typeof VisaCe3QualifyingTransactionSchema>;
export type VisaCe3Evidence = z.infer<typeof VisaCe3EvidenceSchema>;

/**
 * Pure TypeScript Perceptual Hash (dHash) & Deduplication Schemas
 */
export const PerceptualHashResultSchema = z.object({
  sha256: z.string().length(64),
  dHash: z.string().regex(/^[0-9a-fA-F]{16}$/, 'Must be a 64-bit hexadecimal dHash string'),
  is_duplicate: z.boolean(),
  hamming_distance: z.number().int().nonnegative().optional(),
  matched_claim_id: z.string().optional(),
});

export type PerceptualHashResult = z.infer<typeof PerceptualHashResultSchema>;

/**
 * Group Expense & Multi-Party Cart Split Schemas
 */
export const GroupSplitParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number().positive().optional().default(1),
});

export const GroupExpenseSplitSchema = z.object({
  total_cents: z.number().int().positive(),
  tip_cents: z.number().int().nonnegative().default(0),
  tax_cents: z.number().int().nonnegative().default(0),
  participants: z.array(GroupSplitParticipantSchema).min(1),
  shares: z.array(z.object({
    participant_id: z.string(),
    share_cents: z.number().int().nonnegative(),
    percentage: z.number().min(0).max(100),
  })),
  rounding_residual_cents: z.number().int().default(0),
});

export type GroupSplitParticipant = z.infer<typeof GroupSplitParticipantSchema>;
export type GroupExpenseSplit = z.infer<typeof GroupExpenseSplitSchema>;

/**
 * Dynamic Multi-Domain AI Buyer Memory Schemas
 */
export const UniversalBuyerFacetsSchema = z.object({
  userId: z.string().min(1),
  budget_elasticity: z.object({
    target_price_sensory: z.enum(['budget_strict', 'value_optimized', 'premium_first']).default('value_optimized'),
    max_spontaneous_spend_cents: z.number().int().nonnegative().default(10000), // $100
    requires_approval_above_cents: z.number().int().positive().default(25000), // $250
  }),
  preferred_brands: z.array(z.string()).default([]),
  avoided_brands: z.array(z.string()).default([]),
  preferred_fulfillment: z.enum(['express_shipping', 'economy_free', 'curbside_pickup']).default('economy_free'),
  merchant_minimum_trust_score: z.number().min(0).max(100).default(75),
});

export const DomainFacetSchema = z.object({
  category: z.string().min(1), // e.g. "computing", "apparel", "audio", "automotive", "grocery"
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  confidence_score: z.number().min(0).max(1).default(0.8),
  source_order_ids: z.array(z.string()).default([]),
  last_updated: z.string().datetime(),
});

export const DynamicBuyerProfileSchema = z.object({
  userId: z.string().min(1),
  universal: UniversalBuyerFacetsSchema,
  domain_facets: z.record(z.string(), DomainFacetSchema).default({}),
  purchase_velocity: z.object({
    total_orders_completed: z.number().int().nonnegative().default(0),
    lifetime_spend_cents: z.number().int().nonnegative().default(0),
    dispute_count: z.number().int().nonnegative().default(0),
  }),
  updated_at: z.string().datetime(),
});

export type UniversalBuyerFacets = z.infer<typeof UniversalBuyerFacetsSchema>;
export type DomainFacet = z.infer<typeof DomainFacetSchema>;
export type DynamicBuyerProfile = z.infer<typeof DynamicBuyerProfileSchema>;


// ============================================================================
// AllowAgent Constitutional Firewall & PayPal Agent Schemas & Utilities
// ============================================================================

export const ConstitutionModeSchema = z.enum(['PERSONAL', 'BUSINESS']);
export type ConstitutionMode = z.infer<typeof ConstitutionModeSchema>;

export const UnknownVendorPolicySchema = z.enum(['PAUSE_FOR_APPROVAL', 'HARD_BLOCK']);
export type UnknownVendorPolicy = z.infer<typeof UnknownVendorPolicySchema>;

export const TrustedVendorSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});
export type TrustedVendor = z.infer<typeof TrustedVendorSchema>;

export const SpendPolicySchema = z.object({
  mode: ConstitutionModeSchema,
  maxAutoPayUsd: z.number().nonnegative(),
  dailySpendCapUsd: z.number().nonnegative(),
  maxAutoRefundUsd: z.number().nonnegative(),
  priceCreepTolerancePercent: z.number().nonnegative(),
  requireHistoricalInvoiceCheck: z.boolean(),
  unknownVendorPolicy: UnknownVendorPolicySchema,
  requireNonDeliveryForRefundOrDispute: z.boolean(),
  blockPromptInjection: z.enum(['STRICT', 'WARN']),
  allowedTools: z.array(z.string()),
  trustedVendors: z.array(TrustedVendorSchema),
  parseWarnings: z.array(z.string()),
  isFailClosed: z.boolean(),
});
export type SpendPolicy = z.infer<typeof SpendPolicySchema>;

export const InjectionVectorTypeSchema = z.enum([
  'ROLE_OVERRIDE',
  'TOOL_SMUGGLING',
  'AUTHORITY_COERCION',
]);
export type InjectionVectorType = z.infer<typeof InjectionVectorTypeSchema>;

export const InjectionScanResultSchema = z.object({
  detected: z.boolean(),
  vectors: z.array(InjectionVectorTypeSchema),
  flaggedQuotes: z.array(z.string()),
  explanation: z.string(),
});
export type InjectionScanResult = z.infer<typeof InjectionScanResultSchema>;

export const ContradictionCodeSchema = z.enum([
  'INVALID_TOOL_ARGUMENTS',
  'MISSING_OR_INVALID_RESOURCE',
  'TOOL_NOT_IN_CONSTITUTION',
  'SPOOFED_VENDOR_DOMAIN',
  'NEW_UNVERIFIED_VENDOR',
  'PRICE_CREEP_DETECTED',
  'MAX_AUTOPAY_EXCEEDED',
  'DAILY_CAP_EXCEEDED',
  'DOUBLE_REFUND_DETECTED',
  'DELIVERED_REFUND_CONFLICT',
  'DELIVERED_DISPUTE_SURRENDER',
  'SUBSCRIPTION_PRICE_SPIKE',
]);
export type ContradictionCode = z.infer<typeof ContradictionCodeSchema>;

export const LedgerFindingSchema = z.object({
  code: ContradictionCodeSchema,
  severity: z.enum(['WARNING', 'CRITICAL']),
  title: z.string(),
  agentClaim: z.string(),
  ledgerFact: z.string(),
  readToolUsed: z.string(),
});
export type LedgerFinding = z.infer<typeof LedgerFindingSchema>;

export const CrossExamResultSchema = z.object({
  readToolsInvoked: z.array(z.string()),
  findings: z.array(LedgerFindingSchema),
  verifiedFactsComplete: z.boolean(),
  addedLineItems: z.array(z.any()).optional().default([]),
  verifiedBaselineUsd: z.number().optional(),
  ledgerUntrustedText: z.string().optional(),
  ledgerCitations: z.array(z.string()).optional().default([]),
});
export type CrossExamResult = z.infer<typeof CrossExamResultSchema>;

export const FirewallVerdictTypeSchema = z.enum([
  'AUTO_EXECUTE',
  'PAUSE_FOR_APPROVAL',
  'HARD_BLOCK',
]);
export type FirewallVerdictType = z.infer<typeof FirewallVerdictTypeSchema>;

export const EvidenceDiffCardSchema = z.object({
  payloadHash: z.string(),
  requestedAmountUsd: z.number(),
  baselineAmountUsd: z.number().optional(),
  deltaUsd: z.number().optional(),
  percentageIncrease: z.number().optional(),
  findings: z.array(LedgerFindingSchema),
  reasons: z.array(z.string()),
  severity: z.enum(['WARNING', 'CRITICAL']),
  recommendedAction: z.enum(['APPROVE', 'REJECT', 'ESCALATE']),
});
export type EvidenceDiffCard = z.infer<typeof EvidenceDiffCardSchema>;

export const FirewallEvaluationSchema = z.object({
  call: z.any(),
  injectionScan: InjectionScanResultSchema,
  crossExam: CrossExamResultSchema,
  verdict: FirewallVerdictTypeSchema,
  triggeredRule: z.string(),
  payloadHash: z.string(),
  diffCard: EvidenceDiffCardSchema.optional(),
  executionStatus: z.enum(['NOT_EXECUTED', 'PAUSED', 'BLOCKED', 'EXECUTED']),
  timestampIso: z.string(),
});
export type FirewallEvaluation = z.infer<typeof FirewallEvaluationSchema>;

export type PayPalMcpWriteTool =
  | 'pay_order'
  | 'record_payment_for_invoice'
  | 'create_order'
  | 'create_refund'
  | 'accept_dispute_claim'
  | 'update_subscription'
  | 'cancel_subscription';

export type PayPalMcpReadTool =
  | 'get_order'
  | 'get_invoice'
  | 'get_dispute'
  | 'get_subscription'
  | 'list_transactions'
  | 'list_invoices'
  | 'list_orders';

export const McpToolArgsSchema = z.object({
  orderId: z.string().optional(),
  invoiceId: z.string().optional(),
  disputeId: z.string().optional(),
  subscriptionId: z.string().optional(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().optional(),
  amountUsd: z.number().optional(),
  currency: z.string().optional(),
  reason: z.string().optional(),
  customId: z.string().optional(),
});
export type McpToolArgs = z.infer<typeof McpToolArgsSchema>;

export function usdCents(cents: number): string {
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

export function toCents(usd: number): number {
  return Math.round(usd * 100);
}

export function parseStrictUsdDollar(raw: string, rejectZero: boolean = false): number | null {
  const trimmed = raw.trim();
  const m = trimmed.match(/^\$?([0-9]+(?:\.[0-9]{1,2})?)\s*(?:usd)?$/i);
  if (!m || !m[1]) return null;
  const val = parseFloat(m[1]);
  if (!Number.isFinite(val) || val < 0) return null;
  if (rejectZero && val === 0) return null;
  return Math.round(val * 100) / 100;
}

export function parseStrictPercentage(raw: string): number | null {
  const trimmed = raw.trim();
  const m = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)\s*%?$/);
  if (!m || !m[1]) return null;
  const val = parseFloat(m[1]);
  if (!Number.isFinite(val) || val < 0 || val > 1000) return null;
  return Math.round(val * 100) / 100;
}

export const PayPalInvoiceLineItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unitAmountUsd: z.number(),
  totalUsd: z.number(),
});
export type PayPalInvoiceLineItem = z.infer<typeof PayPalInvoiceLineItemSchema>;

export const PayPalInvoiceRecordSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  merchantName: z.string(),
  merchantEmail: z.string(),
  amountUsd: z.number(),
  currency: z.string().default('USD'),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'CANCELLED']),
  items: z.array(PayPalInvoiceLineItemSchema).default([]),
  note: z.string().optional(),
});
export type PayPalInvoiceRecord = z.infer<typeof PayPalInvoiceRecordSchema>;

export const PayPalOrderRecordSchema = z.object({
  id: z.string(),
  merchantName: z.string(),
  merchantEmail: z.string(),
  amountUsd: z.number(),
  currency: z.string().default('USD'),
  status: z.enum(['CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED']),
  intent: z.enum(['CAPTURE', 'AUTHORIZE']),
});
export type PayPalOrderRecord = z.infer<typeof PayPalOrderRecordSchema>;

export const PayPalTransactionRecordSchema = z.object({
  id: z.string(),
  counterpartyName: z.string(),
  counterpartyEmail: z.string(),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  amountUsd: z.number(),
  currency: z.string().default('USD'),
  timestampIso: z.string(),
  status: z.enum(['SUCCESS', 'PENDING', 'DENIED', 'REVERSED']),
  note: z.string().optional(),
  type: z.enum(['PAYMENT', 'INVOICE_SETTLEMENT', 'REFUND', 'DISPUTE_PAYOUT', 'SUBSCRIPTION']),
});
export type PayPalTransactionRecord = z.infer<typeof PayPalTransactionRecordSchema>;

export const PayPalTrackingRecordSchema = z.object({
  trackingNumber: z.string(),
  carrier: z.string(),
  status: z.enum(['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED']),
  orderId: z.string(),
});
export type PayPalTrackingRecord = z.infer<typeof PayPalTrackingRecordSchema>;

export const PayPalDisputeRecordSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  buyerEmail: z.string(),
  disputedAmountUsd: z.number(),
  reason: z.string(),
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED']),
  buyerDeliveredConfirmed: z.boolean(),
});
export type PayPalDisputeRecord = z.infer<typeof PayPalDisputeRecordSchema>;

export const PayPalSubscriptionRecordSchema = z.object({
  id: z.string(),
  planName: z.string(),
  merchantName: z.string(),
  monthlyAmountUsd: z.number(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']),
  lastBilledIso: z.string(),
});
export type PayPalSubscriptionRecord = z.infer<typeof PayPalSubscriptionRecordSchema>;

export const PayPalSandboxStateSchema = z.object({
  invoices: z.array(PayPalInvoiceRecordSchema),
  orders: z.array(PayPalOrderRecordSchema),
  transactions: z.array(PayPalTransactionRecordSchema),
  tracking: z.array(PayPalTrackingRecordSchema),
  disputes: z.array(PayPalDisputeRecordSchema),
  subscriptions: z.array(PayPalSubscriptionRecordSchema),
  dailySpendAccumulatorUsd: z.number().default(0),
});
export type PayPalSandboxState = z.infer<typeof PayPalSandboxStateSchema>;

/**
 * PayPal Catalog Products & Billing Plans Contracts
 */
export const CreateProductSchema = z.object({
  name: z.string().min(1).max(127),
  description: z.string().max(256).optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE']).default('PHYSICAL'),
  category: z.string().min(1).max(127).default('ELECTRONICS'),
  image_url: z.string().url().optional(),
  home_url: z.string().url().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  allow_synthetic_intent: z.boolean().default(true),
  max_discount_percentage: z.number().min(0).max(100).default(10),
  min_instant_capture_cents: z.number().int().nonnegative().optional(),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const PatchProductOperationSchema = z.object({
  op: z.enum(['replace', 'add', 'remove']),
  path: z.string(),
  value: z.any().optional(),
});
export const PatchProductSchema = z.array(PatchProductOperationSchema);
export type PatchProductInput = z.infer<typeof PatchProductSchema>;

export const CreateBillingPlanSchema = z.object({
  product_id: z.string().min(1),
  name: z.string().min(1).max(127),
  description: z.string().max(127).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  billing_cycles: z.array(
    z.object({
      frequency: z.object({
        interval_unit: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']),
        interval_count: z.number().int().positive().default(1),
      }),
      tenure_type: z.enum(['REGULAR', 'TRIAL']).default('REGULAR'),
      sequence: z.number().int().positive().default(1),
      total_cycles: z.number().int().nonnegative().default(0),
      pricing_scheme: z.object({
        fixed_price: z.object({
          value: z.string(),
          currency_code: z.string().default('USD'),
        }),
      }).optional(),
    })
  ).min(1),
  payment_preferences: z.object({
    auto_bill_outstanding: z.boolean().default(true),
    setup_fee_failure_action: z.enum(['CONTINUE', 'CANCEL']).default('CONTINUE'),
    payment_failure_threshold: z.number().int().nonnegative().default(3),
    setup_fee: z.object({
      value: z.string(),
      currency_code: z.string().default('USD'),
    }).optional(),
  }).optional(),
});
export type CreateBillingPlanInput = z.infer<typeof CreateBillingPlanSchema>;

export const AiProductSuggestSchema = z.object({
  image_base64: z.string().optional(),
  image_url: z.string().url().optional(),
  prompt: z.string().optional(),
});
export type AiProductSuggestInput = z.infer<typeof AiProductSuggestSchema>;

export * from './logger.js';
