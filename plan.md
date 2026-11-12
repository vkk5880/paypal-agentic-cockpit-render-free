# MASTER ENGINEERING & EXECUTION BLUEPRINT (`plan.md`)

**Project Codename:** AegisPay — Autonomous Dual-Sided Agentic Commerce, Synthetic Intent Clearinghouse & Arbitration Cockpit

**Target Competition:** Build What's Next with PayPal and AI Global Hackathon (Deadline: Nov 12, 2026)

**Target Prize Pool (\$34,500+ Combined Track Strategy):**

* **PayPal Core Tracks:** Grand Prize ($\$12,000$), Best Use of PayPal + AI ($\$5,000$), Best Use of Agentic Commerce ($\$5,000$), Best Demo Delivery ($\$5,000$)

* **Sponsor Tracks:** AG Grid / AG Studio 3 1st Place ($\$5,000$), Channel3 ($\$1,500$), APIMatic ($\$1,000$), Bryntum ($\$1,000$), Render ($\$1,000$ Credits)

**Development Paradigm:** Continuous Feature-Driven Modular Execution (Zero Compromise on Core Technical Moats)

## 1. ARCHITECTURAL DECISIONS & SCOPE MATRIX

Our rule is simple: **Zero compromise on our core algorithmic and cryptographic moats**, while dropping only external dependencies that have no sponsor track or slow down our build.

### 1.1 Uncompromising Core Moats (100% Retained & Engineered in Full)

1. **Standalone Proxy MCP Server + Redis Lua Atomic Spend Enforcer (`packages/mcp-enforcer`):**

   * Wraps `@paypal/mcp` and `@paypal/agent-toolkit` behind a zero-trust JSON-RPC/SSE proxy.

   * Validates browser-signed Ed25519 `SessionMandate` policies and executes single-threaded **Redis Lua scripts** on Render Key-Value to prevent concurrent agent race conditions or prompt-injected overspending.

2. **Commission-Subsidized Multi-Vendor Knapsack Cart Optimizer (`apps/api-orchestrator/src/services/cart-solver.ts`):**

   * Queries Channel3 (`/v1/search` and `/v1/lookup` using promo code `PAYPAL-HACKATHON-2026` for 20,000 credits) across text, scene images, category IDs, and hex color palettes.

   * Solves an Integer Linear Programming (ILP) / Branch-and-Bound optimization across `offers[].price`, `offers[].compare_at_price`, `offers[].max_commission_rate` rebates, and tiered shipping thresholds, mapping the winning split into a single **PayPal Orders v2 Multi-Purchase-Unit** payload (`intent: "AUTHORIZE"`).

3. **Synthetic Intent Negotiation — Buyer-to-Merchant Autonomous Bidding (`apps/api-orchestrator/src/services/synthetic-intent.ts`):**

   * When a buyer's desired basket exceeds their budget cap by $5\%\text{--}18\%$, the Buyer Agent mints a cryptographically backed **Synthetic Intent Voucher** anchored by a live **PayPal Vault v3 Setup Token (`/v3/vault/setup-tokens`)**.

   * Broadcasts the binding bid to the Merchant Cockpit; when the merchant's pricing agent (or 1-click cockpit action) accepts the bid, the system immediately converts the vaulted token into an authorized & captured PayPal v2 Order.

4. **72-Hour Price-Drop Escrow via Render Workflows (`apps/workflows/src/tasks/price-drop-watcher.ts`):**

   * Uses **Render Workflows (`ctx.step()`)** to durability-poll Channel3 `/v1/lookup` during PayPal's 3-day authorization honor period. Automatically captures the lower adjusted price via `POST /v2/payments/authorizations/{id}/capture` or voids and re-routes if a competing merchant undercuts the hold.

5. **12-Action Multi-Modal Dispute & Refund Arbiter (`apps/workflows/src/tasks/dispute-arbiter.ts`):**

   * Goes far beyond `@paypal/mcp`'s basic `accept_dispute_claim`. Implements full APIMatic-grounded coverage of PayPal Disputes v1 (`/provide-evidence` `multipart/form-data`, `/make-offer`, `/acknowledge-return-item`, `/accept-claim`, and sandbox state transitions `/require-evidence` & `/adjudicate`) plus Captures Refund v2 (`/v2/payments/captures/{id}/refund`).

   * Pairs EXIF tamper detection + Multimodal Vision comparison (Channel3 `images[].cleaned_url` vs. buyer return photo) with PayPal Shipment Tracking v1 (`/v1/shipping/trackers-batch`) into a bounded Liability-Risk matrix $(L, R) \in [0,1]^2$.

6. **AG Studio 3 Multi-Agent Cockpit + DuckDB-WASM + Bryntum SLA Scheduler (`apps/web-cockpit`):**

   * Wires AG Studio 3 (`@ag-grid/studio@3.0.0`) `createAiHarness` (`lead`, `planning`, `data`, `page`, `widget`) to our custom `paypal_arbiter` agent (`clientToolRunner`) and `api.defineAiCommand` cross-filters.

   * Embeds `@duckdb/duckdb-wasm` in a Web Worker for sub-10ms OLAP SQL queries and integrates `@bryntum/scheduler-trial` with an **"Unallocated SLA Deadline"** filter badge to auto-schedule analyst shifts before `seller_response_due_date` expires.

### 1.2 What Unrelated Items We Drop (And Why)

* **DROP Elasticsearch Cluster:** Has no standalone cash prize category in the hackathon rules and duplicates Channel3's 100M+ vector product search and DuckDB-WASM's in-browser SQL engine.

* **DROP External UPS / FedEx / DHL Developer Registrations:** Instead of waiting days for third-party logistics API keys, we use **PayPal's official Shipment Tracking v1 API (`/v1/shipping/trackers-batch`)** combined with deterministic carrier weight/GPS telemetry in our Sandbox Chaos Simulator.

* **DROP External AWS S3 / Cloudflare R2 Buckets:** Instead of managing external cloud storage credentials that break local judge evaluation, we compile multi-modal dispute evidence PDFs in-memory using `pdf-lib` (`Uint8Array`), stream them directly as `multipart/form-data` to PayPal's `/v1/customer/disputes/{id}/provide-evidence` endpoint, and store base64/binary previews in Render PostgreSQL.

## 2. MONOREPO DIRECTORY & MODULE TOPOLOGY

We use a strict TypeScript Turborepo structure so shared Zod schemas, APIMatic-grounded PayPal SDK wrappers, and cryptographic utilities work seamlessly across all packages.

```
aegispay-monorepo/
├── LICENSE                                  # Mandatory root MIT License (visible in GitHub About)
├── render.yaml                              # Render Blueprint IaC (Web, API, Workflows, PG, Redis)
├── turbo.json
├── package.json
├── docs/
│   └── APIMATIC.md                          # Required audit log of APIMatic Context Plugin SDK grounding
│
├── apps/
│   ├── web-cockpit/                         # Next.js 15 + React 19 Dual-Sided Cockpit
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (buyer)/                 # Buyer Agent, Spend Signer, Knapsack & Synthetic Bid UI
│   │   │   │   ├── (merchant)/              # AG Studio 3 Canvas + Bryntum Dispute SLA Scheduler
│   │   │   │   └── judge/                   # Pre-authenticated 1-Click Judge Chaos & Verification Portal
│   │   │   ├── components/
│   │   │   │   ├── ag-studio/
│   │   │   │   │   ├── studioHarness.ts                 # createStudio + createAiHarness + paypal_arbiter
│   │   │   │   │   ├── EvidenceComparatorWidget.tsx     # Custom SVG Channel3 vs Return Photo Diff Widget
│   │   │   │   │   └── HateoasDisputeActionRenderer.tsx # Dynamic HATEOAS links[] action buttons
│   │   │   │   ├── bryntum/
│   │   │   │   │   └── DisputeSlaScheduler.tsx          # @bryntum/scheduler-trial w/ Unallocated SLA badge
│   │   │   │   └── buyer/
│   │   │   │       ├── CryptographicMandateSigner.tsx   # WebCrypto Ed25519 SessionMandate generator
│   │   │   │       ├── KnapsackSplitVisualizer.tsx      # Multi-merchant commission & shipping breakdown
│   │   │   │       ├── SyntheticIntentBidder.tsx        # Vault v3 Setup Token backed bid broadcaster
│   │   │   │       └── PayPalV6SdkMount.tsx             # window.paypal.createInstance() 15-min token session
│   │   │   └── workers/
│   │   │       └── duckdb.worker.ts         # @duckdb/duckdb-wasm OLAP SQL engine
│   │
│   ├── api-orchestrator/                    # Fastify + TypeScript Core Financial Clearinghouse
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── paypal.webhooks.ts       # /api/webhooks/paypal (Cryptographic signature verified)
│   │   │   │   ├── buyer.procurement.ts     # /api/buyer/knapsack, /authorize, /synthetic-bid
│   │   │   │   ├── merchant.arbitration.ts  # /api/agents/arbiter/stream (AG-UI event generator)
│   │   │   │   └── integrations.verify.ts   # /api/integrations/verify (Live PayPal read-back ledger)
│   │   │   ├── services/
│   │   │   │   ├── paypal-apimatic.ts       # APIMatic-grounded @paypal/paypal-server-sdk wrapper
│   │   │   │   ├── channel3.client.ts       # /v1/search (text/image/hex) & /v1/lookup client
│   │   │   │   ├── cart-solver.ts           # Commission-subsidized ILP multi-vendor solver
│   │   │   │   ├── synthetic-intent.ts      # Vault v3 setup-token bid matching & auto-capture engine
│   │   │   │   └── dispute-matrix.ts        # (L, R) Liability-Risk calculator & in-memory pdf-lib builder
│   │   │   └── index.ts
│   │
│   └── workflows/                           # Render Workflows Durable Execution Service (@renderinc/sdk)
│       ├── src/
│       │   ├── tasks/
│       │   │   ├── priceDropWatcher.ts      # Durable ctx.step() 72h Channel3 price-drop poller & capturer
│       │   │   ├── disputeForensicsTask.ts  # Durable ctx.step() Vision diff + PDF evidence uploader
│       │   │   └── syntheticBidMatcher.ts   # Durable ctx.step() autonomous bid-to-merchant clearing
│       │   └── index.ts
│
└── packages/
    ├── mcp-enforcer/                        # Standalone Proxy MCP Server + Redis Lua Spend Enforcer
    │   ├── src/
    │   │   ├── ed25519-verifier.ts          # Cryptographic SessionMandate verification
    │   │   ├── redis-lua-enforcer.ts        # Atomic Lua budget reservation & velocity check
    │   │   ├── merchant-anomaly-gate.ts     # Pre-flight domain, discount variance & dispute score check
    │   │   ├── custom-tools.ts              # 6 custom tools missing from official @paypal/mcp
    │   │   └── server.ts                    # Proxies @paypal/mcp + enforces zero-trust guardrails
    │
    ├── database/                            # Drizzle ORM + PostgreSQL 16 Schema & Sandbox Seeder
    │   ├── src/
    │   │   ├── schema.ts
    │   │   └── seed-sandbox.ts
    │
    └── shared-types/                        # Canonical Zod schemas & AG-UI protocol events
        └── src/index.ts

```

## 3. DATA LAYER, REDIS LUA ATOMIC ENFORCER & CRYPTOGRAPHIC SCHEMAS

### 3.1 PostgreSQL 16 Relational Schema (`packages/database/src/schema.ts`)

