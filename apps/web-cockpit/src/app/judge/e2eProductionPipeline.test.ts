import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as chaosHandler } from '../api/chaos/route.js';
import { GET as verifyHandler } from '../api/integrations/verify/route.js';

test('E2E Pipeline Step 1 (TRIGGER_REDIS_LUA_ATTACK): Blocks $5,000 adversarial attack in < 1ms before PayPal API touch', async () => {
  const req = new Request('http://localhost:3000/api/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'TRIGGER_REDIS_LUA_ATTACK' }),
  });

  const res = await chaosHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'REJECTED');
  assert.equal(json.chaos_action, 'TRIGGER_REDIS_LUA_ATTACK');

  // Verify atomic Lua enforcer data
  assert.ok(json.lua_enforcer);
  assert.equal(json.lua_enforcer.atomic_rejection_code, 'ERR_EXCEEDS_TOTAL_MANDATE_BUDGET');
  assert.equal(json.lua_enforcer.requested_cents, 500000); // $5,000.00
  assert.equal(json.lua_enforcer.mandate_budget_cents, 50000); // $500.00 cap
  assert.equal(json.lua_enforcer.guardrail_verdict, 'BLOCKED_BEFORE_PAYPAL_API');
  assert.ok(
    json.lua_enforcer.redis_lua_execution_ms < 1.0,
    `Expected execution < 1ms, got ${json.lua_enforcer.redis_lua_execution_ms}ms`
  );

  // Verify PayPal API was untouched
  assert.equal(json.paypal_server_readback.paypal_api_touched, false);
});

test('E2E Pipeline Step 2 (TRIGGER_CHANNEL3_KNAPSACK): Multi-modal discovery & Knapsack optimization with promo code and 2PC hold', async () => {
  const req = new Request('http://localhost:3000/api/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'TRIGGER_CHANNEL3_KNAPSACK' }),
  });

  const res = await chaosHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'SUCCESS');
  assert.equal(json.chaos_action, 'TRIGGER_CHANNEL3_KNAPSACK');

  // Verify Channel3 search & stock hold
  assert.ok(json.channel3);
  assert.equal(json.channel3.catalog_search.promo_code, 'PAYPAL-HACKATHON-2026');
  assert.equal(json.channel3.catalog_search.credits_granted, 20000);
  assert.equal(json.channel3.stock_hold_2pc.all_held, true);
  assert.ok(json.channel3.stock_hold_2pc.reservation_id.startsWith('res_ch3_'));

  // Verify Knapsack optimization
  assert.ok(json.knapsack_optimization);
  assert.equal(json.knapsack_optimization.status, 'OPTIMAL');
  assert.equal(json.knapsack_optimization.shipping_waived, true);
  assert.equal(json.knapsack_optimization.postal_tax_calculated, true);
  assert.equal(json.knapsack_optimization.gross_amount_usd, '485.00');
  assert.equal(json.knapsack_optimization.commission_rebate_usd, '52.00');

  // Verify PayPal Server read-back
  assert.ok(json.paypal_server_readback);
  assert.equal(json.paypal_server_readback.server_readback_verified, true);
  assert.ok(json.paypal_server_readback.id.startsWith('PP-ORD-CH3-'));
});

test('E2E Pipeline Step 3 (TRIGGER_AUTONOMOUS_VAULT_BUY): Autonomous auto-buy using PayPal Vault v3 token with verified read-back', async () => {
  const req = new Request('http://localhost:3000/api/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'TRIGGER_AUTONOMOUS_VAULT_BUY' }),
  });

  const res = await chaosHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'SUCCESS');
  assert.equal(json.chaos_action, 'TRIGGER_AUTONOMOUS_VAULT_BUY');

  // Verify Vault token details
  assert.ok(json.vault);
  assert.ok(json.vault.paypal_vault_setup_token_id.startsWith('vlt_st_'));
  assert.ok(json.vault.paypal_payment_token_id.startsWith('vlt_pt_'));
  assert.equal(json.vault.usage_type, 'MERCHANT');
  assert.equal(json.vault.customer_type, 'CONSUMER');
  assert.equal(json.vault.headless_delegation, true);
  assert.equal(json.vault.human_in_the_loop_required, false);

  // Verify Orders v2 capture execution
  assert.ok(json.order_execution);
  assert.equal(json.order_execution.intent, 'CAPTURE');
  assert.equal(json.order_execution.gross_captured_usd, '450.00');
  assert.equal(json.order_execution.payment_source.token.type, 'PAYMENT_METHOD_TOKEN');

  // Verify PayPal Readback
  assert.ok(json.paypal_server_readback);
  assert.equal(json.paypal_server_readback.status, 'COMPLETED');
  assert.equal(json.paypal_server_readback.gross_captured_usd, '450.00');
  assert.equal(json.paypal_server_readback.server_readback_verified, true);
});

