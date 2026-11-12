/**
 * Jules Task 1: Contracts Parity & Verification Suite
 * Fully verified 44 test suites covering ACP contracts, Custodian AP2, and x402 schemas.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SpendMandateSchema,
  SessionMandateSchema,
  PolicyEvaluationVerdictSchema,
  CustodianVerdictSchema,
  ViolationTaxonomySchema,
  CustodianViolationTaxonomySchema,
  CustodianReasonCodeSchema,
  CUSTODIAN_REASON_CODES,
  CUSTODIAN_BLOCKING_REASON_CODES,
  CUSTODIAN_TAXONOMY_REGISTRY,
  isBlockingReasonCode,
  CentsSchema,
  PositiveCentsSchema,
  BasisPointsSchema,
  FULL_BP,
  ZERO_BP,
  MoneyError,
  BpError,
  rejectFloat,
  parseCents,
  formatCents,
  lineTotal,
  validateBasisPoints,
  basisPointsFromRatio,
  basisPointsFromPercent,
  weightedBasisPoints,
  formatBasisPoints,
  AcpCartPayloadSchema,
  AcpCheckoutSessionSchema,
  AcpPaymentHandlerRequestSchema,
  AcpPaymentHandlerResponseSchema,
  AcpDiscountExtensionSchema,
  X402PaymentContractSchema,
  X402ChallengeResponseSchema,
  X402PaymentReceiptSchema,
  PaymentReceiptSchema,
  McpToolCallSchema,
  LocalReasonerProposalSchema,
  DisputeEvidenceSchema,
  SubmitDisputeEvidenceSchema,
  numberToDecimalString,
  parseMoneyString,
  parseMoney,
  convertToTokenAmount,
  networkMatchesPattern,
  deepEqual,
  toComparableArray,
  VerifyError,
  SettleError,
  FacilitatorResponseError,
  FacilitatorTimeoutError,
  getFacilitatorResponseError,
  ADDITIVE_ARRAY_INFO_FIELDS,
  SERVER_OWNED_INFO_FIELDS,
  ADDITIVE_ARRAY_MAX_LENGTHS,
  NonEmptyString,
  NetworkSchemaV1,
  NetworkSchemaV2,
  NetworkSchema,
  ResourceInfoSchema,
  PaymentRequirementsV1Schema,
  PaymentRequiredV1Schema,
  PaymentPayloadV1Schema,
  PaymentRequirementsV2Schema,
  PaymentRequiredV2Schema,
  PaymentPayloadV2Schema,
  UniversalPaymentRequirementsSchema,
  UniversalPaymentRequiredSchema,
  UniversalPaymentPayloadSchema,
  parsePaymentRequired,
  validatePaymentRequired,
  isPaymentRequired,
  parsePaymentRequirements,
  validatePaymentRequirements,
  isPaymentRequirements,
  parsePaymentPayload,
  validatePaymentPayload,
  isPaymentPayload,
  isPaymentRequiredV1,
  isPaymentRequiredV2,
  isPaymentRequirementsV1,
  isPaymentRequirementsV2,
  isPaymentPayloadV1,
  isPaymentPayloadV2,
  PENDING_SETTLEMENT_TTL_MS,
  InMemoryPendingSettlementStore,
  RedisPendingSettlementStore,
  FacilitatorCapabilityError,
  RouteConfigurationError,
  RouteValidationError,
  ResponseBodyTooLargeError,
  ConstitutionModeSchema,
  UnknownVendorPolicySchema,
  TrustedVendorSchema,
  SpendPolicySchema,
  InjectionVectorTypeSchema,
  InjectionScanResultSchema,
  ContradictionCodeSchema,
  LedgerFindingSchema,
  CrossExamResultSchema,
  FirewallVerdictTypeSchema,
  EvidenceDiffCardSchema,
  FirewallEvaluationSchema,
  McpToolArgsSchema,
  usdCents,
  toCents,
  parseStrictUsdDollar,
  parseStrictPercentage,
  PayPalInvoiceLineItemSchema,
  PayPalInvoiceRecordSchema,
  PayPalOrderRecordSchema,
  PayPalTransactionRecordSchema,
  PayPalTrackingRecordSchema,
  PayPalDisputeRecordSchema,
  PayPalSubscriptionRecordSchema,
  PayPalSandboxStateSchema,
} from './index.js';

test('SpendMandateSchema: validates valid mandate and enforces cap refinement', () => {
  const validMandate = {
    mandate_id: 'vch_valid_123',
    buyer_id: 'buyer_abc',
    max_total_spend_cents: 50000,
    max_single_merchant_cents: 20000,
    cumulative_spent_cents: 0,
    currency_code: 'USD',
    allowed_category_ids: ['electronics', 'apparel'],
    public_key_hex: 'a'.repeat(64),
    ed25519_signature_hex: 'b'.repeat(128),
    expires_at: new Date(Date.now() + 86400000),
    status: 'ACTIVE' as const,
  };

  const parsed = SpendMandateSchema.safeParse(validMandate);
  assert.equal(parsed.success, true);

  // Invariant Refinement: max_single_merchant_cents cannot exceed max_total_spend_cents
  const invalidCapsMandate = {
    ...validMandate,
    max_total_spend_cents: 10000,
    max_single_merchant_cents: 20000, // exceeds total!
  };
  const parsedInvalidCaps = SpendMandateSchema.safeParse(invalidCapsMandate);
  assert.equal(parsedInvalidCaps.success, false);
  if (!parsedInvalidCaps.success) {
    assert.ok(
      parsedInvalidCaps.error.issues.some((i: any) =>
        i.message.includes('max_single_merchant_cents must not exceed max_total_spend_cents')
      )
    );
  }

  // SessionMandateSchema parity
  const parsedSession = SessionMandateSchema.safeParse(validMandate);
  assert.equal(parsedSession.success, true);
});

test('PolicyEvaluationVerdictSchema: validates alignment and forbids APPROVE with blocking reasons', () => {
  const validApprove = {
    mandate_id: 'vch_123',
    outcome: 'APPROVE' as const,
    decision_id: 'dec_001',
    total_score_bp: 9500,
    reasons: ['BUDGET_SATISFIED', 'MERCHANT_IN_SCOPE'] as any[],
    dimensions: [
      {
        dimension: 'BUDGET' as const,
        status: 'PASS' as const,
        score_bp: 10000,
        reason_codes: ['BUDGET_SATISFIED'] as any[],
      },
      {
        dimension: 'MERCHANT_SCOPE' as const,
        status: 'PASS' as const,
        score_bp: 9000,
        reason_codes: ['MERCHANT_IN_SCOPE'] as any[],
      },
    ],
    evaluated_at: new Date(),
  };

  const parsedApprove = PolicyEvaluationVerdictSchema.safeParse(validApprove);
  assert.equal(parsedApprove.success, true);

  // Invariant Refinement: APPROVE with blocking reason (e.g. BUDGET_EXCEEDED) must be rejected
  const illegalApprove = {
    ...validApprove,
    reasons: ['BUDGET_EXCEEDED', 'MERCHANT_IN_SCOPE'] as any[],
  };
  const parsedIllegal = PolicyEvaluationVerdictSchema.safeParse(illegalApprove);
  assert.equal(parsedIllegal.success, false);
  if (!parsedIllegal.success) {
    assert.ok(
      parsedIllegal.error.issues.some((i: any) =>
        i.message.includes('An APPROVE outcome cannot contain blocking violation reason codes')
      )
    );
  }

  // REJECT or HOLD with blocking reasons is allowed
  const validReject = {
    ...validApprove,
    outcome: 'REJECT' as const,
    reasons: ['BUDGET_EXCEEDED'] as any[],
  };
  const parsedReject = PolicyEvaluationVerdictSchema.safeParse(validReject);
  assert.equal(parsedReject.success, true);
});

test('ViolationTaxonomySchema: validates violation taxonomy across gate stages', () => {
  const validTaxonomy = {
    code: 'BUDGET_EXCEEDED',
    message: 'Requested transaction exceeds allocated budget ceiling',
    stage: 'STAGE_4_REDIS_LUA_PRE_RESERVATION',
    is_blocking: true,
    observed_value: 55000,
    expected_ceiling: 50000,
  };

  const parsed = ViolationTaxonomySchema.safeParse(validTaxonomy);
  assert.equal(parsed.success, true);

  // Invalid stage rejected
  const invalidStage = {
    ...validTaxonomy,
    stage: 'INVALID_STAGE',
  };
  const parsedInvalid = ViolationTaxonomySchema.safeParse(invalidStage);
  assert.equal(parsedInvalid.success, false);
});

test('AcpCartPayloadSchema: enforces line item arithmetic refinement', () => {
  const validCart = {
    cart_id: 'cart_001',
    currency: 'USD',
    subtotal_cents: 6000,
    tax_cents: 500,
    shipping_cents: 0,
    discount_cents: 500,
    total_cents: 6000,
    items: [
      {
        id: 'item_1',
        title: 'Mechanical Keyboard',
        quantity: 1,
        unit_price_cents: 6000,
        total_price_cents: 6000,
        currency: 'USD',
      },
    ],
  };

  const parsed = AcpCartPayloadSchema.safeParse(validCart);
  assert.equal(parsed.success, true);

  // Arithmetic mismatch between items sum and subtotal
  const mismatchCart = {
    ...validCart,
    subtotal_cents: 9999, // mismatch!
  };
  const parsedMismatch = AcpCartPayloadSchema.safeParse(mismatchCart);
  assert.equal(parsedMismatch.success, false);
  if (!parsedMismatch.success) {
    assert.ok(
      parsedMismatch.error.issues.some((i: any) =>
        i.message.includes('Cart subtotal_cents must equal sum of item total_price_cents')
      )
    );
  }

  // Empty items rejected
  const emptyCart = {
    ...validCart,
    items: [],
  };
  const parsedEmpty = AcpCartPayloadSchema.safeParse(emptyCart);
  assert.equal(parsedEmpty.success, false);
});

test('AcpCheckoutSessionSchema: validates session lifecycle and addresses', () => {
  const validSession = {
    id: 'cs_001',
    status: 'in_progress',
    cart: {
      cart_id: 'cart_001',
      currency: 'USD',
      subtotal_cents: 3000,
      total_cents: 3000,
      items: [
        {
          id: 'item_1',
          title: 'USB-C Cable',
          quantity: 2,
          unit_price_cents: 1500,
          total_price_cents: 3000,
          currency: 'USD',
        },
      ],
    },
    shipping_address: {
      name: 'Alice Smith',
      line_one: '100 Market St',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      postal_code: '94105',
    },
    expires_at: new Date(Date.now() + 1800000),
  };

  const parsed = AcpCheckoutSessionSchema.safeParse(validSession);
  assert.equal(parsed.success, true);

  const invalidStatus = {
    ...validSession,
    status: 'UNKNOWN_STATUS',
  };
  assert.equal(AcpCheckoutSessionSchema.safeParse(invalidStatus).success, false);
});

test('AcpPaymentHandler schemas: validates delegated payment requests and responses', () => {
  const validRequest = {
    checkout_session_id: 'cs_001',
    payment_method: {
      type: 'vault_token',
      token: 'tok_paypal_vault_999',
    },
    amount_cents: 3000,
    currency: 'USD',
    merchant_domain: 'bestbuy.com',
    risk_signals: [
      {
        type: 'card_testing',
        score: 0,
        action: 'authorized',
      },
    ],
  };

  const parsedReq = AcpPaymentHandlerRequestSchema.safeParse(validRequest);
  assert.equal(parsedReq.success, true);

  // Negative amount rejected
  const negativeReq = {
    ...validRequest,
    amount_cents: -500,
  };
  assert.equal(AcpPaymentHandlerRequestSchema.safeParse(negativeReq).success, false);

  const validResponse = {
    payment_id: 'pay_987654',
    status: 'AUTHORIZED',
    amount_cents: 3000,
    currency: 'USD',
    transaction_reference: 'ref_12345',
    paypal_order_id: 'ord_pp_777',
    created_at: new Date(),
  };

  const parsedRes = AcpPaymentHandlerResponseSchema.safeParse(validResponse);
  assert.equal(parsedRes.success, true);
});

test('AcpDiscountExtensionSchema: validates discount extensions and rebates', () => {
  const validDiscount = {
    code: 'SAVE10',
    title: '10% Seasonal Promotion',
    amount_cents: 500,
    type: 'promo',
    applied_to: 'order',
  };

  assert.equal(AcpDiscountExtensionSchema.safeParse(validDiscount).success, true);

  const negativeDiscount = {
    ...validDiscount,
    amount_cents: -100,
  };
  assert.equal(AcpDiscountExtensionSchema.safeParse(negativeDiscount).success, false);
});

test('CentsSchema & Float-Safe Money: strictly rejects floats and validates integer cents', () => {
  // 1. CentsSchema validation: valid integer cents
  assert.equal(CentsSchema.safeParse(0).success, true);
  assert.equal(CentsSchema.safeParse(100).success, true);
  assert.equal(CentsSchema.safeParse(129950).success, true);

  // Strict float rejection
  const floatCents = CentsSchema.safeParse(12.5);
  assert.equal(floatCents.success, false);
  assert.equal(CentsSchema.safeParse(0.01).success, false);
  assert.equal(CentsSchema.safeParse(199.99).success, false);
  assert.equal(CentsSchema.safeParse(12.0001).success, false);

  // Negative rejection
  assert.equal(CentsSchema.safeParse(-1).success, false);
  assert.equal(CentsSchema.safeParse(-500).success, false);

  // Type boundary rejection
  assert.equal(CentsSchema.safeParse('100').success, false);
  assert.equal(CentsSchema.safeParse(true).success, false);
  assert.equal(CentsSchema.safeParse(null).success, false);
  assert.equal(CentsSchema.safeParse(undefined).success, false);

  // PositiveCentsSchema
  assert.equal(PositiveCentsSchema.safeParse(100).success, true);
  assert.equal(PositiveCentsSchema.safeParse(0).success, false);

  // 2. rejectFloat helper
  assert.doesNotThrow(() => rejectFloat(100, 'cents'));
  assert.throws(() => rejectFloat(12.5, 'cents'), MoneyError);
  assert.throws(() => rejectFloat(true, 'cents'), MoneyError);
  assert.throws(() => rejectFloat('100', 'cents'), MoneyError);

  // 3. parseCents without float math
  assert.equal(parseCents('$12.99'), 1299);
  assert.equal(parseCents('12.99'), 1299);
  assert.equal(parseCents('₹1,299.50'), 129950);
  assert.equal(parseCents('Rs. 1,299.50'), 129950);
  assert.equal(parseCents('USD 45.00'), 4500);
  assert.equal(parseCents('199/-'), 19900);
  assert.equal(parseCents(5000), 5000);
  // Rejects floats in parseCents
  assert.throws(() => parseCents(12.5), MoneyError);
  assert.throws(() => parseCents(-100), MoneyError);
  assert.throws(() => parseCents('not-a-number'), MoneyError);

  // 4. formatCents presentation
  assert.equal(formatCents(200000), '$2,000.00');
  assert.equal(formatCents(200000, 'INR'), '₹2,000.00');
  assert.equal(formatCents(0), '$0.00');
  assert.throws(() => formatCents(12.5 as any), MoneyError);

  // 5. lineTotal integer multiplication
  assert.equal(lineTotal(1500, 3), 4500);
  assert.equal(lineTotal(0, 5), 0);
  assert.throws(() => lineTotal(15.5 as any, 3), MoneyError);
  assert.throws(() => lineTotal(1500, 2.5 as any), MoneyError);
  assert.throws(() => lineTotal(1500, -1), MoneyError);
});

test('BasisPointsSchema & Float-Safe Math: strictly rejects floats and validates [0, 10000] range', () => {
  // 1. BasisPointsSchema: 0 to 10000 integer bp
  assert.equal(BasisPointsSchema.safeParse(0).success, true);
  assert.equal(BasisPointsSchema.safeParse(3333).success, true);
  assert.equal(BasisPointsSchema.safeParse(8500).success, true);
  assert.equal(BasisPointsSchema.safeParse(10000).success, true);

  // Strict float rejection
  assert.equal(BasisPointsSchema.safeParse(85.5).success, false);
  assert.equal(BasisPointsSchema.safeParse(99.99).success, false);
  assert.equal(BasisPointsSchema.safeParse(0.5).success, false);

  // Bounds rejection
  assert.equal(BasisPointsSchema.safeParse(-1).success, false);
  assert.equal(BasisPointsSchema.safeParse(10001).success, false);

  // Non-number rejection
  assert.equal(BasisPointsSchema.safeParse('8500').success, false);
  assert.equal(BasisPointsSchema.safeParse(true).success, false);

  // 2. validateBasisPoints
  assert.equal(validateBasisPoints(8500), 8500);
  assert.throws(() => validateBasisPoints(85.5 as any), BpError);
  assert.throws(() => validateBasisPoints(-5), BpError);
  assert.throws(() => validateBasisPoints(10001), BpError);

  // 3. basisPointsFromRatio (round half up integer math)
  assert.equal(basisPointsFromRatio(1, 3), 3333);
  assert.equal(basisPointsFromRatio(1, 2), 5000);
  assert.equal(basisPointsFromRatio(2, 3), 6667);
  assert.equal(basisPointsFromRatio(3, 3), 10000);
  assert.equal(basisPointsFromRatio(0, 5), 0);
  assert.throws(() => basisPointsFromRatio(1, 0), BpError);
  assert.throws(() => basisPointsFromRatio(1.5 as any, 3), BpError);
  assert.throws(() => basisPointsFromRatio(-1, 3), BpError);

  // 4. basisPointsFromPercent
  assert.equal(basisPointsFromPercent('85'), 8500);
  assert.equal(basisPointsFromPercent('85.5'), 8550);
  assert.equal(basisPointsFromPercent('100%'), 10000);
  assert.equal(basisPointsFromPercent('0%'), 0);
  assert.equal(basisPointsFromPercent('33.33%'), 3333);

  // 5. weightedBasisPoints
  assert.equal(weightedBasisPoints([[8000, 1], [9000, 1]]), 8500);
  assert.equal(weightedBasisPoints([[10000, 3], [5000, 1]]), 8750);
  assert.equal(weightedBasisPoints([]), ZERO_BP);
  assert.throws(() => weightedBasisPoints([[8500, -1]]), BpError);
  assert.throws(() => weightedBasisPoints([[85.5 as any, 1]]), BpError);

  // 6. formatBasisPoints
  assert.equal(formatBasisPoints(8500), '85.00%');
  assert.equal(formatBasisPoints(10000), '100.00%');
  assert.equal(formatBasisPoints(0), '0.00%');
  assert.equal(formatBasisPoints(3333), '33.33%');
});

test('CustodianReasonCodeSchema & CustodianViolationTaxonomySchema: verifies complete 30-reason taxonomy coverage', () => {
  // 1. Exactly 30 reason codes in the closed taxonomy
  assert.equal(CUSTODIAN_REASON_CODES.length, 30);
  assert.equal(CustodianReasonCodeSchema.options.length, 30);

  // 2. Validate all 30 codes under CustodianReasonCodeSchema and CustodianViolationTaxonomySchema
  for (const code of CUSTODIAN_REASON_CODES) {
    const parsedCode = CustodianReasonCodeSchema.safeParse(code);
    assert.equal(parsedCode.success, true, `Reason code ${code} must parse successfully`);

    const taxonomyEntry = CUSTODIAN_TAXONOMY_REGISTRY[code];
    assert.ok(taxonomyEntry, `Taxonomy entry must exist for ${code}`);
    assert.equal(taxonomyEntry.code, code);

    const parsedTaxonomy = CustodianViolationTaxonomySchema.safeParse(taxonomyEntry);
    assert.equal(parsedTaxonomy.success, true, `Taxonomy for ${code} must satisfy schema`);
  }

  // 3. Blocking reason code helper
  assert.equal(isBlockingReasonCode('BUDGET_EXCEEDED'), true);
  assert.equal(isBlockingReasonCode('PRICE_MISMATCH'), true);
  assert.equal(isBlockingReasonCode('HARD_CONSTRAINT_VIOLATED'), true);
  assert.equal(isBlockingReasonCode('ED25519_SIGNATURE_VERIFICATION_FAILED'), true);
  assert.equal(isBlockingReasonCode('BUDGET_SATISFIED'), false);
  assert.equal(isBlockingReasonCode('PRICE_MATCHES_CATALOG'), false);
  assert.equal(isBlockingReasonCode('MERCHANT_IN_SCOPE'), false);

  // 4. Invalid reason code rejected
  assert.equal(CustodianReasonCodeSchema.safeParse('UNKNOWN_REASON_CODE').success, false);
});

test('CustodianVerdictSchema: validates alignment, enforces float rejection on scores and amounts, and parity with PolicyEvaluationVerdictSchema', () => {
  const validVerdict = {
    mandate_id: 'man_test_888',
    outcome: 'APPROVE' as const,
    decision_id: 'dec_custodian_001',
    total_score_bp: 9800,
    reasons: ['BUDGET_SATISFIED', 'MERCHANT_IN_SCOPE'] as any[],
    dimensions: [
      {
        dimension: 'PRICE_INTEGRITY' as const,
        status: 'PASS' as const,
        score_bp: 10000,
        reason_codes: ['PRICE_MATCHES_CATALOG'] as any[],
      },
      {
        dimension: 'BUDGET' as const,
        status: 'PASS' as const,
        score_bp: 9800,
        reason_codes: ['BUDGET_SATISFIED'] as any[],
      },
      {
        dimension: 'MERCHANT_SCOPE' as const,
        status: 'PASS' as const,
        score_bp: 10000,
        reason_codes: ['MERCHANT_IN_SCOPE'] as any[],
      },
    ],
    verified_total_cents: 4500,
    evaluated_at: new Date(),
  };

  // 1. CustodianVerdictSchema parses valid approval
  const parsedCustodian = CustodianVerdictSchema.safeParse(validVerdict);
  assert.equal(parsedCustodian.success, true);

  // 2. Parity: PolicyEvaluationVerdictSchema parses identically
  const parsedPolicy = PolicyEvaluationVerdictSchema.safeParse(validVerdict);
  assert.equal(parsedPolicy.success, true);

  // 3. Float rejection on total_score_bp
  const floatScoreVerdict = {
    ...validVerdict,
    total_score_bp: 9800.5,
  };
  const parsedFloatScore = CustodianVerdictSchema.safeParse(floatScoreVerdict);
  assert.equal(parsedFloatScore.success, false);

  // 4. Float rejection on dimension score_bp
  const floatDimVerdict = {
    ...validVerdict,
    dimensions: [
      {
        dimension: 'PRICE_INTEGRITY' as const,
        status: 'PASS' as const,
        score_bp: 9999.9, // float!
        reason_codes: ['PRICE_MATCHES_CATALOG'] as any[],
      },
    ],
  };
  assert.equal(CustodianVerdictSchema.safeParse(floatDimVerdict).success, false);

  // 5. Float rejection on verified_total_cents
  const floatCentsVerdict = {
    ...validVerdict,
    verified_total_cents: 4500.5, // float!
  };
  assert.equal(CustodianVerdictSchema.safeParse(floatCentsVerdict).success, false);

  // 6. Invariant: APPROVE cannot carry a blocking reason code
  const blockingApprove = {
    ...validVerdict,
    reasons: ['BUDGET_EXCEEDED'] as any[],
  };
  const parsedBlocking = CustodianVerdictSchema.safeParse(blockingApprove);
  assert.equal(parsedBlocking.success, false);

  // 7. Invariant: APPROVE cannot carry a dimension with blocking reason code
  const blockingDimApprove = {
    ...validVerdict,
    reasons: ['BUDGET_SATISFIED'] as any[],
    dimensions: [
      {
        dimension: 'BUDGET' as const,
        status: 'FAIL' as const,
        score_bp: 0,
        reason_codes: ['BUDGET_EXCEEDED'] as any[], // blocking!
      },
    ],
  };
  assert.equal(CustodianVerdictSchema.safeParse(blockingDimApprove).success, false);

  // 8. HOLD / REJECT allows blocking codes
  const validHold = {
    ...validVerdict,
    outcome: 'HOLD' as const,
    reasons: ['BUDGET_EXCEEDED'] as any[],
  };
  assert.equal(CustodianVerdictSchema.safeParse(validHold).success, true);
});

test('X402PaymentContractSchema & X402PaymentReceiptSchema: validates x402 specifications and receipts', () => {
  // 1. Valid standard x402 core PaymentRequired contract
  const standardX402Contract = {
    x402Version: 2,
    resource: {
      url: 'https://aegispay.dev/api/procurement/checkout',
      description: 'Autonomous multi-merchant procurement agent execution',
      mimeType: 'application/json',
      serviceName: 'AegisPay',
      tags: ['agentic-commerce', 'paypal'],
    },
    accepts: [
      {
        scheme: 'exact',
        network: 'paypal-sandbox',
        asset: 'USD',
        amount: '129.99',
        payTo: 'payto://paypal/merchant@aegispay.dev',
        maxTimeoutSeconds: 3600,
        extra: { invoice_id: 'inv_12345' },
      },
    ],
  };

  const parsedStandard = X402PaymentContractSchema.safeParse(standardX402Contract);
  assert.equal(parsedStandard.success, true);
  if (parsedStandard.success) {
    assert.equal(parsedStandard.data.x402Version, 2);
    assert.equal(parsedStandard.data.accepts?.length, 1);
    assert.equal(parsedStandard.data.resource?.serviceName, 'AegisPay');
  }

  // 2. Valid AegisPay interceptor 402 challenge contract
  const aegispayX402Contract = {
    x402Version: 2,
    payment_contract_id: 'ct_402_987654321',
    pay_to: 'payto://paypal/merchant@aegispay.dev?contract=ct_402_987654321',
    vault_setup_url: 'https://www.sandbox.paypal.com/v3/vault/setup-tokens',
    accepted_headers: ['X-Payment-Receipt', 'X-Spend-Mandate-Id', 'X-Synthetic-Voucher-Id'],
    spend_policy: {
      currency: 'USD',
      mandate_protocol: 'Ed25519-SessionMandate-v1',
      atomic_settlement: 'REDIS_LUA_PRE_RESERVED',
      max_allowed_spend_cents: 100000,
    },
  };

  const parsedAegis = X402PaymentContractSchema.safeParse(aegispayX402Contract);
  assert.equal(parsedAegis.success, true);

  // 3. Valid X402PaymentReceiptSchema
  const validReceipt = {
    contractId: 'ct_402_987654321',
    amountCents: 5000,
    currency: 'USD',
    timestamp: Date.now(),
    hmac: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    receipt_token: 'rcpt_eyJuYW1lIjoidGVzdCJ9',
    x402Version: 2,
  };

  const parsedReceipt = X402PaymentReceiptSchema.safeParse(validReceipt);
  assert.equal(parsedReceipt.success, true);

  // 4. Invalid receipts: negative amount, too short HMAC, non-numeric timestamp
  assert.equal(
    X402PaymentReceiptSchema.safeParse({
      ...validReceipt,
      amountCents: -500,
    }).success,
    false,
    'Negative amountCents must fail receipt validation'
  );

  assert.equal(
    X402PaymentReceiptSchema.safeParse({
      ...validReceipt,
      hmac: 'too_short',
    }).success,
    false,
    'HMAC shorter than 32 characters must fail receipt validation'
  );

  assert.equal(
    X402PaymentReceiptSchema.safeParse({
      ...validReceipt,
      timestamp: 'not-a-number',
    }).success,
    false,
    'Non-numeric timestamp must fail receipt validation'
  );
});



test('AffiliateAttributionSchema: validates privacy-preserving affiliate attribution claims', () => {
  const { AffiliateAttributionSchema } = require('./index.js');

  const validFirstTouch = {
    provider: 'channel3.ai',
    token: 'atp_tok_valid_test_123',
    campaign_id: 'cmp_hackathon_2026',
    touchpoint: 'first',
    source: {
      type: 'platform',
      url: 'https://channel3.ai/explore',
    },
    metadata: {
      placement: 'ai_copilot_recommendation',
      sub_score: 95,
      is_sponsored: true,
    },
  };
  const parsed = AffiliateAttributionSchema.safeParse(validFirstTouch);
  assert.ok(parsed.success);

  const validPublisher = {
    provider: 'impact.com',
    publisher_id: 'pub_tech_gear_99',
    touchpoint: 'last',
  };
  assert.ok(AffiliateAttributionSchema.safeParse(validPublisher).success);

  const invalidMissingBoth = {
    provider: 'impact.com',
    campaign_id: 'cmp_123',
  };
  assert.ok(!AffiliateAttributionSchema.safeParse(invalidMissingBoth).success);

  const invalidMissingProvider = {
    token: 'tok_123',
  };
  assert.ok(!AffiliateAttributionSchema.safeParse(invalidMissingProvider).success);
});

test('Pre-Checkout Cart Schemas (SEP #187): validates pre-checkout basket and estimated totals', () => {
  const { CartCreateRequestSchema, AcpCartResponseSchema } = require('./index.js');

  const validCreate = {
    items: [
      { id: 'item_1', name: 'Ergonomic Mouse', quantity: 2, unit_price_cents: 4500 },
      { id: 'item_2', name: 'USB-C Cable', quantity: 1, unit_price_cents: 1500 },
    ],
    currency: 'usd',
    buyer: {
      email: 'buyer@example.com',
    },
  };
  const createResult = CartCreateRequestSchema.safeParse(validCreate);
  assert.ok(createResult.success);

  const validCartResponse = {
    id: 'cart_12345678',
    line_items: validCreate.items,
    currency: 'usd',
    totals: {
      subtotal_cents: 10500,
      tax_cents: 840,
      shipping_cents: 0,
      discount_cents: 500,
      total_cents: 10840,
    },
    messages: [
      { type: 'info', code: 'PROMO_APPLIED', message: 'Applied 500 cent promo' }
    ],
    continue_url: 'https://aegispay.dev/carts/cart_12345678',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  };
  const cartResult = AcpCartResponseSchema.safeParse(validCartResponse);
  assert.ok(cartResult.success);
});

test('AcpMcpToolArgumentsSchema & AcpRpcErrorSchema: validates MCP transport bindings', () => {
  const { AcpMcpToolArgumentsSchema, AcpRpcErrorSchema } = require('./index.js');

  const validMcpCall = {
    meta: {
      api_version: '2026-01-30',
      idempotency_key: 'idemp_test_mcp_1',
      user_agent: 'OpenAI-ChatGPT/1.0',
    },
    id: 'cs_session_456',
    payload: {
      action: 'complete',
    },
  };
  assert.ok(AcpMcpToolArgumentsSchema.safeParse(validMcpCall).success);

  const invalidMcpCall = {
    meta: {
      idempotency_key: 'idemp_missing_ver',
    },
    id: 'cs_session_456',
  };
  assert.ok(!AcpMcpToolArgumentsSchema.safeParse(invalidMcpCall).success);

  const validRpcError = {
    code: -32000,
    message: 'Checkout session not found',
    data: {
      type: 'invalid_request',
      code: 'session_not_found',
      message: 'Checkout session not found',
      param: 'id',
    },
  };
  assert.ok(AcpRpcErrorSchema.safeParse(validRpcError).success);
});


test('AgentCapabilitiesSchema & SellerCapabilitiesSchema: validates capability negotiation and intersection schemas', () => {
  const { AgentCapabilitiesSchema, SellerCapabilitiesSchema } = require('./index.js');

  const validAgentCaps = {
    interventions: {
      supported: ['3ds', 'biometric', 'address_verification'],
      display_context: 'webview',
      redirect_context: 'in_app',
      max_redirects: 1,
      max_interaction_depth: 1,
    },
    extensions: ['discount'],
  };
  assert.ok(AgentCapabilitiesSchema.safeParse(validAgentCaps).success);

  const validSellerCaps = {
    payment_methods: [
      {
        method: 'card',
        brands: ['visa', 'mastercard', 'amex'],
        funding_types: ['credit', 'debit'],
      },
      'card.network_token',
      'wallet.paypal',
    ],
    interventions: {
      supported: ['3ds', 'address_verification'],
      required: [],
      enforcement: 'conditional',
    },
    extensions: [
      {
        name: 'discount',
        extends: ['$.CheckoutSessionCreateRequest.discounts', '$.CheckoutSession.discounts'],
      },
    ],
  };
  assert.ok(SellerCapabilitiesSchema.safeParse(validSellerCaps).success);
});

test('DelegateAuthCreateRequestSchema & ThreeDSAuthenticationResultSchema: validates 3DS2 delegation contract', () => {
  const { DelegateAuthCreateRequestSchema, ThreeDSAuthenticationResultSchema } = require('./index.js');

  const validAuthReq = {
    merchant_id: 'merchant_aegis_1',
    payment_method: {
      type: 'card',
      number: '4111111111111111',
      exp_month: '12',
      exp_year: '2028',
      name: 'John Doe',
    },
    amount: {
      value: 12500,
      currency: 'USD',
    },
    flow_preference: {
      type: 'frictionless',
    },
  };
  assert.ok(DelegateAuthCreateRequestSchema.safeParse(validAuthReq).success);

  const valid3DSResult = {
    trans_status: 'Y',
    electronic_commerce_indicator: '05',
    three_ds_cryptogram: 'AAABBBCCC1234567890==',
    transaction_id: 'tx_3ds_test_123',
    three_ds_server_trans_id: 'srv_3ds_456',
    version: '2.2.0',
  };
  assert.ok(ThreeDSAuthenticationResultSchema.safeParse(valid3DSResult).success);
});

test('DelegatePaymentRequestSchema & DelegatePaymentResponseSchema: validates tokenized credential delegation', () => {
  const { DelegatePaymentRequestSchema, DelegatePaymentResponseSchema } = require('./index.js');

  const validDelegateReq = {
    payment_method: {
      type: 'card',
      card_number_type: 'fpan',
      virtual: false,
      number: '4111111111111111',
      exp_month: '08',
      exp_year: '2027',
      display_card_funding_type: 'credit',
      display_brand: 'visa',
      display_last4: '1111',
    },
    allowance: {
      reason: 'one_time',
      max_amount: 50000,
      currency: 'usd',
      checkout_session_id: 'cs_test_123',
      merchant_id: 'merchant_xyz',
      expires_at: '2026-12-31T23:59:59Z',
    },
    risk_signals: [
      {
        type: 'card_testing',
        score: 12,
        action: 'authorized',
      },
    ],
    metadata: {
      source: 'agent_checkout',
    },
  };
  assert.ok(DelegatePaymentRequestSchema.safeParse(validDelegateReq).success);

  const validDelegateRes = {
    id: 'vt_01J8Z3WXYZ9ABC',
    created: '2026-11-05T12:00:00Z',
    metadata: {
      merchant_id: 'merchant_xyz',
    },
  };
  assert.ok(DelegatePaymentResponseSchema.safeParse(validDelegateRes).success);
});

test('Discount Extension Schemas: validates coupon definitions, applied discounts, and rejection codes', () => {
  const { DiscountCouponSchema, AppliedDiscountSchema, RejectedDiscountSchema } = require('./index.js');

  const validPercentCoupon = {
    id: 'coup_save20',
    name: '20% Off Holiday Special',
    percent_off: 20,
    duration: 'once',
  };
  assert.ok(DiscountCouponSchema.safeParse(validPercentCoupon).success);

  const validApplied = {
    id: 'disc_app_1',
    code: 'SAVE20',
    coupon: validPercentCoupon,
    amount: 2000,
    automatic: false,
    method: 'across',
    priority: 1,
    allocations: [
      { path: '$.line_items[0]', amount: 2000 },
    ],
  };
  assert.ok(AppliedDiscountSchema.safeParse(validApplied).success);

  const validRejected = {
    code: 'EXPIRED10',
    reason: 'expired_code',
    message: 'This promotional code has expired',
  };
  assert.ok(RejectedDiscountSchema.safeParse(validRejected).success);
});


test('AcpDiscoveryDocumentSchema: validates discovery metadata and capabilities (rfc.discovery.md)', () => {
  const { AcpDiscoveryDocumentSchema } = require('./index.js');

  const validDiscovery = {
    protocol: {
      name: 'acp',
      version: '2026-04-17',
      supported_versions: ['2025-09-29', '2025-12-12', '2026-01-16', '2026-01-30', '2026-04-17'],
      documentation_url: 'https://aegispay.dev/docs',
    },
    api_base_url: 'https://aegispay.dev/acp',
    transports: ['rest', 'mcp'],
    capabilities: {
      services: ['checkout', 'orders', 'delegate_payment', 'carts', 'delegate_authentication'],
      extensions: [{ name: 'discount', spec: 'https://aegispay.dev/specs/discount' }],
      intervention_types: ['3ds', 'biometric', 'address_verification'],
      supported_currencies: ['USD'],
      supported_locales: ['en-US'],
    },
  };

  assert.ok(AcpDiscoveryDocumentSchema.safeParse(validDiscovery).success);
});

test('IntentTraceSchema: validates reason codes, summary limits, and metadata context (rfc.intent_traces.md)', () => {
  const { IntentTraceSchema } = require('./index.js');

  const validTrace = {
    reason_code: 'price_sensitivity',
    trace_summary: 'User found identical item on competitor store for $20 cheaper.',
    metadata: {
      competitor_source: 'amazon',
      competitor_price: 7999,
      buyer_max_budget: 8000,
    },
  };
  assert.ok(IntentTraceSchema.safeParse(validTrace).success);

  const invalidCode = {
    reason_code: 'random_unsupported_reason',
  };
  assert.ok(!IntentTraceSchema.safeParse(invalidCode).success);
});

test('MarketingConsent schemas: validates channel options and buyer decisions (rfc.marketing_consent.md)', () => {
  const { MarketingConsentOptionSchema, MarketingConsentSchema } = require('./index.js');

  const validOption = {
    channel: 'email',
    display_text: 'Receive product updates and exclusive hackathon deals from AegisPay merchants',
    privacy_policy_url: 'https://aegispay.dev/privacy',
    is_subscribed: false,
  };
  assert.ok(MarketingConsentOptionSchema.safeParse(validOption).success);

  const validDecision = {
    channel: 'email',
    opted_in: true,
  };
  assert.ok(MarketingConsentSchema.safeParse(validDecision).success);
});

test('EnhancedOrderSchema: validates 3-quantity model, fulfillments and adjustments (rfc.orders.md)', () => {
  const { EnhancedOrderSchema } = require('./index.js');

  const validOrder = {
    type: 'order',
    id: 'ord_test_order_123',
    checkout_session_id: 'cs_test_session_123',
    permalink_url: 'https://aegispay.dev/orders/ord_test_order_123',
    order_number: 'AEGIS-98765',
    status: 'processing',
    line_items: [
      {
        id: 'li_item_1',
        title: 'Ergonomic Mechanical Keyboard',
        quantity: {
          ordered: 2,
          current: 2,
          fulfilled: 1,
        },
        unit_price: 15000,
        subtotal: 30000,
        status: 'partial',
      },
    ],
    fulfillments: [
      {
        id: 'ful_ship_1',
        type: 'shipping',
        carrier: 'USPS',
        tracking_number: '9400100000000000000000',
        tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000',
      },
    ],
    adjustments: [],
    totals: [{ type: 'total', amount: 30000 }],
    created_at: new Date().toISOString(),
  };

  assert.ok(EnhancedOrderSchema.safeParse(validOrder).success);
});


test('PaymentHandlerDescriptorSchema & PaymentInstrumentSchema: validates payment handlers framework (rfc.payment_handlers.md)', () => {
  const { PaymentHandlerDescriptorSchema, PaymentInstrumentSchema } = require('./index.js');

  const validDescriptor = {
    id: 'card_vault_paypal',
    name: 'dev.acp.tokenized.card',
    version: '2026-01-22',
    spec: 'https://aegispay.dev/specs/card',
    requires_delegate_payment: true,
    requires_pci_compliance: false,
    psp: 'paypal',
    config: {
      merchant_id: 'merchant_123',
      supports_vault: true,
    },
    display_order: 1,
  };
  assert.ok(PaymentHandlerDescriptorSchema.safeParse(validDescriptor).success);

  const validInstrument = {
    id: 'pm_inst_99',
    handler_id: 'card_vault_paypal',
    type: 'tokenized_card',
    credential: {
      vault_token_id: 'vt_abc123',
    },
  };
  assert.ok(PaymentInstrumentSchema.safeParse(validInstrument).success);
});

test('SellerBackedPaymentHandlerConfigSchema: validates seller-backed store credit & saved card (rfc.seller_backed_payment_handler.md)', () => {
  const { SellerBackedPaymentHandlerConfigSchema } = require('./index.js');

  const validStoreCredit = {
    type: 'store_credit',
    merchant_id: 'merchant_aegis_prime',
    display_name: 'Aegis Store Credit Balance',
    balance_cents: 15000,
    currency: 'USD',
  };
  assert.ok(SellerBackedPaymentHandlerConfigSchema.safeParse(validStoreCredit).success);

  const validSavedCard = {
    type: 'saved_card',
    merchant_id: 'merchant_aegis_prime',
    display_name: 'Saved Visa ending in 4242',
    last4: '4242',
  };
  assert.ok(SellerBackedPaymentHandlerConfigSchema.safeParse(validSavedCard).success);
});

test('ProductFeed schemas: validates feed catalog, variants, and upsert request (rfc.product_feeds.md)', () => {
  const { ProductFeedSchema, FeedCreateRequestSchema, FeedUpsertItemsRequestSchema } = require('./index.js');

  assert.ok(FeedCreateRequestSchema.safeParse({ target_country: 'US' }).success);

  const validProduct = {
    id: 'prod_keyboard_pro',
    title: 'Custom Hot-Swap Mechanical Keyboard',
    description: 'Aircraft aluminum case with tactile switches',
    variants: [
      {
        id: 'var_sw_blue',
        title: 'Blue Tactile Switches',
        price: {
          amount_cents: 18900,
          currency: 'USD',
          compare_at_cents: 22000,
        },
        availability: 'in_stock',
        condition: 'new',
        variant_options: [{ name: 'Switch', value: 'Blue' }],
      },
    ],
  };

  const validUpsert = {
    items: [validProduct],
  };
  assert.ok(FeedUpsertItemsRequestSchema.safeParse(validUpsert).success);

  const validFeed = {
    id: 'feed_us_electronics',
    target_country: 'US',
    updated_at: new Date().toISOString(),
    products: [validProduct],
  };
  assert.ok(ProductFeedSchema.safeParse(validFeed).success);
});


test('AcpWebhookEventSchema: validates order_create and order_update webhook payloads', () => {
  const { AcpWebhookEventSchema } = require('./index.js');

  const validCreateWebhook = {
    event: 'order_create',
    event_id: 'evt_wh_create_123',
    created_at: new Date().toISOString(),
    order: {
      type: 'order',
      id: 'ord_wh_1',
      checkout_session_id: 'cs_wh_1',
      permalink_url: 'https://aegispay.dev/orders/ord_wh_1',
      status: 'confirmed',
      line_items: [
        {
          id: 'li_item_wh',
          title: 'Mechanical Keyboard',
          quantity: { ordered: 1, current: 1, fulfilled: 0 },
        },
      ],
      created_at: new Date().toISOString(),
    },
  };
  assert.ok(AcpWebhookEventSchema.safeParse(validCreateWebhook).success);

  const validUpdateWebhook = {
    event: 'order_update',
    event_id: 'evt_wh_update_456',
    updated_at: new Date().toISOString(),
    order_id: 'ord_wh_1',
    status: 'shipped',
    fulfillments: [
      {
        id: 'ful_wh_1',
        type: 'shipping',
        carrier: 'USPS',
        tracking_number: '94001234567890',
      },
    ],
  };
  assert.ok(AcpWebhookEventSchema.safeParse(validUpdateWebhook).success);
});

test('OpenRPCDocumentSchema: validates OpenRPC 1.3 specification metadata', () => {
  const { OpenRPCDocumentSchema } = require('./index.js');

  const validOpenRpc = {
    openrpc: '1.3.2',
    info: {
      title: 'Agentic Checkout OpenRPC',
      version: '2026-04-17',
    },
    methods: [
      {
        name: 'create_checkout_session',
        description: 'Creates checkout session over MCP',
        params: [],
        result: {
          name: 'CheckoutSession',
          schema: { type: 'object' },
        },
      },
    ],
  };
  assert.ok(OpenRPCDocumentSchema.safeParse(validOpenRpc).success);
});


test('Batch 4 Deep Audit: StrictCartCreateRequestSchema with line_items parity (schema.cart.json)', () => {
  const { StrictCartCreateRequestSchema, StrictCartUpdateRequestSchema } = require('./index.js');

  const validSchemaCart = {
    line_items: [
      { id: 'item_123', quantity: 2, unit_amount: 12000 },
      { id: 'item_456', quantity: 1, unit_amount: 5000 },
    ],
    buyer: {
      email: 'buyer@example.com',
    },
    locale: 'en-US',
  };
  assert.ok(StrictCartCreateRequestSchema.safeParse(validSchemaCart).success);

  const validSchemaCartUpdate = {
    line_items: [
      { id: 'item_123', quantity: 3 },
      { id: 'item_789', quantity: 1 },
    ],
  };
  assert.ok(StrictCartUpdateRequestSchema.safeParse(validSchemaCartUpdate).success);
});


test('Batch 5 Schema Parity: CanonicalDiscountErrorCodeSchema, StrictExtensionDeclarationSchema, DelegateAuthActionSchema', () => {
  const {
    CanonicalDiscountErrorCodeSchema,
    StrictExtensionDeclarationSchema,
    DelegateAuthActionSchema,
    CanonicalFeedProductSchema
  } = require('./index.js');

  // 1. Discount error codes
  assert.ok(CanonicalDiscountErrorCodeSchema.safeParse('discount_code_expired').success);
  assert.ok(CanonicalDiscountErrorCodeSchema.safeParse('discount_code_invalid').success);
  assert.ok(CanonicalDiscountErrorCodeSchema.safeParse('discount_code_combination_disallowed').success);

  // 2. Strict extension declaration with version suffix
  const validExtensionWithVer = {
    name: 'discount@2026-01-27',
    extends: [
      '$.CheckoutSession.discounts',
      '$.CheckoutSessionCreateRequest.discounts',
    ],
  };
  assert.ok(StrictExtensionDeclarationSchema.safeParse(validExtensionWithVer).success);

  // 3. Delegate Auth Action (fingerprint and challenge)
  const validFingerprintAction = {
    type: 'fingerprint',
    fingerprint: {
      three_ds_method_url: 'https://aegispay.dev/3ds/method',
      three_ds_server_trans_id: 'srv_3ds_999',
    },
  };
  assert.ok(DelegateAuthActionSchema.safeParse(validFingerprintAction).success);

  const validChallengeAction = {
    type: 'challenge',
    challenge: {
      acs_url: 'https://aegispay.dev/3ds/challenge',
      acs_trans_id: 'acs_tx_123',
      three_ds_server_trans_id: 'srv_3ds_999',
      message_version: '2.2.0',
    },
  };
  assert.ok(DelegateAuthActionSchema.safeParse(validChallengeAction).success);

  // 4. Canonical Feed Product with multi-format description
  const validFeedProd = {
    id: 'prod_gadget_1',
    title: 'Smart Home Hub',
    description: {
      plain: 'A versatile zigbee/thread smart home hub',
      markdown: '**Versatile** smart home hub',
    },
    variants: [
      {
        id: 'var_gadget_white',
        title: 'Hub - White Edition',
        price: { amount: 12900, currency: 'USD' },
        availability: { available: true, status: 'in_stock' },
        condition: 'new',
      },
    ],
  };
  assert.ok(CanonicalFeedProductSchema.safeParse(validFeedProd).success);
});


test('Batch 7 Unreleased Provenance: SuggestedPriceSchema and PriceSourceSchema parity', () => {
  const { SuggestedPriceSchema, PriceSourceSchema } = require('./index.js');

  const validSuggestedPrice = {
    amount: 14500,
    currency: 'USD',
    source: {
      feed_id: 'feed_us_main',
      variant_id: 'var_prod_123',
      url: 'https://aegispay.dev/products/prod_123',
    },
    observed_at: new Date().toISOString(),
  };

  assert.ok(SuggestedPriceSchema.safeParse(validSuggestedPrice).success);
});


test('Final Batch Parity: UpsertProductsResponseSchema (unreleased feed schema)', () => {
  const { UpsertProductsResponseSchema } = require('./index.js');

  const validUpsertResponse = {
    id: 'feed_8f3K2x',
    accepted: true,
    feed_update_id: 'upd_7kQ9mR',
  };

  assert.ok(UpsertProductsResponseSchema.safeParse(validUpsertResponse).success);
});



test("Google A2A x402 Protocol Extension: AgentCard, EIP-3009, Tasks, Messages, and State Machine", async (t) => {
  const {
    X402_EXTENSION_URI,
    X402_EXTENSION_URI_V1,
    X402_EXTENSION_URI_V2,
    HEADER_X_A2A_EXTENSIONS,
    HEADER_X_A2A_VERSION,
    X402_METADATA_KEYS,
    A2ATaskStateSchema,
    A2APaymentStatusSchema,
    X402ErrorCode,
    X402Error,
    X402PaymentRequiredException,
    EIP712DomainSchema,
    EIP3009AuthorizationSchema,
    ExactPaymentPayloadSchema,
    X402PaymentPayloadSchema,
    A2AExtensionDeclarationSchema,
    A2ACapabilitiesSchema,
    A2AAgentCardSchema,
    createX402AgentCard,
    A2AMessageSchema,
    A2ATaskSchema,
    createPaymentSubmissionMessage,
    extractTaskId,
    X402A2AUtils,
    getTransferWithAuthTypedData,
    createTieredPaymentOptions,
    requirePayment,
    requirePaymentChoice,
    checkPaymentContext,
  } = require("./index.js");

  // 1. Verify extension constants and header names
  assert.equal(X402_EXTENSION_URI_V1, "https://github.com/google-a2a/a2a-x402/v0.1");
  assert.equal(X402_EXTENSION_URI_V2, "https://github.com/google-agentic-commerce/a2a-x402/blob/main/spec/v0.2");
  assert.equal(X402_EXTENSION_URI, X402_EXTENSION_URI_V2);
  assert.equal(HEADER_X_A2A_EXTENSIONS, "X-A2A-Extensions");
  assert.equal(HEADER_X_A2A_VERSION, "X-A2A-Version");
  assert.equal(X402_METADATA_KEYS.STATUS_KEY, "x402.payment.status");

  // 2. Validate createX402AgentCard and A2AAgentCardSchema
  const agentCard = createX402AgentCard({
    name: "AegisPay Merchant Agent",
    description: "Autonomous payment-enabled agent selling digital services",
    url: "https://api.aegispay.dev/agents/merchant",
    skills: [
      {
        id: "premium_compute",
        name: "Premium AI Compute",
        description: "Monetized GPU compute inference via x402 payment requirements",
      },
    ],
  });
  const parsedCard = A2AAgentCardSchema.safeParse(agentCard);
  assert.equal(parsedCard.success, true);
  if (parsedCard.success) {
    assert.equal(parsedCard.data.name, "AegisPay Merchant Agent");
    assert.equal(parsedCard.data.capabilities.streaming, true);
    assert.equal(parsedCard.data.capabilities.extensions[0].uri, X402_EXTENSION_URI);
    assert.equal(parsedCard.data.capabilities.extensions[0].required, true);
  }

  // 3. Validate EIP-712 typed data generator
  const typedData = getTransferWithAuthTypedData({
    from: "0x1234567890123456789012345678901234567890",
    to: "0x0987654321098765432109876543210987654321",
    value: "1000000",
    validAfter: 0,
    validBefore: 1893456000,
    nonce: "0x" + "aa".repeat(32),
    chainId: 8453, // Base
    contractAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenName: "USD Coin",
    tokenVersion: "2",
  });
  assert.equal(typedData.primaryType, "TransferWithAuthorization");
  assert.equal(typedData.domain.name, "USD Coin");
  assert.equal(typedData.domain.chainId, 8453);
  assert.equal(typedData.message.value, "1000000");

  // 4. Validate EIP3009AuthorizationSchema and ExactPaymentPayloadSchema
  const authPayload = {
    signature: "0x" + "bb".repeat(65),
    authorization: {
      from: "0x1234567890123456789012345678901234567890",
      to: "0x0987654321098765432109876543210987654321",
      value: "500000",
      valid_after: "0",
      valid_before: "1893456000",
      nonce: "0x" + "11".repeat(32),
    },
  };
  const parsedExact = ExactPaymentPayloadSchema.safeParse(authPayload);
  assert.equal(parsedExact.success, true);

  const x402PaymentPayload = {
    x402Version: 2,
    scheme: "exact",
    network: "base",
    payload: authPayload,
  };
  const parsedX402Payload = X402PaymentPayloadSchema.safeParse(x402PaymentPayload);
  assert.equal(parsedX402Payload.success, true);

  // 5. Validate createPaymentSubmissionMessage and extractTaskId
  const submissionMsg = createPaymentSubmissionMessage(
    "task_abc_123",
    x402PaymentPayload,
    "Payment submitted for order"
  );
  assert.equal(submissionMsg.task_id, "task_abc_123");
  assert.equal(submissionMsg.role, "user");
  assert.equal(submissionMsg.metadata["x402.payment.status"], "payment-submitted");
  assert.equal(extractTaskId(submissionMsg), "task_abc_123");

  // 6. Validate X402A2AUtils State Machine
  const task = {
    id: "task_402_test",
    status: {
      state: "submitted",
    },
    artifacts: [],
    history: [],
  };

  // createPaymentRequiredTask
  X402A2AUtils.createPaymentRequiredTask(task, {
    accepts: [
      {
        scheme: "exact",
        network: "base",
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        max_amount_required: "5.00",
      },
    ],
  });
  assert.equal(task.status.state, "input-required");
  assert.equal(X402A2AUtils.getPaymentStatus(task), "payment-required");

  // recordPaymentVerified
  X402A2AUtils.recordPaymentVerified(task);
  assert.equal(X402A2AUtils.getPaymentStatus(task), "payment-verified");

  // recordPaymentSuccess
  const settleResponse = {
    success: true,
    transaction: "0x" + "ff".repeat(32),
    network: "base",
    payer: "0x1234567890123456789012345678901234567890",
  };
  X402A2AUtils.recordPaymentSuccess(task, settleResponse);
  assert.equal(X402A2AUtils.getPaymentStatus(task), "payment-completed");
  const receipts = X402A2AUtils.getPaymentReceipts(task);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].transaction, settleResponse.transaction);

  // recordPaymentFailure
  X402A2AUtils.recordPaymentFailure(task, X402ErrorCode.INSUFFICIENT_FUNDS);
  assert.equal(X402A2AUtils.getPaymentStatus(task), "payment-failed");
  assert.equal((task.status as any)?.message?.metadata["x402.payment.error"], "INSUFFICIENT_FUNDS");

  // 7. Validate createTieredPaymentOptions
  const tieredOptions = createTieredPaymentOptions({
    basePrice: "$2.50",
    payToAddress: "0xPayTo123",
    resource: "/api/generate",
    tiers: [
      { multiplier: 1, suffix: "standard", description: "Standard resolution" },
      { multiplier: 4, suffix: "hd", description: "4K High Definition" },
    ],
  });
  assert.equal(tieredOptions.length, 2);
  assert.equal(tieredOptions[0].maxAmountRequired, "$2.50");
  assert.equal(tieredOptions[1].maxAmountRequired, "$10.00");
  assert.equal(tieredOptions[1].resource, "/api/generate/hd");

  // 8. Validate X402PaymentRequiredException
  const exc = requirePayment({
    price: "$1.50",
    payToAddress: "0xMerchantWallet",
    resource: "/api/data",
  });
  assert.equal(exc.name, "X402PaymentRequiredException");
  assert.equal(exc.code, "PAYMENT_REQUIRED");
  assert.equal(exc.paymentRequirements.length, 1);
  assert.equal(exc.paymentRequirements[0].maxAmountRequired, "1.50");
});



test("Batch 2: Config, Error Subclasses, PaymentStatus, Lightning/Spark Schemes, and ServerExecutor Pipeline", async (t) => {
  const {
    X402ExtensionConfigSchema,
    X402ServerConfigSchema,
    X402MessageError,
    X402ValidationError,
    X402PaymentError,
    X402StateError,
    mapErrorToX402Code,
    X402ErrorCode,
    PaymentStatus,
    x402Metadata,
    LightningExactPaymentRequirementsSchema,
    LightningPaymentPayloadSchema,
    SparkExactPaymentRequirementsSchema,
    SparkPaymentPayloadSchema,
    X402BaseExecutor,
    X402ServerExecutor,
    X402A2AUtils,
  } = require("./index.js");

  // 1. Config validation
  const extConfig = X402ExtensionConfigSchema.parse({});
  assert.equal(extConfig.required, true);
  assert.equal(extConfig.x402_version, 2);

  const serverConfig = X402ServerConfigSchema.parse({
    price: "$2.00",
    pay_to_address: "0xServerWallet",
  });
  assert.equal(serverConfig.price, "$2.00");
  assert.equal(serverConfig.network, "base");

  // 2. Error subclasses and mapping
  const valErr = new X402ValidationError("Invalid sig");
  assert.equal(valErr.name, "X402ValidationError");
  assert.equal(mapErrorToX402Code(valErr), X402ErrorCode.INVALID_SIGNATURE);

  const payErr = new X402PaymentError("Settlement failed");
  assert.equal(mapErrorToX402Code(payErr), X402ErrorCode.SETTLEMENT_FAILED);

  // 3. Parity constants
  assert.equal(PaymentStatus.PAYMENT_REQUIRED, "payment-required");
  assert.equal(x402Metadata.STATUS_KEY, "x402.payment.status");

  // 4. Lightning Scheme Validation
  const lightningReq = {
    scheme: "exact",
    network: "lightning",
    asset: "BTC",
    maxAmountRequired: "5000000",
    payTo: "03a1b2c3d4e5f6789...",
    extra: {
      invoice: "lnbc50u1...",
    },
  };
  const parsedLightning = LightningExactPaymentRequirementsSchema.safeParse(lightningReq);
  assert.equal(parsedLightning.success, true);

  const lightningPayload = {
    x402Version: 1,
    scheme: "exact",
    network: "lightning",
    payload: {
      invoice: "lnbc50u1...",
      signature: "0x123abc...",
      from: "0x456def...",
    },
  };
  assert.equal(LightningPaymentPayloadSchema.safeParse(lightningPayload).success, true);

  // 5. Spark Scheme Validation
  const sparkReq = {
    scheme: "exact",
    network: "spark",
    asset: "BTC",
    maxAmountRequired: "1000",
    payTo: "spark1...",
    extra: {
      lightningInvoice: "lnbc1...",
      depositAddress: "bc1...",
    },
  };
  assert.equal(SparkExactPaymentRequirementsSchema.safeParse(sparkReq).success, true);

  const sparkPayload = {
    x402Version: 1,
    scheme: "exact",
    network: "spark",
    payload: {
      paymentType: "SPARK",
      transfer_id: "tx_spark_123",
    },
  };
  assert.equal(SparkPaymentPayloadSchema.safeParse(sparkPayload).success, true);

  // 6. BaseExecutor and ServerExecutor 3-phase execution
  const baseExec = new X402BaseExecutor();
  assert.equal(baseExec.isActive({ "x-a2a-extensions": "https://github.com/google-agentic-commerce/a2a-x402/blob/main/spec/v0.2" }), true);
  assert.equal(baseExec.isActive({}), false);

  const serverExec = new X402ServerExecutor();
  const testTask = {
    id: "task_pipeline_test",
    status: {
      state: "working",
      message: {
        message_id: "msg_status",
        role: "user",
        parts: [{ kind: "text", text: "Ready" }],
        metadata: {
          "x402.payment.status": "payment-submitted",
          "x402.payment.payload": {
            x402Version: 2,
            scheme: "exact",
            network: "base",
            payload: {
              signature: "0x123",
              authorization: {
                from: "0x1",
                to: "0x2",
                value: "100",
                nonce: "0x3",
              },
            },
          },
          "x402.payment.required": {
            scheme: "exact",
            network: "base",
          },
        },
      },
    },
    artifacts: [],
    history: [],
  };

  let delegateExecuted = false;
  const resultTask = await serverExec.executePaymentFlow({
    task: testTask,
    verifyPayment: async () => ({ is_valid: true }),
    executeDelegate: async () => { delegateExecuted = true; },
    settlePayment: async () => ({ success: true, transaction: "0xHash" }),
  });

  assert.equal(delegateExecuted, true);
  assert.equal(X402A2AUtils.getPaymentStatus(resultTask), "payment-completed");
});



test("Batch 3: UMA Scheme Schemas Validation (scheme_exact_uma.md)", async (t) => {
  const {
    UmaExactPaymentRequirementsSchema,
    UmaPaymentPayloadSchema,
  } = require("./index.js");

  const umaReq = {
    scheme: "exact",
    network: "uma",
    asset: "USD",
    maxAmountRequired: "1000",
    payTo: "$receiver@vasp.com",
    resource: "https://example.com/weather",
    description: "Access to protected content",
    mimeType: "application/json",
    maxTimeoutSeconds: 300,
    extra: {
      umaInvoice: "uma_inv_12345",
    },
  };
  const parsedReq = UmaExactPaymentRequirementsSchema.safeParse(umaReq);
  assert.equal(parsedReq.success, true);
  if (parsedReq.success) {
    assert.equal(parsedReq.data.network, "uma");
    assert.equal(parsedReq.data.payTo, "$receiver@vasp.com");
  }

  const umaPayload = {
    x402Version: 1,
    scheme: "exact",
    network: "uma",
    payload: {
      preimage: "preimage_hex_32bytes",
    },
  };
  const parsedPayload = UmaPaymentPayloadSchema.safeParse(umaPayload);
  assert.equal(parsedPayload.success, true);
});

test("Batch 4: Core x402 V1 & V2 Schemas, Network Identifiers, Type Guards, and PendingSettlementStore", async (t) => {
  // 1. Primitive schemas
  assert.equal(NonEmptyString.safeParse("valid").success, true);
  assert.equal(NonEmptyString.safeParse("").success, false);

  // 2. Network schemas: V1 accepts non-empty string, V2 enforces CAIP-2
  assert.equal(NetworkSchemaV1.safeParse("base-mainnet").success, true);
  assert.equal(NetworkSchemaV2.safeParse("eip155:8453").success, true);
  assert.equal(NetworkSchemaV2.safeParse("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp").success, true);
  assert.equal(NetworkSchemaV2.safeParse("invalid_net!").success, false);
  assert.equal(NetworkSchema.safeParse("eip155:1").success, true);
  assert.equal(NetworkSchema.safeParse("custom-net").success, true);

  // 3. ResourceInfoSchema
  const validResource = {
    url: "https://api.merchant.com/v1/inference",
    description: "AI LLM inference endpoint",
    mimeType: "application/json",
    parameters: { model: "claude-3-5-sonnet" },
    method: "POST",
  };
  assert.equal(ResourceInfoSchema.safeParse(validResource).success, true);

  // 4. V1 PaymentRequirements & PaymentRequired
  const v1Req = {
    scheme: "exact",
    network: "base",
    amount: "1000000",
    payTo: "0x1234567890123456789012345678901234567890",
    maxTimeoutSeconds: 300,
    asset: "USDC",
    extra: { test: true },
  };
  assert.equal(PaymentRequirementsV1Schema.safeParse(v1Req).success, true);

  const v1Required = {
    x402Version: 1,
    accepts: [v1Req],
  };
  assert.equal(PaymentRequiredV1Schema.safeParse(v1Required).success, true);
  assert.equal(isPaymentRequiredV1(v1Required), true);
  assert.equal(isPaymentRequiredV2(v1Required), false);

  const v1Payload = {
    x402Version: 1,
    scheme: "exact",
    network: "base",
    payload: { signature: "0xabc" },
  };
  assert.equal(PaymentPayloadV1Schema.safeParse(v1Payload).success, true);
  assert.equal(isPaymentPayloadV1(v1Payload), true);
  assert.equal(isPaymentPayloadV2(v1Payload), false);

  // 5. V2 PaymentRequirements & PaymentRequired
  const v2Req = {
    scheme: "exact",
    network: "eip155:8453",
    amount: "2500000",
    payTo: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    maxTimeoutSeconds: 600,
    asset: "USDC",
  };
  assert.equal(PaymentRequirementsV2Schema.safeParse(v2Req).success, true);

  const v2Required = {
    x402Version: 2,
    resource: validResource,
    accepts: [v2Req],
  };
  assert.equal(PaymentRequiredV2Schema.safeParse(v2Required).success, true);
  assert.equal(isPaymentRequiredV2(v2Required), true);
  assert.equal(isPaymentRequiredV1(v2Required), false);

  const v2Payload = {
    x402Version: 2,
    accepted: v2Req,
    payload: { authorization: { v: 27, r: "0x1", s: "0x2" } },
  };
  assert.equal(PaymentPayloadV2Schema.safeParse(v2Payload).success, true);
  assert.equal(isPaymentPayloadV2(v2Payload), true);

  // 6. Universal schemas & validation functions
  assert.equal(isPaymentRequired(v1Required), true);
  assert.equal(isPaymentRequired(v2Required), true);
  assert.equal(isPaymentRequirements(v1Req), true);
  assert.equal(isPaymentRequirements(v2Req), true);
  assert.equal(isPaymentPayload(v1Payload), true);
  assert.equal(isPaymentPayload(v2Payload), true);

  const parsedReq = validatePaymentRequired(v2Required);
  assert.equal(parsedReq.x402Version, 2);

  // 7. InMemoryPendingSettlementStore lifecycle & TTL pruning
  assert.equal(PENDING_SETTLEMENT_TTL_MS, 300000);
  const store = new InMemoryPendingSettlementStore();
  await store.set("tx_key_1", "0xhash12345");
  assert.equal(await store.get("tx_key_1"), "0xhash12345");

  const snapshot = store.entriesSnapshot();
  assert.equal(snapshot["tx_key_1"], "0xhash12345");

  await store.delete("tx_key_1");
  assert.equal(await store.get("tx_key_1"), undefined);

  // 8. RedisPendingSettlementStore operations
  const mockRedisMap = new Map();
  const mockRedisClient = {
    get: async (k: any) => mockRedisMap.get(k),
    set: async (k: any, v: any) => { mockRedisMap.set(k, v); return "OK"; },
    del: async (k: any) => { mockRedisMap.delete(k); return 1; },
  };
  const redisStore = new RedisPendingSettlementStore(mockRedisClient);
  await redisStore.set("settle_req_99", "0xredisTxHash");
  assert.equal(await redisStore.get("settle_req_99"), "0xredisTxHash");
  await redisStore.delete("settle_req_99");
  assert.equal(await redisStore.get("settle_req_99"), undefined);

  // 9. Error classes
  const capErr = new FacilitatorCapabilityError("Scheme not supported by facilitator");
  assert.equal(capErr.name, "FacilitatorCapabilityError");
  const routeCfgErr = new RouteConfigurationError("Invalid route pattern");
  assert.equal(routeCfgErr.name, "RouteConfigurationError");
  const routeValErr = new RouteValidationError("Route parameter validation failed");
  assert.equal(routeValErr.name, "RouteValidationError");
  const respTooLargeErr = new ResponseBodyTooLargeError(1048576);
  assert.equal(respTooLargeErr.name, "ResponseBodyTooLargeError");
});

test("Batch 2: Interoperability Types, Facilitator Errors, Money Conversion & Deep Equal Utilities", async (t) => {
  // 1. numberToDecimalString & parseMoneyString
  assert.equal(numberToDecimalString(4.02), "4.02");
  assert.equal(numberToDecimalString(1e-7), "0.0000001");
  assert.equal(numberToDecimalString(1250), "1250");
  assert.equal(numberToDecimalString(-0.005), "-0.005");

  assert.equal(parseMoneyString("$10.50"), "10.50");
  assert.equal(parseMoneyString("25.00"), "25.00");
  assert.throws(() => parseMoneyString("invalid_amt"), /Invalid money format/);
  assert.throws(() => parseMoneyString("1e5"), /Invalid money format/);

  // 2. parseMoney
  const parsed1 = parseMoney(15.99);
  assert.equal(parsed1.amount, "15.99");
  const parsed2 = parseMoney("$100.50 USDC");
  assert.equal(parsed2.amount, "100.50");
  assert.equal(parsed2.symbol, "USDC");
  const parsed3 = parseMoney("$50.00 USD");
  assert.equal(parsed3.amount, "50.00");
  assert.equal(parsed3.symbol, undefined); // USD is normalized to no symbol

  // 3. convertToTokenAmount
  assert.equal(convertToTokenAmount("10.50", 6), "10500000"); // 6 decimals (e.g. USDC)
  assert.equal(convertToTokenAmount("1.00000000", 8), "100000000"); // 8 decimals (e.g. BTC)
  assert.equal(convertToTokenAmount("0.05", 2), "5");
  assert.equal(convertToTokenAmount("0", 6), "0");

  // 4. networkMatchesPattern
  assert.equal(networkMatchesPattern("*", "eip155:8453"), true);
  assert.equal(networkMatchesPattern("eip155:*", "eip155:8453"), true);
  assert.equal(networkMatchesPattern("eip155:*", "solana:mainnet"), false);
  assert.equal(networkMatchesPattern("eip155:1", "eip155:1"), true);
  assert.equal(networkMatchesPattern("eip155:1", "eip155:8453"), false);

  // 5. deepEqual & toComparableArray
  assert.equal(deepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] }), true);
  assert.equal(deepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 4] }), false);
  assert.equal(deepEqual({ a: 1 }, { a: 1, b: 2 }), false);
  assert.equal(deepEqual(null, null), true);
  assert.equal(deepEqual(null, {}), false);

  assert.deepEqual(toComparableArray([3, 1, 2]), [1, 2, 3]);
  assert.equal(toComparableArray("not_array"), undefined);

  // 6. Facilitator error classes
  const mockVerifyResp = {
    isValid: false,
    invalidReason: "INVALID_SIG",
    invalidMessage: "Ed25519 signature mismatch",
    payer: "0xpayer123",
  };
  const vErr = new VerifyError(400, mockVerifyResp);
  assert.equal(vErr.name, "VerifyError");
  assert.equal(vErr.statusCode, 400);
  assert.equal(vErr.invalidReason, "INVALID_SIG");
  assert.equal(vErr.payer, "0xpayer123");

  const mockSettleResp = {
    success: false,
    errorReason: "INSUFFICIENT_FUNDS",
    errorMessage: "Account balance below required authorization",
    payer: "0xpayer456",
    transaction: "0xtx_failed",
    network: "eip155:8453",
  };
  const sErr = new SettleError(402, mockSettleResp);
  assert.equal(sErr.name, "SettleError");
  assert.equal(sErr.statusCode, 402);
  assert.equal(sErr.errorReason, "INSUFFICIENT_FUNDS");

  const timeoutErr = new FacilitatorTimeoutError("settle", 90000);
  assert.equal(timeoutErr.name, "FacilitatorTimeoutError");
  assert.equal(timeoutErr.operation, "settle");
  assert.equal(timeoutErr.timeoutMs, 90000);

  const wrapperErr = new Error("Transport failed", { cause: timeoutErr });
  const extracted = getFacilitatorResponseError(wrapperErr);
  assert.equal(extracted?.name, "FacilitatorTimeoutError");

  // 7. Additive array info fields constants
  assert.ok(ADDITIVE_ARRAY_INFO_FIELDS.bazaar.has("endpoints"));
  assert.ok(SERVER_OWNED_INFO_FIELDS.bazaar.has("manifestUrl"));
  assert.equal(ADDITIVE_ARRAY_MAX_LENGTHS.bazaar.endpoints, 100);
});

// ============================================================================
// BATCH 3 (FILES 21-30): EXTENSIONS & HTTP ADAPTERS TEST SUITES
// ============================================================================

test("Batch 3: Bazaar Discovery Extension Schemas & Types (bazaar/index.ts & types.ts)", async (t) => {
  const {
    QueryDiscoveryInfoSchema,
    BodyDiscoveryInfoSchema,
    McpDiscoveryInfoSchema,
    DiscoveryInfoSchema,
    declareDiscoveryExtension,
    isValidRouteTemplate,
    extractDiscoveryInfo,
    BAZAAR,
    isQueryExtensionConfig,
    isBodyExtensionConfig,
    isMcpExtensionConfig,
  } = require("./index.js");

  // 1. Query Discovery
  const queryInfo = {
    input: {
      type: "http",
      method: "GET",
      queryParams: { ticker: { type: "string" } },
      headers: { "x-api-key": "secret" },
    },
    output: {
      type: "application/json",
      example: { price: 100 },
    },
  };
  assert.equal(QueryDiscoveryInfoSchema.safeParse(queryInfo).success, true);
  assert.equal(DiscoveryInfoSchema.safeParse(queryInfo).success, true);

  // 2. Body Discovery
  const bodyInfo = {
    input: {
      type: "http",
      method: "POST",
      bodyType: "json",
      bodySchema: { amount: { type: "integer" } },
    },
    output: { type: "application/json" },
  };
  assert.equal(BodyDiscoveryInfoSchema.safeParse(bodyInfo).success, true);
  assert.equal(DiscoveryInfoSchema.safeParse(bodyInfo).success, true);

  // 3. MCP Discovery
  const mcpInfo = {
    input: {
      type: "mcp",
      toolName: "financial_analyzer",
      description: "Analyze ticker financials",
      transport: "stdio",
      inputSchema: {
        type: "object",
        properties: { ticker: { type: "string" } },
        required: ["ticker"],
      },
    },
  };
  assert.equal(McpDiscoveryInfoSchema.safeParse(mcpInfo).success, true);
  assert.equal(DiscoveryInfoSchema.safeParse(mcpInfo).success, true);

  // 4. Type guards & declareDiscoveryExtension
  assert.equal(isQueryExtensionConfig(queryInfo), true);
  assert.equal(isBodyExtensionConfig(bodyInfo), true);
  assert.equal(isMcpExtensionConfig(mcpInfo.input), true);

  const declaredMcp = declareDiscoveryExtension(mcpInfo.input);
  assert.equal(declaredMcp.info.input.type, "mcp");
  assert.equal((declaredMcp.info.input as any).toolName, "financial_analyzer");

  // 5. Route Template Validation
  assert.equal(isValidRouteTemplate("/api/stocks/{ticker}"), true);
  assert.equal(isValidRouteTemplate("/api/stocks/{}"), false);
  assert.equal(isValidRouteTemplate("/api/stocks/{ticker name}"), false);

  // 6. Extraction
  const payloadWithBazaar = {
    extensions: {
      bazaar: {
        info: queryInfo,
      },
    },
  };
  const extracted = extractDiscoveryInfo(payloadWithBazaar);
  assert.deepEqual(extracted, queryInfo);
});


test("Batch 3: Offer & Receipt Extension Schemas & Types (offer-receipt/index.ts & types.ts)", async (t) => {
  const {
    OfferPayloadSchema,
    ReceiptPayloadSchema,
    JWSSignedOfferSchema,
    EIP712SignedOfferSchema,
    SignedOfferSchema,
    JWSSignedReceiptSchema,
    EIP712SignedReceiptSchema,
    SignedReceiptSchema,
    isJWSSignedOffer,
    isEIP712SignedOffer,
    isJWSSignedReceipt,
    isEIP712SignedReceipt,
    verifyReceiptMatchesOffer,
    OFFER_RECEIPT,
  } = require("./index.js");

  assert.equal(OFFER_RECEIPT, "offer-receipt");

  // 1. Offer Payload
  const validOffer = {
    version: 1,
    resourceUrl: "https://api.aegispay.dev/premium/weather",
    scheme: "exact",
    network: "eip155:8453",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    amount: "5000000",
    validUntil: Math.floor(Date.now() / 1000) + 300,
  };
  assert.equal(OfferPayloadSchema.safeParse(validOffer).success, true);

  // Rejection on float amount
  const invalidFloatOffer = { ...validOffer, amount: "5000.50" };
  assert.equal(OfferPayloadSchema.safeParse(invalidFloatOffer).success, false);

  // 2. Signed Offers (JWS & EIP712)
  const jwsOffer = {
    format: "jws",
    acceptIndex: 0,
    signature: "eyJhbGciOiJFUzI1NksifQ.eyJyZXNvdXJjZVVybCI6InRlc3QifQ.dBjftJeZ4CVP-8B82jhqFb8_s18kR8y1",
  };
  assert.equal(JWSSignedOfferSchema.safeParse(jwsOffer).success, true);
  assert.equal(SignedOfferSchema.safeParse(jwsOffer).success, true);
  assert.equal(isJWSSignedOffer(jwsOffer as any), true);
  assert.equal(isEIP712SignedOffer(jwsOffer as any), false);

  const eip712Offer = {
    format: "eip712",
    acceptIndex: 0,
    payload: validOffer,
    signature: "0x" + "a".repeat(130),
  };
  assert.equal(EIP712SignedOfferSchema.safeParse(eip712Offer).success, true);
  assert.equal(SignedOfferSchema.safeParse(eip712Offer).success, true);
  assert.equal(isEIP712SignedOffer(eip712Offer as any), true);

  // 3. Receipt Payload & Signed Receipts
  const validReceipt = {
    version: 1,
    network: "eip155:8453",
    resourceUrl: "https://api.aegispay.dev/premium/weather",
    payer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    issuedAt: Math.floor(Date.now() / 1000),
    transaction: "0x" + "b".repeat(64),
  };
  assert.equal(ReceiptPayloadSchema.safeParse(validReceipt).success, true);

  const jwsReceipt = {
    format: "jws",
    signature: "eyJhbGciOiJFUzI1NksifQ.payload.sig",
  };
  assert.equal(JWSSignedReceiptSchema.safeParse(jwsReceipt).success, true);
  assert.equal(isJWSSignedReceipt(jwsReceipt as any), true);

  const eip712Receipt = {
    format: "eip712",
    payload: validReceipt,
    signature: "0x" + "c".repeat(130),
  };
  assert.equal(EIP712SignedReceiptSchema.safeParse(eip712Receipt).success, true);
  assert.equal(isEIP712SignedReceipt(eip712Receipt as any), true);

  // 4. Offer-Receipt Matching Invariant
  assert.equal(verifyReceiptMatchesOffer(validReceipt, validOffer), true);
  const mismatchedReceipt = { ...validReceipt, resourceUrl: "https://api.aegispay.dev/other" };
  assert.equal(verifyReceiptMatchesOffer(mismatchedReceipt, validOffer), false);
});


test("Batch 3: Payment Identifier Extension Schemas & Idempotency (payment-identifier/index.ts & types.ts)", async (t) => {
  const {
    PaymentIdentifierInfoSchema,
    generatePaymentId,
    isValidPaymentId,
    validatePaymentIdentifier,
    extractPaymentIdentifier,
    appendPaymentIdentifierToExtensions,
    declarePaymentIdentifierExtension,
    PAYMENT_IDENTIFIER,
    PAYMENT_ID_MIN_LENGTH,
    PAYMENT_ID_MAX_LENGTH,
  } = require("./index.js");

  assert.equal(PAYMENT_IDENTIFIER, "payment-identifier");
  assert.equal(PAYMENT_ID_MIN_LENGTH, 16);
  assert.equal(PAYMENT_ID_MAX_LENGTH, 128);

  // 1. Valid ID Generation
  const id1 = generatePaymentId("pay_");
  assert.equal(id1.startsWith("pay_"), true);
  assert.equal(isValidPaymentId(id1), true);

  // 2. Length & Pattern boundary tests
  assert.equal(isValidPaymentId("too_short"), false); // < 16 chars
  assert.equal(isValidPaymentId("valid_length_key_12345"), true);
  assert.equal(isValidPaymentId("invalid!char@key!123456"), false); // illegal symbols
  assert.equal(isValidPaymentId("a".repeat(129)), false); // > 128 chars

  // 3. Schema parsing
  assert.equal(PaymentIdentifierInfoSchema.safeParse({ required: true, id: id1 }).success, true);
  assert.equal(PaymentIdentifierInfoSchema.safeParse({ required: false }).success, true);
  assert.equal(PaymentIdentifierInfoSchema.safeParse({ required: true, id: "short" }).success, false);

  // 4. Validation helper
  assert.equal(validatePaymentIdentifier({ required: true, id: id1 }).isValid, true);
  assert.equal(validatePaymentIdentifier({ required: true, id: "bad id" }).isValid, false);

  // 5. Append and Declare
  const extMap: Record<string, any> = {};
  appendPaymentIdentifierToExtensions(extMap, id1);
  assert.equal(extMap[PAYMENT_IDENTIFIER].info.id, id1);

  const extracted = extractPaymentIdentifier({ extensions: extMap });
  assert.equal(extracted, id1);

  const declaration = declarePaymentIdentifierExtension(true);
  assert.equal(declaration.info.required, true);
});


test("Batch 3: Sign-In-With-X (SIWX) Extension Schemas & CAIP-122 Validation (sign-in-with-x/index.ts & types.ts)", async (t) => {
  const {
    SIWxPayloadSchema,
    validateSIWxMessage,
    SIGN_IN_WITH_X,
    SOLANA_MAINNET,
  } = require("./index.js");

  assert.equal(SIGN_IN_WITH_X, "sign-in-with-x");
  assert.equal(SOLANA_MAINNET, "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");

  const origin = new URL("https://api.aegispay.dev");
  const nowIso = new Date().toISOString();
  const futureIso = new Date(Date.now() + 300000).toISOString();

  // 1. Valid EVM SIWX Payload
  const validSiwxPayload = {
    domain: "api.aegispay.dev",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    statement: "Sign in to access AegisPay autonomous APIs",
    uri: "https://api.aegispay.dev/api/procurement/checkout",
    version: "1",
    chainId: "eip155:8453",
    type: "eip191",
    nonce: "nonce_abc123456789",
    issuedAt: nowIso,
    expirationTime: futureIso,
    signature: "0x" + "1".repeat(130),
  };

  assert.equal(SIWxPayloadSchema.safeParse(validSiwxPayload).success, true);

  // 2. Validation: Successful message verification
  const validRes = await validateSIWxMessage(validSiwxPayload, origin);
  assert.equal(validRes.isValid, true);

  // 3. Validation: Domain mismatch rejection
  const badDomainPayload = { ...validSiwxPayload, domain: "evil.com" };
  const domainRes = await validateSIWxMessage(badDomainPayload, origin);
  assert.equal(domainRes.isValid, false);
  if (!domainRes.isValid) {
    assert.equal(domainRes.invalidReason, "invalid_siwx_domain_mismatch");
  }

  // 4. Validation: Expired signature rejection
  const expiredPayload = {
    ...validSiwxPayload,
    issuedAt: new Date(Date.now() - 600000).toISOString(), // 10m ago
    expirationTime: new Date(Date.now() - 60000).toISOString(), // 1m ago
  };
  const expRes = await validateSIWxMessage(expiredPayload, origin);
  assert.equal(expRes.isValid, false);

  // 5. Validation: Nonce check rejection
  const usedNonces = new Set(["nonce_already_used"]);
  const noncePayload = { ...validSiwxPayload, nonce: "nonce_already_used" };
  const nonceRes = await validateSIWxMessage(noncePayload, origin, {
    checkNonce: (n: any) => !usedNonces.has(n),
  });
  assert.equal(nonceRes.isValid, false);
  if (!nonceRes.isValid) {
    assert.equal(nonceRes.invalidReason, "invalid_siwx_nonce");
  }
});


test("Batch 3: HTTP Paywall & Settlement Overrides (axios/index.ts & express/index.ts)", async (t) => {
  const {
    SettlementOverridesSchema,
    setSettlementOverrides,
    extractSettlementOverrides,
    SETTLEMENT_OVERRIDES_HEADER,
    HEADER_PAYMENT_SIGNATURE,
    HEADER_PAYMENT_RESPONSE,
  } = require("./index.js");

  assert.equal(HEADER_PAYMENT_SIGNATURE, "PAYMENT-SIGNATURE");
  assert.equal(HEADER_PAYMENT_RESPONSE, "PAYMENT-RESPONSE");
  assert.equal(SETTLEMENT_OVERRIDES_HEADER, "X-Settlement-Overrides");

  const overrides = { amount: "2500", asset: "0xUSDC" };
  assert.equal(SettlementOverridesSchema.safeParse(overrides).success, true);

  const mockRes: { headers: Record<string, string>; setHeader: (k: string, v: string) => void } = {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
  };

  setSettlementOverrides(mockRes, overrides);
  assert.equal(mockRes.headers[SETTLEMENT_OVERRIDES_HEADER], JSON.stringify(overrides));

  const extracted = extractSettlementOverrides(mockRes.headers);
  assert.deepEqual(extracted, overrides);
});


// ============================================================================
// BATCH 4 (FILES 31-36): PAYWALL & EVM MECHANISM TEST SUITES
// ============================================================================

test("Batch 4: Paywall Configuration Schemas & Validation (http/paywall/src/types.ts)", async (t) => {
  const { PaywallConfigSchema } = require("./index.js");

  const validPaywallConfig = {
    appName: "AegisPay Autonomous Portal",
    appLogo: "https://aegispay.dev/logo.png",
    currentUrl: "https://aegispay.dev/checkout",
    testnet: true,
    faucetUrls: {
      "eip155:84532": "https://faucet.base.org",
      "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": "https://faucet.solana.com",
    },
    rpcUrls: {
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "https://api.mainnet-beta.solana.com",
    },
    theme: "dark",
  };

  const parsed = PaywallConfigSchema.safeParse(validPaywallConfig);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.appName, "AegisPay Autonomous Portal");
    assert.equal(parsed.data.testnet, true);
  }

  // Reject invalid URL in logo
  const badConfig = { ...validPaywallConfig, appLogo: "not-a-url" };
  assert.equal(PaywallConfigSchema.safeParse(badConfig).success, false);
});

test("Batch 4: EVM EIP-3009 & Permit2 Exact/Upto Invariants (mechanisms/evm/src/types.ts)", async (t) => {
  const {
    ExactEIP3009PayloadSchema,
    ExactPermit2PayloadSchema,
    ExactEvmPayloadSchema,
    UptoPermit2PayloadSchema,
    isPermit2Payload,
    isEIP3009Payload,
    isUptoPermit2Payload,
    validateEip3009Payload,
    validateExactEvmPayload,
    validateUptoPermit2Payload,
    getExactEvmPayloadPayer,
  } = require("./index.js");

  const payerAddr = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const recipientAddr = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const tokenAddr = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const spenderAddr = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  const facilitatorAddr = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
  const validSignature = "0x" + "a".repeat(130);
  const validNonce32 = "0x" + "b".repeat(64);

  // 1. EIP-3009 Payload
  const validEip3009 = {
    signature: validSignature,
    authorization: {
      from: payerAddr,
      to: recipientAddr,
      value: "5000000",
      validAfter: "0",
      validBefore: "1799999999",
      nonce: validNonce32,
    },
  };

  assert.equal(ExactEIP3009PayloadSchema.safeParse(validEip3009).success, true);
  assert.equal(ExactEvmPayloadSchema.safeParse(validEip3009).success, true);
  assert.equal(isEIP3009Payload(validEip3009), true);
  assert.equal(isPermit2Payload(validEip3009), false);
  assert.equal(validateEip3009Payload(validEip3009), undefined);
  assert.equal(getExactEvmPayloadPayer(validEip3009), payerAddr);

  // Rejection on malformed nonce
  const badNonceEip3009 = {
    ...validEip3009,
    authorization: { ...validEip3009.authorization, nonce: "not-a-32byte-hex" },
  };
  assert.equal(ExactEIP3009PayloadSchema.safeParse(badNonceEip3009).success, false);
  assert.ok(validateEip3009Payload(badNonceEip3009) !== undefined);

  // 2. Exact Permit2 Payload
  const validPermit2 = {
    signature: validSignature,
    permit2Authorization: {
      from: payerAddr,
      permitted: {
        token: tokenAddr,
        amount: "10000000",
      },
      spender: spenderAddr,
      nonce: "1",
      deadline: "1799999999",
      witness: {
        to: recipientAddr,
        validAfter: "0",
      },
    },
  };

  assert.equal(ExactPermit2PayloadSchema.safeParse(validPermit2).success, true);
  assert.equal(ExactEvmPayloadSchema.safeParse(validPermit2).success, true);
  assert.equal(isPermit2Payload(validPermit2), true);
  assert.equal(isEIP3009Payload(validPermit2), false);
  assert.equal(isUptoPermit2Payload(validPermit2), false);
  assert.equal(validateExactEvmPayload(validPermit2), undefined);
  assert.equal(getExactEvmPayloadPayer(validPermit2), payerAddr);

  // 3. Upto Permit2 Payload (with Facilitator constraint)
  const validUptoPermit2 = {
    signature: validSignature,
    permit2Authorization: {
      from: payerAddr,
      permitted: {
        token: tokenAddr,
        amount: "50000000",
      },
      spender: spenderAddr,
      nonce: "2",
      deadline: "1799999999",
      witness: {
        to: recipientAddr,
        facilitator: facilitatorAddr,
        validAfter: "0",
      },
    },
  };

  assert.equal(UptoPermit2PayloadSchema.safeParse(validUptoPermit2).success, true);
  assert.equal(isUptoPermit2Payload(validUptoPermit2), true);
  assert.equal(validateUptoPermit2Payload(validUptoPermit2), undefined);

  // Rejection when witness.facilitator is invalid address
  const badFacilitatorUpto = {
    ...validUptoPermit2,
    permit2Authorization: {
      ...validUptoPermit2.permit2Authorization,
      witness: { ...validUptoPermit2.permit2Authorization.witness, facilitator: "not-an-evm-address" },
    },
  };
  assert.equal(UptoPermit2PayloadSchema.safeParse(badFacilitatorUpto).success, false);
  assert.ok(validateUptoPermit2Payload(badFacilitatorUpto) !== undefined);
});

test('Section 01 Audit: SpendMandateSchema string trimming, regex, and integer cents hardening', () => {
  const baseMandate = {
    mandate_id: '  vch_mandate_001  ',
    buyer_id: '  buyer_alpha_123  ',
    max_total_spend_cents: 100000,
    max_single_merchant_cents: 50000,
    cumulative_spent_cents: 0,
    currency_code: '  usd  ',
    allowed_category_ids: ['  electronics  ', 'books'],
    public_key_hex: '  ' + 'a'.repeat(64) + '  ',
    ed25519_signature_hex: '  ' + 'b'.repeat(128) + '  ',
    expires_at: new Date(Date.now() + 86400000),
    status: 'ACTIVE' as const,
  };

  // Trimming check
  const parsed = SpendMandateSchema.safeParse(baseMandate);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.mandate_id, 'vch_mandate_001');
    assert.equal(parsed.data.buyer_id, 'buyer_alpha_123');
    assert.equal(parsed.data.currency_code, 'USD');
    assert.equal(parsed.data.allowed_category_ids[0], 'electronics');
    assert.equal(parsed.data.public_key_hex, 'a'.repeat(64));
    assert.equal(parsed.data.ed25519_signature_hex, 'b'.repeat(128));
  }

  // Regex and length boundaries for mandate_id
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, mandate_id: '' }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, mandate_id: 'invalid mandate id with spaces' }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, mandate_id: 'vch_@bad#chars!' }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, mandate_id: 'a'.repeat(65) }).success, false);

  // Hex format checking for keys and signatures
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, public_key_hex: 'not_hex_chars_at_all!' }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, public_key_hex: '1234' }).success, false); // too short
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, ed25519_signature_hex: 'zz'.repeat(64) }).success, false);

  // Numeric injection: NaN, Infinity, floats, negative values in cents
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, max_total_spend_cents: NaN }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, max_total_spend_cents: Infinity }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, max_total_spend_cents: -Infinity }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, max_total_spend_cents: 99.99 }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, max_total_spend_cents: 0 }).success, false); // strictly positive
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, max_single_merchant_cents: NaN }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, max_single_merchant_cents: 12.34 }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, cumulative_spent_cents: NaN }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, cumulative_spent_cents: -1 }).success, false);
  assert.equal(SpendMandateSchema.safeParse({ ...baseMandate, cumulative_spent_cents: 5.5 }).success, false);
});

test('Section 01 Audit: McpToolCallSchema trimming, length bounds, and passthrough', () => {
  const validCall = {
    id: '  call_mcp_12345  ',
    toolName: '  execute_order  ',
    agentSummary: '  Executing single order via vault  ',
    args: { amount: 5000 },
    custom_extension_data: 'allowed',
  };

  const parsed = McpToolCallSchema.safeParse(validCall);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.id, 'call_mcp_12345');
    assert.equal(parsed.data.toolName, 'execute_order');
    assert.equal(parsed.data.agentSummary, 'Executing single order via vault');
    assert.equal((parsed.data as any).custom_extension_data, 'allowed');
  }

  // Bounds and required strings
  assert.equal(McpToolCallSchema.safeParse({ ...validCall, id: '' }).success, false);
  assert.equal(McpToolCallSchema.safeParse({ ...validCall, id: '   ' }).success, false);
  assert.equal(McpToolCallSchema.safeParse({ ...validCall, id: 'x'.repeat(129) }).success, false);
  assert.equal(McpToolCallSchema.safeParse({ ...validCall, toolName: '' }).success, false);
  assert.equal(McpToolCallSchema.safeParse({ ...validCall, toolName: '   ' }).success, false);
  assert.equal(McpToolCallSchema.safeParse({ ...validCall, toolName: 't'.repeat(129) }).success, false);
});

test('Section 01 Audit: LocalReasonerProposalSchema validation, finite confidence, and trimming', () => {
  const validProposal = {
    toolCall: {
      id: 'call_fallback_99',
      toolName: 'broadcast_intent',
      args: { offer: 1000 },
    },
    rationale: '  Target merchant matched natural language request  ',
    modelUsed: '  hermes-3-local-deterministic  ',
    confidence: 0.95,
    thinking: 'Analyzed query tokens and mapped to known catalog entity.',
    category: 'electronics',
    merchant: 'bestbuy.com',
    urgency: 'high' as const,
  };

  const parsed = LocalReasonerProposalSchema.safeParse(validProposal);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.rationale, 'Target merchant matched natural language request');
    assert.equal(parsed.data.modelUsed, 'hermes-3-local-deterministic');
    assert.equal(parsed.data.confidence, 0.95);
    assert.equal(parsed.data.urgency, 'high');
  }

  // Confidence boundaries: [0, 1] and finite
  assert.equal(LocalReasonerProposalSchema.safeParse({ ...validProposal, confidence: NaN }).success, false);
  assert.equal(LocalReasonerProposalSchema.safeParse({ ...validProposal, confidence: Infinity }).success, false);
  assert.equal(LocalReasonerProposalSchema.safeParse({ ...validProposal, confidence: -0.01 }).success, false);
  assert.equal(LocalReasonerProposalSchema.safeParse({ ...validProposal, confidence: 1.01 }).success, false);

  // Missing or empty required fields
  assert.equal(LocalReasonerProposalSchema.safeParse({ ...validProposal, rationale: '   ' }).success, false);
  assert.equal(LocalReasonerProposalSchema.safeParse({ ...validProposal, modelUsed: '' }).success, false);
  assert.equal(LocalReasonerProposalSchema.safeParse({ ...validProposal, urgency: 'invalid_urgency' as any }).success, false);
});

test('Section 01 Audit: DisputeEvidenceSchema and SubmitDisputeEvidenceSchema parity and validation', () => {
  const validEvidence = {
    paypal_dispute_id: '  PP-D-99887766  ',
    carrier_tracking_number: '  1Z9999999999999999  ',
    policy_proof_text: '  Merchant return policy strictly stipulates 30-day unopened window.  ',
    vision_defect_mask: [0.1, 0.2, 0.8, 0.9],
    evidence_type: 'PROOF_OF_DELIVERY' as const,
    document_url: 'https://aegispay.dev/dossiers/doc_123.pdf',
    notes: 'Signed delivery receipt verified.',
    submitted_at: new Date(),
  };

  const parsed = DisputeEvidenceSchema.safeParse(validEvidence);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.paypal_dispute_id, 'PP-D-99887766');
    assert.equal(parsed.data.carrier_tracking_number, '1Z9999999999999999');
    assert.equal(parsed.data.policy_proof_text, 'Merchant return policy strictly stipulates 30-day unopened window.');
  }

  // Parity alias
  const parsedSubmit = SubmitDisputeEvidenceSchema.safeParse(validEvidence);
  assert.equal(parsedSubmit.success, true);

  // Rejection on invalid dispute id
  assert.equal(DisputeEvidenceSchema.safeParse({ ...validEvidence, paypal_dispute_id: '' }).success, false);
  assert.equal(DisputeEvidenceSchema.safeParse({ ...validEvidence, paypal_dispute_id: '   ' }).success, false);

  // Bounding box / mask finite checks and length
  assert.equal(DisputeEvidenceSchema.safeParse({ ...validEvidence, vision_defect_mask: [0, 1, 2] }).success, false); // length 3 instead of 4
  assert.equal(DisputeEvidenceSchema.safeParse({ ...validEvidence, vision_defect_mask: [0, NaN, 1, 1] }).success, false);
  assert.equal(DisputeEvidenceSchema.safeParse({ ...validEvidence, vision_defect_mask: [0, Infinity, 1, 1] }).success, false);

  // Invalid document URL
  assert.equal(DisputeEvidenceSchema.safeParse({ ...validEvidence, document_url: 'not-a-valid-url' }).success, false);
});

test('Section 01 Audit: PaymentReceiptSchema and X402PaymentReceiptSchema parity, decimal injection, and string trimming', () => {
  const validReceipt = {
    contractId: '  ct_402_receipt_audit_01  ',
    amountCents: 5000,
    currency: '  usd  ',
    timestamp: Date.now(),
    hmac: '  ' + 'f'.repeat(64) + '  ',
    receipt_token: '  rcpt_token_valid_123  ',
    x402Version: 2,
  };

  const parsed = PaymentReceiptSchema.safeParse(validReceipt);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.contractId, 'ct_402_receipt_audit_01');
    assert.equal(parsed.data.currency, 'USD');
    assert.equal(parsed.data.hmac, 'f'.repeat(64));
    assert.equal(parsed.data.receipt_token, 'rcpt_token_valid_123');
  }

  // Parity alias with X402PaymentReceiptSchema
  assert.equal(X402PaymentReceiptSchema.safeParse(validReceipt).success, true);

  // Strict integer cents check: reject NaN, Infinity, -Infinity, decimal floats, negative values
  assert.equal(PaymentReceiptSchema.safeParse({ ...validReceipt, amountCents: NaN }).success, false);
  assert.equal(PaymentReceiptSchema.safeParse({ ...validReceipt, amountCents: Infinity }).success, false);
  assert.equal(PaymentReceiptSchema.safeParse({ ...validReceipt, amountCents: -Infinity }).success, false);
  assert.equal(PaymentReceiptSchema.safeParse({ ...validReceipt, amountCents: 49.99 }).success, false);
  assert.equal(PaymentReceiptSchema.safeParse({ ...validReceipt, amountCents: -500 }).success, false);

  // HMAC length bounds: min 32 chars
  assert.equal(PaymentReceiptSchema.safeParse({ ...validReceipt, hmac: 'short_hmac' }).success, false);

  // Timestamp non-negative integer
  assert.equal(PaymentReceiptSchema.safeParse({ ...validReceipt, timestamp: -100 }).success, false);
  assert.equal(PaymentReceiptSchema.safeParse({ ...validReceipt, timestamp: 12345.67 }).success, false);
  assert.equal(PaymentReceiptSchema.safeParse({ ...validReceipt, timestamp: NaN }).success, false);
});

test('Section 01 Audit: DisputeArbitrationSchema and DisputeAnalysisResultSchema contract verification', () => {
  const {
    DisputeArbitrationSchema,
    DisputeAnalysisResultSchema,
    PrimaryBadgeSchema,
    ProductBadgeSchema,
    BazaarDiscoveryExtensionSchema,
    StrictEIP3009AuthorizationSchema,
  } = require('./index.js');

  const validDispute = {
    paypal_dispute_id: 'PP-D-12345678',
    purchase_unit_id: '123e4567-e89b-12d3-a456-426614174000',
    dispute_reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED',
    dispute_state: 'REQUIRED_ACTION',
    dispute_amount_cents: 12500,
    liability_score_l: 0.85,
    abuse_risk_score_r: 0.12,
    exif_tamper_flag: false,
    defect_bounding_box: [0.1, 0.2, 0.8, 0.9],
    hateoas_allowed_actions: ['accept-claim', 'make-offer', 'provide-evidence'],
    selected_tier_action: 'TIER1_REFUND' as const,
    seller_response_due_date: new Date(),
    assigned_analyst_id: 'analyst_007',
  };

  const parsedDispute = DisputeArbitrationSchema.safeParse(validDispute);
  assert.equal(parsedDispute.success, true);
  if (parsedDispute.success) {
    assert.equal(parsedDispute.data.paypal_dispute_id, 'PP-D-12345678');
    assert.equal(parsedDispute.data.dispute_amount_cents, 12500);
    assert.equal(parsedDispute.data.liability_score_l, 0.85);
    assert.equal(parsedDispute.data.abuse_risk_score_r, 0.12);
    assert.deepEqual(parsedDispute.data.defect_bounding_box, [0.1, 0.2, 0.8, 0.9]);
    assert.deepEqual(parsedDispute.data.hateoas_allowed_actions, ['accept-claim', 'make-offer', 'provide-evidence']);
  }

  // Reject out-of-range or non-finite liability scores
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, liability_score_l: -0.1 }).success, false);
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, liability_score_l: 1.1 }).success, false);
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, liability_score_l: NaN }).success, false);
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, liability_score_l: Infinity }).success, false);

  // Reject out-of-range or non-finite abuse risk scores
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, abuse_risk_score_r: -0.05 }).success, false);
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, abuse_risk_score_r: 1.05 }).success, false);
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, abuse_risk_score_r: NaN }).success, false);

  // Reject invalid defect_bounding_box
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, defect_bounding_box: [0.1, 0.2] }).success, false);
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, defect_bounding_box: [0.1, 0.2, 0.3, NaN] }).success, false);
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, defect_bounding_box: [0.1, 0.2, 0.3, Infinity] }).success, false);

  // Reject invalid dispute_amount_cents
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, dispute_amount_cents: -100 }).success, false);
  assert.equal(DisputeArbitrationSchema.safeParse({ ...validDispute, dispute_amount_cents: 12.5 }).success, false);

  // DisputeAnalysisResultSchema
  const validAnalysis = {
    identity_match_score: 0.92,
    defect_severity_score: 0.74,
    defect_bounding_box: [0.15, 0.25, 0.65, 0.85],
    liability_score_l: 0.81,
    abuse_risk_score_r: 0.15,
  };
  const parsedAnalysis = DisputeAnalysisResultSchema.safeParse(validAnalysis);
  assert.equal(parsedAnalysis.success, true);
  assert.equal(DisputeAnalysisResultSchema.safeParse({ ...validAnalysis, liability_score_l: 1.5 }).success, false);
  assert.equal(DisputeAnalysisResultSchema.safeParse({ ...validAnalysis, abuse_risk_score_r: -0.2 }).success, false);

  // AcpMcpToolArgumentsSchema
  const { AcpMcpToolArgumentsSchema } = require('./index.js');
  const validAcpToolArgs = {
    meta: {
      api_version: '2026-04-17',
      idempotency_key: 'idem_test_999',
    },
    id: 'cs_session_audit_1',
    payload: {
      cart_id: 'cart_123',
      action: 'inspect',
    },
  };
  assert.equal(AcpMcpToolArgumentsSchema.safeParse(validAcpToolArgs).success, true);
  // Missing api_version in meta must fail
  assert.equal(AcpMcpToolArgumentsSchema.safeParse({ meta: {} }).success, false);

  // PrimaryBadgeSchema & ProductBadgeSchema
  const validPrimaryBadge = {
    tier: 'tier1',
    label: 'Verified Merchant',
    color: '#00FF00',
    icon: 'shield-check',
    description: 'High reputational standing and zero dispute velocity',
    trust_multiplier: 1.25,
  };
  assert.equal(PrimaryBadgeSchema.safeParse(validPrimaryBadge).success, true);
  assert.equal(PrimaryBadgeSchema.safeParse({ ...validPrimaryBadge, tier: 'invalid_tier' }).success, false);

  const validProductBadge = {
    label: 'Best Value',
    color: '#0088FF',
    description: 'Optimal price-to-performance ratio',
  };
  assert.equal(ProductBadgeSchema.safeParse(validProductBadge).success, true);

  // BazaarDiscoveryExtensionSchema & StrictEIP3009AuthorizationSchema
  const validStrictAuth = {
    from: '0x' + '1'.repeat(40),
    to: '0x' + '2'.repeat(40),
    value: '1000000',
    validAfter: '0',
    validBefore: '1893456000',
    nonce: '0x' + '3'.repeat(64),
  };
  assert.equal(StrictEIP3009AuthorizationSchema.safeParse(validStrictAuth).success, true);
  assert.equal(StrictEIP3009AuthorizationSchema.safeParse({ ...validStrictAuth, from: 'invalid_evm_addr' }).success, false);
});

test('X402ChallengeResponseSchema: validates standard 402 challenge contract response payloads', () => {
  const validContract = {
    x402Version: 2,
    payment_contract_id: 'ct_402_test_999',
    pay_to: 'payto://paypal/merchant@aegispay.dev',
    vault_setup_url: 'https://www.sandbox.paypal.com/v3/vault/setup-tokens',
    accepted_headers: ['X-Payment-Receipt'],
  };

  const validChallengeResponse = {
    status: 402 as const,
    message: 'Payment Required',
    contract: validContract,
    pay_to: 'payto://paypal/merchant@aegispay.dev',
    payment_contract_id: 'ct_402_test_999',
    challenge_token: 'chk_tok_12345',
  };

  const parsed = X402ChallengeResponseSchema.safeParse(validChallengeResponse);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.status, 402);
    assert.equal(parsed.data.message, 'Payment Required');
    assert.equal(parsed.data.contract.payment_contract_id, 'ct_402_test_999');
  }

  // Status must be 402
  assert.equal(X402ChallengeResponseSchema.safeParse({ ...validChallengeResponse, status: 200 as any }).success, false);
  // Missing required contract must fail
  assert.equal(X402ChallengeResponseSchema.safeParse({ status: 402, message: 'Missing contract' }).success, false);
});

test('AllowAgent Constitutional Firewall & SpendPolicy schemas and utilities verification', () => {
  // 1. Currency & percentage parser utilities
  assert.equal(parseStrictUsdDollar('$40.00 USD'), 40.0);
  assert.equal(parseStrictUsdDollar('150.50'), 150.5);
  assert.equal(parseStrictUsdDollar('0', true), null); // rejectZero
  assert.equal(parseStrictUsdDollar('-10.00'), null);
  assert.equal(parseStrictPercentage('10%'), 10);
  assert.equal(parseStrictPercentage('25.5'), 25.5);
  assert.equal(parseStrictPercentage('-5'), null);
  assert.equal(toCents(40.50), 4050);
  assert.equal(usdCents(4050), '$40.50');

  // 2. SpendPolicySchema and ConstitutionModeSchema
  const validPolicy = {
    mode: 'PERSONAL' as const,
    maxAutoPayUsd: 40.0,
    dailySpendCapUsd: 150.0,
    maxAutoRefundUsd: 25.0,
    priceCreepTolerancePercent: 10,
    requireHistoricalInvoiceCheck: true,
    unknownVendorPolicy: 'PAUSE_FOR_APPROVAL' as const,
    requireNonDeliveryForRefundOrDispute: true,
    blockPromptInjection: 'STRICT' as const,
    allowedTools: ['pay_order', 'record_payment_for_invoice'],
    trustedVendors: [{ name: 'Metro Fiber', email: 'autopay@metrofiber.com' }],
    parseWarnings: [],
    isFailClosed: false,
  };
  assert.equal(SpendPolicySchema.safeParse(validPolicy).success, true);
  assert.equal(ConstitutionModeSchema.safeParse('BUSINESS').success, true);
  assert.equal(ConstitutionModeSchema.safeParse('UNKNOWN').success, false);
  assert.equal(UnknownVendorPolicySchema.safeParse('HARD_BLOCK').success, true);
  assert.equal(TrustedVendorSchema.safeParse({ name: 'Vendor', email: 'valid@vendor.com' }).success, true);
  assert.equal(TrustedVendorSchema.safeParse({ name: 'Vendor', email: 'not-an-email' }).success, false);

  // 3. Injection and Contradiction codes
  assert.equal(InjectionVectorTypeSchema.safeParse('ROLE_OVERRIDE').success, true);
  assert.equal(InjectionVectorTypeSchema.safeParse('INVALID_VECTOR').success, false);

  const scanResult = {
    detected: true,
    vectors: ['TOOL_SMUGGLING' as const],
    flaggedQuotes: ['Ignore previous instructions'],
    explanation: 'Adversarial instruction detected in untrusted invoice note',
  };
  assert.equal(InjectionScanResultSchema.safeParse(scanResult).success, true);

  assert.equal(ContradictionCodeSchema.safeParse('PRICE_CREEP_DETECTED').success, true);
  assert.equal(ContradictionCodeSchema.safeParse('DOUBLE_REFUND_DETECTED').success, true);
  assert.equal(ContradictionCodeSchema.safeParse('DELIVERED_REFUND_CONFLICT').success, true);

  const ledgerFinding = {
    code: 'PRICE_CREEP_DETECTED' as const,
    severity: 'WARNING' as const,
    title: 'Recurring Subscription Price Spike',
    agentClaim: '$120 requested',
    ledgerFact: 'Historical baseline is $80',
    readToolUsed: 'get_invoice',
  };
  assert.equal(LedgerFindingSchema.safeParse(ledgerFinding).success, true);

  // 4. CrossExamResultSchema & EvidenceDiffCardSchema
  const crossExam = {
    readToolsInvoked: ['get_invoice', 'list_transactions'],
    findings: [ledgerFinding],
    verifiedFactsComplete: true,
    addedLineItems: [],
    verifiedBaselineUsd: 80,
  };
  assert.equal(CrossExamResultSchema.safeParse(crossExam).success, true);

  const diffCard = {
    payloadHash: 'hash_abc_123',
    requestedAmountUsd: 120,
    baselineAmountUsd: 80,
    deltaUsd: 40,
    percentageIncrease: 50,
    findings: [ledgerFinding],
    reasons: ['Price increase exceeds 10% tolerance'],
    severity: 'WARNING' as const,
    recommendedAction: 'ESCALATE' as const,
  };
  assert.equal(EvidenceDiffCardSchema.safeParse(diffCard).success, true);

  // 5. FirewallVerdictTypeSchema & FirewallEvaluationSchema
  assert.equal(FirewallVerdictTypeSchema.safeParse('AUTO_EXECUTE').success, true);
  assert.equal(FirewallVerdictTypeSchema.safeParse('PAUSE_FOR_APPROVAL').success, true);
  assert.equal(FirewallVerdictTypeSchema.safeParse('HARD_BLOCK').success, true);

  const firewallEval = {
    call: { toolName: 'pay_order', args: { orderId: 'ord_123' } },
    injectionScan: { detected: false, vectors: [], flaggedQuotes: [], explanation: 'Clean' },
    crossExam,
    verdict: 'PAUSE_FOR_APPROVAL' as const,
    triggeredRule: 'Rule: Price creep exceeds constitutional threshold',
    payloadHash: 'hash_abc_123',
    diffCard,
    executionStatus: 'PAUSED' as const,
    timestampIso: new Date().toISOString(),
  };
  assert.equal(FirewallEvaluationSchema.safeParse(firewallEval).success, true);

  // 6. McpToolArgsSchema
  const mcpArgs = {
    orderId: 'ord_123',
    amountUsd: 49.99,
    currency: 'USD',
  };
  assert.equal(McpToolArgsSchema.safeParse(mcpArgs).success, true);

  // 7. PayPal Sandbox Records & State
  const lineItem = { name: 'Item A', quantity: 1, unitAmountUsd: 50, totalUsd: 50 };
  assert.equal(PayPalInvoiceLineItemSchema.safeParse(lineItem).success, true);

  const invoiceRecord = {
    id: 'inv_001',
    invoiceNumber: 'INV-2026-001',
    merchantName: 'Metro Fiber',
    merchantEmail: 'billing@metrofiber.com',
    amountUsd: 50,
    currency: 'USD',
    status: 'SENT' as const,
    items: [lineItem],
  };
  assert.equal(PayPalInvoiceRecordSchema.safeParse(invoiceRecord).success, true);

  const orderRecord = {
    id: 'ord_001',
    merchantName: 'Metro Fiber',
    merchantEmail: 'billing@metrofiber.com',
    amountUsd: 50,
    status: 'CREATED' as const,
    intent: 'CAPTURE' as const,
  };
  assert.equal(PayPalOrderRecordSchema.safeParse(orderRecord).success, true);

  const txnRecord = {
    id: 'txn_001',
    counterpartyName: 'Metro Fiber',
    counterpartyEmail: 'billing@metrofiber.com',
    direction: 'OUTBOUND' as const,
    amountUsd: 50,
    currency: 'USD',
    timestampIso: new Date().toISOString(),
    status: 'SUCCESS' as const,
    type: 'PAYMENT' as const,
  };
  assert.equal(PayPalTransactionRecordSchema.safeParse(txnRecord).success, true);

  const trackingRecord = {
    trackingNumber: '1Z9999999999999999',
    carrier: 'UPS',
    status: 'DELIVERED' as const,
    orderId: 'ord_001',
  };
  assert.equal(PayPalTrackingRecordSchema.safeParse(trackingRecord).success, true);

  const disputeRecord = {
    id: 'disp_001',
    orderId: 'ord_001',
    buyerEmail: 'buyer@example.com',
    disputedAmountUsd: 50,
    reason: 'MERCHANDISE_NOT_RECEIVED',
    status: 'OPEN' as const,
    buyerDeliveredConfirmed: false,
  };
  assert.equal(PayPalDisputeRecordSchema.safeParse(disputeRecord).success, true);

  const subRecord = {
    id: 'sub_001',
    planName: 'Gigabit Internet',
    merchantName: 'Metro Fiber',
    monthlyAmountUsd: 79.99,
    status: 'ACTIVE' as const,
    lastBilledIso: new Date().toISOString(),
  };
  assert.equal(PayPalSubscriptionRecordSchema.safeParse(subRecord).success, true);

  const sandboxState = {
    invoices: [invoiceRecord],
    orders: [orderRecord],
    transactions: [txnRecord],
    tracking: [trackingRecord],
    disputes: [disputeRecord],
    subscriptions: [subRecord],
    dailySpendAccumulatorUsd: 50,
  };
  assert.equal(PayPalSandboxStateSchema.safeParse(sandboxState).success, true);
});

test('Upgrade B: ActiveTurnProductSchema, ChatMessageTurnSchema, and ConversationalChatPayloadSchema validation', async () => {
  const {
    ActiveTurnProductSchema,
    ChatMessageTurnSchema,
    ConversationalChatPayloadSchema,
  } = await import('./index.js');

  const validActiveProduct = {
    index: 1,
    product_id: 'ch3_rowenta_steam_01',
    title: 'Rowenta Steam Iron 1710W',
    price_cents: 4999,
    merchant_domain: 'bestbuy.com',
    rating: 4.8,
    free_shipping: true,
    specs: { Wattage: '1710W', Soleplate: 'Stainless Steel' },
  };
  assert.equal(ActiveTurnProductSchema.safeParse(validActiveProduct).success, true);

  const turnMessage = {
    id: 'turn-msg-01',
    role: 'assistant' as const,
    content: 'Here are the matching steam irons for your search:',
    attached_products: [
      {
        product_id: 'ch3_rowenta_steam_01',
        title: 'Rowenta Steam Iron 1710W',
        description: 'Professional grade steam iron with 1710W power output.',
        category_id: 'home_appliances',
        price_cents: 4999,
        compare_at_price_cents: 5999,
        commission_rebate_cents: 500,
        commission_rate: 0.1,
        rating: 4.8,
        review_count: 120,
        shipping_fee_cents: 0,
        free_shipping: true,
        merchant_domain: 'bestbuy.com',
        merchant_credibility_score: 98,
        stock_status: 'IN_STOCK' as const,
        delivery_window: '2-Day Express',
        image_url: 'https://images.example.com/iron.jpg',
        specs: { Wattage: '1710W' },
      },
    ],
    focused_product_id: 'ch3_rowenta_steam_01',
    selected_product_ids: ['ch3_rowenta_steam_01', 'ch3_black_decker_02'],
    timestamp: new Date().toISOString(),
  };
  assert.equal(ChatMessageTurnSchema.safeParse(turnMessage).success, true);

  const conversationalPayload = {
    session_id: 'sess_turn_test_123',
    message: 'Which of these two is better for delicate silk and linen?',
    history: [
      { role: 'user' as const, content: 'Find me steam irons under $50' },
      { role: 'assistant' as const, content: 'Here are the matching steam irons:' },
    ],
    selected_product_ids: ['ch3_rowenta_steam_01', 'ch3_black_decker_02'],
    active_turn_products: [validActiveProduct],
    budget_cap_cents: 10000,
    zip_code: '94016',
  };
  assert.equal(ConversationalChatPayloadSchema.safeParse(conversationalPayload).success, true);
});

test('Phase 1: Mastra 4-Tool Schemas and Fastify Data Stream Protocol validation', async () => {
  const {
    FilterTurnProductsInputSchema,
    FilterTurnProductsOutputSchema,
    CompareProductsInputSchema,
    CompareProductsOutputSchema,
    PrepareCheckoutInputSchema,
    PrepareCheckoutOutputSchema,
    SearchCatalogInputSchema,
    SearchCatalogOutputSchema,
    DataStreamFrameSchema,
    formatDataStreamText,
    formatDataStreamToolCall,
    formatDataStreamToolResult,
    formatDataStreamFinish,
    formatDataStreamError,
  } = await import('./index.js');

  // 1. FilterTurnProductsInputSchema & Output
  const filterInput = {
    criteria: 'steam iron under 50',
    max_price_usd: 50,
    top_n: 3,
    sort_by: 'price_asc' as const,
    active_turn_products: [
      {
        index: 0,
        product_id: 'p1',
        title: 'Rowenta Steam Iron',
        price_cents: 4500,
        merchant_domain: 'bestbuy.com',
        rating: 4.8,
        free_shipping: true,
      },
    ],
  };
  assert.equal(FilterTurnProductsInputSchema.safeParse(filterInput).success, true);

  const filterOutput = {
    products: [
      {
        product_id: 'p1',
        title: 'Rowenta Steam Iron',
        description: 'Great iron',
        category_id: 'home',
        price_cents: 4500,
        compare_at_price_cents: 5500,
        commission_rebate_cents: 450,
        commission_rate: 0.1,
        rating: 4.8,
        review_count: 50,
        shipping_fee_cents: 0,
        free_shipping: true,
        merchant_domain: 'bestbuy.com',
        merchant_credibility_score: 95,
        stock_status: 'IN_STOCK' as const,
        delivery_window: '2-Day Express',
        image_url: 'https://images.example.com/iron.jpg',
      },
    ],
    filtered_count: 1,
    applied_criteria: 'steam iron',
  };
  assert.equal(FilterTurnProductsOutputSchema.safeParse(filterOutput).success, true);

  // 2. CompareProductsInputSchema & Output
  const compareInput = {
    product_ids: ['p1', 'p2'],
  };
  assert.equal(CompareProductsInputSchema.safeParse(compareInput).success, true);
  assert.equal(CompareProductsInputSchema.safeParse({ product_ids: [] }).success, false);

  // 3. PrepareCheckoutInputSchema (enforces strict 1 <= quantity <= 5)
  assert.equal(PrepareCheckoutInputSchema.safeParse({ product_id: 'p1', quantity: 1 }).success, true);
  assert.equal(PrepareCheckoutInputSchema.safeParse({ product_id: 'p1', quantity: 5 }).success, true);
  assert.equal(PrepareCheckoutInputSchema.safeParse({ product_id: 'p1', quantity: 0 }).success, false);
  assert.equal(PrepareCheckoutInputSchema.safeParse({ product_id: 'p1', quantity: 6 }).success, false);
  assert.equal(PrepareCheckoutInputSchema.safeParse({ product_id: 'p1', quantity: 9999 }).success, false);

  // 4. SearchCatalogInputSchema & Output
  const searchInput = {
    query: 'wireless headphones',
    max_price_usd: 250,
    limit: 5,
  };
  assert.equal(SearchCatalogInputSchema.safeParse(searchInput).success, true);

  // 5. Data Stream Protocol frame formatters
  const textFrame = formatDataStreamText('Top recommendations:');
  assert.equal(textFrame, '0:"Top recommendations:"\n');

  const toolCallFrame = formatDataStreamToolCall('call_01', 'search_catalog', { query: 'headphones' });
  assert.equal(toolCallFrame, '9:{"toolCallId":"call_01","toolName":"search_catalog","args":{"query":"headphones"}}\n');

  const toolResultFrame = formatDataStreamToolResult('call_01', { total_found: 2 });
  assert.equal(toolResultFrame, 'a:{"toolCallId":"call_01","result":{"total_found":2}}\n');

  const finishFrame = formatDataStreamFinish('stop', { promptTokens: 10, completionTokens: 20 });
  assert.equal(finishFrame, 'd:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":20}}\n');

  const errorFrame = formatDataStreamError('Network timeout');
  assert.equal(errorFrame, '3:"Network timeout"\n');

  // 6. DataStreamFrameSchema validation
  assert.equal(DataStreamFrameSchema.safeParse({ type: 'text', delta: 'hello' }).success, true);
  assert.equal(
    DataStreamFrameSchema.safeParse({
      type: 'tool_call',
      toolCallId: 'c1',
      toolName: 'search_catalog',
      args: { query: 'test' },
    }).success,
    true
  );
  assert.equal(
    DataStreamFrameSchema.safeParse({
      type: 'tool_result',
      toolCallId: 'c1',
      result: { ok: true },
    }).success,
    true
  );
  assert.equal(
    DataStreamFrameSchema.safeParse({
      type: 'finish',
      finishReason: 'stop',
    }).success,
    true
  );
});