```
-- 1. Cryptographic Buyer Spend Mandates (Ed25519 Signed)
CREATE TABLE spend_mandates (
    mandate_id VARCHAR(32) PRIMARY KEY, -- e.g., 'vch_9f8a7d6c5b4e3a21'
    buyer_id VARCHAR(64) NOT NULL,
    max_total_spend_cents INTEGER NOT NULL CHECK (max_total_spend_cents > 0),
    max_single_merchant_cents INTEGER NOT NULL CHECK (max_single_merchant_cents > 0),
    cumulative_spent_cents INTEGER NOT NULL DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    allowed_category_ids TEXT[] NOT NULL, -- e.g., Channel3 category IDs ['xoN']
    public_key_hex VARCHAR(128) NOT NULL,
    ed25519_signature_hex TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXHAUSTED, REVOKED, EXPIRED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Synthetic Intent Negotiation Vouchers (Vault v3 Backed Bids)
CREATE TABLE synthetic_intent_vouchers (
    voucher_id VARCHAR(32) PRIMARY KEY, -- e.g., 'syn_4d3c2b1a8e7f6g5h'
    mandate_id VARCHAR(32) NOT NULL REFERENCES spend_mandates(mandate_id),
    paypal_vault_setup_token_id VARCHAR(64) NOT NULL, -- From POST /v3/vault/setup-tokens
    paypal_payment_token_id VARCHAR(64),              -- From POST /v3/vault/payment-tokens
    channel3_product_id VARCHAR(64) NOT NULL,
    merchant_domain VARCHAR(128) NOT NULL,
    retail_offer_cents INTEGER NOT NULL,
    buyer_bid_cents INTEGER NOT NULL,                 -- e.g., 8% below retail_offer_cents
    commission_rebate_rate NUMERIC(5,4) NOT NULL,     -- Channel3 max_commission_rate
    merchant_min_floor_cents INTEGER NOT NULL,        -- Autonomous merchant agent reserve floor
    negotiation_status VARCHAR(32) NOT NULL DEFAULT 'OPEN_BID', -- OPEN_BID, COUNTERED, ACCEPTED_AND_CAPTURED, EXPIRED
    resulting_paypal_order_id VARCHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Multi-Vendor Escrow Orders & Conditional Authorizations
CREATE TABLE escrow_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paypal_order_id VARCHAR(64) UNIQUE NOT NULL,
    paypal_request_id VARCHAR(64) UNIQUE NOT NULL,    -- Idempotency header
    mandate_id VARCHAR(32) NOT NULL REFERENCES spend_mandates(mandate_id),
    gross_authorized_cents INTEGER NOT NULL,
    commission_rebate_cents INTEGER NOT NULL DEFAULT 0,
    shipping_saved_cents INTEGER NOT NULL DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    server_readback_verified BOOLEAN NOT NULL DEFAULT FALSE, -- Verified via GET /v2/checkout/orders/{id}
    order_status VARCHAR(32) NOT NULL, -- AUTHORIZED, PRICE_DROP_CAPTURED, COMPLETED, VOIDED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Individual Merchant Purchase Units & 72h Price-Drop Watchers
CREATE TABLE purchase_unit_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_order_id UUID NOT NULL REFERENCES escrow_orders(id),
    invoice_id VARCHAR(64) UNIQUE NOT NULL,           -- Deterministic suffix to prevent DUPLICATE_INVOICE_ID
    paypal_authorization_id VARCHAR(64) UNIQUE,
    paypal_capture_id VARCHAR(64) UNIQUE,
    paypal_tracking_number VARCHAR(64),               -- Linked via POST /v1/shipping/trackers-batch
    channel3_product_id VARCHAR(64) NOT NULL,
    channel3_cleaned_image_url TEXT NOT NULL,         -- Baseline reference for Dispute Vision Diff
    merchant_domain VARCHAR(128) NOT NULL,
    merchant_anomaly_score NUMERIC(4,3) NOT NULL,
    authorized_cents INTEGER NOT NULL,
    target_price_drop_cents INTEGER NOT NULL,
    final_captured_cents INTEGER,
    honor_period_expires_at TIMESTAMPTZ NOT NULL,     -- +72 hours from authorization
    auth_valid_until TIMESTAMPTZ NOT NULL,            -- +29 days from authorization
    hold_status VARCHAR(32) NOT NULL DEFAULT 'WATCHING_PRICE'
);

-- 5. Multi-Modal Dispute Arbitrations & Bryntum SLA Schedule
CREATE TABLE dispute_arbitrations (
    paypal_dispute_id VARCHAR(64) PRIMARY KEY,
    purchase_unit_id UUID REFERENCES purchase_unit_holds(id),
    dispute_reason VARCHAR(64) NOT NULL,
    dispute_state VARCHAR(64) NOT NULL,               -- REQUIRED_ACTION, UNDER_REVIEW, RESOLVED
    dispute_amount_cents INTEGER NOT NULL,
    liability_score_l NUMERIC(4,3) NOT NULL,          -- L in [0.0, 1.0] (Vision + Carrier + Policy)
    abuse_risk_score_r NUMERIC(4,3) NOT NULL,         -- R in [0.0, 1.0] (EXIF Tamper + Velocity)
    exif_tamper_flag BOOLEAN NOT NULL DEFAULT FALSE,
    defect_bounding_box JSONB,                        -- [ymin, xmin, ymax, xmax] SVG overlay coordinates
    hateoas_allowed_actions TEXT[] NOT NULL,          -- Parsed from PayPal dispute response links[]
    selected_tier_action VARCHAR(48) NOT NULL,        -- TIER1_REFUND, TIER2_PARTIAL_OFFER, TIER3_RETURN_OFFER, TIER4_CONTEST_PDF, TIER5_SLA_ESCALATE
    seller_response_due_date TIMESTAMPTZ NOT NULL,
    assigned_analyst_id VARCHAR(64),                  -- NULL = Flagged by Bryntum "Unallocated SLA Deadline"
    scheduled_review_start TIMESTAMPTZ,
    scheduled_review_end TIMESTAMPTZ,
    compiled_evidence_pdf_base64 TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

```

### 3.2 Atomic Redis Lua Script (`packages/mcp-enforcer/src/redis-lua-enforcer.ts`)

Executed inside Render Key-Value (Redis) on every tool invocation inside `packages/mcp-enforcer` before touching PayPal's REST API:

```
-- KEYS[1]: "aegis:mandate:" .. mandate_id
-- KEYS[2]: "aegis:merchant_exposure:" .. mandate_id .. ":" .. merchant_domain
-- ARGV[1]: requested_cents
-- ARGV[2]: current_unix_ms
-- ARGV[3]: category_id
-- ARGV[4]: merchant_anomaly_score (scaled 0..1000)

local m = redis.call("HMGET", KEYS[1], "max_total", "max_single_merchant", "spent", "expires_ms", "status", "allowed_cats")
if not m[1] then
    return {0, "ERR_MANDATE_NOT_FOUND"}
end

local max_total = tonumber(m[1])
local max_merchant = tonumber(m[2])
local spent = tonumber(m[3])
local expires_ms = tonumber(m[4])
local status = m[5]
local allowed_cats = m[6]

local req_cents = tonumber(ARGV[1])
local now_ms = tonumber(ARGV[2])
local cat_id = ARGV[3]
local anomaly_score = tonumber(ARGV[4])

if status ~= "ACTIVE" then
    return {0, "ERR_MANDATE_STATUS_" .. status}
end
if now_ms > expires_ms then
    redis.call("HSET", KEYS[1], "status", "EXPIRED")
    return {0, "ERR_MANDATE_EXPIRED"}
end
if anomaly_score > 300 then
    return {0, "ERR_MERCHANT_ANOMALY_THRESHOLD_EXCEEDED"}
end
if string.find(allowed_cats, cat_id, 1, true) == nil and allowed_cats ~= "*" then
    return {0, "ERR_CATEGORY_NOT_AUTHORIZED:" .. cat_id}
end

local current_merchant_spent = tonumber(redis.call("GET", KEYS[2]) or "0")
if (current_merchant_spent + req_cents) > max_merchant then
    return {0, "ERR_EXCEEDS_SINGLE_MERCHANT_EXPOSURE_CAP"}
end
if (spent + req_cents) > max_total then
    return {0, "ERR_EXCEEDS_TOTAL_MANDATE_BUDGET"}
end

-- Atomic Reservation
redis.call("HINCRBY", KEYS[1], "spent", req_cents)
redis.call("INCRBY", KEYS[2], req_cents)
return {1, tostring(spent + req_cents)}

```

## 4. MODULE A: AUTONOMOUS BUYER AGENT, KNAPSACK SOLVER, SYNTHETIC INTENT NEGOTIATION & MCP PROXY

### 4.1 Standalone Proxy MCP Server (`packages/mcp-enforcer/src/server.ts`)

1. **Upstream Wrapping & Tool Filtering:**

   * Spawns or connects to the official `@paypal/mcp` / `@paypal/agent-toolkit` read-only tools (`list_transactions`, `get_order`, `get_dispute`, `get_shipment_tracking`, `get_merchant_insights`) so external MCP clients (Claude Desktop, Cursor, or our internal orchestrator) retain full observability.

   * **Intercepts and hides** raw unguarded mutation tools (`create_order`, `pay_order`, `accept_dispute_claim`, `create_refund`).

2. **Six Custom Guarded MCP Tools (`custom-tools.ts`):**

   * `optimize_channel3_multi_merchant_basket`: Runs the commission-subsidized knapsack solver across Channel3 `/v1/search` offers under a signed `allowance_voucher_id`.

   * `authorize_conditional_escrow_order`: Verifies the Ed25519 signature + Redis Lua atomic reservation, appends a deterministic `invoice_id` suffix, creates a multi-unit PayPal v2 Order with `intent: "AUTHORIZE"`, performs a mandatory server-side read-back (`GET /v2/checkout/orders/{id}`), and triggers the Render Workflow 72-hour price-drop watcher.

   * `broadcast_synthetic_intent_voucher`: Creates a PayPal Vault v3 setup token (`/v3/vault/setup-tokens`) and broadcasts a binding below-retail bid to merchants when a basket exceeds the buyer's budget cap.

   * `void_or_capture_escrow_hold`: Executes `POST /v2/payments/authorizations/{id}/capture` (at the lower price-dropped amount) or `POST /v2/payments/authorizations/{id}/void`.

   * `submit_dispute_evidence_bundle`: Compiles carrier tracking, vision defect masks, and policy proofs into an in-memory PDF (`pdf-lib`) and submits `multipart/form-data` to `POST /v1/customer/disputes/{id}/provide-evidence`.

   * `propose_dispute_partial_settlement`: Executes `POST /v1/customer/disputes/{id}/make-offer` with calculated partial compromise amounts.

### 4.2 Commission-Subsidized Multi-Vendor Knapsack Solver (`cart-solver.ts`)

1. **Channel3 Discovery (`/v1/search` & `/v1/lookup`):**

   * Supports multimodal search inputs: text query, inspiration scene image (`image_url` / base64), `category_ids` (e.g., `"xoN"`), and beta hex-color filters (`#RRGGBB`).

   * Extracts `offers[].price`, `offers[].compare_at_price`, `offers[].max_commission_rate`, `offers[].domain`, `images[].cleaned_url`, and physical `dimensions`.

2. **ILP / Branch-and-Bound Formulation:**

   * Evaluates candidate merchant assignments $x_{i,m} \in \{0,1\}$ for each required shopping slot $i \in \{1, \dots, N\}$ to minimize net buyer expenditure:
     

     $$
     \min_{x_{i,m} \in \{0,1\}} \sum_{i=1}^{N} \sum_{m \in M_i} x_{i,m} \cdot \left( P_{i,m} \cdot (1 - \alpha \cdot C_{i,m}) + S_m \cdot \mathbb{I}\left(\sum_{k} x_{k,m} P_{k,m} < \theta_m\right) + \lambda \cdot \rho_m \right)
     $$

   * Where $C_{i,m}$ is Channel3's `max_commission_rate`, $\alpha = 0.75$ is the platform commission rebate passed back to the buyer's mandate allowance, $S_m$ is the shipping fee waived when total spend at merchant $m$ reaches $\theta_m$, and $\rho_m$ is the merchant anomaly penalty (flagging suspicious $>85\%$ `compare_at_price` markdowns).

