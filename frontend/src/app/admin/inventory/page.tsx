"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft, History, X } from "lucide-react";
import { authedFetch } from "@/lib/api";

import { Branch, Product, InventoryMovement } from "@/lib/types/domain";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type ProductListResponse = { items: Product[]; total: number };

export default function AdminInventoryPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("staff");
  const [myBranchId, setMyBranchId] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState("");

  const [transferItem, setTransferItem] = useState<Product | null>(null);
  const [toBranchId, setToBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const [historyItem, setHistoryItem] = useState<Product | null>(null);
  const [history, setHistory] = useState<InventoryMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const meta = data?.user?.user_metadata ?? {};
      setRole(meta.role ?? "staff");
      setMyBranchId(meta.branch_id ?? "");
      if (meta.role !== "admin" && meta.branch_id) setBranchFilter(meta.branch_id);
    });
    authedFetch("/branches")
      .then((b) => setBranches(Array.isArray(b) ? b : b.items ?? []))
      .catch((err) => setTransferError(err instanceof Error ? err.message : "Could not load branches"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      if (branchFilter) params.set("branch_id", branchFilter);
      try {
        const data: ProductListResponse = await authedFetch(`/products?${params.toString()}`);
        if (!cancelled) setItems(data.items);
      } catch {
        if (!cancelled) setItems([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [branchFilter]);

  function openTransfer(item: Product) {
    setTransferItem(item);
    setToBranchId("");
    setNotes("");
    setTransferError(null);
  }

  async function submitTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!transferItem) return;
    setTransferLoading(true);
    setTransferError(null);
    try {
      await authedFetch("/inventory/movements", {
        method: "POST",
        body: JSON.stringify({
          item_id: transferItem.id,
          from_branch_id: transferItem.branch_id,
          to_branch_id: toBranchId,
          notes: notes || null,
        }),
      });
      setItems((prev) =>
        prev.map((p) =>
          p.id === transferItem.id
            ? { ...p, branch_id: toBranchId, branch_name: branches.find((b) => b.id === toBranchId)?.name ?? p.branch_name }
            : p
        )
      );
      setTransferItem(null);
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Transfer failed");
    }
    setTransferLoading(false);
  }

  async function openHistory(item: Product) {
    setHistoryItem(item);
    setHistoryLoading(true);
    try {
      const data: InventoryMovement[] = await authedFetch(`/inventory/items/${item.id}/movements`);
      setHistory(data);
    } catch {
      setHistory([]);
    }
    setHistoryLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1">Inventory & Transfers</h1>
          <p className="text-grayx text-sm">Move items between branches and review their transfer history</p>
        </div>
      </div>

      {role === "admin" && (
        <div className="flex gap-3 mb-6">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 border border-beige text-sm bg-white outline-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      <div className="bg-white border border-beige">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-beige">
              <th className="text-left font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Item</th>
              <th className="text-left font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Current Branch</th>
              <th className="text-left font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Status</th>
              <th className="text-right font-semibold text-[11px] text-grayx uppercase tracking-wide px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-grayx text-sm">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-grayx text-sm">No items found</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-b border-beige/50 hover:bg-ivory/30 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium">{p.title}</p>
                    {p.item_code && <p className="text-[11px] text-grayx font-mono">{p.item_code}</p>}
                  </td>
                  <td className="px-6 py-3">{p.branch_name}</td>
                  <td className="px-6 py-3"><Badge tone="gray">{p.status.replace(/_/g, " ")}</Badge></td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openTransfer(p)}
                        disabled={p.status === "sold" || (role !== "admin" && p.branch_id !== myBranchId)}
                        title={role !== "admin" && p.branch_id !== myBranchId ? "Not your branch" : "Transfer"}
                        className="p-1.5 text-grayx hover:text-charcoal transition-colors disabled:opacity-30"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                      <button onClick={() => openHistory(p)} className="p-1.5 text-grayx hover:text-charcoal transition-colors">
                        <History size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {transferItem && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-beige w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-beige">
              <h2 className="text-[13px] font-semibold">Transfer "{transferItem.title}"</h2>
              <button onClick={() => setTransferItem(null)} className="text-grayx hover:text-charcoal"><X size={16} /></button>
            </div>
            <form onSubmit={submitTransfer} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Current Branch</label>
                <input value={transferItem.branch_name} disabled className="w-full px-3 py-2.5 border border-beige text-sm bg-ivory/50 outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Transfer To *</label>
                <select value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} required className="w-full px-3 py-2.5 border border-beige text-sm bg-white outline-none">
                  <option value="">Select destination branch</option>
                  {branches.filter((b) => b.id !== transferItem.branch_id).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2.5 border border-beige text-sm outline-none resize-none" />
              </div>
              {transferError && <p className="text-red text-xs">{transferError}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={transferLoading} className="flex-1 justify-center">
                  {transferLoading ? "Transferring..." : "Confirm Transfer"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setTransferItem(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyItem && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-beige w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-beige">
              <h2 className="text-[13px] font-semibold">Movement History — "{historyItem.title}"</h2>
              <button onClick={() => setHistoryItem(null)} className="text-grayx hover:text-charcoal"><X size={16} /></button>
            </div>
            <div className="p-6">
              {historyLoading ? (
                <p className="text-sm text-grayx">Loading...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-grayx">No transfers recorded for this item yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-beige">
                      <th className="text-left text-[11px] text-grayx uppercase px-2 py-2">Date</th>
                      <th className="text-left text-[11px] text-grayx uppercase px-2 py-2">From</th>
                      <th className="text-left text-[11px] text-grayx uppercase px-2 py-2">To</th>
                      <th className="text-left text-[11px] text-grayx uppercase px-2 py-2">Staff</th>
                      <th className="text-left text-[11px] text-grayx uppercase px-2 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((m) => (
                      <tr key={m.id} className="border-b border-beige/50">
                        <td className="px-2 py-2">{new Date(m.moved_at).toLocaleDateString()}</td>
                        <td className="px-2 py-2">{m.from_branch_name}</td>
                        <td className="px-2 py-2">{m.to_branch_name}</td>
                        <td className="px-2 py-2">{m.moved_by_staff_name}</td>
                        <td className="px-2 py-2 text-grayx">{m.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}