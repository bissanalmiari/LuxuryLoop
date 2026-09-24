"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { Product } from "@/lib/types/domain";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { ProductViewer360 } from "@/components/product/ProductViewer360";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [mode360, setMode360] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const favoriteRequest = useRef(false);


  useEffect(() => {
    fetch(`${API_BASE}/products/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setProduct)
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    authedFetch("/favorites")
      .then((data) => setIsFavorite((data.favorites || []).some((favorite: { item_id: string }) => favorite.item_id === id)))
      .catch(() => setIsFavorite(false));
  }, [id]);

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
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
      setAdded(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not add to cart");
    }
    setAdding(false);
  }

  async function toggleFavorite() {
    if (!product || favoriteRequest.current) return;
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=/product/${product.id}`);
      return;
    }

    const nextValue = !isFavorite;
  favoriteRequest.current = true;
  setIsFavorite(nextValue);
    try {
      await authedFetch(nextValue ? "/favorites" : `/favorites/${product.id}`, {
        method: nextValue ? "POST" : "DELETE",
        ...(nextValue ? { body: JSON.stringify({ item_id: product.id }) } : {}),
      });
    } catch {
      alert("Could not update favorites. Please try again.");
      setIsFavorite(!nextValue);
    } finally {
      favoriteRequest.current = false;
    }
  }

  if (notFound)
    return <div className="max-w-[1240px] mx-auto px-8 py-10 text-center text-grayx">Item not found.</div>;
  if (!product)
    return (
      <div className="max-w-[1240px] mx-auto px-8 py-10">
        <div className="h-3 w-44 bg-beige/50 animate-pulse mb-8" />
        <div className="grid grid-cols-2 gap-12">
          <div className="aspect-square bg-beige/30 border border-beige animate-pulse" />
          <div className="space-y-4">
            <div className="h-3 w-24 bg-beige/50 animate-pulse" />
            <div className="h-8 w-2/3 bg-beige/50 animate-pulse" />
            <div className="h-7 w-36 bg-beige/50 animate-pulse" />
            <div className="h-10 w-28 bg-beige/50 animate-pulse" />
            <div className="h-28 w-full bg-beige/30 animate-pulse" />
            <div className="h-12 w-56 bg-beige/50 animate-pulse" />
          </div>
        </div>
      </div>
    );

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
      <div className="flex items-center gap-4 mb-8">
        <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm text-grayx hover:text-charcoal">
          <ArrowLeft size={16} /> Back to shop
        </Link>
        <span className="text-[15px] text-beige">|</span>
        <p className="text-xs text-grayx">
          <Link href="/shop" className="hover:text-charcoal">Shop</Link>
          {product.category_name && <> / <span>{product.category_name}</span></>}
          {" "}/ <span className="text-charcoal">{product.title}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-12">
                {/* Gallery */}
        <div>
          {mode360 && images.length >= 3 ? (
            <ProductViewer360 images={images} title={product.title} onExit={() => setMode360(false)} />
          ) : (
            <>
              <div className="relative aspect-square bg-ivory border border-beige flex items-center justify-center overflow-hidden mb-3">
                {images[activeImage] ? (
                  <img src={images[activeImage]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-grayx text-sm">No image</span>
                )}
                {images.length >= 3 && (
                  <button
                    onClick={() => setMode360(true)}
                    className="absolute top-3 right-3 z-10 text-[11px] font-semibold px-3 py-2 bg-gold text-charcoal border border-beige cursor-pointer hover:bg-[#B4924E]"
                  >
                    360° View
                  </button>
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
            </>
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
              <span className="text-sm">📍 {product.branch_name}{product.branch_country ? `, ${product.branch_country}` : ""}</span>
              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>
            <p className="text-[11px] text-grayx mt-2">
              Every LuxuryLoop item is a single, unique piece — once it&apos;s gone, it&apos;s gone.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAddToCart}
              disabled={product.status !== "available" || adding || added}
              className="flex-1 justify-center"
            >
              {product.status !== "available" ? "Not Available" : added ? "Added to Cart" : adding ? "Adding..." : "Add to cart"}
            </Button>
            <button
              type="button"
              onClick={toggleFavorite}
              className={`w-11 h-11 border flex items-center justify-center shrink-0 ${isFavorite ? "border-[#B54444] text-[#B54444]" : "border-beige hover:border-gold text-charcoal"}`}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorite}
            >
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}