### 4.3 Synthetic Intent Negotiation (`synthetic-intent.ts`)

1. **Trigger Condition:**

   * When the optimal knapsack basket cost $\sum P_{i,m}$ exceeds the buyer's budget cap $B$ by up to $18\%$ (e.g., optimal basket is $\$490.00$, buyer mandate cap is $\$450.00$), standard checkout fails.

2. **Cryptographic Vault Proof (`POST /v3/vault/setup-tokens`):**

   * Instead of failing the session, the Buyer Agent mints a `SyntheticIntentVoucher` for $\$450.00$ backed by a verified PayPal Vault v3 payment token (`payment_source.token`) and the buyer's Ed25519 mandate signature.

   * The voucher proves to the merchant that **100% of the** $\$450.00$ **funds are vaulted, pre-authorized, and zero-click capturable** if the merchant accepts an $8.1\%$ discount.

3. **Autonomous Merchant Margin Evaluation & Instant Clearing (`syntheticBidMatcher.ts`):**

   * The Render Workflow task evaluates the incoming `SyntheticIntentVoucher` against the merchant's minimum margin floor (incorporating the saved customer acquisition cost from Channel3's `max_commission_rate`).

   * If $\text{BidAmount} \ge \text{MerchantFloor}$, or if the merchant clicks `[Accept Synthetic Bid & Capture $450.00]` in the AG Studio 3 Cockpit, the orchestrator immediately executes `POST /v2/checkout/orders` using the vaulted token, captures the funds, and verifies completion via `GET /v2/checkout/orders/{id}`.

### 4.4 72-Hour Price-Drop Escrow via Render Workflows (`priceDropWatcher.ts`)

1. **Durable Checkpoint Execution (`@renderinc/sdk/workflows`):**

   * Upon `POST /v2/checkout/orders/{id}/authorize`, the orchestrator invokes the Render Workflow task `aegispay-workflows/price-drop-watcher`.

   * Inside durable `await ctx.step("poll-channel3-lookup", ...)` checkpoints, the task queries Channel3 `/v1/lookup` for the `channel3_product_id`.

   * **Case A (Same Merchant Price Drop):** If the merchant lowers the price from $P_{\text{auth}}$ to $P_{\text{new}} < P_{\text{auth}}$, `await ctx.step("capture-lower-price", ...)` invokes `POST /v2/payments/authorizations/{auth_id}/capture` with `amount: P_new` and `final_capture: true`, automatically releasing $P_{\text{auth}} - P_{\text{new}}$ back to the buyer.

   * **Case B (Competing Merchant Undercut):** If a competing merchant in Channel3's `offers[]` drops their price below $P_{\text{auth}} - \text{switching\_threshold}$, the workflow voids the initial authorization (`POST /v2/payments/authorizations/{auth_id}/void`) and places a new order on the cheaper merchant rail.

## 5. MODULE B: 12-ACTION MULTI-MODAL DISPUTE & REFUND ARBITER ENGINE

### 5.1 Cryptographic Webhook Verification & HATEOAS State Inspection

1. **Webhook Verification (`paypal.webhooks.ts`):**

   * Verifies `PAYPAL-TRANSMISSION-SIG` via `POST /v1/notifications/verify-webhook-signature` for `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.UPDATED`, and `PAYMENT.CAPTURE.REFUNDED`.

2. **HATEOAS Link Extraction:**

   * Queries `GET /v1/customer/disputes/{id}` and inspects the `links[]` array (`accept-claim`, `make-offer`, `provide-evidence`, `acknowledge-return-item`, `appeal`) so neither the autonomous agent nor the AG Studio UI ever attempts an invalid state transition.

### 5.2 Parallel Multi-Modal Evidentiary Ingestion (`disputeForensicsTask.ts`)

Executed as durable `ctx.step()` stages inside Render Workflows:

1. **Step 1 — Paired Vision Forensics (Channel3 Baseline vs. Buyer Evidence):**

   * Fetches the pristine studio reference image from Channel3 (`images[].cleaned_url`, white background, 1024px) alongside the buyer's submitted return/damage image.

   * Runs `exifreader` buffer analysis to detect manipulation software (`Photoshop`, `Midjourney`, `GIMP`) or timestamp mismatches (`exif_tamper_flag`).

   * Invokes Claude 3.5 Sonnet / GPT-4o Vision with `temperature: 0.0` to output:

     * `identity_match_score` $\in [0,1]$ (Does the return photo show the exact SKU, color hex, and variant?)

     * `defect_severity_score` $\in [0,1]$ (Cosmetic scratch $\approx 0.25$ vs. structural shatter $\approx 0.90$)

     * `defect_bounding_box`: `[ymin, xmin, ymax, xmax]` for our AG Studio custom SVG comparator widget.

2. **Step 2 — PayPal Shipment Tracking v1 & Weight Telemetry:**

   * Queries `GET /v1/shipping/trackers/{id}` (and registers trackers via `POST /v1/shipping/trackers-batch`) to verify `DELIVERED` status, postal code match, and package weight consistency against Channel3's `dimensions.weight`.

### 5.3 Two-Dimensional $(L, R)$ Settlement Matrix & In-Memory PDF Evidence Builder

We compute two orthogonal deterministic scores in $[0.0, 1.0]$:

* **Merchant Liability Score (**$L$**):**
  

  $$
  L = \text{clamp}\!\left(0.45 \cdot S_{\text{defect}} + 0.35 \cdot S_{\text{non\_delivery}} + 0.20 \cdot S_{\text{policy\_valid}}, \, 0.0, \, 1.0\right)
  $$

* **Buyer Abuse / Fraud Risk Score (**$R$**):**
  

  $$
  R = \text{clamp}\!\left(0.50 \cdot \mathbb{I}_{\text{exif\_tamper}} + 0.30 \cdot (1 - S_{\text{identity\_match}}) + 0.20 \cdot S_{\text{buyer\_dispute\_velocity}}, \, 0.0, \, 1.0\right)
  $$

**Five-Tier Deterministic Execution Matrix:**

1. **Tier 1 — Pre-Dispute Micro-Refund (**$L \ge 0.75, R < 0.20$**, Amount** $\le \$50$**):**

   * Invokes `POST /v2/payments/captures/{capture_id}/refund` directly to resolve the issue instantly before chargeback fees accrue.

2. **Tier 2 — Partial Keep-The-Item Compromise (**$0.30 \le L < 0.75, R < 0.35$**, Cosmetic Defect):**

   * Calculates $\text{Offer} = \text{round}(\text{DisputeAmount} \times L, 2)$ and invokes `POST /v1/customer/disputes/{id}/make-offer` with `offer_type: "REFUND"`.

3. **Tier 3 — Refund Contingent on Return (**$L \ge 0.75, R < 0.40$**, Amount** $> \$50$**):**

   * Invokes `POST /v1/customer/disputes/{id}/make-offer` with `offer_type: "REFUND_WITH_RETURN"`, then triggers `POST /v1/customer/disputes/{id}/acknowledge-return-item` once return carrier scan arrives.

4. **Tier 4 — Autonomous Forensic Defense (**$R \ge 0.60$ **or** $L < 0.25$**):**

   * Uses `pdf-lib` in memory to generate a forensic PDF dossier containing the side-by-side Channel3 `cleaned_url` vs. buyer photo diff, EXIF tamper log, and PayPal Shipment Tracking v1 proof.

   * Uploads the binary `Uint8Array` via `multipart/form-data` to `POST /v1/customer/disputes/{id}/provide-evidence` (`evidence_type: "PROOF_OF_FULFILLMENT"`).

5. **Tier 5 — High-Value Human Escalation & Bryntum SLA Scheduling (**$0.35 \le R < 0.60$ **or Amount** $> \$250$**):**

   * Routes to the AG Studio 3 Cockpit and triggers the Bryntum Scheduler to allocate an analyst review slot prior to `seller_response_due_date`.

## 6. MODULE C: AG STUDIO 3 MULTI-AGENT COCKPIT, DUCKDB-WASM & BRYNTUM SLA SCHEDULER

### 6.1 AG Studio 3 Agent Framework Integration (`studioHarness.ts`)

1. **Hybrid Multi-Agent Harness (`createAiHarness`):**

   * Enhances AG Studio 3's built-in `lead` agent (`directLlmRunner`) with `delegateTo(['planning', 'data', 'page', 'widget', 'paypal_arbiter'])`.

   * Registers our custom `paypal_arbiter` specialist via `clientToolRunner` streaming AG-UI protocol events (`TEXT_MESSAGE_*`, `TOOL_CALL_*`) from `/api/agents/arbiter/stream`.

2. **Programmatic Cross-Filtering (`api.defineAiCommand`):**

   * Registers `isolate_high_risk_disputes` using `api.execCommand('AgAddPageFilterCommand', ...)` and live schema helpers (`s.pageId()`, `s.widgetId()`) so natural language prompts automatically filter grids, pivot charts, and highlight rows across the entire AG Studio page.

3. **Calculated Expressions (`create_expression`):**

   * Configures a live calculated column `Net_Retained_Margin`:
     

     $$
     \text{Net\_Retained\_Margin} = \text{capture\_amount} - \text{paypal\_fee} - (\text{dispute\_amount} \times L) + \text{channel3\_rebate}
     $$

### 6.2 Custom AG Studio Visual Widgets & Cell Renderers

1. **`EvidenceComparatorWidget.tsx` (Custom Studio Catalogue Widget):**

   * Side-by-side interactive SVG viewer comparing the Channel3 `cleaned_url` studio photo against the buyer's return photo with the animated `[ymin, xmin, ymax, xmax]` defect bounding box, EXIF tamper badge, and dual $(L, R)$ radial gauges.

2. **`HateoasDisputeActionRenderer.tsx` (HATEOAS-Aware Grid Cell Renderer):**

   * Reads `hateoas_allowed_actions` on each row and renders 1-click execution buttons (`[Submit PDF Defense]`, `[Offer 35% Partial]`, `[Accept Synthetic Bid]`) that optimistic-update the grid row upon PayPal Sandbox confirmation.

### 6.3 DuckDB-WASM In-Browser OLAP & Bryntum SLA Scheduler

1. **`duckdb.worker.ts` (`@duckdb/duckdb-wasm`):**

   * Ingests historical PayPal transactions and live SSE webhook deltas into an in-memory Apache Arrow table. Exposes `query_anonymized_financial_ledger` to the Studio `data` agent so cohort queries execute in $<10\text{ ms}$ while stripping PII.

2. **`DisputeSlaScheduler.tsx` (`@bryntum/scheduler-trial`):**

   * Mounted in the Cockpit's SLA tab (built using `https://mcp.bryntum.com` patterns).

   * Features a prominent red **"Unallocated SLA Deadline"** toolbar filter badge that highlights any dispute carrying a `seller_response_due_date` with no analyst time allocated, plus an agent-driven rescheduler that automatically shifts review blocks when a PayPal webhook reports a new dispute, late capture, or Synthetic Intent bid expiry.

## 7. MODULE D: APIMATIC GROUNDING DOCUMENTATION & `/app/judge` CHAOS SIMULATOR

### 7.1 Mandatory APIMatic Prize Verification (`docs/APIMATIC.md`)

Because judges cannot inspect our local IDE during grading, we commit `docs/APIMATIC.md` documenting exact before/after diffs generated by the **APIMatic Context Plugin for PayPal**:

* Grounded `@paypal/paypal-server-sdk` initialization with OAuth2 token caching and 15-minute `/v1/oauth2/token` client token generation for PayPal JS SDK v6 (`window.paypal.createInstance()`).

* Grounded Vault v3 (`POST /v3/vault/setup-tokens` & `POST /v3/vault/payment-tokens`) payloads for Synthetic Intent Negotiation.

* Grounded `PayPal-Request-Id` idempotency and `PayPal-Mock-Response` fault injection headers (`{"mock_application_codes": "INSTRUMENT_DECLINED"}` and `{"mock_application_codes": "COMPLIANCE_VIOLATION"}`).

