"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { Product, ProductListResponse, Branch, Category, Brand } from "@/lib/types/domain";
import { authedFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 8;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const favoriteRequests = useRef(new Set<string>());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");
  const [addedIds, setAddedIds] = useState<string[]>([]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    authedFetch("/favorites")
      .then((data) => setFavoriteIds((data.favorites || []).map((favorite: { item_id: string }) => favorite.item_id)))
      .catch(() => setFavoriteIds([]));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/branches`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/categories`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/brands`).then((r) => r.json()).catch(() => []),
    ]).then(([b, c, br]) => {
      setBranches(b); setCategories(c); setBrands(br);
      const urlParams = new URLSearchParams(window.location.search);
      const categoryName = urlParams.get("category");
      const selectedCategory = categoryName
        ? c.find((category: Category) => category.name.toLowerCase() === categoryName.toLowerCase())
        : undefined;
      setCategoryFilter(selectedCategory ? [selectedCategory.id] : []);
    });
  }, []);

  useEffect(() => { setPage(1); }, [categoryFilter, brandFilter, branchFilter, minPrice, maxPrice, search]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const cat = q.get("category_id");
    const br = q.get("branch_id");
    if (cat) setCategoryFilter([cat]);
    if (br) setBranchFilter(br);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));
      params.set("status", "available");
      if (categoryFilter[0]) params.set("category_id", categoryFilter[0]);
      if (brandFilter[0]) params.set("brand_id", brandFilter[0]);
      if (branchFilter) params.set("branch_id", branchFilter);
      if (minPrice) params.set("min_price", minPrice);
      if (maxPrice) params.set("max_price", maxPrice);
      if (search) params.set("search", search);

      try {
        const res = await fetch(`${API_BASE}/products?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
        const data: Partial<ProductListResponse> = await res.json();
        if (!cancelled) {
          setProducts(Array.isArray(data.items) ? data.items : []);
          setTotal(typeof data.total === "number" ? data.total : 0);
        }
      } catch {
        if (!cancelled) { setProducts([]); setTotal(0); }
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [page, categoryFilter, brandFilter, branchFilter, minPrice, maxPrice, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function toggleFavorite(itemId: string) {
    if (favoriteRequests.current.has(itemId)) return;
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=/shop`);
      return;
    }

    const isFavorite = favoriteIds.includes(itemId);
    favoriteRequests.current.add(itemId);
    setFavoriteIds((current) => isFavorite ? current.filter((id) => id !== itemId) : [...current, itemId]);
    try {
      await authedFetch(isFavorite ? `/favorites/${itemId}` : "/favorites", {
        method: isFavorite ? "DELETE" : "POST",
        ...(isFavorite ? {} : { body: JSON.stringify({ item_id: itemId }) }),
      });
    } catch {
      setFavoriteIds((current) => isFavorite ? [...current, itemId] : current.filter((id) => id !== itemId));
      alert("Could not update favorites. Please try again.");
    } finally {
      favoriteRequests.current.delete(itemId);
    }
  }

async function addToCart(p: Product) {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=/shop`);
      return;
    }
    try {
      await authedFetch("/cart", { method: "POST", body: JSON.stringify({ item_id: p.id }) });
      setAddedIds((ids) => [...ids, p.id]);
      setTimeout(() => setAddedIds((ids) => ids.filter((id) => id !== p.id)), 1600);
    } catch {
      alert("Could not add to cart. Please try again.");
    }
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }} className="shop-page px-5 py-14 md:px-8 md:py-[56px]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4" style={{ marginBottom: 32 }}>
        <div>
          <p style={{ color: "#C6A15B", fontSize: 13, fontWeight: 600, letterSpacing: "0.14em", marginBottom: 14 }}>
            FULL COLLECTION
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 500, margin: 0 }}>
            Shop all products
          </h1>
        </div>
        <p style={{ color: "#77736E", fontSize: 14.5 }}>{total} authenticated pieces across 3 branches.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-9">
        {/* Sidebar */}
        <aside>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, model..."
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Category</label>
            {categories.map((c) => (
              <label key={c.id} style={checkboxRow}>
                <input
                  type="checkbox"
                  checked={categoryFilter.includes(c.id)}
                  onChange={() => toggle(categoryFilter, setCategoryFilter, c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Brand</label>
            {brands.map((b) => (
              <label key={b.id} style={checkboxRow}>
                <input
                  type="checkbox"
                  checked={brandFilter.includes(b.id)}
                  onChange={() => toggle(brandFilter, setBrandFilter, b.id)}
                />
                {b.name}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Price range</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min" style={{ ...inputStyle, width: "50%" }} />
              <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max" style={{ ...inputStyle, width: "50%" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Branch</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBranchFilter(branchFilter === b.id ? "" : b.id)}
                  style={{
                    padding: "10px 16px",
                    fontSize: 13,
                    border: `1px solid ${branchFilter === b.id ? "#C6A15B" : "#E5E0D8"}`,
                    background: "#fff",
                    color: "#1C1C1C",
                    cursor: "pointer",
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3" style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: "#77736E" }}>
              {loading ? "Loading..." : `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total} results`}
            </p>
            <select style={{ padding: "10px 14px", border: "1px solid #E5E0D8", fontSize: 13, background: "#fff" }}>
              <option>Sort: Newest first</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #E5E0D8" }} className="animate-pulse">
                  <div style={{ aspectRatio: "1 / 1", background: "#E5E0D8" }} />
                  <div style={{ padding: 18 }}>
                    <div style={{ height: 12, background: "#E5E0D8", width: "45%", marginBottom: 10 }} />
                    <div style={{ height: 15, background: "#E5E0D8", width: "65%", marginBottom: 12 }} />
                    <div style={{ height: 19, background: "#E5E0D8", width: "40%", marginBottom: 14 }} />
                    <div style={{ height: 38, background: "#E5E0D8" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p style={{ color: "#77736E", fontSize: 14, padding: "40px 0" }}>No items match your filters.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
              {products.map((p) => (
                <div key={p.id} style={{ background: "#fff", border: "1px solid #E5E0D8" }}>
                  <Link href={`/product/${p.id}`} style={{ display: "block", position: "relative" }}>
                    <div
                      style={{
                        aspectRatio: "1 / 1",
                        background: "#F1EEE7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {p.image_urls[0] ? (
                        <img src={p.image_urls[0]} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ color: "#B8A99A", fontSize: 13 }}>No image</span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={favoriteIds.includes(p.id) ? "Remove from favorites" : "Add to favorites"}
                      aria-pressed={favoriteIds.includes(p.id)}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleFavorite(p.id);
                      }}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(255,255,255,0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
color: favoriteIds.includes(p.id) ? "#B54444" : "#1C1C1C",
                          cursor: "pointer",
                        }}
                      >
                        <Heart size={16} fill={favoriteIds.includes(p.id) ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        aria-label={addedIds.includes(p.id) ? "Added to cart" : "Add to cart"}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          addToCart(p);
                        }}
                        style={{
                          position: "absolute",
                          bottom: 12,
                          right: 12,
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: "none",
                          background: addedIds.includes(p.id) ? "#1C1C1C" : "rgba(28,28,28,0.9)",
                          color: addedIds.includes(p.id) ? "#C6A15B" : "#F8F6F1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          cursor: "pointer",
                          transition: "background 0.2s, color 0.2s",
                        }}
                      >
                        {addedIds.includes(p.id) ? <Check size={16} /> : <ShoppingBag size={16} />}
                      </button>
                    </Link>
                  <div style={{ padding: 18 }}>
                    <p style={{ fontSize: 12.5, color: "#77736E", margin: "0 0 4px" }}>{p.brand_name}</p>
                    <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 8px" }}>{p.title}</p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, margin: "0 0 14px" }}>
                      ${p.selling_price.toLocaleString()}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12.5, color: "#77736E", minWidth: 0 }}>📍 {p.branch_name}{p.branch_country ? `, ${p.branch_country}` : ""}</span>
                      <Link
                        href={`/product/${p.id}`}
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

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 3).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    width: 40,
                    height: 40,
                    border: "1px solid #E5E0D8",
                    background: page === n ? "#1C1C1C" : "#fff",
                    color: page === n ? "#fff" : "#1C1C1C",
                    cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: "0 16px", height: 40, border: "1px solid #E5E0D8", background: "#fff", cursor: "pointer" }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  border: "1px solid #E5E0D8",
  background: "#fff",
  fontSize: 14,
  outline: "none",
};

const checkboxRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13.5,
  padding: "6px 0",
  color: "#1C1C1C",
};