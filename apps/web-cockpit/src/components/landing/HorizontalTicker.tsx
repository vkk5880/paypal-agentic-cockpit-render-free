'use client';

import React from 'react';
import { StaticProductCard, StaticProductItem } from './StaticProductCard';

const DUMMY_PRODUCTS: StaticProductItem[] = [
  { id: 1, title: 'Sony WH-1000XM5 ANC', source: 'Amazon', price: '$278.00', rating: '4.8', hotDeal: true, verdict: 'Underpriced 23%' },
  { id: 2, title: 'ASUS ROG Zephyrus G14', source: 'Best Buy', price: '$1,449.00', rating: '4.7', hotDeal: false, verdict: 'MSRP Parity' },
  { id: 3, title: 'LG C3 OLED 55" 4K', source: 'Amazon', price: '$1,096.00', rating: '4.9', hotDeal: false, verdict: 'Score 9.4/10' },
  { id: 4, title: 'Apple MacBook Air M3', source: 'Apple Official', price: '$1,049.00', rating: '4.9', hotDeal: true, verdict: 'Vault Rebate' },
  { id: 5, title: 'Samsung Galaxy S24 Ultra', source: 'B&H Photo', price: '$1,199.99', rating: '4.7', hotDeal: false, verdict: '2PC Stock Hold' },
  { id: 6, title: 'Bose QuietComfort Ultra', source: 'Walmart', price: '$379.00', rating: '4.6', hotDeal: true, verdict: 'Knapsack Split' },
];

export function HorizontalTicker() {
  const ROW_1 = [...DUMMY_PRODUCTS, ...DUMMY_PRODUCTS, ...DUMMY_PRODUCTS];
  const ROW_2 = [...DUMMY_PRODUCTS].reverse().concat([...DUMMY_PRODUCTS].reverse()).concat([...DUMMY_PRODUCTS].reverse());
  const ROW_3 = [
    ...DUMMY_PRODUCTS.slice(2),
    ...DUMMY_PRODUCTS.slice(0, 2),
    ...DUMMY_PRODUCTS.slice(2),
    ...DUMMY_PRODUCTS.slice(0, 2),
    ...DUMMY_PRODUCTS.slice(2),
    ...DUMMY_PRODUCTS.slice(0, 2),
  ];

  return (
    <div
      aria-hidden="true"
      className="absolute w-[150vw] -left-[25vw] h-full z-0 overflow-hidden flex flex-col justify-center gap-14 opacity-25 transform -rotate-2 select-none pointer-events-none"
    >
      {/* Row 1 - Left to Right */}
      <div className="flex w-max relative animate-marquee-right will-change-transform">
        {ROW_1.map((p, i) => (
          <StaticProductCard key={`r1-${i}`} item={p} />
        ))}
      </div>

      {/* Row 2 - Right to Left */}
      <div className="flex w-max relative animate-marquee-left will-change-transform">
        {ROW_2.map((p, i) => (
          <StaticProductCard key={`r2-${i}`} item={p} />
        ))}
      </div>

      {/* Row 3 - Left to Right */}
      <div className="flex w-max relative animate-marquee-right will-change-transform">
        {ROW_3.map((p, i) => (
          <StaticProductCard key={`r3-${i}`} item={p} />
        ))}
      </div>
    </div>
  );
}
