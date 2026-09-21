"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StaffConsignment, PhysicalAuthCreate, PhysicalAuthDecision } from "@/lib/types/domain";
import { authedFetch } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function AdminConsignmentsPage() {
  const [rows, setRows] = useState<StaffConsignment[]>([]);
  const [selected, setSelected] = useState<StaffConsignment | null>(null);
  const [notes, setNotes] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [apptAt, setApptAt] = useState("");
  const [apptNotes, setApptNotes] = useState("");
  const [apptError, setApptError] = useState<string | null>(null);
  const [busyAppt, setBusyAppt] = useState(false);

  const load = useCallback(() => {
    authedFetch(`${BASE}/staff/consignments`)
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

  const confidence = useMemo(() => {
    const v = selected?.confidence_score;
    return v == null ? null : Math.round(v * 100);
  }, [selected]);

  async function scheduleAppointment() {
    if (!selected || !apptAt) return;
    setBusyAppt(true);
    setApptError(null);
    try {
      const body: PhysicalAuthCreate = {
        appointment_at: new Date(apptAt).toISOString(),
        notes: apptNotes || null,
      };
      await authedFetch(
        `${BASE}/consignments/${selected.request_id}/physical-authentication`,
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
        notes: notes || null,
        decided_at: new Date().toISOString(),
      };
      await authedFetch(`${BASE}/consignments/physical-authentication/${selected.id}`, {
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
    <main className="max-w-[960px] mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] font-medium mb-1">
            Consignment review
          </h1>
          <p className="text-[13.5px] text-grayx">
            AI-assisted screening — staff makes the final call
          </p>
        </div>
        <Badge tone="gold">{rows.length} pending</Badge>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-6 items-start">
        <section className="card overflow-hidden divide-y divide-beige">
          <div className="px-5 py-4 border-b border-beige">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-grayx uppercase tracking-wide">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">AI score</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`cursor-pointer ${
                      selected?.id === r.id ? "bg-gold/5" : "hover:bg-ivory"
                    }`}
                  >
                    <td className="py-3 pr-3 font-medium">{r.title ?? "Untitled"}</td>
                    <td className="py-3 pr-3 text-grayx text-[13px]">{r.customer_name}</td>
                    <td className="py-3 pr-3">
                      {r.confidence_score != null && (
                        <span className="font-mono text-[13px] text-gold">
                          {Math.round(r.confidence_score * 100)}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {r.status === "authenticated" ? (
                        <Badge tone="green">Selected</Badge>
                      ) : (
                        <span className="text-[12px] text-gold">Review →</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <section className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-beige">
              <p className="font-serif text-[17px] font-medium leading-snug">
                “{selected.title ?? "Untitled"}”
              </p>
              <p className="text-[12.5px] text-grayx mt-1">
                {selected.customer_name} ·{" "}
                {selected.branch_name
                  ? `${selected.branch_name} branch`
                  : "No branch assigned"}
              </p>
            </div>

            <div className="px-5 py-4 border-b border-beige">
              <p className="text-[10.5px] uppercase tracking-wider text-gold font-semibold mb-2">
                AI authenticity assessment
              </p>
              {confidence != null && (
                <>
                  <p className="font-serif text-[26px] leading-none mb-1.5">
                    {confidence}% confidence
                  </p>
                  <div className="h-1.5 bg-beige rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gold rounded-full"
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10.5px] font-semibold text-gold mb-1.5">
                    Supporting indicators
                  </p>
                  <ul className="text-[12px] text-grayx space-y-1">
                    {(selected.suspicious_indicators ?? []).length === 0 && (
                      <li>· Serial format matches production era</li>
                    )}
                    {selected.explanation && <li>· {selected.explanation}</li>}
                  </ul>
                </div>
                <div>
                  <p className="text-[10.5px] font-semibold text-red mb-1.5">
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
            </div>

            <div className="px-5 py-4 border-b border-beige">
              <p className="text-[10.5px] uppercase tracking-wider text-gold font-semibold mb-2">
                Physical authentication appointment
              </p>
              <div className="space-y-3">
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
                    Notes
                  </label>
                  <textarea
                    value={apptNotes}
                    onChange={(e) => setApptNotes(e.target.value)}
                    rows={2}
                    placeholder="Coordinate branch, courier, inspection scope…"
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
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
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
          </section>
        )}
      </div>
    </main>
  );
}
