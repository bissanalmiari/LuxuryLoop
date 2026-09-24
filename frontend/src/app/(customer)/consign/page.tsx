"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Branch } from "@/lib/types/domain";

interface Ref { id: string; name: string; }

async function uploadFile(file: File, folder: string): Promise<string | null> {
  const supabase = createClient();
  const path = `${folder}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from("uploads").upload(path, file);
  if (error) return null;
  return supabase.storage.from("uploads").getPublicUrl(data.path).data.publicUrl;
}

export default function ConsignPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Ref[]>([]);
  const [brands, setBrands] = useState<Ref[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [preferredBranchId, setPreferredBranchId] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState("Excellent");
  const [description, setDescription] = useState("");
  const [intent, setIntent] = useState<"shop_buy" | "consignment">("consignment");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [doc, setDoc] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    category: false,
    brand: false,
    branch: false,
    model: false,
    photos: false,
  });

  const validation = {
    category: touched.category && !categoryId ? "Please select a category." : "",
    brand: touched.brand && !brandId ? "Please select a brand." : "",
    branch: touched.branch && !preferredBranchId ? "Please select a branch." : "",
    model: touched.model && !model.trim() ? "Please enter the item model or name." : "",
    photos: touched.photos && photos.length === 0 ? "Please add at least one item photo." : "",
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/categories`).then((r) => r.json()).then(setCategories);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/brands`).then((r) => r.json()).then(setBrands);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/branches`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBranches(data.filter((b: Branch) => b.is_active));
      })
      .catch(() => setBranches([]));
  }, []);

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 8 - photos.length);
    setPhotos((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ category: true, brand: true, branch: true, model: true, photos: true });
    if (!categoryId || !brandId || !preferredBranchId || !model.trim()) {
      setError("Please select a category, brand, branch, and enter the item model or name.");
      return;
    }
    if (photos.length === 0) {
      setError("Please add at least one photo of the item.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login?next=/consign");
        return;
      }

      const documents: { document_type: string; file_url: string }[] = [];
      let uploadFailed = false;
      for (const file of photos) {
        const url = await uploadFile(file, "consignment-photos");
        if (url) documents.push({ document_type: "image", file_url: url });
        else uploadFailed = true;
      }
      if (doc) {
        const url = await uploadFile(doc, "consignment-docs");
        const type = doc.type === "application/pdf" ? "invoice" : "certificate";
        if (url) documents.push({ document_type: type, file_url: url });
        else uploadFailed = true;
      }
      if (uploadFailed) {
        setError("Some photos failed to upload. Please check your connection and try again.");
        setSubmitting(false);
        return;
      }

      const result = await authedFetch("/consignments", {
        method: "POST",
        body: JSON.stringify({
          acquisition_intent: intent,
          preferred_branch_id: preferredBranchId || null,
          category_id: categoryId || null,
          brand_id: brandId || null,
          model,
          condition,
          description,
          documents,
        }),
      });
      router.push(`/consign/status/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-[700px] mx-auto px-8 py-14">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="text-xs text-gold font-semibold tracking-wide mb-2">SELL WITH US</p>
          <h1 className="font-serif text-3xl font-medium">Consign an item</h1>
        </div>
        <Link href="/consign/status" className="text-sm font-medium text-gold hover:underline whitespace-nowrap mt-1">
          Track my consignments
        </Link>
      </div>
      <p className="text-sm text-grayx mb-8">
        Tell us about your piece. Our AI gives a preliminary screening instantly, then a specialist confirms authenticity in person.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Category <span className="text-red">*</span></label>
            <select required value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setTouched((current) => ({ ...current, category: true })); }} className={`w-full px-3 py-2.5 border text-sm bg-white outline-none ${validation.category ? "border-red" : "border-beige"}`}>
              <option value="">Select</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {validation.category && <p className="mt-1 text-xs text-red">{validation.category}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Brand <span className="text-red">*</span></label>
            <select required value={brandId} onChange={(e) => { setBrandId(e.target.value); setTouched((current) => ({ ...current, brand: true })); }} className={`w-full px-3 py-2.5 border text-sm bg-white outline-none ${validation.brand ? "border-red" : "border-beige"}`}>
              <option value="">Select</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {validation.brand && <p className="mt-1 text-xs text-red">{validation.brand}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Model / name <span className="text-red">*</span></label>
            <input required value={model} onChange={(e) => { setModel(e.target.value); setTouched((current) => ({ ...current, model: true })); }} onBlur={() => setTouched((current) => ({ ...current, model: true }))} placeholder="e.g. Classic Flap Bag, Medium" className={`w-full px-3 py-2.5 border text-sm outline-none focus:border-gold ${validation.model ? "border-red" : "border-beige"}`} />
            {validation.model && <p className="mt-1 text-xs text-red">{validation.model}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full px-3 py-2.5 border border-beige text-sm bg-white outline-none">
              <option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Description & notable details</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Purchase year, hardware, any flaws..." className="w-full px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold resize-none" />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Preferred branch for inspection <span className="text-red">*</span></label>
          <select required value={preferredBranchId} onChange={(e) => { setPreferredBranchId(e.target.value); setTouched((current) => ({ ...current, branch: true })); }} className={`w-full px-3 py-2.5 border text-sm bg-white outline-none focus:border-gold ${validation.branch ? "border-red" : "border-beige"}`}>
            <option value="">Select a branch…</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.city ? ` · ${b.city}` : ""}</option>)}
          </select>
          {validation.branch && <p className="mt-1 text-xs text-red">{validation.branch}</p>}
          <p className="text-[11px] text-grayx mt-1.5">
            Your item will be authenticated at this branch — a specialist will confirm the appointment once your submission passes AI screening.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">How would you like to proceed?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIntent("consignment")}
              className={`text-left px-4 py-3 border text-sm transition ${intent === "consignment" ? "border-gold bg-[#FBF7EF]" : "border-beige bg-white"}`}
            >
              <span className="block font-semibold mb-0.5">Consignment</span>
              <span className="text-[11.5px] text-grayx leading-snug">List it in our shop for sale. It stays yours — you get paid (minus our commission) when it sells.</span>
            </button>
            <button
              type="button"
              onClick={() => setIntent("shop_buy")}
              className={`text-left px-4 py-3 border text-sm transition ${intent === "shop_buy" ? "border-gold bg-[#FBF7EF]" : "border-beige bg-white"}`}
            >
              <span className="block font-semibold mb-0.5">Sell to the shop</span>
              <span className="text-[11.5px] text-grayx leading-snug">Sell it to us outright. Get your payout right away, no waiting for a buyer.</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Photos <span className="text-red">*</span></label>
          <div className="flex flex-wrap gap-2 mb-2">
            {photoPreviews.map((src, i) => <img key={i} src={src} className="w-16 h-16 object-cover border border-beige" />)}
          </div>
          <label className={`flex flex-col items-center gap-1 text-xs text-grayx border border-dashed px-3 py-6 cursor-pointer hover:border-gold text-center ${validation.photos ? "border-red" : "border-beige"}`} onClick={() => setTouched((current) => ({ ...current, photos: true }))}>
            <span>📎 Add at least one photo of the item</span>
            <span className="text-[10px]">Front, back, hardware, serial number · up to 8 images</span>
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </label>
          {validation.photos && <p className="mt-1 text-xs text-red">{validation.photos}</p>}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Invoice / certificate (optional)</label>
          <label className="flex flex-col items-center gap-1 text-xs text-grayx border border-dashed border-beige px-3 py-5 cursor-pointer hover:border-gold text-center">
            <span>📎 {doc ? doc.name : "Upload invoice or authenticity papers"}</span>
            <span className="text-[10px]">PDF, JPG or PNG</span>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} className="hidden" />
          </label>
        </div>

        {error && <p className="text-red text-xs">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full justify-center">
          {submitting ? "Submitting..." : "Submit for AI screening"}
        </Button>
      </form>
    </div>
  );
}