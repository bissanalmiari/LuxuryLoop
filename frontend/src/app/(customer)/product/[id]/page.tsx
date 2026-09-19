"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Product } from "@/lib/types/domain";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/items/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setProduct)
      .catch(() => setNotFound(true));
  }, [id]);

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
    setAddedMsg(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push(`/login?next=/product/${product.id}`);
        return;
      }
      await authedFetch("/cart", {
        method: "POST",
        body: JSON.stringify({ item_id: product.id }),
      });
      setAddedMsg("Added to cart.");
    } catch (e) {
      setAddedMsg(e instanceof Error ? e.message : "Could not add to cart");
    }
    setAdding(false);
  }

  if (notFound)
    return <div className="max-w-[1240px] mx-auto px-8 py-20 text-center text-grayx">Item not found.</div>;
  if (!product)
    return <div className="max-w-[1240px] mx-auto px-8 py-20 text-center text-grayx">Loading...</div>;

  const images = product.image_urls.length ? product.image_urls : [];
  const statusMeta = {
    available: { tone: "green" as const, label: "Available" },
    reserved: { tone: "gold" as const, label: "Reserved" },
    sold: { tone: "gray" as const, label: "Sold" },
    pending_authentication: { tone: "gold" as const, label: "Pending Authentication" },
    rejected: { tone: "red" as const, label: "Not Available" },
    transferred: { tone: "gray" as const, label: "In Transfer" },
  }[product.status] ?? { tone: "gray" as const, label: product.status };

  return (
    <div className="max-w-[1240px] mx-auto px-8 py-10">
      <p className="text-xs text-grayx mb-8">
        <Link href="/shop" className="hover:text-charcoal">Shop</Link>
        {product.category_name && <> / <span>{product.category_name}</span></>}
        {" "}/ <span className="text-charcoal">{product.title}</span>
      </p>

      <div className="grid grid-cols-2 gap-12">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-ivory border border-beige flex items-center justify-center overflow-hidden mb-3">
            {images[activeImage] ? (
              <img src={images[activeImage]} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-grayx text-sm">No image</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`aspect-square bg-ivory border overflow-hidden ${
                    i === activeImage ? "border-gold" : "border-beige"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-xs text-grayx uppercase tracking-wide mb-1">{product.brand_name}</p>
          <h1 className="font-serif text-3xl font-medium mb-2">{product.title}</h1>
          <p className="font-serif text-2xl mb-4">${product.selling_price.toLocaleString()}</p>

          <div className="flex items-center gap-2 mb-6">
            <Badge tone="gold">Verified Authentic</Badge>
            {product.item_code && <span className="text-[11px] text-grayx font-mono">{product.item_code}</span>}
          </div>

          {product.condition && <p className="text-sm mb-2">Condition: <span className="font-medium">{product.condition}</span></p>}
          {product.description && (
            <p className="text-sm text-grayx leading-relaxed mb-6">{product.description}</p>
          )}

          <div className="border border-beige bg-white p-4 mb-4">
            <p className="text-[11px] font-semibold text-grayx uppercase mb-2">This piece</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">📍 {product.branch_name}</span>
              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>
            <p className="text-[11px] text-grayx mt-2">
              Every LuxuryLoop item is a single, unique piece — once it's gone, it's gone.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAddToCart}
              disabled={product.status !== "available" || adding}
              className="flex-1 justify-center"
            >
              {product.status !== "available" ? "Not Available" : adding ? "Adding..." : "Add to cart"}
            </Button>
            <button className="w-11 h-11 border border-beige flex items-center justify-center hover:border-gold shrink-0" aria-label="Wishlist">
              ♡
            </button>
          </div>
          {addedMsg && <p className="text-xs text-grayx mt-2">{addedMsg}</p>}
        </div>
      </div>
    </div>
  );
}