### 7.2 Pre-Authenticated `/app/judge` Chaos & Sandbox Simulator

To ensure judges never encounter `NOT_ENABLED_TO_VAULT_PAYMENT_SOURCE` or missing `.env` keys, `/app/judge` provides 4 zero-config interactive triggers paired with a live `/api/integrations/verify` read-back console:

1. **`[Trigger Knapsack + 72h Price-Drop Capture]`:** Runs a 3-merchant Channel3 search, creates a real PayPal Sandbox `AUTHORIZE` order, simulates a $15\%$ Channel3 price drop inside the Render Workflow task, captures the lower price via PayPal, and displays the verified `GET /v2/checkout/orders/{id}` JSON read-back.

2. **`[Trigger Synthetic Intent Bid ($450 on $490 Bundle)]`:** Mints a Vault v3 setup token + Ed25519 voucher, executes autonomous merchant floor matching, captures the discounted order, and streams the SSE update to AG Studio 3.

3. **`[Trigger Redis Lua Prompt-Injection Attack ($5,000)]`:** Fires an adversarial tool call into `packages/mcp-enforcer` exceeding the buyer's mandate; displays the exact `< 1ms` Redis Lua rejection code (`ERR_EXCEEDS_TOTAL_MANDATE_BUDGET`).

4. **`[Inject Live Sandbox Dispute & Auto-Adjudicate]`:** Calls PayPal's sandbox-only `POST /v1/customer/disputes/{id}/require-evidence` endpoint, triggers the Render Workflow vision forensics + `pdf-lib` multipart upload to `/provide-evidence`, and calls `/adjudicate` to resolve the dispute live on screen.

## 8. DECLARATIVE RENDER BLUEPRINT (`render.yaml`)

```yaml
previews:
  generation: automatic
  expireAfterDays: 3

envVarGroups:
  - name: aegispay-common
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: NODE_ENV
        value: production
      - key: LOG_LEVEL
        value: info
      - key: MASTRA_TELEMETRY_DISABLED
        value: "true"

  - name: aegispay-ai-config
    envVars:
      - key: COMMERCE_AGENT_MODEL
        value: google/gemini-2.5-flash
      - key: GEMINI_MODEL
        value: gemini-2.5-flash

  - name: aegispay-paypal-creds
    envVars:
      - key: PAYPAL_CLIENT_ID
        sync: false
      - key: PAYPAL_CLIENT_SECRET
        sync: false
      - key: PAYPAL_WEBHOOK_ID
        sync: false
      - key: CHANNEL3_API_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: HTTP402_HMAC_SECRET
        sync: false
      - key: RENDER_API_KEY
        sync: false

services:
  # 1. Next.js 15 Dual-Sided Cockpit (Buyer Portal + AG Studio 3 + Bryntum + /app/judge)
  - type: web
    name: aegispay-web-cockpit
    runtime: node
    plan: standard
    region: oregon
    buildCommand: pnpm install --frozen-lockfile --prod=false && pnpm --filter @aegispay/web-cockpit build
    startCommand: pnpm --filter @aegispay/web-cockpit start
    healthCheckPath: /api/health
    envVars:
      - fromGroup: aegispay-common
      - key: NEXT_PUBLIC_API_URL
        fromService:
          type: web
          name: aegispay-api-orchestrator
          property: host
      - key: NEXT_PUBLIC_PAYPAL_CLIENT_ID
        sync: false
      - key: NEXT_PUBLIC_AG_GRID_LICENSE_KEY
        sync: false

  # 2. Fastify Financial Orchestrator + Proxy MCP Enforcer Gateway
  - type: web
    name: aegispay-api-orchestrator
    runtime: node
    plan: standard
    region: oregon
    buildCommand: pnpm install --frozen-lockfile --prod=false && pnpm --filter @aegispay/api-orchestrator build
    preDeployCommand: pnpm --filter @aegispay/database build && pnpm --filter @aegispay/database db:push
    initialDeployHook: pnpm --filter @aegispay/database run db:seed
    startCommand: pnpm --filter @aegispay/api-orchestrator start
    healthCheckPath: /api/integrations/verify
    envVars:
      - fromGroup: aegispay-common
      - fromGroup: aegispay-ai-config
      - fromGroup: aegispay-paypal-creds
      - key: DATABASE_URL
        fromDatabase:
          name: aegispay-postgres
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: keyvalue
          name: aegispay-redis
          property: connectionString

  # 3. Native Render Workflows Service (72h Price-Drop Watcher, Vision Arbiter & Synthetic Matcher)
  - type: workflow
    name: aegispay-workflows
    runtime: node
    region: oregon
    buildCommand: pnpm install --frozen-lockfile --prod=false && pnpm --filter @aegispay/workflows build
    startCommand: pnpm --filter @aegispay/workflows start
    envVars:
      - fromGroup: aegispay-common
      - fromGroup: aegispay-ai-config
      - fromGroup: aegispay-paypal-creds
      - key: DATABASE_URL
        fromDatabase:
          name: aegispay-postgres
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: keyvalue
          name: aegispay-redis
          property: connectionString

  # 4. Scheduled Ledger Reconciliation & Dutch Auction Voucher Pruning Engine
  - type: cron
    name: aegispay-cron-reconciler
    runtime: node
    plan: starter
    region: oregon
    schedule: "0 */6 * * *"
    buildCommand: pnpm install --frozen-lockfile --prod=false && pnpm --filter @aegispay/api-orchestrator build
    startCommand: node apps/api-orchestrator/dist/jobs/reconcile-ledger.js
    envVars:
      - fromGroup: aegispay-common
      - fromGroup: aegispay-paypal-creds
      - key: DATABASE_URL
        fromDatabase:
          name: aegispay-postgres
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: keyvalue
          name: aegispay-redis
          property: connectionString

  # 5. Render Key-Value (Redis) for Atomic Lua Spend Enforcer
  - type: keyvalue
    name: aegispay-redis
    plan: starter
    region: oregon
    maxmemoryPolicy: noeviction
    ipAllowList: []

databases:
  # 6. Render Managed PostgreSQL 16 Ledger
  - name: aegispay-postgres
    plan: basic-1gb
    region: oregon
    postgresMajorVersion: "16"
    databaseName: aegispay
    user: aegispay_admin
    ipAllowList: []
```

### Render Sponsor Prize Compliance & Architectural Verification
- [x] **Declarative Blueprint (`render.yaml`)**:
  - Web Services: `aegispay-web-cockpit` (Next.js 15), `aegispay-api-orchestrator` (Fastify 4)
  - Native Workflows: `aegispay-workflows` (`type: workflow`, Node 22, pinned to `region: oregon`)
  - Private Datastores: `aegispay-redis` (Key-Value, `noeviction`, `ipAllowList: []`), `aegispay-postgres` (PostgreSQL 16)
  - Scheduled Jobs: `aegispay-cron-reconciler` (`type: cron`, schedule: `"0 */6 * * *"`)
  - Automation: `preDeployCommand` Drizzle migration push + `initialDeployHook` 1,000-row sandbox seeder
  - Preview Environments: `previews: generation: automatic, expireAfterDays: 3`
  - DRY Configuration: `envVarGroups` (`aegispay-common`, `aegispay-ai-config`, `aegispay-paypal-creds`)
- [x] **Render Workflows SDK (`@renderinc/sdk` v1.8.0)**:
  - Multi-step flow definitions using `flow()` and `FlowContext` with checkpointed `ctx.step()`
  - Explicit retry policies (`maxRetries: 3`, `waitDurationMs: 1500`, `backoffScaling: 2.0`) and `plan: 'flex'`
  - Programmatic workflow dispatch client in API orchestrator (`render.workflows.startFlow()`)
- [x] **Observability & Diagnostics**:
  - Live `/api/integrations/verify` terminal extracting `RENDER_SERVICE_ID`, `RENDER_INSTANCE_ID`, and live ping latencies
  - Dedicated sponsor compliance dossier in `docs/RENDER.md`
  - 1-Click "Deploy to Render" button integrated into root `README.md`

## 9. CONTINUOUS BUILD SEQUENCE (MODULAR IMPLEMENTATION ORDER)

Because we are building continuously without artificial day-by-day pauses, we execute the codebase in **5 tightly coupled dependency layers**:

1. **Layer 1 — Foundation, Schemas & Cryptographic MCP Guardrail (`packages/shared-types`, `packages/database`, `packages/mcp-enforcer`):**

   * Initialize Turborepo, root `LICENSE` (MIT), Drizzle PostgreSQL schema, Ed25519 `SessionMandate` signer/verifier, Redis Lua atomic spend script, and the 6 custom MCP tools wrapping `@paypal/mcp`.

2. **Layer 2 — APIMatic-Grounded PayPal Core & Channel3 Procurement Engine (`apps/api-orchestrator`):**

   * Implement `paypal-apimatic.ts` (JS SDK v6 15-min client tokens, Orders v2 Multi-Unit `AUTHORIZE`/`CAPTURE`/`VOID`, Vault v3 setup tokens, Disputes v1 12-action client, Shipment Tracking v1, and Webhook verification) + `docs/APIMATIC.md`.

   * Implement `channel3.client.ts`, the commission-subsidized `cart-solver.ts` knapsack engine, and `synthetic-intent.ts` Vault-backed bidding.

3. **Layer 3 — Durable Render Workflows (`apps/workflows`):**

   * Implement `priceDropWatcher.ts`, `syntheticBidMatcher.ts`, and `disputeForensicsTask.ts` (Channel3 `cleaned_url` vs. return photo vision diff, EXIF tamper check, $(L, R)$ matrix, and in-memory `pdf-lib` multipart `/provide-evidence` uploader) using `ctx.step()`.

4. **Layer 4 — Dual-Sided Next.js 15 Cockpit, AG Studio 3, DuckDB-WASM & Bryntum (`apps/web-cockpit`):**

   * Build the Buyer Portal (Ed25519 Mandate Signer, Knapsack Split Visualizer, Synthetic Intent Bidder, PayPal JS SDK v6 mount).

   * Build the Merchant Cockpit (`studioHarness.ts` wiring the 5 built-in AG Studio agents + `paypal_arbiter`, `EvidenceComparatorWidget.tsx`, `HateoasDisputeActionRenderer.tsx`, `duckdb.worker.ts`, and `DisputeSlaScheduler.tsx` with the red **"Unallocated SLA Deadline"** badge).

5. **Layer 5 — Sandbox Seeder, `/app/judge` Chaos Portal & Render Blueprint (`seed-sandbox.ts`, `render.yaml`):**

   * Wire the deterministic 1,000-row sandbox seeder and the 4 one-click chaos triggers on `/app/judge` with `/api/integrations/verify` live PayPal read-backs.

## 10. PRODUCTION-GRADE EXPANSION BLUEPRINT & SECTION-WISE SPECIFICATIONS (TASKS 8–15)

Following comprehensive competitive audit against production agentic commerce platforms (Stripe Agentic Commerce Suite, Skyfire HTTP 402, Payman AI, and Nevermined) and hackathon evaluation criteria, the following 8 expansion sections define the mandatory production upgrade sequence for Jules.

---

### 10.1 [Task 8] Open Agent Interoperability Protocols — HTTP 402 Gateway & OpenAI ACP Adapter

#### Objective & Moat Rationale
Proprietary MCP tools isolate AegisPay in a walled garden. External autonomous agents (ChatGPT Shopping, Claude Desktop, Skyfire web-native agents) require open protocols. We implement standard HTTP 402 (Payment Required) and OpenAI Agentic Commerce Protocol (ACP) adapters without altering our underlying cryptographic Redis Lua enforcer.

