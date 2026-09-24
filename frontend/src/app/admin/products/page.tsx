"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, Upload, RotateCcw } from "lucide-react";
import { authedFetch } from "@/lib/api";

import {Branch, Category, Brand, Product, ProductListResponse } from "@/lib/types/domain";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const PAGE_SIZE = 15;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "uploads";



const statusBadge: Record<string, "gold" | "green" | "red" | "gray"> = {
  available: "green",
  sold: "red",
  reserved: "gold",
  pending_authentication: "gold",
  rejected: "red",
  transferred: "gray",
};

// Manual quick-status options an admin/staff can move an item between directly.
// "sold" is deliberately excluded here — that should only ever happen through
// the order/payment flow (Week 1 Day 7), never a manual click.
const QUICK_STATUS_OPTIONS = ["available", "reserved"];

async function uploadImageToSupabase(file: File): Promise<string | null> {
  const supabase = createClient();
  const fileName = `product-images/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file);
  if (error) return null;
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [search, setSearch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formBrandId, setFormBrandId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formCondition, setFormCondition] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Existing images (already uploaded, belong to editingProduct) vs newly
  // picked files (not uploaded yet — uploaded only on submit).
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      authedFetch("/branches").catch(() => ({ items: [] })),
      authedFetch("/categories").catch(() => ({ items: [] })),
      authedFetch("/brands").catch(() => ({ items: [] })),
    ]).then(([b, c, br]) => {
      setBranches(Array.isArray(b) ? b : b.items ?? []);
      setCategories(Array.isArray(c) ? c : c.items ?? []);
      setBrands(Array.isArray(br) ? br : br.items ?? []);
    });
  }, []);

  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter, brandFilter, branchFilter, search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category_id", categoryFilter);
      if (brandFilter) params.set("brand_id", brandFilter);
      if (branchFilter) params.set("branch_id", branchFilter);
      if (search) params.set("search", search);

      try {
        const data: ProductListResponse = await authedFetch(`/products?${params.toString()}`);
        if (!cancelled) { setProducts(data.items); setTotal(data.total); }
      } catch {
        if (!cancelled) { setProducts([]); setTotal(0); }
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [page, statusFilter, categoryFilter, brandFilter, branchFilter, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function clearFilters() {
    setStatusFilter("");
    setCategoryFilter("");
    setBrandFilter("");
    setBranchFilter("");
    setSearch("");
    setPage(1);
  }

  function openCreate() {
    setEditingProduct(null);
    setFormTitle(""); setFormModel(""); setFormBrandId(""); setFormCategoryId("");
    setFormBranchId(""); setFormPrice(""); setFormCost(""); setFormCondition(""); setFormDescription("");
    setExistingImages([]); setNewImageFiles([]); setNewImagePreviews([]);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setFormTitle(p.title); setFormModel(p.model ?? ""); setFormBrandId(p.brand_id ?? "");
    setFormCategoryId(p.category_id ?? ""); setFormBranchId(p.branch_id);
    setFormPrice(String(p.selling_price)); setFormCost(p.cost != null ? String(p.cost) : "");
    setFormCondition(p.condition ?? ""); setFormDescription(p.description ?? "");
    setExistingImages(p.image_urls ?? []); setNewImageFiles([]); setNewImagePreviews([]);
    setFormError(null);
    setShowForm(true);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNewImageFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setNewImagePreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  }

  function removeNewImage(index: number) {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function removeExistingImage(url: string) {
    if (!editingProduct) return;
    try {
      await authedFetch(`/products/${editingProduct.id}/images?image_url=${encodeURIComponent(url)}`, { method: "DELETE" });
      setExistingImages((prev) => prev.filter((imageUrl) => imageUrl !== url));
      setProducts((prev) => prev.map((product) => (
        product.id === editingProduct.id
          ? { ...product, image_urls: product.image_urls.filter((imageUrl) => imageUrl !== url) }
          : product
      )));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete image");
    }
  }

  async function handleQuickStatusChange(product: Product, newStatus: string) {
    try {
      const updated: Product = await authedFetch(`/products/${product.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not change status");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await authedFetch(`/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => t - 1);
    } catch { /* ignore */ }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      // Upload any newly picked files first.
      setUploading(true);
      const uploadedUrls: string[] = [];
      for (const file of newImageFiles) {
        const url = await uploadImageToSupabase(file);
        if (url) uploadedUrls.push(url);
      }
      setUploading(false);

      if (editingProduct) {
        const payload = {
          title: formTitle,
          model: formModel || null,
          brand_id: formBrandId || null,
          category_id: formCategoryId || null,
          branch_id: formBranchId,
          selling_price: parseFloat(formPrice),
          cost: formCost ? parseFloat(formCost) : null,
          condition: formCondition || null,
          description: formDescription || null,
        };
        const updated: Product = await authedFetch(`/products/${editingProduct.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        let finalImages = existingImages;
        if (uploadedUrls.length) {
          const res: { image_urls: string[] } = await authedFetch(
            `/products/${editingProduct.id}/images`,
            { method: "POST", body: JSON.stringify({ image_urls: uploadedUrls }) }
          );
          finalImages = res.image_urls;
        }
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...updated, image_urls: finalImages } : p)));
      } else {
        const payload = {
          title: formTitle,
          model: formModel || null,
          brand_id: formBrandId || null,
          category_id: formCategoryId || null,
          branch_id: formBranchId,
          selling_price: parseFloat(formPrice),
          cost: formCost ? parseFloat(formCost) : null,
          condition: formCondition || null,
          description: formDescription || null,
          image_urls: uploadedUrls,
        };
        const result: Product = await authedFetch("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setProducts((prev) => [result, ...prev]);
        setTotal((t) => t + 1);
      }
      setShowForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save product");
    }
    setFormLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1">Products</h1>
          <p className="text-grayx text-sm">{total} items</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} /> Add Product</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="px-3 py-2 border border-beige text-sm bg-white outline-none w-full sm:w-64 focus:border-gold"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-beige text-sm bg-white outline-none flex-1 sm:flex-none">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
          <option value="pending_authentication">Pending Auth</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-beige text-sm bg-white outline-none flex-1 sm:flex-none">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="px-3 py-2 border border-beige text-sm bg-white outline-none flex-1 sm:flex-none">
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="px-3 py-2 border border-beige text-sm bg-white outline-none flex-1 sm:flex-none">
          <option value="">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={clearFilters} className="whitespace-nowrap">
          <RotateCcw size={14} /> Clear Filters
        </Button>
      </div>

      <div className="bg-white border border-beige overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-beige">
              <th className="text-left font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Product</th>
              <th className="text-left font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Brand</th>
              <th className="text-left font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Category</th>
              <th className="text-left font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Branch</th>
              <th className="text-left font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Price</th>
              <th className="text-left font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Status</th>
              <th className="text-right font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-beige/50 animate-pulse">
                  <td className="px-6 py-3" colSpan={7}><div className="h-4 bg-beige/50 w-full" /></td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-grayx text-sm">No products found</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-beige/50 hover:bg-ivory/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 bg-ivory border border-beige flex items-center justify-center overflow-hidden">
                          {p.image_urls?.[0] ? (
                            <img src={p.image_urls[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-grayx font-serif">{p.brand_name?.charAt(0)}</span>
                          )}
                        </div>
                        {p.ownership_type === "consigned" && (
                          <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[18px] h-[18px] rotate-45 bg-charcoal flex items-center justify-center ring-1 ring-gold/40 z-10">
                            <span className="-rotate-45 text-gold text-[10px] font-bold uppercase leading-none">C</span>
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{p.title}</p>
                        {p.item_code && <p className="text-[11px] text-grayx font-mono">{p.item_code}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">{p.brand_name}</td>
                  <td className="px-6 py-3">{p.category_name}</td>
                  <td className="px-6 py-3">{p.branch_name}</td>
                  <td className="px-6 py-3 font-medium">${p.selling_price.toLocaleString()}</td>
                  <td className="px-6 py-3">
                    {QUICK_STATUS_OPTIONS.includes(p.status) ? (
                      <select
                        value={p.status}
                        onChange={(e) => handleQuickStatusChange(p, e.target.value)}
                        className="text-[11px] border border-beige px-1.5 py-1 bg-white outline-none"
                      >
                        {QUICK_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <Badge tone={statusBadge[p.status] ?? "gray"}>{p.status.replace(/_/g, " ")}</Badge>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-grayx hover:text-charcoal transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-grayx hover:text-red transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-grayx">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-beige disabled:opacity-30"><ChevronLeft size={14} /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border border-beige disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-beige w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-beige">
              <h2 className="text-[13px] font-semibold">{editingProduct ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowForm(false)} className="text-grayx hover:text-charcoal"><X size={16} /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {!editingProduct && (
                <p className="text-[11px] text-grayx bg-ivory/60 border border-beige px-3 py-2">
                  This creates a store-owned item. Consigned items are created automatically once a
                  customer&apos;s consignment is approved.
                </p>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Title *</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required className="w-full px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Brand *</label>
                  <select value={formBrandId} onChange={(e) => setFormBrandId(e.target.value)} required className="w-full px-3 py-2.5 border border-beige text-sm bg-white outline-none">
                    <option value="">Select</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Model</label>
                  <input value={formModel} onChange={(e) => setFormModel(e.target.value)} className="w-full px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Category *</label>
                  <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} required className="w-full px-3 py-2.5 border border-beige text-sm bg-white outline-none">
                    <option value="">Select</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Branch *</label>
                  <select value={formBranchId} onChange={(e) => setFormBranchId(e.target.value)} required className="w-full px-3 py-2.5 border border-beige text-sm bg-white outline-none">
                    <option value="">Select</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Selling Price ($) *</label>
                  <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} required className="w-full px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Cost ($)</label>
                  <input type="number" value={formCost} onChange={(e) => setFormCost(e.target.value)} className="w-full px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Condition</label>
                <select value={formCondition} onChange={(e) => setFormCondition(e.target.value)} className="w-full px-3 py-2.5 border border-beige text-sm bg-white outline-none">
                  <option value="">Select</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Description</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} className="w-full px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold resize-none" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Images</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {existingImages.map((url, i) => (
                    <div key={`existing-${i}`} className="relative">
                      <img src={url} alt="" className="w-16 h-16 object-cover border border-beige" />
                      <button type="button" onClick={() => removeExistingImage(url)} className="absolute -top-2 -right-2 bg-white border border-beige rounded-full p-0.5">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {newImagePreviews.map((src, i) => (
                    <div key={`new-${i}`} className="relative">
                      <img src={src} alt="" className="w-16 h-16 object-cover border border-gold" />
                      <button type="button" onClick={() => removeNewImage(i)} className="absolute -top-2 -right-2 bg-white border border-beige rounded-full p-0.5">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-grayx border border-dashed border-beige px-3 py-2 cursor-pointer hover:border-gold">
                  <Upload size={14} /> Upload photos
                  <input type="file" accept="image/*" multiple onChange={handleImagePick} className="hidden" />
                </label>
              </div>

              {formError && <p className="text-red text-xs">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={formLoading || uploading} className="flex-1 justify-center">
                  {uploading ? "Uploading images..." : formLoading ? "Saving..." : "Save Product"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}