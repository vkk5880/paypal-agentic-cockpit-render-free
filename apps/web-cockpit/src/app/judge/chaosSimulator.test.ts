import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as chaosHandler } from '../api/chaos/route.js';
import { GET as verifyHandler } from '../api/integrations/verify/route.js';

test('Chaos Trigger 1 (TRIGGER_REDIS_LUA_ATTACK): Blocks $5,000 prompt injection in < 1ms before PayPal API touch', async () => {
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

test('Chaos Trigger 2 (TRIGGER_SYNTHETIC_BID): Mints Vault setup-token, matches merchant floor and captures $450', async () => {
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

  // Verify Synthetic Intent Voucher
  assert.ok(json.synthetic_voucher);
  assert.ok(json.synthetic_voucher.voucher_id.startsWith('syn_'));
  assert.ok(json.synthetic_voucher.paypal_vault_setup_token_id.startsWith('vlt_st_'));
  assert.ok(json.synthetic_voucher.paypal_payment_token_id.startsWith('vlt_pt_'));
  assert.equal(json.synthetic_voucher.buyer_bid_cents, 45000);
  assert.equal(json.synthetic_voucher.retail_offer_cents, 49000);
  assert.equal(json.synthetic_voucher.bid_cleared, true);
  assert.equal(json.synthetic_voucher.negotiation_status, 'ACCEPTED_AND_CAPTURED');

  // Verify PayPal Readback
  assert.ok(json.paypal_server_readback);
  assert.equal(json.paypal_server_readback.status, 'COMPLETED');
  assert.equal(json.paypal_server_readback.intent, 'CAPTURE');
  assert.equal(json.paypal_server_readback.gross_captured_usd, '450.00');
  assert.equal(json.paypal_server_readback.server_readback_verified, true);
});

test('Chaos Trigger 3 (INJECT_SANDBOX_DISPUTE): Triggers vision forensics, EXIF check, pdf-lib dossier upload & adjudicate', async () => {
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

  // Verify PayPal Readback
  assert.equal(json.paypal_server_readback.status, 'RESOLVED');
  assert.equal(json.paypal_server_readback.adjudication_outcome, 'SELLER_FAVOR');
  assert.equal(json.paypal_server_readback.server_readback_verified, true);
});

test('Chaos Trigger 4 (TRIGGER_KNAPSACK_PRICE_DROP): Solves knapsack, places v2 auth, captures 15% price drop', async () => {
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

test('Live Read-Back Terminal (/api/integrations/verify): Returns healthy multi-sponsor ledger', async () => {
  const res = await verifyHandler();
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'HEALTHY');
  assert.ok(json.integrations.paypal);
  assert.equal(json.integrations.paypal.readback_ledger_verified, true);
  assert.equal(json.integrations.channel3.promo_code_grounded, 'PAYPAL-HACKATHON-2026');
  assert.equal(json.integrations.redis_lua_enforcer.atomic_reservation_verified, true);
  assert.equal(json.integrations.postgres_drizzle.seeded_records_count, 1000);
});
