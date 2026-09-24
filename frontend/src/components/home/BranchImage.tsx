"use client";

import { useEffect, useState } from "react";
import { Branch } from "@/lib/types/domain";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function BranchImage() {
  const [branch, setBranch] = useState<Branch | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/branches`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBranch(data.find((b: Branch) => b.is_active && b.image_url) ?? null);
        }
      })
      .catch(() => setBranch(null));
  }, []);

  return (
    <div className="aspect-[4/3] bg-[#F1EEE7] flex items-center justify-center overflow-hidden">
      {branch?.image_url ? (
        <img src={branch.image_url} alt={branch.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-2/5 h-2/5 bg-taupe" />
      )}
    </div>
  );
}