#### Architectural Boundaries & File Specifications
1. **`apps/api-orchestrator/src/middleware/http402-interceptor.ts` (Check File):**
   * Fastify pre-handler interceptor. Intercepts incoming requests lacking active `X-Spend-Mandate-Id` or `X-Synthetic-Voucher-Id`.
   * Returns `HTTP 402 Payment Required` with standardized headers:
     - `X-Payment-Contract-Id`: Generated contract hash.
     - `X-PayPal-Vault-Setup-Url`: Link for user/agent to tokenize vaulted payment method.
     - `X-Aegis-Spend-Policy`: Spend constraints required to satisfy transaction.
   * Responds with RFC-compliant payment challenge JSON.

2. **`packages/mcp-enforcer/src/acp-manifest.ts`:**
   * Exports OpenAI ACP-compliant tool and agent manifest.
   * Maps ACP procurement intents (`discover_products`, `request_purchase_quote`, `confirm_payment_hold`) directly into AegisPay's 6 guarded tools.

3. **`apps/api-orchestrator/src/routes/acp.routes.ts`:**
   * Mounts `GET /.well-known/acp.json` and `POST /api/acp/actions` for external agent discovery and execution.

---

### 10.2 [Task 9] Procurement Resilience — 2PC Inventory Pre-Check, Zip-Code Tax & Redis Hash Tags

#### Objective & Moat Rationale
Multi-merchant knapsack optimization risks split order failure if an item goes out of stock between calculation and authorization. Furthermore, uncalculated sales tax causes capture mismatch errors (`PAYMENT_DENIED`), and single-node Redis key structures limit horizontal scaling across cluster shards.

#### Architectural Boundaries & File Specifications
1. **`apps/api-orchestrator/src/services/tax-estimator.ts` (Check File):**
   * Implements regional and US zip-code tax calculator computing state and local sales tax in basis points.
   * Injects `tax_cents` directly into knapsack solver output and PayPal multi-purchase unit payloads.

2. **`apps/api-orchestrator/src/services/channel3.client.ts`:**
   * Implements Two-Phase Commit (2PC) inventory pre-check `verifyAndHoldStock(itemIds: string[])`.
   * Verifies real-time SKU availability across all knapsack merchants prior to triggering PayPal Orders v2 `AUTHORIZE`.
   * Includes fallback re-optimization if any item is out of stock (automatically drops optional accessories or substitutes vendor).

3. **`packages/mcp-enforcer/src/redis-lua-enforcer.ts`:**
   * Updates key naming to use **Redis Hash Tags (`{...}`)**:
     `KEYS[1] = "aegis:{vch_" .. mandate_id .. "}:mandate"`
     `KEYS[2] = "aegis:{vch_" .. mandate_id .. "}:exposure:" .. merchant_domain`
   * Ensures all keys for a given mandate evaluate on the exact same Redis Cluster shard, enabling horizontal multi-master scaling ($500,000+$ ops/sec).

4. **`packages/database/src/schema.ts` & `packages/shared-types/src/index.ts`:**
   * Extends `purchase_unit_holds` schema with `tax_cents: integer()`, `zip_code: varchar(10)`, and `stock_reservation_status: varchar(32)`.

---

### 10.3 [Task 10] Settlement Mechanics & Negotiation — Partial Capture Split & Multi-Turn Counter-Bidding

#### Objective & Moat Rationale
72-hour price drop pre-capture holds currently capture or void the entire order monolithically. If 1 merchant drops price but another cancels, individual units must be captured or voided independently. Additionally, Synthetic Intent Bidding must support algorithmic 2-turn counter-offers (bounded Dutch auction) rather than 1-shot binary failure.

#### Architectural Boundaries & File Specifications
1. **`apps/api-orchestrator/src/services/counter-bid-engine.ts` (Check File):**
   * Implements bounded multi-turn counter-negotiation engine.
   * If merchant margin reserve floor sits between buyer bid ($450) and list price ($490) (e.g. floor $460), generates algorithmic merchant counter-voucher.
   * Evaluates counter against buyer's signed Ed25519 mandate limit ($500); if within policy, auto-approves or initiates 60s HITL confirmation.

2. **`apps/workflows/src/tasks/priceDropWatcher.ts`:**
   * Enhances durable workflow with unit-level partial capture and void split:
     - `ctx.step("partial-unit-capture")`: Captures discounted Unit A independently via `POST /v2/payments/authorizations/{unit_a_auth_id}/capture`.
     - `ctx.step("partial-unit-void")`: Voids out-of-stock Unit B independently via `POST /v2/payments/authorizations/{unit_b_auth_id}/void` without canceling Unit A.
   * Persists individual unit status in PostgreSQL `purchase_unit_holds`.

3. **`apps/workflows/src/tasks/syntheticBidMatcher.ts`:**
   * Updates durable step pipeline with `ctx.step("evaluate-counter-bid")` checkpoint.

---

### 10.4 [Task 11] Dispute Forensics & Reverse Logistics — Automated Shipping Labels & Autonomy Dial

#### Objective & Moat Rationale
In Tier 3 disputes (return contingent refund), calling `/acknowledge-return-item` without providing the buyer with a return shipping label leaves the dispute unfulfillable. Merchants also need an autonomy dial to configure automated versus supervised refund execution thresholds.

#### Architectural Boundaries & File Specifications
1. **`apps/workflows/src/tasks/reverseShippingLabelTask.ts` (Check File):**
   * Implements automated prepaid return shipping label and scannable barcode/QR code generation.
   * Integrates tracking number generation conforming to PayPal Shipment Tracking v1 (`/v1/shipping/trackers-batch`).
   * Attaches return shipping dossier URL and tracking ID to `dispute_arbitrations` table.

2. **`apps/workflows/src/tasks/disputeForensicsTask.ts`:**
   * Links Tier 3 execution directly to `reverseShippingLabelTask`.
   * Automatically dispatches return label payload to buyer dispute notification endpoint.

3. **`packages/shared-types/src/index.ts`:**
   * Defines `ReturnLabelInfo` schema: `{ label_url: string, tracking_number: string, carrier: string, qr_code_base64: string }`.
   * Defines `AutonomyDialMode`: `'COPILOT' | 'SUPERVISED' | 'AUTONOMOUS'`.

---

### 10.5 [Task 12] Consumer-Grade Buyer Cockpit — Generative Intent Bar, Thought Stream & Progressive Disclosure

#### Objective & Moat Rationale
The buyer portal currently alienates non-technical consumers with raw Ed25519 hex dumps, mathematical budget sliders, and isolated category checkboxes. We introduce an AI Generative Intent Bar, streaming thought trace, and progressive disclosure for cryptographic proofs.

#### Architectural Boundaries & File Specifications
1. **`apps/web-cockpit/src/components/buyer/GenerativeIntentBar.tsx` (Check File):**
   * Conversational natural language prompt bar (e.g., *"Find me a minimalist ergonomic workspace under $400 with walnut wood and fast shipping"*).
   * Parses natural language into category filters, price ceilings, and Channel3 vector search queries.

2. **`apps/web-cockpit/src/components/buyer/ThoughtStreamVisualizer.tsx`:**
   * Live streaming activity trace rendering animated micro-milestones:
     - `[0.12s]` Ingested visual inspiration and parsed color palette.
     - `[0.34s]` Matched 14 candidate offers across 3 merchants via Channel3.
     - `[0.61s]` Solved multi-vendor knapsack: saved $24.50 by bundling shipping.
     - `[0.82s]` WebCrypto Ed25519 spend mandate locked: $400.00 cap.

3. **`apps/web-cockpit/src/components/buyer/CryptographicMandateSigner.tsx`:**
   * Redesigns primary view to display a reassuring **"Cryptographic Vault Lock" Shield** and plain English status: *"Hardware-Signed Spend Cap: $500.00 (Active for 15m)"*.
   * Moves raw Ed25519 public key hexes, signature hexes, and JSON payload into a collapsible `<details>` drawer labeled:
     `[▾ Inspect Cryptographic Proof & Signature (Ed25519) — For Judges & Auditors]`.

4. **`apps/web-cockpit/src/components/buyer/KnapsackSplitVisualizer.tsx`:**
   * Groups multi-merchant items into **"Unified Delivery Windows"** with delivery date estimates.
   * Displays line-item commission rebates as instant discounts.

5. **`apps/web-cockpit/src/components/buyer/SyntheticIntentBidder.tsx`:**
   * Adds prominent status pill: `Authorization Hold Only — $0 Captured Until Accepted`.
   * Adds active 15-minute visual countdown timer.

6. **`apps/web-cockpit/src/app/(buyer)/page.tsx`:**
   * Integrates the Generative Intent Bar, Thought Stream, Vault Lock shield, and Unified Cart into a coherent consumer shopping flow.

---

### 10.6 [Task 13] Merchant Cockpit & SLA Polish — Rationale Cards, Safety Hold & Urgent SLA Views

#### Objective & Moat Rationale
Analysts second-guess bare $(L, R)$ numbers. Direct HATEOAS action buttons risk accidental irreversible refunds on live accounts. Bryntum SLA scheduler requires emergency sorting to prevent deadline defaults before `seller_response_due_date`.

#### Architectural Boundaries & File Specifications
1. **`apps/web-cockpit/src/components/ag-studio/AutonomyDialWidget.tsx` (Check File):**
   * Implements 3-mode merchant autonomy selector:
     - `Co-Pilot`: Analyst approval required for all actions.
     - `Supervised`: Auto-executes micro-refunds < $50; analyst confirmation for > $50.
     - `Full Autonomous`: Executes all verified forensic verdicts within policy.

2. **`apps/web-cockpit/src/components/ag-studio/EvidenceComparatorWidget.tsx`:**
   * Adds plain-English **Forensic Rationale Card** next to radial $(L, R)$ meters:
     - Carrier Match: USPS tracker delivery and weight verified (+0.35 confidence).
     - Integrity Audit: EXIF metadata verifies unedited mobile capture.
     - Defect Severity: Bounding box detects 6.2cm structural surface fracture.
     - Recommendation: Auto-settle via Tier 1 Micro-Refund (below dispute fee).

3. **`apps/web-cockpit/src/components/ag-studio/HateoasDisputeActionRenderer.tsx`:**
   * Replaces raw 1-click execution buttons with a 2-second **"Hold to Confirm"** interaction or 5-second non-blocking toast with an **"Undo"** buffer.
   * Adds preview modal for destructive Tier 4/5 `pdf-lib` dossiers.

4. **`apps/web-cockpit/src/components/bryntum/DisputeSlaScheduler.tsx`:**
   * Color-codes timeline bars dynamically:
     - Red: Unallocated SLA deadline with < 6 hours remaining.
     - Yellow: Under automated vision forensics triage.
     - Green: Evidence bundle submitted to PayPal Disputes v1.
   * Adds 1-click filter for **"Imminent Breach (< 12 Hours Left)"**.

---

### 10.7 [Task 14] Real-Time Human-in-the-Loop (HITL) Push Approvals & Friendly Error Transmutation

#### Objective & Moat Rationale
When an autonomous agent attempts a transaction exceeding exposure limits or when a merchant returns a counter-bid, outright failure alienates users. We implement a real-time HITL push bridge with 60-second approval timers and user-friendly error recovery.

#### Architectural Boundaries & File Specifications
1. **`apps/api-orchestrator/src/services/hitl-approval.ts` (Check File):**
   * Implements in-memory/Redis 60-second approval registry.
   * Exposes SSE / WebSocket channel broadcasting approval requests to connected client cockpits.
   * Handles user approval/rejection and resumes execution pipeline.

2. **`apps/web-cockpit/src/components/buyer/HitlApprovalModal.tsx`:**
   * Real-time push notification modal with 60-second countdown ring:
     - *"Merchant countered at $465.00 ($15 above bid). Accept counter before timer expires? [Accept] [Decline]"*
     - *"Agent requested $520.00 spend ($20 above mandate cap). Approve 1-time exception? [Approve] [Block]"*

