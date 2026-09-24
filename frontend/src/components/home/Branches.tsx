"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Branch } from "@/lib/types/domain";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/branches`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBranches(data.filter((b) => b.is_active));
      })
      .catch(() => setBranches([]));
  }, []);

  if (branches.length === 0) return null;

  return (
    <section className="py-14 max-w-[1240px] mx-auto px-8 scroll-mt-20" id="branches">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">Visit Us</p>
          <h2 className="font-serif text-[32px] font-medium">Our branches</h2>
        </div>
        <p className="text-[14.5px] text-grayx max-w-[380px]">Three locations across Lebanon, one collection.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
        {branches.map((b) => (
          <Link key={b.id} href={`/shop?branch_id=${b.id}`} className="card overflow-hidden">
            <div className="relative h-[140px] bg-[#F1EEE7] flex items-center justify-center overflow-hidden">
              {b.image_url ? (
                <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-2/5 h-2/5 bg-taupe" />
              )}
            </div>
            <div className="p-5">
              <h4 className="text-[15px] font-semibold mb-1.5">{b.name}</h4>
              <p className="text-[13px] text-grayx mb-1">
                {b.address || b.city || ""}
                {b.country ? ` · ${b.country}` : ""}
              </p>
              <p className="text-[13px] text-grayx">{b.phone ?? "\u00a0"}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}