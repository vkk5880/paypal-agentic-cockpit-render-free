'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ColDef } from 'ag-grid-community';
import { EndpointPage } from '@/components/merchant/EndpointPage';
import { AddProductModal } from '@/components/merchant/AddProductModal';
import { Plus, Sparkles, RefreshCw } from 'lucide-react';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';
import { BASELINE_PRODUCTS } from '@/lib/merchantService';

interface ProductRow {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  created: string;
  recent_bids_distribution: number[];
  price?: number;
  allow_synthetic_intent?: boolean;
}

const DEFAULT_PRODUCTS: ProductRow[] = BASELINE_PRODUCTS.map((p: any, idx: number) => ({
  id: p.id || `PROD-${idx + 1}`,
  name: p.name || 'Unnamed Product',
  type: p.type || 'PHYSICAL',
  category: p.category || 'SOFTWARE',
  description: p.description || '',
  created: p.create_time || new Date().toISOString(),
  recent_bids_distribution: Array.isArray(p.recent_bids_distribution) && p.recent_bids_distribution.length > 0
    ? p.recent_bids_distribution
    : [12, 18, 25, 42, 38, 55, 60],
  price: p.price_cents ? p.price_cents / 100 : (p.price ? parseFloat(p.price) : 119.0),
  allow_synthetic_intent: p.allow_synthetic_intent ?? true,
}));

interface ProductsClientViewProps {
  initialProducts?: ProductRow[];
  embedded?: boolean;
}

export function ProductsClientView({ initialProducts = [], embedded = false }: ProductsClientViewProps) {
  const [products, setProducts] = useState<ProductRow[]>(
    initialProducts.length > 0 ? initialProducts : DEFAULT_PRODUCTS
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLiveProducts = useCallback(async () => {
    setIsLoading(true);
    logger.info('[ProductsClientView] Fetching live products from PayPal Catalog API');
    try {
      const orchestratorUrl = getApiBaseUrl();
      const res = await fetch(`${orchestratorUrl}/api/merchant/products`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          const mapped: ProductRow[] = data.products.map((p: any, idx: number) => ({
            id: p.id || `PROD-${idx + 1}`,
            name: p.name || 'Unnamed Product',
            type: p.type || 'PHYSICAL',
            category: p.category || 'ELECTRONICS',
            description: p.description || '',
            created: p.create_time || new Date().toISOString(),
            recent_bids_distribution: Array.isArray(p.recent_bids_distribution) ? p.recent_bids_distribution : [],
            price: p.price_cents ? p.price_cents / 100 : (p.price ? parseFloat(p.price) : 0),
            allow_synthetic_intent: p.allow_synthetic_intent ?? false,
          }));
          setProducts(mapped);
          logger.info(`[ProductsClientView] Updated with ${mapped.length} live products`);
          return;
        }
      }
    } catch (err: any) {
      logger.warn('[ProductsClientView] Failed to fetch live products, keeping current state', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveProducts();
  }, [fetchLiveProducts]);

  const handleProductCreated = (newProduct: any) => {
    logger.info('[ProductsClientView] Adding newly created product to grid', newProduct);
    const formatted: ProductRow = {
      id: newProduct.id || `PROD-${Date.now().toString(36).toUpperCase()}`,
      name: newProduct.name || 'New Product',
      type: newProduct.type || 'PHYSICAL',
      category: newProduct.category || 'ELECTRONICS',
      description: newProduct.description || 'Newly created catalog product',
      created: newProduct.create_time || new Date().toISOString(),
      recent_bids_distribution: Array.isArray(newProduct.recent_bids_distribution) ? newProduct.recent_bids_distribution : [],
      price: newProduct.price_cents ? newProduct.price_cents / 100 : (newProduct.price ? parseFloat(newProduct.price) : 0),
      allow_synthetic_intent: newProduct.allow_synthetic_intent ?? false,
    };
    setProducts((prev) => [formatted, ...prev]);
  };

  const columns: ColDef<any>[] = [
    { field: 'name', headerName: 'Name', flex: 1, enableRowGroup: true, editable: true },
    { field: 'type', headerName: 'Type', width: 120, enableRowGroup: true },
    { field: 'category', headerName: 'Category', width: 140, enableRowGroup: true, editable: true },
    {
      field: 'recent_bids_distribution',
      headerName: 'Real-Time Bid Velocity',
      width: 180,
      cellRenderer: 'agSparklineCellRenderer',
      cellRendererParams: {
        sparklineOptions: {
          type: 'column',
          fill: '#10b981',
          padding: { top: 2, bottom: 2 },
          highlightStyle: { fill: '#06b6d4' },
        },
      },
    },
    { field: 'description', headerName: 'Description', flex: 2, editable: true },
    { field: 'created', headerName: 'Created', type: 'dateTime', width: 200 },
    { field: 'id', headerName: 'Product ID', width: 150 },
  ];

  return (
    <>
      <EndpointPage
        title="Catalog Products & Bid Velocity"
        calls={[
          'GET /v1/catalogs/products',
          'GET /v1/catalogs/products/{id}',
          'POST /v1/catalogs/products',
          'PATCH /v1/catalogs/products/{id}',
        ]}
        source="listProducts()"
        note="Live catalog items from PayPal Catalog API with instant price updates and inventory velocity."
        rows={products}
        columns={columns}
        embedded={embedded}
        tableName="products"
        headerAction={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveProducts}
              disabled={isLoading}
              title="Refresh from PayPal"
              className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-500' : ''}`} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-500 hover:to-blue-500 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        }
      />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductCreated={handleProductCreated}
      />
    </>
  );
}
