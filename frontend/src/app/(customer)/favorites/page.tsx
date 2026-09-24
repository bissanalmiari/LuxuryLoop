"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { authedFetch } from "@/lib/api";
import { FavoriteItem } from "@/lib/types/domain";

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authedFetch("/favorites")
      .then((d) => setItems(d.favorites || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function remove(f: FavoriteItem) {
    await authedFetch(`/favorites/${f.item_id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((x) => x.id !== f.id));
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }} className="px-5 py-14 md:px-8 md:py-[56px]">
      <p style={{ color: "#C6A15B", fontSize: 13, fontWeight: 600, letterSpacing: "0.14em", marginBottom: 14 }}>
        WISHLIST
      </p>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 500, margin: "0 0 32px" }}>
        My favorites
      </h1>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ border: "1px solid #E5E0D8", background: "#fff" }}>
              <div style={{ aspectRatio: "1 / 1", background: "#F1EEE7" }} />
              <div style={{ padding: 18 }}>
                <div style={{ height: 12, width: 90, background: "#E5E0D8", marginBottom: 10 }} />
                <div style={{ height: 16, width: "75%", background: "#E5E0D8", marginBottom: 14 }} />
                <div style={{ height: 20, width: 80, background: "#E5E0D8", marginBottom: 18 }} />
                <div style={{ height: 34, width: "100%", background: "#F0EDE6" }} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ border: "1px solid #E5E0D8", background: "#fff", padding: 48, textAlign: "center" }}>
          <p style={{ color: "#77736E", marginBottom: 12 }}>You haven&apos;t saved any pieces yet.</p>
          <Link href="/shop" style={{ color: "#C6A15B", fontWeight: 600 }}>Browse the shop</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
          {items.map((f) => (
            <div key={f.id} style={{ border: "1px solid #E5E0D8", background: "#fff" }}>
              <div style={{ position: "relative" }}>
                <Link href={`/product/${f.item_id}`} style={{ display: "block" }}>
                  <div style={{ aspectRatio: "1 / 1", background: "#F1EEE7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: "#B8A99A", fontSize: 13 }}>No image</span>
                  )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(f)}
                  aria-label={`Remove ${f.title} from favorites`}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(255,255,255,0.92)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#B54444",
                  }}
                >
                  <Heart size={16} fill="currentColor" />
                </button>
              </div>
              <div style={{ padding: 18 }}>
                <p style={{ fontSize: 12.5, color: "#77736E", margin: "0 0 4px" }}>{f.brand_name}</p>
                <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 8px" }}>{f.title}</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, margin: "0 0 14px" }}>
                  ${f.selling_price.toLocaleString()}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: "#77736E", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {f.branch_name}</span>
                  <Link
                    href={`/product/${f.item_id}`}
                    style={{
                      background: "#C6A15B",
                      color: "#1C1C1C",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "8px 12px",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    View details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}