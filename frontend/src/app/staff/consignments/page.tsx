"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StaffConsignment, PhysicalAuthDecision } from "@/lib/types/domain";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function StaffConsignments() {
  const [rows, setRows] = useState<StaffConsignment[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string>("");

  const load = useCallback(() => {
    fetch(`${BASE}/staff/consignments`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setRows(d);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(id: string, result: "authenticated" | "rejected") {
    setBusy(id);
    const body: PhysicalAuthDecision = {
      result,
      notes: notes || null,
      decided_at: new Date().toISOString(),
    };
    await authedFetch(`${BASE}/consignments/physical-authentication/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setNotes("");
    setBusy("");
    load();
  }

  return (
    <main className="max-w-[960px] mx-auto px-8 py-10">
      <h1 className="font-serif text-[26px] font-medium mb-6">Consignment review queue</h1>
      <div className="card overflow-hidden divide-y divide-beige">
        {rows.length === 0 && (
          <p className="p-6 text-[13px] text-grayx text-center">
            No consignments to review right now.
          </p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="p-5 grid grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <p className="text-[13px] text-grayx mb-0.5">{r.customer_name}</p>
              <p className="text-[15px] font-semibold mb-0.5">{r.title}</p>
              <p className="text-[12.5px] text-grayx">
                {r.branch_name} · {r.appointment_at ? new Date(r.appointment_at).toLocaleString() : "no appointment"}
              </p>
              {r.notes && <p className="text-[12.5px] text-grayx mt-1.5">{r.notes}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge>{r.status}</Badge>
              <div className="flex gap-2">
                <Button onClick={() => decide(r.id, "authenticated")} disabled={busy === r.id}>
                  Approve
                </Button>
                <Button variant="outline" className="border-red text-red" onClick={() => decide(r.id, "rejected")} disabled={busy === r.id}>
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}