test('E2E Pipeline Step 4 (TRIGGER_REDIS_LUA_ROLLBACK): Instant Redis Lua rollback (<1ms) on simulated card decline', async () => {
  const req = new Request('http://localhost:3000/api/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'TRIGGER_REDIS_LUA_ROLLBACK' }),
  });

  const res = await chaosHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'ROLLED_BACK');
  assert.equal(json.chaos_action, 'TRIGGER_REDIS_LUA_ROLLBACK');

  // Verify decline failure simulation
  assert.ok(json.failure_simulation);
  assert.equal(json.failure_simulation.paypal_error_code, 'INSTRUMENT_DECLINED');

  // Verify compensating rollback
  assert.ok(json.compensating_rollback);
  assert.equal(json.compensating_rollback.restored_cents, 38500);
  assert.equal(json.compensating_rollback.rollback_success, true);
  assert.equal(json.compensating_rollback.mandate_budget_restored, true);
  assert.ok(
    json.compensating_rollback.rollback_latency_ms < 1.0,
    `Expected rollback latency < 1ms, got ${json.compensating_rollback.rollback_latency_ms}ms`
  );

  // Verify PayPal read-back and budget protection
  assert.ok(json.paypal_server_readback);
  assert.equal(json.paypal_server_readback.error, 'INSTRUMENT_DECLINED');
  assert.equal(json.paypal_server_readback.server_readback_verified, true);
});

test('E2E Pipeline Step 5 (INJECT_SANDBOX_DISPUTE): Multi-modal dispute forensics, EXIF check, pdf-lib dossier upload & adjudication', async () => {
  const req = new Request('http://localhost:3000/api/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'INJECT_SANDBOX_DISPUTE' }),
  });

  const res = await chaosHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'SUCCESS');
  assert.equal(json.chaos_action, 'INJECT_SANDBOX_DISPUTE');

  // Verify Dispute Pipeline stages
  assert.ok(json.dispute_pipeline);
  assert.ok(json.dispute_pipeline.dispute_id.startsWith('PP-D-'));
  assert.equal(json.dispute_pipeline.state, 'RESOLVED');

  const stages = json.dispute_pipeline.stages;
  assert.equal(stages.length, 4);

  // Stage 1: sandbox_require_evidence
  assert.equal(stages[0].stage, 'sandbox_require_evidence');
  assert.equal(stages[0].status, 'COMPLETED');

  // Stage 2: vision_forensics_analysis
  assert.equal(stages[1].stage, 'vision_forensics_analysis');
  assert.equal(stages[1].exif_tamper_flag, true);
  assert.ok(stages[1].defect_bounding_box);
  assert.equal(stages[1].selected_tier, 'TIER4_CONTEST_PDF');

  // Stage 3: pdf_lib_forensic_bundle_upload
  assert.equal(stages[2].stage, 'pdf_lib_forensic_bundle_upload');
  assert.equal(stages[2].multipart_mime, 'multipart/form-data');
  assert.ok(stages[2].dossier_pages >= 1);

  // Stage 4: sandbox_adjudicate
  assert.equal(stages[3].stage, 'sandbox_adjudicate');
  assert.equal(stages[3].adjudication_outcome, 'SELLER_FAVOR');

  // Verify Return Label Generation for reverse logistics
  assert.ok(json.dispute_pipeline.return_label);
  assert.equal(json.dispute_pipeline.return_label.carrier, 'USPS');
  assert.ok(json.dispute_pipeline.return_label.tracking_number.startsWith('940011189922'));
  assert.ok(json.dispute_pipeline.return_label.label_url.startsWith('data:application/pdf;base64,'));
  assert.ok(json.dispute_pipeline.return_label.qr_code_base64.includes('QR:'));
  assert.equal(json.dispute_pipeline.return_label.paypal_tracking_v1_registered, true);

  // Verify PayPal Readback
  assert.equal(json.paypal_server_readback.status, 'RESOLVED');
  assert.equal(json.paypal_server_readback.adjudication_outcome, 'SELLER_FAVOR');
  assert.equal(json.paypal_server_readback.server_readback_verified, true);
});

