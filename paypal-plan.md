# PayPal TypeScript Integration Contract Sheet & Master Plan (`paypal-plan.md`)

## 1. SDK Identity & Architecture Grounding

- **APIMatic Engine:** APIMatic Core (`@apimatic/core`, `@apimatic/schema`, `@apimatic/authentication-adapters`) powering `@paypal/paypal-server-sdk` (v2.5.0) and `@paypal/agent-toolkit` (v1.11.0).
- **Import Specifiers:** `@paypal/paypal-server-sdk`, `@paypal/agent-toolkit`.
- **Runtime Environment:** Node.js `>=20.3` under TypeScript Turborepo (`apps/api-orchestrator`, `packages/mcp-enforcer`, `apps/workflows`).
- **Client Lifetime:** Long-lived app-scoped singleton (`PayPalApimaticClient` in `apps/api-orchestrator/src/services/paypal-apimatic.ts` and `PayPalToolkitBridge` in `packages/mcp-enforcer/src/paypal-bridge.ts`).
- **Host Configuration:**
  - Sandbox: `https://api-m.sandbox.paypal.com` (`Environment.Sandbox`)
  - Production: `https://api-m.paypal.com` (`Environment.Production`)
  - Explicit deployment binding: `PAYPAL_ENVIRONMENT` environment variable ('sandbox' | 'production').
- **Authentication:** OAuth 2.0 Client Credentials flow with client-managed in-memory token cache (`CachedToken` with token lifetime tracking and preemptive refresh).

---

## 2. Contract Sheet: Operations & Endpoints

| Resource | Operation | Route / Verb | Auth | Request Type | Idempotency Mechanism | Return Type |
|---|---|---|---|---|---|---|
| Orders v2 | `createOrder` | `POST /v2/checkout/orders` | OAuth 2 Bearer | `OrdersCreateInput` | `PayPal-Request-Id` (UUID v4) | `Order` |
| Orders v2 | `getOrder` | `GET /v2/checkout/orders/{id}` | OAuth 2 Bearer | `{ id: string }` | Read-only | `Order` |
| Orders v2 | `authorizeOrder` | `POST /v2/checkout/orders/{id}/authorize` | OAuth 2 Bearer | `{ id: string }` | `PayPal-Request-Id` | `OrderAuthorizeResponse` |
| Orders v2 | `captureOrder` | `POST /v2/checkout/orders/{id}/capture` | OAuth 2 Bearer | `{ id: string }` | `PayPal-Request-Id` | `OrderCaptureResponse` |
| Payments v2 | `captureAuthorization` | `POST /v2/payments/authorizations/{id}/capture` | OAuth 2 Bearer | `AuthorizationsCaptureInput` | `PayPal-Request-Id` | `Capture` |
| Payments v2 | `voidAuthorization` | `POST /v2/payments/authorizations/{id}/void` | OAuth 2 Bearer | `{ id: string }` | `PayPal-Request-Id` | `void` / HTTP 204 |
| Payments v2 | `refundCapture` | `POST /v2/payments/captures/{id}/refund` | OAuth 2 Bearer | `CapturesRefundInput` | `PayPal-Request-Id` | `Refund` |
| Vault v3 | `createSetupToken` | `POST /v3/vault/setup-tokens` | OAuth 2 Bearer | `SetupTokenRequest` | `PayPal-Request-Id` | `SetupTokenResponse` |
| Vault v3 | `createPaymentToken` | `POST /v3/vault/payment-tokens` | OAuth 2 Bearer | `PaymentTokenRequest` | `PayPal-Request-Id` | `PaymentTokenResponse` |
| Tracking v1 | `createShipmentTracker` | `POST /v1/shipping/trackers-batch` | OAuth 2 Bearer | `TrackerBatchInput` | `PayPal-Request-Id` | `TrackerBatchResponse` |
| Disputes v1 | `getDispute` | `GET /v1/customer/disputes/{id}` | OAuth 2 Bearer | `{ id: string }` | Read-only | `Dispute` |
| Disputes v1 | `provideEvidence` | `POST /v1/customer/disputes/{id}/provide-evidence` | OAuth 2 Bearer | `multipart/form-data` | `PayPal-Request-Id` | `Dispute` |
| Disputes v1 | `acceptDisputeClaim` | `POST /v1/customer/disputes/{id}/accept-claim` | OAuth 2 Bearer | `{ id: string, note?: string }` | `PayPal-Request-Id` | `Dispute` |

---

## 3. Table 1b.1 — Durable Writes

### Duplicate Claims

| Write | Where the claim is stored | What rejects the second one | Where that rejection is caught | Where in the code |
|---|---|---|---|---|
| Order Authorization Hold | PostgreSQL `escrow_orders` & Redis Key-Value | Unique constraint on `paypal_request_id` + atomic Redis Lua `reserveBudget` script | Fastify route handler `apps/api-orchestrator/src/routes/buyer.procurement.ts` | `packages/mcp-enforcer/src/redis-lua-enforcer.ts` and `apps/api-orchestrator/src/services/cart-solver.ts` |
| Multi-Unit Hold Creation | PostgreSQL `purchase_unit_holds` | Unique constraint on `invoice_id` (deterministic per merchant unit) | DB insert error code `23505` in `cart-solver.ts` | `apps/api-orchestrator/src/services/cart-solver.ts#executeMultiUnitEscrowHold` |
| 72h Lower Price Capture | PostgreSQL `purchase_unit_holds` | Atomic status check `order_status = 'AUTHORIZED'` before capture | Render Workflows step retry exception handler | `apps/workflows/src/tasks/priceDropWatcher.ts#priceDropWatcherTask` |
| Vault Setup Token Minting | PostgreSQL `synthetic_intent_vouchers` | Unique constraint on `voucher_id` and active buyer spend mandate | Fastify route handler `/api/buyer/synthetic-bid` | `apps/api-orchestrator/src/services/synthetic-intent.ts#createSyntheticIntentVoucher` |

