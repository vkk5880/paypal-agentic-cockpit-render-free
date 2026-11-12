import type { PurchaseHistoryItem, NFTReceiptItem } from '@/app/(buyer)/history/HistoryContent';

const ORDERS_KEY = 'aegispay_client_orders';
const RECEIPTS_KEY = 'aegispay_client_receipts';

export function getClientOrders(): PurchaseHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveClientOrder(order: Partial<PurchaseHistoryItem> & { order_id: string }): void {
  if (typeof window === 'undefined' || !order.order_id) return;
  try {
    const existing = getClientOrders();
    const normalized: PurchaseHistoryItem = {
      order_id: order.order_id,
      user_id: order.user_id || 'demo',
      title: order.title || 'Verified Merchandise Order',
      price_cents: order.price_cents || 0,
      merchant_domain: order.merchant_domain || 'bestbuy.com',
      cleaned_url: order.cleaned_url,
      score: order.score || 9.4,
      tx_id: order.tx_id || `PAYID-${order.order_id.toUpperCase()}`,
      reservation_id: order.reservation_id || `res_vlt_${order.order_id}`,
      escrow_status: order.escrow_status || 'HELD',
      timestamp: order.timestamp || new Date().toISOString(),
      receipt_number: order.receipt_number || Math.floor(1000 + Math.random() * 9000),
      hash: order.hash || `0x${Buffer.from(order.order_id).toString('hex').padStart(64, '0')}`,
      carrier: order.carrier || 'FedEx Priority',
      tracking_number: order.tracking_number || `FDX-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      fulfillment_status: order.fulfillment_status || 'processing',
    };

    // Prepend new order, deduplicate by order_id
    const filtered = existing.filter((o) => o.order_id !== order.order_id);
    const updated = [normalized, ...filtered].slice(0, 50);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));

    // Also automatically create and persist matching NFT receipt
    saveClientReceipt({
      receipt_number: normalized.receipt_number || 1001,
      product_title: normalized.title,
      amount_cents: normalized.price_cents,
      merchant_domain: normalized.merchant_domain,
      tx_id: normalized.tx_id || normalized.order_id,
      chain_hash: normalized.hash || `0x${Buffer.from(normalized.order_id).toString('hex').padStart(64, '0')}`,
      timestamp: normalized.timestamp,
      status: normalized.escrow_status === 'FAILED' ? 'FAILED' : 'SUCCESS',
    });
  } catch {}
}

export function getClientReceipts(): NFTReceiptItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveClientReceipt(receipt: NFTReceiptItem): void {
  if (typeof window === 'undefined' || !receipt.tx_id) return;
  try {
    const existing = getClientReceipts();
    const filtered = existing.filter((r) => r.tx_id !== receipt.tx_id);
    const updated = [receipt, ...filtered].slice(0, 50);
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(updated));
  } catch {}
}
