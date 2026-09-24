"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";

interface CartItem { id: string; item_id: string; title: string; brand_name: string; branch_name: string; branch_country: string; selling_price: number; image_url: string | null; status: string; }

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await authedFetch("/cart");
      setItems(data.items); setSubtotal(data.subtotal);
    } catch { setItems([]); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    await authedFetch(`/cart/${id}`, { method: "DELETE" });
    load();
  }

  if (loading)
    return (
      <div className="max-w-[900px] mx-auto px-8 py-14">
        <div className="h-8 w-48 bg-beige/50 animate-pulse mb-8" />
        <div className="grid grid-cols-[1fr_320px] gap-10">
          <div className="border border-beige bg-white divide-y divide-beige">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="w-16 h-16 bg-beige/40 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-beige/50" />
                  <div className="h-4 w-44 bg-beige/50" />
                  <div className="h-3 w-36 bg-beige/50" />
                </div>
                <div className="h-5 w-16 bg-beige/50" />
              </div>
            ))}
          </div>
          <div className="border border-beige bg-white p-5 h-fit space-y-3">
            <div className="h-4 w-28 bg-beige/50 animate-pulse" />
            <div className="h-4 w-44 bg-beige/50 animate-pulse" />
            <div className="h-11 w-full bg-beige/50 animate-pulse" />
          </div>
        </div>
      </div>
    );

  return (
    <div className="max-w-[900px] mx-auto px-8 py-14">
      <h1 className="font-serif text-3xl font-medium mb-8">Your cart</h1>
      {items.length === 0 ? (
        <p className="text-grayx text-sm">Your cart is empty. <Link href="/shop" className="text-gold">Browse the shop</Link></p>
      ) : (
        <div className="grid grid-cols-[1fr_320px] gap-10">
          <div className="border border-beige bg-white divide-y divide-beige">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-4 p-4">
                <div className="w-16 h-16 bg-ivory border border-beige shrink-0 overflow-hidden">
                  {it.image_url && <img src={it.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-grayx">{it.brand_name}</p>
                  <p className="font-medium text-sm">{it.title}</p>
                  <p className="text-xs text-grayx">Branch: {it.branch_name}{it.branch_country ? `, ${it.branch_country}` : ""}</p>
                  {it.status !== "available" && <p className="text-xs text-red mt-1">No longer available — please remove</p>}
                </div>
                <p className="font-serif">${it.selling_price.toLocaleString()}</p>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  aria-label="Remove from cart"
                  className="text-grayx hover:text-red transition-colors shrink-0"
                >
                  <Trash2 size={17} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
          <div className="border border-beige bg-white p-5 h-fit">
            <h2 className="text-sm font-semibold mb-4">Order summary</h2>
            <div className="flex justify-between text-sm mb-2"><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm mb-4"><span>Shipping</span><span>Free</span></div>
            <div className="flex justify-between font-semibold mb-5 border-t border-beige pt-3"><span>Total</span><span>${subtotal.toLocaleString()}</span></div>
            <Link href="/checkout"><Button className="w-full justify-center">Proceed to checkout</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}