### Unknown Outcomes

| Write | The operation you re-read with | The reference you search by | Where in the code | The test that fails the connection |
|---|---|---|---|---|
| `createOrder` / `authorizeOrder` | `getOrder` (`GET /v2/checkout/orders/{id}`) | `paypal_order_id` / `paypal_request_id` | `apps/api-orchestrator/src/services/paypal-apimatic.ts#getOrder` | `apps/web-cockpit/src/app/judge/chaosSimulator.test.ts` |
| `captureAuthorization` | `getAuthorizedPayment` (`GET /v2/payments/authorizations/{id}`) | `paypal_authorization_id` | `apps/workflows/src/tasks/priceDropWatcher.ts` | `apps/web-cockpit/src/app/judge/e2eProductionPipeline.test.ts` |
| `createSetupToken` | `getSetupToken` (`GET /v3/vault/setup-tokens/{id}`) | `setup_token_id` | `apps/api-orchestrator/src/services/synthetic-intent.ts` | `apps/api-orchestrator/src/services/paypal-apimatic.test.ts` |

---

## 4. Table 1b.2 — Cross-Operation Invariants

| Invariant | Where the legal set comes from | Enforced where | The test that proves it |
|---|---|---|---|
| Allowed Product Category IDs | Ed25519-signed `SessionMandate.allowed_category_ids` | `packages/mcp-enforcer/src/ed25519-verifier.ts` & `redis-lua-enforcer.ts` | `packages/mcp-enforcer/src/redis-lua-enforcer.test.ts` |
| Cumulative Budget Cap | Ed25519-signed `SessionMandate.max_total_spend_cents` | Single-threaded Redis Lua atomic decrement | `packages/mcp-enforcer/src/mcp-spend-firewall.test.ts` (Call 1-24) |
| Dispute Settlement Tier Transition | Evaluated Risk/Liability $(L, R) \in [0,1]^2$ matrix | `apps/workflows/src/tasks/disputeForensicsTask.ts` | `apps/web-cockpit/src/app/judge/disputeHardening.test.ts` |
| Carrier Code Normalization | Supported 150+ PayPal carrier registry | `apps/api-orchestrator/src/services/paypal-apimatic.ts#normalizeCarrierCode` | `apps/api-orchestrator/src/services/paypal-apimatic.test.ts` |

---

## 5. Table 1b.3 — Optional Request Fields

| Field | What requires it | Set it? |
|---|---|---|
| `PayPal-Request-Id` | Required by DUPLICATE CLAIMS table to enforce mutation idempotency | ✅ Set to deterministic UUID v4 |
| `PayPal-Partner-Attribution-Id` | Sponsor track attribution (`AegisPay_PayPal_AI_2026`) | ✅ Set on all outbound API requests |
| `PayPal-Mock-Response` | Chaos simulator fault-injection tests (`INSTRUMENT_DECLINED`, etc.) | ✅ Set conditionally during testing |
| `invoice_id` | Required to prevent duplicate debiting per purchase unit | ✅ Set with deterministic hash suffix |
| `custom_id` | Audit correlation with internal PostgreSQL order ID | ✅ Set to internal UUID |
| `note_to_payer` | Regulatory compliance and dispute offer clarity | ✅ Set on refunds and claim settlements |

---

## 6. Table 1b.4 — When the API Says No

| Status | Your app answers | The caller reads | Test |
|---|---|---|---|
| `400 Bad Request` | HTTP 400 | The API's reason text from `err.result.details` or `err.message` | Fake 400 in chaos test; assert reason returned |
| `401 Unauthorized` / `403 Forbidden` | HTTP 502 | Fixed message: "Upstream payment provider authorization error" | Fake 401; assert 502 and fixed message |
| `422 Unprocessable Entity` | HTTP 422 | Exact validation issue from `err.result.details[0].issue` | Fake 422; assert issue and field in payload |
| `429 Too Many Requests` | HTTP 503 | Fixed message: "Rate limit reached on payment clearinghouse" | Verified in retry policy |
| `5xx Server Error` | HTTP 502 | Fixed message: "Payment clearinghouse temporary error" | Verified in retry policy |
| Connection / Timeout Error on Write | Unknown outcome | Query `GET` status by `PayPal-Request-Id` before final response | `chaosSimulator.test.ts` |

---

## 7. Required Reading & Companion Skills

- MUST load `typescript-error-handling`: For `ApiError`, status narrowing, and error payload unwrapping.
- MUST load `typescript-client-initialization`: For app-scoped singleton construction and environment selection.
- MUST load `typescript-authentication`: For OAuth 2 client credentials management and token caching.
- MUST load `typescript-calling-endpoints`: For flat parameter unwrapping and server read-back verification.
- MUST load `typescript-models`: For model construction, strict optional fields, and enum mapping.
- MUST load `typescript-configuration-resilience`: For timeouts, exponential backoff, and idempotent retries.
- MUST load `typescript-testing`: For wire-level mocking and chaos fault injection testing.