3. **`apps/web-cockpit/src/components/common/FriendlyErrorTransmuter.tsx`:**
   * Intercepts Redis Lua codes (`ERR_EXCEEDS_TOTAL_MANDATE_BUDGET`, `ERR_MANDATE_EXPIRED`, `ERR_EXCEEDS_SINGLE_MERCHANT_EXPOSURE_CAP`) and PayPal API errors.
   * Transmutes technical codes into friendly, contextual recovery cards with one-click resolution buttons:
     - *"Adding this item exceeds your preset limit by $15.00. [Increase Cap to $515.00] or [Find Cheaper Alternative]?"*

---

### 10.8 [Task 15] Hackathon Winning Video Chaos Simulator Polish & Sponsor Compliance Verification

#### Objective & Moat Rationale
The hackathon Grand Prize and sponsor prize sweep require strict adherence to the 3-minute video presentation formula and unassailable proof of live PayPal sandbox read-backs across all 5 sponsor categories.

#### Architectural Boundaries & File Specifications
1. **`apps/web-cockpit/src/app/judge/chaosSimulator.test.ts` (Check File):**
   * Automated test suite executing and verifying all 4 chaos simulator triggers against mock/live endpoints.
   * Asserts `< 1ms` rejection on prompt injection, Vault setup-token minting on synthetic intent, and valid `pdf-lib` multipart payload on disputes.

2. **`apps/web-cockpit/src/app/judge/page.tsx`:**
   * Polishes `/app/judge` UI to strictly reflect the 3-minute demo video script:
     - Action 1: *Simulate Prompt Injection Attack ($5,000)* -> Instant red alert: Blocked in <1ms by Redis Lua Enforcer before PayPal API touch.
     - Action 2: *Trigger Synthetic Intent Haggle & Vault Authorization* -> Shows Vault setup token minting and autonomous capture.
     - Action 3: *Inject Damaged Return Dispute* -> Multi-modal vision diff, carrier weight check, and in-memory `pdf-lib` dossier submitted to PayPal Disputes v1.
   * Live `/api/integrations/verify` terminal showing verified PayPal server read-back JSON.

3. **`docs/APIMATIC.md` & `README.md`:**
   * Complete sponsor prize sweep documentation: APIMatic, AG Grid/Studio 3, Bryntum, Channel3, and Render.
   * Clear local run instructions and Devpost 3-minute submission video script outline.


---

## 11. Production Consumer Agent & Enterprise Workstation Suite (Tasks 16–20)

### 11.1 [Task 16] Core Financial Resiliency & One-Time Vault v3 Pre-Authorization Engine

#### Objective & Moat Rationale
A real production financial engine cannot permanently lock user funds if a card declines (`INSTRUMENT_DECLINED`) or a network error occurs. Furthermore, true agentic commerce requires one-time Vault v3 onboarding so the agent can execute off-session purchases and background counter-bidding within user-defined spend caps without popping up repetitive PayPal login windows. Finally, affiliate commission rebates must be decoupled from merchant settlement so sellers receive full retail authorization on PayPal Orders v2 while platform funds customer rebates.

#### Architectural Boundaries & File Specifications
1. **`packages/mcp-enforcer/src/redis-lua-enforcer.ts` (Check File):**
   * Implement `rollbackReservation(mandateId: string, reqCents: number, merchantDomain?: string): Promise<boolean>` executing atomic Lua compensating rollback (`HINCRBY ... -req_cents`) on `{vch_<id>}:mandate`.
   * Export `eval_rollback` Lua script and ensure cluster hash tags `{vch_...}` preserve single-slot atomicity.
   * Unit tests verifying that failed authorizations restore mandate available balance to 100%.

2. **`apps/api-orchestrator/src/services/vault-onboarding.ts`:**
   * Implement one-time Vault v3 onboarding service:
     - `createVaultSetupSession()`: Calls `POST /v3/vault/setup-tokens` with `usage_type: "MERCHANT"` and `customer_type: "CONSUMER"`.
     - `confirmVaultPaymentToken(setupTokenId: string)`: Calls `POST /v3/vault/payment-tokens` converting setup token into durable `paypal_payment_token_id`.
   * Persists `paypal_payment_token_id` in session/database, enabling zero-click off-session agent buying.

3. **`apps/api-orchestrator/src/services/cart-solver.ts`:**
   * Update multi-purchase unit creation to authorize full retail merchant amounts, recording `commission_rebate_cents` in a separate platform subsidy breakdown so merchants are never underpaid before affiliate payouts.

4. **`apps/api-orchestrator/src/routes/buyer.procurement.ts`:**
   * Mount `/api/buyer/vault/setup` and `/api/buyer/vault/confirm`.
   * Add compensating rollback invocation in `catch` blocks of all checkout and authorization routes.

---

### 11.2 [Task 17] Conversational AI Shopping Concierge & Product Comparison Engine

#### Objective & Moat Rationale
Consumers expect an intelligent conversational partner—similar to Perplexity Buy or ChatGPT Shopping—that discovers products across 100M+ Channel3 items, compares specifications side-by-side, checks 2PC merchant stock, and answers questions before buying.

#### Architectural Boundaries & File Specifications
1. **`apps/api-orchestrator/src/services/shopping-assistant.ts` (Check File):**
   * Implements intelligent shopping concierge service parsing natural language intent into structured actions:
     - `DISCOVER`: Matches query against Channel3 `/v1/search` with promo code `PAYPAL-HACKATHON-2026`.
     - `COMPARE`: Computes side-by-side comparison matrix across 2–3 products (price, rating, key specs, delivery time, commission rebate).
     - `DETAILS`: Returns high-resolution image gallery, merchant credibility score, and delivery windows.
     - `BUY`: Runs 2PC stock verification (`verifyAndHoldStock`) and prepares unified knapsack cart.
   * Returns structured `ChatResponsePayload` containing markdown explanation, product cards data, comparison table, and actionable follow-ups.

2. **`apps/api-orchestrator/src/routes/chat.routes.ts`:**
   * Mounts `POST /api/buyer/chat` streaming or returning JSON responses with full error handling and fallback recommendations.

---

### 11.3 [Task 18] Consumer Shopping Chat UI with Generative Cards, Budget Bar & Settings Drawer

#### Objective & Moat Rationale
The buyer portal must look impressive and intuitive to non-technical users. It replaces engineer control panels with an elegant conversational chat window, generative product cards with high-res imagery, a persistent spend allowance header, and a comprehensive settings drawer.

#### Architectural Boundaries & File Specifications
1. **`apps/web-cockpit/src/components/buyer/ConversationalAgentChat.tsx` (Check File):**
   * Interactive chat window with message history, typing animation, and thought traces.
   * Inlines interactive **Product Cards** with images, badges (Free Shipping, Commission Rebate), specs, and 1-click `[Details]`, `[Compare]`, and `[Buy for Me]`.
   * Inlines side-by-side **Comparison Table Card** highlighting differentiators.

2. **`apps/web-cockpit/src/components/buyer/UserSettingsDrawer.tsx`:**
   * Slide-out settings drawer triggered by header gear icon:
     - **Delivery Address:** Inputs for Street, City, State, and Postal ZIP code (used by `tax-estimator.ts` for exact postal tax).
     - **Fulfillment & Protection:** Selector between `72-Hour Smart Price Watcher (Pre-capture hold & auto-refunds)` vs. `Priority Express (Immediate capture & dispatch)`.
     - **Purchasing Rules:** Toggle between `Always ask me to confirm before buying` vs. `Autonomous 1-Click Buy for orders under $X`.
     - **Single-Merchant Exposure Cap Slider.**

3. **Persistent Spend Allowance Header Bar:**
   - Sleek top bar displaying: `Max Spend Allowance: $500.00` | `Spent: $85.00` | `Available: $415.00`.
   - Onboarding state: If budget is not configured on fresh start, shows clean modal/banner: *"Connect PayPal to set your autonomous shopping allowance (One-Time Setup)"*.

---

### 11.4 [Task 19] Explainable Multi-Vendor Cart & Pre-Purchase Confirmation UI

#### Objective & Moat Rationale
Cross-store cart splitting can confuse consumers unless the financial trade-offs are clearly explained. We provide a transparent multi-vendor cart drawer that explains bundling logic in plain English and renders a 1-click pre-purchase confirmation card using the pre-authorized Vault token.

#### Architectural Boundaries & File Specifications
1. **`apps/web-cockpit/src/components/buyer/UnifiedCartDrawer.tsx` (Check File):**
   * Groups items by vendor with estimated delivery dates.
   * Displays human-readable bundling math: *"Bundled Desk Mat and DAC at Nordic Workspaces to qualify for Free Shipping (Saved $18.00); split Headphones to AudioDirect for $25.00 lower price + commission rebate."*
   * Clear cost summary: Retail Subtotal, Platform Subsidy (-$15.00), Estimated Tax (ZIP: 94016), Shipping Fee ($0.00 Waived), Net Total.

2. **`apps/web-cockpit/src/components/buyer/PurchaseConfirmationCard.tsx`:**
   * Renders inside the chat stream when user asks to buy or order exceeds auto-buy threshold.
   * Single-click `[Confirm Purchase with Vaulted PayPal]` button executing instant authorization via vaulted payment token.

3. **`apps/web-cockpit/src/app/(buyer)/page.tsx`:**
   * Unifies chat, budget bar, settings drawer, and cart drawer into a cohesive consumer shopping experience.
   * Removes all developer simulation buttons (`[Simulate Error]`, `[Simulate HITL Push]`) and technical tabs from the consumer portal.

---

### 11.5 [Task 20] Real-World Dispute Hardening & Enterprise Merchant/Judge Separation

#### Objective & Moat Rationale
Dispute arbitration must align with strict PayPal REST behaviors (calling `/accept-claim` on active disputes), handle mobile-stripped EXIF headers without false penalties, prevent competitor cancellations on already-shipped orders, and isolate developer simulation tools strictly to `/judge`.

#### Architectural Boundaries & File Specifications
1. **`apps/workflows/src/tasks/disputeForensicsTask.ts` (Check File):**
   * Route Tier 1 settlements to `POST /v1/customer/disputes/{id}/accept-claim` whenever an active dispute ID is present, reserving `/v2/payments/captures/{id}/refund` for pre-dispute transactions.
   * Update EXIF inspection: only set `exif_tamper_flag = true` when explicit editing tags (`Photoshop`, `GIMP`, `Midjourney`, `Canva`) are detected. Treat missing EXIF headers as neutral.

2. **`apps/workflows/src/tasks/priceDropWatcher.ts`:**
   * Prior to competitor void/reroute, query PayPal Shipment Tracking v1. If tracking status is `SHIPPED` or `IN_TRANSIT`, lock the order and restrict adjustments to same-merchant partial captures.

3. **`apps/web-cockpit/src/workers/duckdb.worker.ts`:**
   * Exclude `compiled_evidence_pdf_base64` binary blobs from the in-browser Arrow table projection, fetching PDF dossiers on demand via `/api/disputes/:id/dossier` to prevent WebAssembly memory bloat.

4. **`apps/web-cockpit/src/app/judge/page.tsx`:**
   * Isolate all chaos test triggers, prompt injection simulations, and raw server read-back terminals exclusively within `/judge`.



---

## 12. Sentinel Security Hardening Specification

### 12.1 [Task 21] Redis Lua Delimiter Category Matching, Positive Spend Enforcement & Ed25519 Cryptographic Guardrails

#### Objective & Moat Rationale
The Redis Lua script acts as AegisPay's first-line financial clearinghouse. Any logic loophole in string matching or budget deduction can result in budget exhaustion bypass. Furthermore, cryptographic mandate verification must enforce strict byte-length, format, status, and expiration checks.

