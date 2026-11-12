# AegisPay 🛡️ — PayPal Developer Platform Modernization & Integration Guide

> **Build What's Next with PayPal and AI Global Hackathon 2026**  
> **Target Tracks:**  
> - **Grand Prize ($12,000)**  
> - **Best Use of PayPal + AI ($5,000)**  
> - **Best Use of Agentic Commerce ($5,000)**  
> - **Best Demo Delivery ($5,000)**  

---

## 1. Executive Summary & Architectural Grounding

AegisPay transforms the PayPal Developer Platform into an autonomous, dual-sided agentic clearinghouse and arbitration cockpit. Rather than using brittle mocked API wrappers or unverified prompts, AegisPay is built on:

1. **Official `@paypal/agent-toolkit` & `@paypal/mcp` Bridge Architecture**:
   - Zero-trust runtime wrapper around PayPal's official Agent Toolkit (`PayPalAgentToolkit` / `PayPalMCPToolkit` v1.11.0).
   - Intercepts all autonomous financial mutations (`create_order`, `pay_order`, `create_invoice`, `create_refund`).
   - Executes hardware-signed Ed25519 `SessionMandate` verification and single-threaded Redis Lua atomic budget checks in `< 1ms` before any PayPal API endpoint is called.

2. **Full Orders v2 & Payments v2 Multi-Merchant Settlement Suite**:
   - Multi-purchase-unit order routing with dedicated merchant payee IDs and PayPal Seller Protection categorization (`category: 'PHYSICAL_GOODS'`).
   - Authorization hold tracking with `reauthorizeAuthorization` extending validity windows up to 29 days.
   - Partial captures with residual balance tracking (`final_capture: false`) for staged multi-vendor fulfillment.

3. **Vault v3 & Invoicing v2 Autonomous Commerce Rails**:
   - Tokenizes recurring payment credentials via Vault v3 setup tokens and payment tokens.
   - Issues autonomous B2B draft invoices (`POST /v2/invoicing/invoices`), dispatches them via email, generates payment QR codes (Base64 PNG), and automates Net-30 reminders.

4. **12-Action Disputes v1 HATEOAS & Carrier-Normalized Shipment Tracking v1**:
   - Automated dispute retrieval, evidence submission with mobile EXIF forensics and `pdf-lib` dossiers, settlement offers, and appeals (`POST /v1/customer/disputes/{id}/appeal`).
   - Normalized carrier code mapping (`UPS`, `USPS`, `FEDEX`, `DHL`) for batch shipment tracking.

5. **Distributed Webhooks v1 Persistence & Fastlane by PayPal**:
   - Atomic 72-hour idempotency lock powered by Redis Lua `SET ... EX 259200 NX` (with in-memory LRU fallback).
   - Fastify `onReady` automated webhook listener subscription (`ensureWebhookSubscription`).
   - Interactive Fastlane 1-click passwordless guest checkout with customer email lookup.

6. **Live `PayPal-Mock-Response` Chaos Simulator**:
   - Pass-through fault injection headers for testing genuine bank declines (`INSTRUMENT_DECLINED`) and policy blocks (`COMPLIANCE_VIOLATION`) with compensating ledger rollbacks.

---

## 2. Complete List of 18+ Integrated PayPal Endpoints

| # | Endpoint / Resource | HTTP Method | PayPal Service | Implementation Method |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `/v1/oauth2/token` | `POST` | Auth | `getAccessToken()` |
| 2 | `/v3/vault/setup-tokens` | `POST` | Vault v3 | `createVaultSetupToken()` |
| 3 | `/v3/vault/payment-tokens` | `POST` | Vault v3 | `createPaymentToken()` |
| 4 | `/v3/vault/payment-tokens` | `GET` | Vault v3 | `listCustomerPaymentTokens(customerId)` |
| 5 | `/v3/vault/payment-tokens/{id}` | `DELETE` | Vault v3 | `deletePaymentToken(paymentTokenId)` |
| 6 | `/v2/checkout/orders` | `POST` | Orders v2 | `createMultiPurchaseUnitOrder()` (AUTHORIZE/CAPTURE) |
| 7 | `/v2/checkout/orders/{id}` | `GET` | Orders v2 | `getOrder(orderId)` (Server Read-Back) |
| 8 | `/v2/checkout/orders/{id}/authorize` | `POST` | Orders v2 | `authorizeOrder(orderId, requestId, mockResponse)` |
| 9 | `/v2/checkout/orders/{id}/capture` | `POST` | Orders v2 | `captureOrder(orderId, requestId, mockResponse)` |
| 10 | `/v2/payments/authorizations/{id}/capture` | `POST` | Payments v2 | `captureAuthorization(authId, amount, isFinal, mockResponse)` |
| 11 | `/v2/payments/authorizations/{id}/reauthorize` | `POST` | Payments v2 | `reauthorizeAuthorization(authId, amount)` |
| 12 | `/v1/customer/disputes` | `GET` | Disputes v1 | `listDisputes(params)` |
| 13 | `/v1/customer/disputes/{id}` | `GET` | Disputes v1 | `getDispute(disputeId)` |
| 14 | `/v1/customer/disputes/{id}/provide-evidence` | `POST` | Disputes v1 | `provideDisputeEvidence(disputeId, payload)` (multipart/form-data) |
| 15 | `/v1/customer/disputes/{id}/appeal` | `POST` | Disputes v1 | `appealDispute(disputeId, payload)` |
| 16 | `/v1/customer/disputes/{id}/make-offer` | `POST` | Disputes v1 | `makeDisputeOffer(disputeId, offer)` |
| 17 | `/v1/customer/disputes/{id}/accept-claim` | `POST` | Disputes v1 | `acceptDisputeClaim(disputeId, note)` |
| 18 | `/v1/shipping/trackers-batch` | `POST` | Tracking v1 | `addShipmentTrackingBatch(trackers)` |
| 19 | `/v1/shipping/trackers/{id}` | `GET` | Tracking v1 | `getTracker(trackerId)` |
| 20 | `/v1/shipping/trackers/{id}` | `PUT` | Tracking v1 | `updateTracker(trackerId, params)` |
| 21 | `/v2/invoicing/invoices` | `POST` | Invoicing v2 | `createInvoice(params)` |
| 22 | `/v2/invoicing/invoices/{id}/send` | `POST` | Invoicing v2 | `sendInvoice(invoiceId)` |
| 23 | `/v2/invoicing/invoices/{id}/generate-qr-code` | `POST` | Invoicing v2 | `generateInvoiceQrCode(invoiceId)` |
| 24 | `/v2/invoicing/invoices/{id}/remind` | `POST` | Invoicing v2 | `sendInvoiceReminder(invoiceId, note)` |
| 25 | `/v1/notifications/webhooks` | `POST` | Webhooks v1 | `ensureWebhookSubscription(webhookUrl)` |
| 26 | `/v1/notifications/verify-webhook-signature` | `POST` | Webhooks v1 | `verifyWebhookSignature(params)` |