test('E2E Pipeline Step 6 (TRIGGER_KNAPSACK_PRICE_DROP): Multi-unit v2 auth, 72h Render Workflows price drop and lower capture', async () => {
  const req = new Request('http://localhost:3000/api/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'TRIGGER_KNAPSACK_PRICE_DROP' }),
  });

  const res = await chaosHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'SUCCESS');
  assert.equal(json.chaos_action, 'TRIGGER_KNAPSACK_PRICE_DROP');

  const steps = json.execution_steps;
  assert.equal(steps.length, 5);

  // Step 1: Channel3 Multimodal Search
  assert.equal(steps[0].step, 'channel3_multimodal_search');
  assert.equal(steps[0].merchants_discovered, 3);
  assert.equal(steps[0].query_promo_applied, 'PAYPAL-HACKATHON-2026');

  // Step 2: Knapsack ILP Optimization
  assert.equal(steps[1].step, 'knapsack_ilp_optimization');
  assert.equal(steps[1].shipping_waived, true);
  assert.ok(steps[1].commission_rebates_cents > 0);

  // Step 3: PayPal Orders v2 Multi-Unit Authorize
  assert.equal(steps[2].step, 'paypal_v2_orders_multi_unit_authorize');
  assert.equal(steps[2].intent, 'AUTHORIZE');
  assert.equal(steps[2].gross_amount_usd, '475.00');

  // Step 4: Render Workflows 72h Watcher Poll
  assert.equal(steps[3].step, 'render_workflows_72h_watcher_simulation');
  assert.equal(steps[3].status, 'PRICE_DROP_DETECTED');
  assert.equal(steps[3].previous_price_cents, 47500);
  assert.equal(steps[3].new_price_cents, 40375); // 15% drop

  // Step 5: Final Capture at Lower Price
  assert.equal(steps[4].step, 'paypal_v2_authorization_capture');
  assert.equal(steps[4].status, 'CAPTURED_LOWER_PRICE');
  assert.equal(steps[4].final_captured_usd, '403.75');

  // Server readback
  assert.equal(json.paypal_server_readback.status, 'COMPLETED');
  assert.equal(json.paypal_server_readback.server_readback_verified, true);
});

test('E2E Pipeline Step 7 (Live Read-Back Terminal /api/integrations/verify): Covers all 7 Sponsor Tracks', async () => {
  const res = await verifyHandler();
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'HEALTHY');

  const integrations = json.integrations;
  assert.ok(integrations);

  // 1. PayPal Core Track
  assert.ok(integrations.paypal);
  assert.equal(integrations.paypal.readback_ledger_verified, true);
  assert.equal(integrations.paypal.vault_v3_supported, true);
  assert.equal(integrations.paypal.orders_v2_multi_unit, true);
  assert.equal(integrations.paypal.disputes_v1_coverage, true);
  assert.equal(integrations.paypal.tracking_v1_sync, true);

  // 2. Channel3 Track
  assert.ok(integrations.channel3);
  assert.equal(integrations.channel3.promo_code_grounded, 'PAYPAL-HACKATHON-2026');
  assert.equal(integrations.channel3.two_phase_commit_stock_hold, true);
  assert.equal(integrations.channel3.studio_reference_images_cleaned, true);

  // 3. APIMatic Track
  assert.ok(integrations.apimatic);
  assert.equal(integrations.apimatic.status, 'GROUNDED');
  assert.equal(integrations.apimatic.sdk_wrapper, 'PayPalApimaticClient');
  assert.equal(integrations.apimatic.verified_server_readbacks, true);

  // 4. AG Grid / AG Studio Track
  assert.ok(integrations.ag_grid);
  assert.equal(integrations.ag_grid.status, 'ACTIVE');
  assert.equal(integrations.ag_grid.version, '3.0.0');
  assert.ok(integrations.ag_grid.widgets.includes('EvidenceComparatorWidget'));

  // 5. Bryntum Track
  assert.ok(integrations.bryntum);
  assert.equal(integrations.bryntum.status, 'ACTIVE');
  assert.equal(integrations.bryntum.component, 'DisputeSlaScheduler');

  // 6. Render Track
  assert.ok(integrations.render);
  assert.equal(integrations.render.status, 'CONFIGURED');
  assert.equal(integrations.render.blueprint_iac, 'render.yaml');
  assert.ok(integrations.redis_lua_enforcer);
  assert.equal(integrations.redis_lua_enforcer.atomic_reservation_verified, true);

  // 7. DuckDB-WASM Track
  assert.ok(integrations.duckdb_wasm);
  assert.equal(integrations.duckdb_wasm.status, 'ACTIVE');
  assert.equal(integrations.duckdb_wasm.sub_10ms_analytics, true);
  assert.equal(integrations.duckdb_wasm.read_only_enforced, true);
});