#### Architectural Boundaries & File Specifications
1. **packages/mcp-enforcer/src/redis-lua-enforcer.ts (Check File):**
   * **Delimiter-Bounded Category Matching:** In LUA_SCRIPT, replace string.find(allowed_cats, cat_id, 1, true) with comma-bounded matching ("," .. allowed_cats .. "," and "," .. cat_id .. ",") to prevent substring bypass (e.g., category "tron" matching "electronics").
   * **Strict Positive Spend Check:** Enforce if req_cents <= 0 then return {0, "ERR_INVALID_SPEND_AMOUNT"} end to prevent negative spend requests from decrementing spent amounts and resetting budgets.
   * **Redis Exposure Key TTL:** Apply TTL to KEYS[2] (merchant exposure) matching the mandate expiration or remaining TTL of KEYS[1] via edis.call("TTL", KEYS[1]).
   * **Defensive 
il Field Guards:** Wrap hash field reads with 	onumber(m[i] or "0") to prevent arithmetic crashes on missing keys.

2. **packages/mcp-enforcer/src/ed25519-verifier.ts:**
   * Validate signature byte length (signatureBuffer.length === 64), public key byte length (publicKeyBuffer.length === 32), and strict hexadecimal formatting (/^[0-9a-fA-F]+$/).
   * Verify mandate expiration (mandate.expires_at > new Date()) and status (mandate.status === 'ACTIVE').

3. **packages/mcp-enforcer/src/merchant-anomaly-gate.ts:**
   * Fix regex literal from /\\d{5,}/ to /\d{5,}/ so that consecutive digits in domains are correctly detected.
   * Enforce non-negative bounds on dispute rates and discount variance (Math.max(0, context.disputeRate)).

4. **packages/mcp-enforcer/src/custom-tools.ts:**
   * Add .refine() to AuthorizeEscrowOrderSchema ensuring equested_cents === items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0).

---

### 12.2 [Task 22] MCP Stdio Protocol Integrity, SSRF Defense & Production Fail-Closed Infrastructure

#### Objective & Moat Rationale
When MCP runs over stdio, any extraneous stdout output corrupts JSON-RPC messages and crashes client agents. Similarly, unvalidated image URLs create SSRF vulnerabilities against internal infrastructure, and silent database catch fallbacks risk executing real financial settlements based on fabricated mock data.

#### Architectural Boundaries & File Specifications
1. **packages/mcp-enforcer/src/custom-tools.ts (Check File):**
   * Replace all console.log calls with console.error (stderr) across all tool handlers to preserve JSON-RPC protocol integrity.
   * Redact sensitive tokens and parameters before logging to stderr.
   * Connect handleAuthorizeEscrow to verify real Ed25519 signatures and invoke AtomicSpendEnforcer.reserveBudget instead of returning mock values.
   * Add SSRF URL validation helper alidatePublicImageUrl(url: string) rejecting loopback (127.0.0.1, localhost), link-local metadata (169.254.169.254), and RFC 1918 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).

2. **packages/mcp-enforcer/package.json:**
   * Pin "@modelcontextprotocol/sdk" from "latest" to "^1.6.0" to guarantee deterministic builds.

3. **pps/web-cockpit/next.config.ts:**
   * Configure HTTP security headers: Content-Security-Policy, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security, Referrer-Policy: strict-origin-when-cross-origin, and Cross-Origin-Opener-Policy: same-origin.

4. **scripts/dispatch-next-task.mjs:**
   * Use execFileSync with argument arrays instead of string-interpolated execSync to eliminate shell command injection risks.
   * Enclose temporary task prompt files in 	ry ... finally blocks to prevent stranded disk artifacts.

5. **pps/workflows/src/tasks/disputeForensicsTask.ts:**
   * Implement fail-closed error handling: when process.env.NODE_ENV === 'production', throw explicit database connection errors instead of falling back to mock dispute records.

---

## 13. Bolt Performance & Database Optimization Specification

### 13.1 [Task 23] Workflow Concurrent I/O Parallelization & Database Query Batching

#### Objective & Moat Rationale
Agent workflows processing disputes and price drop checks must execute with minimal latency. Sequential database round-trips and un-indexed queries create latency bottlenecks and excessive connection pool utilization under high event volumes.

#### Architectural Boundaries & File Specifications
1. **pps/workflows/src/tasks/disputeForensicsTask.ts (Check File):**
   * Parallelize independent forensic steps: run paired-vision-forensics and carrier-telemetry concurrently using Promise.all after dispute record retrieval, reducing workflow task latency by 40-60%.

2. **pps/workflows/src/tasks/priceDropWatcher.ts:**
   * Batch purchase unit hold database queries: replace the sequential or loop queries with a single batched query using Drizzle's inArray(purchaseUnitHolds.id, targetUnitIds) to eliminate N+1 query overhead.

3. **packages/database/src/schema.ts:**
   * Add PostgreSQL B-tree indexes to high-frequency query and foreign key columns:
     - dispute_arbitrations: indexes on purchase_unit_id, dispute_state, selected_tier_action.
     - purchase_unit_holds: indexes on escrow_order_id, merchant_domain, hold_status.
     - synthetic_intent_vouchers: indexes on mandate_id, 
egotiation_status.
   * Add database-level CHECK constraints ensuring positive values for financial integer columns (max_total_spend_cents > 0, uthorized_cents > 0).

4. **packages/database/src/index.ts:**
   * Configure Pool connection pool limits: max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000.

---

### 13.2 [Task 24] DuckDB Worker Statement Caching, Ed25519 ASN.1 LRU & Monorepo Alignment

#### Objective & Moat Rationale
In-browser analytical queries with DuckDB-WASM and cryptographic signature verification are repeated frequently. Recompiling prepared statements or re-parsing ASN.1 DER structures on every invocation wastes CPU cycles and induces UI jitter.

#### Architectural Boundaries & File Specifications
1. **pps/web-cockpit/src/workers/duckdb.worker.ts (Check File):**
   * Maintain a cache of pre-compiled prepared statements for repeated financial aggregations.
   * Enclose query execution in a 	ry ... finally { await conn.close(); } block to guarantee connection cleanup on errors.
   * Restrict executed queries strictly to SELECT statements, rejecting DDL and mutations.

2. **packages/mcp-enforcer/src/ed25519-verifier.ts:**
   * Implement an LRU / Map cache for parsed Ed25519 KeyObject instances keyed by public_key_hex, bypassing repeated ASN.1 DER parsing overhead.

3. **pps/workflows/package.json:**
   * Align @paypal/paypal-server-sdk dependency version from ^1.0.0 to ^2.5.0 to maintain monorepo-wide SDK uniformity with pps/api-orchestrator.

4. **Cryptographic Random ID Generation:**
   * Replace remaining Math.random() invocations in ID generators across workflows and cockpit with crypto.randomUUID().

---

## 14. HACKATHON JUDGE & SPONSOR EVALUATION RUBRIC SPECIFICATIONS (TASKS 25–32)

### 14.1 [Task 25] Monorepo Boundaries & Next.js Route Guardrails

#### Objective & Moat Rationale
Hackathon projects often fall apart during evaluation when monorepo boundaries blur or Next.js route collisions crash the build. Strict package isolation and directory discipline ensure that judge-facing, buyer-facing, and merchant-facing codebases remain completely insulated from cross-contamination.

#### Architectural Boundaries & File Specifications
1. **Package Isolation Matrix**:
   - `packages/shared-types`: Canonical Zod schemas (`PrimaryBadgeSchema`, `ProductBadgeSchema`, `ProductCardDataSchema`, `AcpCheckoutSessionSchema`, `SpendMandateSchema`, etc.), float-safe integer cents (`CentsSchema`), basis points (`BasisPointsSchema`), and ACP contracts. Zero runtime dependencies on backend or frontend packages.
   - `packages/database`: PostgreSQL 16 connection pooling (`createDb` with bounded pool options and `statement_timeout: 10000`), Drizzle ORM schemas, and native SQLite audit ledger fallback (`createSqliteDb`).
   - `packages/mcp-enforcer`: Zero-trust MCP proxy server, single-threaded atomic Redis Lua spend limit scripts (`reserve_spend`, `capture_spend`, `rollback_spend`), monotonic risk evaluator, and category smuggling detector.
   - `apps/api-orchestrator`: Fastify financial orchestrator, PayPal APIMatic client, Channel3 search & product discovery, knapsack solver, synthetic intent matcher, ACP REST OpenAPI 3.1 / OpenRPC 1.3.2 bindings, and HTTP 402 gateway with 5 universal adapters.
   - `apps/workflows`: Render Workflows durable execution service (`@renderinc/sdk/workflows`), 72-hour price-drop watcher, synthetic bid matcher, vision forensics & PDF dossier builder.
   - `apps/web-cockpit`: Next.js 15 dual-sided cockpit (Buyer Portal + AG Studio 3 + Bryntum + `/app/judge`).

2. **Route Collision Prevention**:
   - Buyer routes must reside exclusively in `apps/web-cockpit/src/app/(buyer)/` (`/`, `/search`, `/history`, `/watchlist`, `/share`, `/cockpit`).
   - Merchant routes must reside exclusively in `apps/web-cockpit/src/app/(merchant)/merchant/` (`/merchant`, `/merchant/balances`, `/merchant/invoices`, `/merchant/plans`, `/merchant/products`, `/merchant/transactions`).
   - Judge / simulator routes (`/judge`, `/simulator`) are strictly gated behind `NEXT_PUBLIC_DEV_TOOLS === 'true'`.
   - Never place duplicate top-level page routes in `apps/web-cockpit/src/app/` that conflict with route group segments.

3. **Component Directory Discipline**:
   - Buyer UI components reside strictly in `apps/web-cockpit/src/components/buyer/`.
   - Never create duplicate `src/components/product/` folders.
   - Merchant UI components reside strictly in `src/components/merchant/`, `src/components/ag-studio/`, and `src/components/bryntum/`.

---

### 14.2 [Task 26] PostgreSQL 16 Relational Schema & Drizzle ORM Definitions (`packages/database`)

#### Objective & Moat Rationale
Financial agentic commerce cannot rely on ephemeral in-memory state or volatile cache keys. The relational database schema must establish an immutable audit trail, durable order tracking with 3-field quantity models, and multi-tenant isolation.

#### Architectural Boundaries & File Specifications
1. **Core Checkout & Ledger Tables (`schema.ts`)**:
   - `checkout_sessions`: ACP session state (`id`, `status: 'ready_for_payment' | 'completed' | 'cancelled'`, `currency`, `subtotal_cents`, `tax_cents`, `shipping_cents`, `total_cents`, `created_at`, `updated_at`).
   - `carts`: Pre-checkout cart capability (`id`, `currency`, `items`, `subtotal_cents`, `created_at`).
   - `orders`: Confirmed enhanced orders (`order_id`, `checkout_session_id`, `mandate_id`, `paypal_order_id`, `paypal_request_id`, `gross_authorized_cents`, `commission_rebate_cents`, `shipping_saved_cents`, `order_status: 'created' | 'confirmed' | 'processing' | 'shipped' | 'completed' | 'canceled'`, `server_readback_verified`, `created_at`, `updated_at`).
   - `order_line_items`: 3-quantity tracking model (`ordered: number`, `current: number`, `fulfilled: number`, `unit_price`, `subtotal`, `status: 'processing' | 'partial' | 'fulfilled' | 'removed'`).
   - `purchase_unit_holds`: 2PC hold records (`hold_id`, `escrow_order_id`, `purchase_unit_id`, `merchant_domain`, `authorized_cents`, `target_price_drop_cents`, `hold_status`, `expires_at`).

2. **Idempotency & Audit Store**:
   - `idempotency_records`: Composite key `(authenticated_identity, endpoint, idempotency_key)`, payload SHA-256 hash, response status code, response headers JSON, response body JSON, `created_at`, `expires_at`.
   - `audit_ledger`: SHA-256 hash-chained immutable audit log (`seq`, `event_id`, `request_id`, `event_type`, `mandate_id`, `order_id`, `payload`, `prev_hash`, `hash`, `created_at`).

