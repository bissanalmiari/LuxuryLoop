"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

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
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState("Excellent");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [doc, setDoc] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/categories`).then((r) => r.json()).then(setCategories);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/brands`).then((r) => r.json()).then(setBrands);
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
      for (const file of photos) {
        const url = await uploadFile(file, "consignment-photos");
        if (url) documents.push({ document_type: "image", file_url: url });
      }
      if (doc) {
        const url = await uploadFile(doc, "consignment-docs");
        const type = doc.type === "application/pdf" ? "invoice" : "certificate";
        if (url) documents.push({ document_type: type, file_url: url });
      }

      const result = await authedFetch("/consignments", {
        method: "POST",
        body: JSON.stringify({
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
      <p className="text-xs text-gold font-semibold tracking-wide mb-2">SELL WITH US</p>
      <h1 className="font-serif text-3xl font-medium mb-2">Consign an item</h1>
      <p className="text-sm text-grayx mb-8">
        Tell us about your piece. Our AI gives a preliminary screening instantly, then a specialist confirms authenticity in person.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2.5 border border-beige text-sm bg-white outline-none">
              <option value="">Select</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Brand</label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="w-full px-3 py-2.5 border border-beige text-sm bg-white outline-none">
              <option value="">Select</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Model / name</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Classic Flap Bag, Medium" className="w-full px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold" />
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
          <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Photos</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {photoPreviews.map((src, i) => <img key={i} src={src} className="w-16 h-16 object-cover border border-beige" />)}
          </div>
          <label className="flex flex-col items-center gap-1 text-xs text-grayx border border-dashed border-beige px-3 py-6 cursor-pointer hover:border-gold text-center">
            <span>📎 Drag photos here or click to upload</span>
            <span className="text-[10px]">Front, back, hardware, serial number · up to 8 images</span>
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </label>
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