test('E2E Pipeline Step 8 (TRIGGER_APIMATIC_VERIFY): Validates PayPal REST API read-backs and OAS 3.0 conformance', async () => {
  const req = new Request('http://localhost:3000/api/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'TRIGGER_APIMATIC_VERIFY' }),
  });

  const res = await chaosHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'SUCCESS');
  assert.equal(json.chaos_action, 'TRIGGER_APIMATIC_VERIFY');

  // Verify APIMatic SDK conformance
  assert.ok(json.apimatic_sdk);
  assert.equal(json.apimatic_sdk.status, 'GROUNDED');
  assert.equal(json.apimatic_sdk.sdk_wrapper, 'PayPalApimaticClient');
  assert.equal(json.apimatic_sdk.cryptographic_readbacks_verified, true);
  assert.equal(json.apimatic_sdk.idempotency_enforced, true);
  assert.ok(json.apimatic_sdk.documented_endpoints.length >= 7);

  // Verify PayPal server read-back
  assert.ok(json.paypal_server_readback);
  assert.equal(json.paypal_server_readback.status, 'COMPLETED');
  assert.equal(json.paypal_server_readback.server_readback_verified, true);
});

test('E2E Pipeline Step 9 (TRIGGER_DUCKDB_BRYNTUM_ANALYTICS): Sub-10ms OLAP query and Bryntum SLA scheduler', async () => {
  const req = new Request('http://localhost:3000/api/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'TRIGGER_DUCKDB_BRYNTUM_ANALYTICS' }),
  });

  const res = await chaosHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'SUCCESS');
  assert.equal(json.chaos_action, 'TRIGGER_DUCKDB_BRYNTUM_ANALYTICS');

  // Verify DuckDB-WASM execution
  assert.ok(json.duckdb_wasm);
  assert.equal(json.duckdb_wasm.read_only_enforced, true);
  assert.equal(json.duckdb_wasm.sub_10ms_guarantee, true);
  assert.ok(json.duckdb_wasm.execution_time_ms < 10.0);
  assert.ok(json.duckdb_wasm.aggregated_metrics.length > 0);

  // Verify Bryntum SLA Scheduler
  assert.ok(json.bryntum_scheduler);
  assert.equal(json.bryntum_scheduler.component, 'DisputeSlaScheduler');
  assert.equal(json.bryntum_scheduler.active_arbitrations_tracked, 1000);
  assert.ok(json.bryntum_scheduler.sla_breach_prevention);
});

test('E2E Pipeline Step 10 (TRIGGER_SYNTHETIC_BID): Automated merchant negotiation and Vault setup token capture', async () => {
  const req = new Request('http://localhost:3000/api/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'TRIGGER_SYNTHETIC_BID' }),
  });

  const res = await chaosHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'SUCCESS');
  assert.equal(json.chaos_action, 'TRIGGER_SYNTHETIC_BID');

  // Verify Synthetic Voucher
  assert.ok(json.synthetic_voucher);
  assert.ok(json.synthetic_voucher.voucher_id.startsWith('syn_'));
  assert.equal(json.synthetic_voucher.buyer_bid_cents, 45000);
  assert.equal(json.synthetic_voucher.retail_offer_cents, 49000);
  assert.equal(json.synthetic_voucher.bid_cleared, true);

  // Verify Server Read-back
  assert.ok(json.paypal_server_readback);
  assert.equal(json.paypal_server_readback.status, 'COMPLETED');
  assert.equal(json.paypal_server_readback.server_readback_verified, true);
});
