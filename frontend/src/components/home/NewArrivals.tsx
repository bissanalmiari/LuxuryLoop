"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ui/ProductCard";
import { Product, ProductListResponse } from "@/lib/types/domain";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const COUNT = 4;

export function NewArrivals() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/products?status=available&page_size=${COUNT}`)
      .then((r) => r.json())
      .then((data: Partial<ProductListResponse>) => {
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="py-14 max-w-[1240px] mx-auto px-8">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">New Arrivals</p>
          <h2 className="font-serif text-[32px] font-medium">Freshly authenticated pieces</h2>
        </div>
        <p className="text-[14.5px] text-grayx max-w-[380px]">Added to the collection this week.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
        {loading
          ? Array.from({ length: COUNT }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-beige/40" />
                <div className="p-[18px] space-y-3">
                  <div className="h-3 w-2/5 bg-beige/50" />
                  <div className="h-4 w-3/5 bg-beige/50" />
                  <div className="h-5 w-1/3 bg-beige/50" />
                  <div className="h-9 w-full bg-beige/40" />
                </div>
              </div>
            ))
          : items.map((p) => (
              <ProductCard
                key={p.id}
                brand={p.brand_name}
                title={p.title}
                price={`$${p.selling_price.toLocaleString()}`}
                location={`${p.branch_name}${p.branch_country ? `, ${p.branch_country}` : ""}`}
                image={p.image_urls[0]}
                href={`/product/${p.id}`}
              />
            ))}
      </div>
    </section>
  );
}
