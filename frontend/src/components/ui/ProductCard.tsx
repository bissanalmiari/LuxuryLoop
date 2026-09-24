"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Heart, ShoppingBag } from "lucide-react";
import { authedFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface ProductCardProps {
  brand: string;
  title: string;
  price: string;
  location: string;
  href: string;
  image?: string | null;
  imageClass?: string;
}

export function ProductCard({ brand, title, price, location, href, image, imageClass = "bg-taupe" }: ProductCardProps) {
  const itemId = href.replace(/^\/product\//, "");
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    authedFetch("/favorites")
      .then((d) => {
        if (active && Array.isArray(d?.favorites)) {
          setSaved(d.favorites.some((f: { item_id: string }) => f.item_id === itemId));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [itemId]);

  async function toggleSaved(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = "/login";
      return;
    }
    try {
      if (saved) {
        await authedFetch(`/favorites/${itemId}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await authedFetch("/favorites", { method: "POST", body: JSON.stringify({ item_id: itemId }) });
        setSaved(true);
      }
    } catch {
      /* keep current state */
    }
  }

async function addToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = "/login";
      return;
    }
    if (adding) return;
    setAdding(true);
    try {
      await authedFetch("/cart", { method: "POST", body: JSON.stringify({ item_id: itemId }) });
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch {
      /* keep current state */
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="card">
      <Link href={href} className="block relative aspect-square bg-[#F1EEE7] flex items-center justify-center overflow-hidden">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-3/5 h-3/5 ${imageClass}`} />
        )}
        <button
          type="button"
          aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          onClick={toggleSaved}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            saved ? "bg-white text-[#B54444]" : "bg-white/90 text-grayx hover:text-charcoal"
          }`}
        >
          <Heart size={15} fill={saved ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          aria-label={added ? "Added to cart" : "Add to cart"}
          onClick={addToCart}
          className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            added ? "bg-charcoal text-gold" : "bg-charcoal/90 text-ivory hover:bg-gold hover:text-charcoal"
          }`}
          disabled={adding}
        >
          <ShoppingBag size={15} />
        </button>
      </Link>
      <div className="p-[18px]">
        <div className="text-[12.5px] text-grayx mb-0.5">{brand}</div>
        <div className="text-[15px] font-semibold mb-2.5">{title}</div>
        <div className="font-serif text-[19px] mb-3.5">{price}</div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[12.5px] text-grayx min-w-0">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <Link
            href={href}
            className="text-[12.5px] font-semibold bg-gold text-charcoal px-4 py-2.5 shrink-0"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
}