3. **Agentic State Tables**:
   - `user_memories`: Buyer preferences (`user_id`, `preferred_brands`, `avoided_brands`, `budget_affinity`, `categories`, `updated_at`).
   - `intent_vouchers`: Synthetic intent negotiation vouchers (`voucher_id`, `mandate_id`, `channel3_product_id`, `merchant_domain`, `retail_offer_cents`, `buyer_bid_cents`, `negotiation_status`, `vault_setup_token`, `created_at`).
   - `price_drop_watchlist`: 72-hour price drop tracking (`item_id`, `user_id`, `product_id`, `current_price_cents`, `target_price_cents`, `auto_buy_enabled`, `status`, `created_at`).
   - `dispute_arbitrations`: Vision arbitration records (`dispute_id`, `purchase_unit_id`, `liability_score_l`, `abuse_risk_score_r`, `selected_tier_action`, `exhibit_pdf_hash`, `dispute_state`, `created_at`).

---

### 14.3 [Task 27] Deterministic 4-Stage Mastra DAG & Mathematical Scoring Specification

#### Objective & Moat Rationale
LLMs are notoriously prone to arithmetic hallucinations when calculating discounts, budgets, and composite rankings. AegisPay eliminates this risk by delegating semantic intent understanding to the LLM while executing a 100% deterministic mathematical pipeline for scoring and optimization.

#### Architectural Boundaries & File Specifications
1. **Mastra DAG Execution Stages (`shopping-assistant.ts`)**:
   - **Stage 1 (`discover_products`)**: Queries Channel3 `/v1/search` with extracted query and buyer preferences from `user-memory.ts`, returning validated `ProductCardData[]`.
   - **Stage 2 (`score_and_rank`)**: Runs `MurthyroshanScoringEngine` executing the pure deterministic utility formula:
     $$\text{Score} = w_1 \cdot \text{CosineSim}(\text{query}, \text{title}) + w_2 \cdot \text{PriceAffinity}(\text{price}, \text{target}) + w_3 \cdot \text{Reputation}(\text{domain}) - w_4 \cdot \text{ShippingLatency}(\text{days})$$
     Assigns automated badges (`Price Leader`, `Best Value`, `Top Rated Merchant`, `Fastest Delivery`) and CSS deal verdicts (`DEAL_EXCELLENT`, `DEAL_GREAT`, `DEAL_FAIR`, `DEAL_OVERPRICED`).
   - **Stage 3 (`solve_knapsack_cart`)**: Solves multi-vendor combinatorial knapsack optimization across Channel3 offers maximizing total utility without exceeding the buyer's spend cap $B$:
     $$\max \sum_{i \in S} \text{Utility}(i) \quad \text{s.t.} \quad \sum_{i \in S} \text{Price}(i) - \text{Rebate}(i) \le B$$
   - **Stage 4 (`execute_escrow_hold`)**: Reserves funds atomically via the Redis Lua spend enforcer (`reserve_spend`) checking mandate caps, merchant anomaly scores ($<300$), and category authorizations, followed by PayPal Orders v2 `intent: "AUTHORIZE"`.

2. **Deterministic Local Reasoner Fallback (`local-reasoner.ts`)**:
   - Fallback circuit breaker activates seamlessly if upstream AI models (Gemini, OpenAI, Anthropic) return HTTP 429 or timeout.
   - Strict regex extraction contracts: `extractAmount`, `extractCategory`, `extractMerchant`, `extractUrgency`.
   - Mandatory Human-in-the-Loop safety gate: Fallback proposals explicitly return `requires_human_confirmation: true` to prevent unreviewed escrow holds.

---

### 14.4 [Task 28] Full ACP Specification & Extension Parity (`spec/unreleased/`)

#### Objective & Moat Rationale
AegisPay strictly implements the Agentic Commerce Protocol (ACP) across both OpenAPI 3.1.0 REST and OpenRPC 1.3.2 MCP streaming bindings, establishing seamless interoperability between autonomous agents and merchants.

#### Architectural Boundaries & File Specifications
1. **1:1 MCP-to-REST Mapping**:
   - `create_checkout_session` $\leftrightarrow$ `POST /checkout_sessions`
   - `get_checkout_session` $\leftrightarrow$ `GET /checkout_sessions/:id`
   - `update_checkout_session` $\leftrightarrow$ `POST /checkout_sessions/:id`
   - `complete_checkout_session` $\leftrightarrow$ `POST /checkout_sessions/:id/complete`
   - `cancel_checkout_session` $\leftrightarrow$ `POST /checkout_sessions/:id/cancel`
   - Pre-Checkout Cart: `POST /carts`, `GET /carts/:id` (SEP #187)
   - Streamable MCP Gateway: `POST /mcp` JSON-RPC 2.0 tool executions.

2. **Price Provenance Verification**:
   - Enforce Channel3 feed update timestamps (`feed_id`, `feed_update_id`, `observed_at`).
   - Programmatically verify offers within a 24-hour TTL (`isOfferFresh`) before honoring agent-suggested prices.

3. **Multi-Touch Affiliate Attribution**:
   - Handle write-only `affiliate_attribution` objects: `touchpoint: "first"` on session creation and `touchpoint: "last"` on checkout completion.
   - Redact and strip affiliate tokens from public responses to prevent attribution theft.

4. **Discount Extension & Allocations**:
   - Validate coupon codes via `DiscountsRequest` and `DiscountsResponse`.
   - Enforce stacking priority (`priority`), explicit rejection codes (`RejectedDiscount`), and JSONPath-targeted line-item discount allocations.

5. **Conversational Error Recovery (`MessageError`)**:
   - On payment failure, return HTTP 2xx session with `status: "not_ready_for_payment"`.
   - Provide RFC 9535 JSONPath `param` pointers and resolution enums (`recoverable`, `requires_buyer_input`, `requires_buyer_review`).

6. **B2B & Post-Purchase Fulfillment**:
   - B2B payment terms (`purchase_order_number`, `net_15` through `net_90`, `TaxExemption`).
   - 3-field `OrderLineItemQuantity` tracking (`ordered`, `current`, `fulfilled`).
   - Post-purchase fulfillment registration via `POST /orders/:id/fulfillments` with carrier tracking and asynchronous `order_update` webhook dispatching.

---

### 14.5 [Task 29] HTTP 402 Paywall & Universal Payment Adapter Contracts

#### Objective & Moat Rationale
Autonomous machine-to-machine commerce requires a standardized, fiat-backed paywall protocol. AegisPay replaces volatile cryptocurrency wallets with HTTP 402 Payment Required paywalls backed by PayPal Vault v3 tokens.

#### Architectural Boundaries & File Specifications
1. **Challenge & Settlement Headers (`http402-interceptor.ts`)**:
   - Challenge Response (402): `WWW-Authenticate: X-Payment-Contract token="..."`, `X-Payment-Required: true`, RFC-compliant challenge payload.
   - Settlement Presentation: `X-Payment-Receipt: <HMAC-SHA256 signature>`, `X-Spend-Mandate-Id: <id>`.
   - Timing-safe HMAC-SHA256 receipt verification with 24-hour TTL.

2. **Universal Payment Client & Server Adapters (`http-adapters.ts`)**:
   - Client Adapters: Axios (`wrapAxiosWithPayment`), Fetch (`wrapFetchWithPayment`).
   - Server Middleware: Express (`expressPaymentMiddleware`), Hono (`honoPaymentMiddleware`), Next.js (`withX402`).

3. **Compensating Rollback Mechanics**:
   - When PayPal Orders v2 returns `INSTRUMENT_DECLINED` (HTTP 422), the orchestrator triggers an instant single-threaded Redis Lua script (`rollback_spend`) and compensates the PostgreSQL ledger within $<1$ms, leaving zero financial liability stranded.

---

### 14.6 [Task 30] Background Workflows & Vision Forensics (`apps/workflows`)

#### Objective & Moat Rationale
E-commerce dispute management is fraught with fraud and manual review latency. AegisPay automates dispute forensics using multimodal computer vision and durable cloud workflows on Render.

#### Architectural Boundaries & File Specifications
1. **Vision Arbiter & Dispute Forensics (`disputeForensicsTask.ts`)**:
   - `ExifReader`: Inspects buyer evidence image uploads for camera metadata, GPS, timestamps, and editing software tags (e.g. `Software: Adobe Photoshop` $\to$ flags image tampering).
   - Pure TypeScript 64-bit dHash (`image-hasher.ts`): Computes difference hash luminance matrices to detect perceptual image duplicate abuse without requiring native C++ compilation.
   - `pdf-lib`: Dynamically compiles tamper-evident PDF evidence dossiers and uploads them directly to PayPal Disputes v1 `/provide-evidence`.
   - Visa Compelling Evidence 3.0 (Rule 10.4): Bipartite correlator matching historical undisputed settled transactions with empty history safety.
   - Lost-in-Transit Fee Avoidance: Automatically accepts verified carrier-lost claims to avoid PayPal's $15+ dispute assessment fee.

2. **Durable Render Workflows (`priceDropWatcher.ts` & `syntheticBidMatcher.ts`)**:
   - Built on official `@renderinc/sdk/workflows` using `ctx.step()` durable checkpoint execution.
   - In-flight shipment gating: Blocks competitor price-drop void/reroute if carrier status has already progressed to `shipped` or `in_transit`.

---

### 14.7 [Task 31] Sponsor Integration Verification Matrix

#### Objective & Moat Rationale
Hackathon judging requires immediate, irrefutable verification that all sponsor technologies are deeply integrated and live, rather than mocked or theatrical.

#### Architectural Boundaries & File Specifications
1. **Diagnostic Healthcheck Route (`/api/integrations/verify`)**:
   - Fastify route returning a comprehensive diagnostic JSON payload verifying live connectivity:
     - PostgreSQL 16 Managed Ledger (Render)
     - Redis Key-Value Atomic Lua Enforcer (Render)
     - PayPal Sandbox API & Vault v3 Tokenization
     - Channel3 Multi-Merchant Catalog API (20k Hackathon Credits)
     - APIMatic SDK Conformance & Read-Back Verification
     - Mastra AI Agent Framework & Model Providers
     - Render Workflows Durable Task Engine

2. **Client Analytics & Scheduling Stack (`apps/web-cockpit`)**:
   - `@duckdb/duckdb-wasm`: Runs in a dedicated Web Worker (`duckdb.worker.ts`) executing sub-10ms OLAP SQL queries over dispute arbitrations with prepared statement caching.
   - `@bryntum/scheduler-trial`: Dispute SLA scheduler mounted in Cockpit with "Unallocated SLA Deadline" badge for auto-scheduling analyst shifts before `seller_response_due_date`.
   - AG Grid Enterprise & AG Studio 3: 5-page merchant operations workstation (`balances`, `invoices`, `plans`, `products`, `transactions`) equipped with 1-click CSV export and interactive custody action controls.

---

### 14.8 [Task 32] Strict Anti-Hallucination & Anti-Downgrade Directives

#### Objective & Moat Rationale
Coding agents must never degrade working production code or introduce non-existent, hallucinated packages that break builds during evaluation.

#### Architectural Boundaries & File Specifications
1. **Strictly Banned Packages & Crypto Bloat**:
   - ❌ Never import hallucinated packages `@modelcontextprotocol/server` or `@modelcontextprotocol/core`. Use exclusively the official `@modelcontextprotocol/sdk`.
   - ❌ Strictly reject third-party crypto and web3 libraries (`usePeraWallet`, Algorand ASA, Solana, EVM). AegisPay is a fiat-first agentic commerce platform built on PayPal Vault v3.
   - ❌ Never modify root `package.json` or `pnpm-lock.yaml` without explicit directive.

2. **Strict Anti-Downgrade Rule**:
   - Never remove SSR `typeof window !== 'undefined'` checks from client components (`VoiceSearchButton.tsx`, `PayPalV6SdkMount.tsx`, `LayoutShell.tsx`).
   - Preserve 100% test pass rate across all 317 unit and contract tests in the workspace.
