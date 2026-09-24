"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StaffConsignment, PhysicalAuthCreate, PhysicalAuthDecision } from "@/lib/types/domain";
import { authedFetch } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "pending_physical_authentication", label: "Pending physical" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_TONE: Record<string, "gold" | "green" | "red" | "gray"> = {
  submitted: "gray",
  under_review: "gold",
  pending_physical_authentication: "gold",
  approved: "green",
  rejected: "red",
};

function statusLabel(s: string | null | undefined) {
  if (!s) return "Unknown";
  return s.replace(/_/g, " ");
}

function isDecided(s: string | null | undefined) {
  return s === "approved" || s === "rejected";
}

export default function AdminConsignmentsPage() {
  const [rows, setRows] = useState<StaffConsignment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<StaffConsignment | null>(null);
  const [notes, setNotes] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [payout, setPayout] = useState("");
  const [commission, setCommission] = useState("15");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [apptAt, setApptAt] = useState("");
  const [apptNotes, setApptNotes] = useState("");
  const [apptError, setApptError] = useState<string | null>(null);
  const [busyAppt, setBusyAppt] = useState(false);

  const load = useCallback(() => {
    authedFetch("/staff/consignments")
      .then((d) => {
        const data = Array.isArray(d) ? d : (d as any)?.items ?? [];
        setRows(data);
        setSelected((prev) => prev ?? data[0] ?? null);
      })
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (statusFilter ? rows.filter((r) => r.status === statusFilter) : rows),
    [rows, statusFilter]
  );

  const pendingCount = useMemo(
    () => rows.filter((r) => !isDecided(r.status)).length,
    [rows]
  );

  const confidence = useMemo(() => {
    const v = selected?.confidence_score;
    return v == null ? null : Math.round(v);
  }, [selected]);

  async function scheduleAppointment() {
    if (!selected || !apptAt) return;
    setBusyAppt(true);
    setApptError(null);
    try {
      const body: PhysicalAuthCreate = {
        branch_id: selected.preferred_branch_id ?? null,
        appointment_at: new Date(apptAt).toISOString(),
        notes: apptNotes || null,
      };
      await authedFetch(
        `/consignments/${selected.request_id}/physical-authentication`,
        { method: "POST", body: JSON.stringify(body) }
      );
      setApptAt("");
      setApptNotes("");
      await load();
    } catch (e) {
      setApptError(e instanceof Error ? e.message : "Schedule failed");
    }
    setBusyAppt(false);
  }

  async function decide(result: "authenticated" | "rejected") {
    if (!selected) return;
    setBusy(selected.id);
    setError(null);
    try {
      const body: PhysicalAuthDecision = {
        result,
        selling_price: result === "authenticated" ? Number(salePrice) || null : null,
        payout_amount:
          result === "authenticated" && selected.acquisition_intent === "shop_buy"
            ? Number(payout) || null
            : null,
        commission_pct:
          result === "authenticated" && selected.acquisition_intent !== "shop_buy"
            ? Number(commission) || null
            : null,
        notes: notes || null,
        decided_at: new Date().toISOString(),
      };
      await authedFetch(`/consignments/physical-authentication/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setSelected(null);
      setNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision failed");
    }
    setBusy("");
  }

  return (
    <main className="max-w-[1240px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="font-serif text-[26px] font-medium mb-1">
            Consignment review
          </h1>
          <p className="text-[13.5px] text-grayx mt-1">
            AI-assisted screening, staff makes the final call
          </p>
        </div>
        <Badge tone={pendingCount > 0 ? "gold" : "gray"}>{pendingCount} pending</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-[11px] font-semibold text-grayx uppercase tracking-wide">
          Filter
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-beige bg-white text-sm outline-none focus:border-gold"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        <section className="bg-white border border-beige overflow-hidden">
          <div className="px-6 py-5 border-b border-beige flex items-center justify-between">
            <h2 className="text-base font-semibold">Review queue</h2>
            <Badge tone="gold">{filtered.length} {filtered.length === 1 ? "item" : "items"}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-grayx uppercase tracking-wide border-b border-beige">
                  <th className="py-3 px-6 pr-3">Item</th>
                  <th className="py-3 pr-3">Customer</th>
                  <th className="py-3 pr-3">AI score</th>
                  <th className="py-3 px-6" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => { setSelected(r); setSalePrice(""); setPayout(""); setCommission("15"); }}
                    className={`cursor-pointer border-b border-[#F0EDE6] ${selected?.id === r.id ? "bg-[#FBF6EC]" : "hover:bg-ivory"
                      }`}
                  >
                    <td className="py-4 px-6 pr-3 font-semibold min-w-[160px]">{r.title ?? "Untitled"}</td>
                    <td className="py-3 pr-3 text-grayx text-[13px]">{r.customer_name}</td>
                    <td className="py-3 pr-3">
                      {r.confidence_score != null && (
                        <span className="font-mono text-[13px] text-gold">
                          {Math.round(r.confidence_score)}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right">
                      {r.status === "approved" ? (
                        <Badge tone="green">Approved</Badge>
                      ) : r.status === "rejected" ? (
                        <Badge tone="red">Rejected</Badge>
                      ) : (
                        <span className="text-[12px] text-gold whitespace-nowrap">Review →</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <div className="space-y-6">
          <section className="bg-white border border-beige overflow-hidden">
            <div className="px-6 py-5 border-b border-beige flex items-start justify-between gap-3">
              <p className="font-serif text-[17px] font-medium leading-snug">
                “{selected.title ?? "Untitled"}”
              </p>
              <Badge tone={STATUS_TONE[selected.status ?? ""] ?? "gray"}>{statusLabel(selected.status)}</Badge>
            </div>
            <div className="px-6 py-4 text-[13px] text-grayx">
              <p className="text-[12.5px] text-grayx mt-1">
                {selected.customer_name} ·{" "}
                {selected.preferred_branch_name
                  ? `${selected.preferred_branch_name} branch`
                  : selected.branch_name
                    ? `${selected.branch_name} branch`
                    : "No branch assigned"}
              </p>
              <p className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-wide bg-ivory border border-beige text-grayx px-2.5 py-1">
                {selected.acquisition_intent === "shop_buy"
                  ? "⚡ Sell to the shop"
                  : "↔ Consignment (paid on sale)"}
              </p>
            </div>
          </section>

          <section className="bg-charcoal text-white p-6">
            <div className="text-gold text-[11px] uppercase tracking-wider font-semibold mb-3">
              ✦ AI authenticity assessment
            </div>
            <div className="px-0 py-0 border-0">
              {confidence != null && (
                <>
                  <p className="font-serif text-[26px] leading-none mb-1.5">
                    {confidence}% confidence
                  </p>
                  <div className="h-2 bg-[#333] rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gold rounded-full"
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <p className="text-[11.5px] font-semibold text-gold mb-1.5">
                    Supporting indicators
                  </p>
                  <ul className="text-[12px] text-grayx space-y-1">
                    {(selected.supporting_indicators ?? []).length > 0 ? (
                      selected.supporting_indicators!.map((s) => <li key={s}>· {s}</li>)
                    ) : (
                      <li>· None noted</li>
                    )}
                  </ul>
                </div>
                <div>
                    <p className="text-[11.5px] font-semibold text-[#D98E7A] mb-1.5">
                    Suspicious indicators
                  </p>
                  <ul className="text-[12px] text-grayx space-y-1">
                    {(selected.suspicious_indicators ?? []).length > 0 ? (
                      selected.suspicious_indicators!.map((s) => (
                        <li key={s}>· {s.replace(/_/g, " ")}</li>
                      ))
                    ) : (
                      <li>· None flagged</li>
                    )}
                  </ul>
                </div>
              </div>
              
              {selected.explanation && (
                  <p className="text-[12.5px] text-[#C9C5BC] leading-relaxed mt-3 pt-3 border-t border-[#333]">
                  {selected.explanation}
                  <br />
                  <span className="italic">This is an assistive score only — final authentication is performed by a specialist.</span>
                </p>
              )}
            </div>
          </section>

            <section className="bg-white border border-beige overflow-hidden">
            <div className="px-6 py-5 border-b border-beige">
              <p className="text-[10.5px] uppercase tracking-wider text-gold font-semibold mb-2">
                Physical authentication appointment
              </p>
              <div className="space-y-3 px-0">
                {selected.preferred_branch_name && (
                  <div className="px-3 py-2.5 border border-gold bg-[#FBF7EF] text-sm">
                    {selected.preferred_branch_name}
                    <span className="ml-2 text-[11px] text-grayx">(chosen by customer)</span>
                  </div>
                )}
                {isDecided(selected.status) ? (
                  <div className="text-[13px] text-grayx space-y-1">
                    <p>
                      {selected.decided_at
                        ? <>Decision recorded on {new Date(selected.decided_at).toLocaleString()}</>
                        : "Decision recorded."}
                    </p>
                    {selected.notes && <p className="italic">{selected.notes}</p>}
                  </div>
                ) : (
                  <>
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">
                    Appointment time
                  </label>
                  <input
                    type="datetime-local"
                    value={apptAt}
                    onChange={(e) => setApptAt(e.target.value)}
                    className="w-full px-3 py-2.5 border border-beige bg-white text-sm outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">
                    Branch
                  </label>
                  <div className="w-full px-3 py-2.5 border border-beige bg-[#FAF9F6] text-sm">
                    {selected.preferred_branch_name
                      ? `${selected.preferred_branch_name} (from customer&apos;s selection)`
                      : "No preferred branch chosen — the branch used to list this item will be resolved at approval."}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">
                    Notes
                  </label>
                  <textarea
                    value={apptNotes}
                    onChange={(e) => setApptNotes(e.target.value)}
                    rows={2}
                    placeholder="Coordinate courier, inspection scope…"
                    className="w-full px-3 py-2.5 border border-beige bg-white text-sm outline-none resize-none focus:border-gold"
                  />
                </div>
                {apptError && <p className="text-[12px] text-red">{apptError}</p>}
                <Button
                  className="w-full justify-center"
                  variant="outline"
                  disabled={busyAppt || !apptAt}
                  onClick={scheduleAppointment}
                >
                  {busyAppt ? "Scheduling…" : "Schedule appointment"}
                </Button>
                  </>
                )}
              </div>
            </div>

              {!isDecided(selected.status) && (
            <div className="px-6 py-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">
                  Set sale price (if approved)
                </label>
                <input
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="$1,850"
                  className="w-full px-3 py-2.5 border border-beige bg-white text-sm outline-none focus:border-gold"
                />
              </div>
              {selected.acquisition_intent === "shop_buy" ? (
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">
                    Payout to customer (required)
                  </label>
                  <input
                    value={payout}
                    onChange={(e) => setPayout(e.target.value)}
                    placeholder="$1,200"
                    className="w-full px-3 py-2.5 border border-beige bg-white text-sm outline-none focus:border-gold"
                  />
                  <p className="text-[11px] text-grayx mt-1">
                    Customer chose &quot;Sell to the shop&quot; — they&apos;ll be emailed to come collect this amount.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">
                    Shop commission %
                  </label>
                  <input
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    type="number"
                    min={0}
                    max={100}
                    className="w-full px-3 py-2.5 border border-beige bg-white text-sm outline-none focus:border-gold"
                  />
                  <p className="text-[11px] text-grayx mt-1">
                    Customer chose &quot;Consignment&quot; — they keep the sale price minus this commission.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-grayx uppercase mb-1">
                  Inspection notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Physical inspection findings…"
                  className="w-full px-3 py-2.5 border border-beige bg-white text-sm outline-none resize-none focus:border-gold"
                />
              </div>
              {error && <p className="text-[12px] text-red">{error}</p>}
              <div className="flex gap-3">
                <Button
                  className="flex-1 justify-center"
                  disabled={busy === selected.id}
                  onClick={() => decide("authenticated")}
                >
                  {busy === selected.id ? "Saving…" : "Approve & list"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 justify-center border-red text-red"
                  disabled={busy === selected.id}
                  onClick={() => decide("rejected")}
                >
                  Reject
                </Button>
              </div>
            </div>
              )}
          </section>
          </div>
        )}
      </div>
    </main>
  );
}