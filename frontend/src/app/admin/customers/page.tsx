"use client";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Plus, Trash2, X, Pencil } from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  function loadCustomers() {
    setLoading(true);
    authedFetch(`/reports/customers?search=${encodeURIComponent(search)}`)
      .then((d) => setCustomers(d.customers || []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(loadCustomers, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function addCustomer(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await authedFetch("/auth/admin/users", {
        method: "POST",
        body: JSON.stringify({ ...form, role: "customer" }),
      });
      setForm({ email: "", password: "", full_name: "" });
      setShowAdd(false);
      loadCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create customer");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer: any) {
    if (!window.confirm(`Delete customer ${customer.full_name || customer.email}? This cannot be undone.`)) return;
    setRemoving(customer.id);
    setError("");
    try {
      await authedFetch(`/auth/admin/users/${customer.id}`, { method: "DELETE" });
      setCustomers((current) => current.filter((item) => item.id !== customer.id));
      if (expanded === customer.id) { setExpanded(null); setHistory(null); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete customer");
    } finally {
      setRemoving(null);
    }
  }

  function openEdit(customer: any) {
    setEditing(customer);
    setEditForm({
      full_name: customer.full_name || "",
      phone: customer.phone || "",
    });
    setError("");
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setError("");
    try {
      await authedFetch(`/auth/admin/users/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...editForm, full_name: editForm.full_name || null, phone: editForm.phone || null }),
      });
      setEditing(null);
      loadCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update customer");
    } finally {
      setSavingEdit(false);
    }
  }

  async function open(id: string) {
    if (expanded === id) { setExpanded(null); setHistory(null); return; }
    setExpanded(id);
    setLoadingHistory(true);
    try {
      setHistory(await authedFetch(`/reports/customers/${id}/history`));
    } catch {
      setHistory(null);
    }
    setLoadingHistory(false);
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1">Customers</h1>
          <p className="text-sm text-grayx">Search, view orders and consignments.</p>
        </div>
        <button type="button" onClick={() => { setShowAdd(true); setError(""); }} className="inline-flex items-center gap-2 bg-gold px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-[#B4924E]">
          <Plus size={16} /> Add customer
        </button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="w-full max-w-md px-4 py-3 border border-beige bg-white text-sm mb-6" />
      {error && <p className="mb-4 border border-[#E7C9C2] bg-[#FBF1EF] px-4 py-3 text-sm text-[#9A4A36]">{error}</p>}
      {showAdd && (
        <form onSubmit={addCustomer} className="mb-6 border border-beige bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">New customer</h2>
            <button type="button" onClick={() => setShowAdd(false)} aria-label="Close"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input required type="text" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="border border-beige px-3 py-2.5 text-sm" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-beige px-3 py-2.5 text-sm" />
            <input required minLength={6} type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border border-beige px-3 py-2.5 text-sm" />
          </div>
          <button type="submit" disabled={saving} className="mt-4 bg-charcoal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create customer"}</button>
        </form>
      )}
      <div className="bg-white border border-beige">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-beige/60 px-6 py-5 animate-pulse">
              <div className="h-4 w-48 bg-beige/50 mb-2" />
              <div className="h-3 w-64 bg-beige/40" />
            </div>
          ))
        ) : customers.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-grayx">
            {search ? "No customers match this search." : "No customers with activity at your branch."}
          </p>
        ) : customers.map((c) => (
          <div key={c.id} className="border-b border-beige/60">
            <button
              onClick={() => open(c.id)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-ivory"
            >
              <div>
                <p className="font-semibold text-[15px]">{c.full_name || c.email}</p>
                <p className="text-xs text-grayx">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
              </div>
              <div className="flex items-center gap-6 text-[13px] text-grayx">
                <span>{c.orders_count} orders</span>
                <span>{c.consignments_count} consignments</span>
                <span className="font-mono">${c.total_spent.toLocaleString()}</span>
                <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(c); }} className="text-grayx hover:text-charcoal" aria-label={`Edit ${c.full_name || c.email}`} title="Edit customer info">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); deleteCustomer(c); }} disabled={removing === c.id} className="text-[#9A4A36] hover:text-[#6F2E22] disabled:opacity-50" aria-label={`Delete ${c.full_name || c.email}`} title="Delete customer">
                  <Trash2 size={16} />
                </button>
              </div>
            </button>
            {expanded === c.id && (
              <div className="px-6 pb-6">
                <div className="border-t border-beige pt-4">
                  {loadingHistory && <p className="text-sm text-grayx">Loading…</p>}
                  {history && (
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-grayx font-semibold mb-2">Orders</p>
                        {history.orders.length === 0 && <p className="text-xs text-grayx">No orders</p>}
                        {history.orders.map((o: any) => (
                          <div key={o.id} className="text-[13px] py-1.5 border-b border-beige/50 flex justify-between">
                            <span>#{o.id.slice(0, 8)} · {o.branch_name}</span>
                            <span className="font-mono">${o.total_amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-grayx font-semibold mb-2">Consignments</p>
                        {history.consignments.length === 0 && <p className="text-xs text-grayx">No consignments</p>}
                        {history.consignments.map((cs: any) => (
                          <div key={cs.id} className="text-[13px] py-1.5 border-b border-beige/50 flex justify-between gap-4">
                            <span className="truncate">{cs.model || cs.description || "Consignment"}</span>
                            <span className="shrink-0">
                              {cs.confidence_score != null && `${Math.round(cs.confidence_score)}% · `}
                              <Badge tone="gold">{cs.status.replace(/_/g, " ")}</Badge>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="w-full max-w-md bg-white border border-beige p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Edit customer</h2>
                <p className="text-xs text-grayx">{editing.email}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="grid gap-4">
              <div>
                <label htmlFor="edit-full-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-grayx">Full name</label>
                <input id="edit-full-name" type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full border border-beige px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label htmlFor="edit-phone" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-grayx">Phone</label>
                <input id="edit-phone" type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border border-beige px-3 py-2.5 text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2.5 text-sm font-semibold text-grayx hover:text-charcoal">Cancel</button>
              <button type="submit" disabled={savingEdit} className="bg-charcoal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {savingEdit ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}