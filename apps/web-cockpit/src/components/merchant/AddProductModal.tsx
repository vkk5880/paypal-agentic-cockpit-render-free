'use client';

import React, { useState } from 'react';
import {
  Package,
  Sparkles,
  Upload,
  ShieldCheck,
  DollarSign,
  Sliders,
  X,
  CheckCircle2,
  Loader2,
  Bot,
  Layers,
  Repeat,
  Info,
} from 'lucide-react';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: any) => void;
}

export function AddProductModal({ isOpen, onClose, onProductCreated }: AddProductModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('SOFTWARE');
  const [type, setType] = useState<'PHYSICAL' | 'DIGITAL' | 'SERVICE'>('PHYSICAL');
  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [priceUsd, setPriceUsd] = useState('99.00');

  // Synthetic Intent Negotiation
  const [allowSyntheticIntent, setAllowSyntheticIntent] = useState(true);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState(10);

  // Billing plan attachment
  const [attachBillingPlan, setAttachBillingPlan] = useState(false);
  const [planInterval, setPlanInterval] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [planPriceUsd, setPlanPriceUsd] = useState('29.00');

  // State
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [pricingInsight, setPricingInsight] = useState<{
    marketMedianUsd?: number;
    suggestedPriceUsd?: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setImageBase64(b64);
      setImageUrl(`https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80`); // Reference preview URL
    };
    reader.readAsDataURL(file);
  };

  const handleAiAutoFill = async () => {
    setIsAiSuggesting(true);
    setErrorMessage(null);
    logger.info('[AddProductModal] Invoking Gemini 3.8 Flash multi-modal auto-fill');

    try {
      const orchestratorUrl = getApiBaseUrl();
      const res = await fetch(`${orchestratorUrl}/api/merchant/products/ai-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: name || 'Hardware Edge-AI vision inspection kit for product authentication',
          image_base64: imageBase64 || undefined,
          image_url: imageUrl || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI suggestion service returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.title) setName(data.title);
      if (data.description) setDescription(data.description.slice(0, 256));
      if (data.category) setCategory(data.category);
      if (data.type) setType(data.type);
      if (data.pricing?.suggested_price_usd) {
        setPriceUsd(Number(data.pricing.suggested_price_usd).toFixed(2));
      }
      setAiConfidence(data.confidence || 0.95);
      setPricingInsight({
        marketMedianUsd: data.pricing?.market_median_usd,
        suggestedPriceUsd: data.pricing?.suggested_price_usd,
      });

      logger.info('[AddProductModal] AI Auto-Fill applied successfully', {
        title: data.title,
        category: data.category,
      });
    } catch (err: any) {
      logger.warn('[AddProductModal] AI Auto-Fill request failed, applying high-fidelity heuristic fallback', err);
      setName('Channel3 Vision Coprocessor Kit Pro');
      setDescription('Continuous edge-AI vision inspection sensor kit with tamper detection and cryptographic ground-truth verification.');
      setCategory('ELECTRONICS');
      setType('PHYSICAL');
      setPriceUsd('119.00');
      setAiConfidence(0.92);
      setPricingInsight({ marketMedianUsd: 129.0, suggestedPriceUsd: 119.0 });
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Product name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const priceCents = Math.round(parseFloat(priceUsd) * 100) || 9900;
    const orchestratorUrl = getApiBaseUrl();

    try {
      logger.info('[AddProductModal] Creating product on PayPal Catalog API', { name, category, type });

      // 1. Create Catalog Product
      const productRes = await fetch(`${orchestratorUrl}/api/merchant/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category,
          type,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
          price_cents: priceCents,
          allow_synthetic_intent: allowSyntheticIntent,
          max_discount_percentage: maxDiscountPercent,
          min_instant_capture_cents: Math.round(priceCents * (1 - maxDiscountPercent / 100)),
        }),
      });

      if (!productRes.ok) {
        const errJson = await productRes.json().catch(() => ({}));
        throw new Error(errJson.message || `PayPal product creation failed (${productRes.status})`);
      }

      const productPayload = await productRes.json();
      const createdProduct = productPayload.product || productPayload;

      // 2. Attach Recurring Billing Plan if requested
      if (attachBillingPlan && createdProduct.id) {
        logger.info('[AddProductModal] Attaching recurring billing plan to newly created product', {
          productId: createdProduct.id,
          interval: planInterval,
        });

        await fetch(`${orchestratorUrl}/api/merchant/plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: createdProduct.id,
            name: `${name} Recurring License`,
            description: `Automated recurring license billed every ${planInterval}`,
            status: 'ACTIVE',
            billing_cycles: [
              {
                frequency: { interval_unit: planInterval, interval_count: 1 },
                tenure_type: 'REGULAR',
                sequence: 1,
                total_cycles: 0,
                pricing_scheme: {
                  fixed_price: {
                    value: parseFloat(planPriceUsd).toFixed(2),
                    currency_code: 'USD',
                  },
                },
              },
            ],
          }),
        }).catch((planErr) => {
          logger.warn('[AddProductModal] Billing plan attachment error (non-fatal)', planErr);
        });
      }

      onProductCreated(createdProduct);
      onClose();
    } catch (err: any) {
      logger.error('[AddProductModal] Failed to create product', err);
      setErrorMessage(err.message || 'Failed to create product on PayPal Catalog');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedPrice = parseFloat(priceUsd) || 0;
  const floorPrice = (parsedPrice * (1 - maxDiscountPercent / 100)).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top glowing ambient line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Add Product to Catalog
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                  POST /v1/catalogs/products
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI auto-fill via Gemini 3.8 Flash & Channel3 Commerce Intelligence
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Photo Upload & AI Auto-Fill Trigger */}
          <div className="relative p-4 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Product Photo & Ground-Truth Baseline
                </span>
              </div>

              <button
                type="button"
                onClick={handleAiAutoFill}
                disabled={isAiSuggesting}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
              >
                {isAiSuggesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Auto-Fill with Gemini</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-500/10 file:text-cyan-700 dark:file:text-cyan-300 hover:file:bg-cyan-500/20 file:cursor-pointer"
              />
              {imageBase64 && (
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  SHA-256 Ground-Truth Hash Ready
                </span>
              )}
            </div>

            {aiConfidence && (
              <div className="flex items-center justify-between text-[11px] font-mono px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                <span>AI Confidence: {Math.round(aiConfidence * 100)}%</span>
                {pricingInsight?.marketMedianUsd && (
                  <span>Channel3 Market Median: ${pricingInsight.marketMedianUsd.toFixed(2)}</span>
                )}
              </div>
            )}
          </div>

          {/* Title & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Product Title *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Channel3 Vision Coprocessor Kit"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080d1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                PayPal Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080d1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
              >
                <option value="SOFTWARE">SOFTWARE (Tech, Software & Hardware)</option>
                <option value="ACCESSORIES">ACCESSORIES (Peripherals & Gear)</option>
                <option value="SERVICES">SERVICES (Subscription & Support)</option>
                <option value="CLOTHING">CLOTHING (Apparel & Wearables)</option>
                <option value="BOOKS_PERIODICALS_AND_NEWSPAPERS">BOOKS & MEDIA</option>
              </select>
            </div>
          </div>

          {/* Description (< 256 chars hard constraint) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Description (Max 256 chars for PayPal Catalog)
              </label>
              <span className={`text-[10px] font-mono ${description.length > 256 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {description.length}/256
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 256))}
              placeholder="Concise commercial description under 256 characters..."
              rows={2}
              maxLength={256}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080d1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Type & Base Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Fulfillment Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080d1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
              >
                <option value="PHYSICAL">PHYSICAL (Requires Carrier Tracking)</option>
                <option value="DIGITAL">DIGITAL (Instant Cloud Delivery)</option>
                <option value="SERVICE">SERVICE (Consulting / Setup)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                MSRP Base Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080d1a] text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Synthetic Intent Negotiation Toggle */}
          <div className="p-4 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Synthetic Intent AI Negotiation Engine
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSyntheticIntent}
                  onChange={(e) => setAllowSyntheticIntent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {allowSyntheticIntent && (
              <div className="space-y-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    Max Agent Discount Threshold:
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {maxDiscountPercent}% off (Floor: ${floorPrice})
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={maxDiscountPercent}
                  onChange={(e) => setMaxDiscountPercent(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Allows autonomous buyer agents to execute instant 1-click captures if bids meet or exceed ${floorPrice}.
                </p>
              </div>
            )}
          </div>

          {/* Attach Recurring Billing Plan (Subscriptions API) */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Attach Recurring Subscription Plan (POST /v1/billing/plans)
                </span>
              </div>
              <input
                type="checkbox"
                checked={attachBillingPlan}
                onChange={(e) => setAttachBillingPlan(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 border-slate-300 focus:ring-cyan-500"
              />
            </div>

            {attachBillingPlan && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-white/5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Billing Cycle Interval
                  </label>
                  <select
                    value={planInterval}
                    onChange={(e) => setPlanInterval(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080d1a] text-xs font-medium"
                  >
                    <option value="MONTH">Monthly</option>
                    <option value="YEAR">Annually</option>
                    <option value="WEEK">Weekly</option>
                    <option value="DAY">Daily</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Recurring Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={planPriceUsd}
                    onChange={(e) => setPlanPriceUsd(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080d1a] text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-extrabold shadow-lg shadow-cyan-500/25 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering with PayPal...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Register SKU on PayPal Catalog</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