---

## 3. Official `@paypal/agent-toolkit` Bridge Architecture

The official `@paypal/agent-toolkit` (v1.11.0) is integrated as a zero-trust bridge within `packages/mcp-enforcer/src/paypal-toolkit-bridge.ts`.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Autonomous AI Shopping Agent                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Tool Invocation (JSON-RPC)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   AegisPay Zero-Trust MCP Enforcer                     │
│                                                                        │
│   1. WebCrypto Hardware Ed25519 SessionMandate Signature Check        │
│   2. Render Key-Value (Redis Lua) Atomic Spend Reservation (<1ms)      │
│   3. Merchant Domain & Anomaly Score Gate Check                        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ Approved                       │ Blocked (<1ms)
                    ▼                                ▼
┌───────────────────────────────────────┐   ┌────────────────────────────┐
│      @paypal/agent-toolkit MCP        │   │ HTTP 402 / Mandate Reject  │
│                                       │   │ (Zero PayPal API touched)  │
│  - paypal_create_order                │   └────────────────────────────┘
│  - paypal_pay_order                   │
│  - paypal_create_invoice              │
│  - paypal_get_dispute                 │
│  - paypal_create_shipment_tracking    │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     PayPal Sandbox REST API Rails                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Live `PayPal-Mock-Response` Chaos Injection

To demonstrate hardened reliability and zero-leak compensating ledger rollbacks, AegisPay natively supports injecting `PayPal-Mock-Response` headers:

### 4.1 Bank Instrument Declined (`INSTRUMENT_DECLINED`)
- **Header Passed**: `PayPal-Mock-Response: {"mock_application_codes": "INSTRUMENT_DECLINED"}`
- **PayPal Response**: HTTP 422 Unprocessable Entity
- **AegisPay Reaction**: Intercepts error, halts multi-vendor settlement, and triggers `ROLLBACK_LUA_SCRIPT` in `< 1ms`, restoring buyer budget cap without leaking funds.

### 4.2 Compliance Violation Quarantine (`COMPLIANCE_VIOLATION`)
- **Header Passed**: `PayPal-Mock-Response: {"mock_application_codes": "COMPLIANCE_VIOLATION"}`
- **PayPal Response**: HTTP 422 Unprocessable Entity
- **AegisPay Reaction**: Quarantines transaction in double-entry financial ledger, freezes escrow release, dispatches high-priority compliance officer alert, and safely cancels 2PC inventory holds.

---

## 5. Verification & Testing

### Run All Test Suites
```bash
# Verify official agent-toolkit bridge and spend enforcer
pnpm --filter @aegispay/mcp-enforcer test

# Verify API orchestrator and route integration
pnpm --filter @aegispay/api-orchestrator test

# Verify entire monorepo builds cleanly
pnpm build
```

### Live Interactive Testing
1. Launch all services:
   ```bash
   pnpm dev
   ```
2. Open the **Pre-Authenticated Judge & Chaos Clearinghouse Portal** at `http://localhost:3000/judge`.
3. Click:
   - **Trigger Knapsack + 72h Price Drop** to view multi-merchant orders and price drop captures.
   - **Trigger Decline & Rollback** to inspect `<1ms` Redis Lua rollback on `INSTRUMENT_DECLINED`.
   - **Inject Compliance Fault** to inspect transaction quarantine on `COMPLIANCE_VIOLATION`.
   - **Dispute Forensics & Label** to inspect mobile EXIF analysis, `pdf-lib` dossier generation, and automated claim resolution.
