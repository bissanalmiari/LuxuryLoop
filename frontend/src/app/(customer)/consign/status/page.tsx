"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

const STEPS = ["submitted", "under_review", "pending_physical_authentication", "approved"];

function label(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toneFor(status: string): "gold" | "green" | "red" {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "gold";
}

export default function MyConsignmentsPage() {
  const [list, setList] = useState<any[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch("/consignments/me")
      .then((d) => setList(d.consignments || []))
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load your consignments"));
  }, []);

  return (
    <div className="max-w-[820px] mx-auto px-8 py-14">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1">Consignment status</h1>
          <p className="text-sm text-grayx">Track your submitted items from review to listing.</p>
        </div>
        <Link href="/consign" className="text-sm font-medium text-gold hover:underline whitespace-nowrap">
          + New consignment
        </Link>
      </div>

      {list === null && !error && (
        <div className="space-y-4">
          {[1, 2].map((k) => (
            <div key={k} className="border border-beige bg-white p-5 animate-pulse">
              <div className="h-5 bg-beige/50 w-56 mb-4" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-1 space-y-2">
                    <div className="w-6 h-6 bg-beige/50 rounded-full mx-auto" />
                    <div className="h-3 bg-beige/50 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="border border-beige bg-white p-8 text-center">
          <p className="text-sm text-charcoal mb-3">{error}</p>
          <Link href="/consign" className="text-sm font-medium text-gold hover:underline">
            Submit a consignment instead
          </Link>
        </div>
      )}

      {list && list.length === 0 && (
        <div className="border border-beige bg-white p-8 text-center">
          <p className="text-sm text-grayx mb-3">No consignments yet.</p>
          <Link href="/consign" className="text-sm font-medium text-gold hover:underline">
            Consign your first item
          </Link>
        </div>
      )}

      {list &&
        list.map((c: any) => {
          const isRejected = c.status === "rejected";
          const stepIndex = isRejected ? -1 : STEPS.indexOf(c.status);
          return (
            <div key={c.id} className="border border-beige bg-white mb-5">
              <div className="px-6 py-4 border-b border-beige flex items-center justify-between gap-4">
                <h3 className="font-serif text-lg font-medium truncate">
                  {c.brand_name} {c.model || "Consignment"}
                </h3>
                <Badge tone={toneFor(c.status)}>{label(c.status)}</Badge>
              </div>
              <div className="p-6">
                {!isRejected && (
                  <div className="flex items-center gap-2 mb-1">
                    {STEPS.map((s, i) => (
                      <div key={s} className="flex items-center gap-2 flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${i <= stepIndex ? "bg-gold text-charcoal" : "bg-beige text-grayx"}`}>
                          {i < stepIndex ? "✓" : i + 1}
                        </div>
                        {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < stepIndex ? "bg-gold" : "bg-beige"}`} />}
                      </div>
                    ))}
                  </div>
                )}
                {isRejected && (
                  <p className="text-[13px] text-[#B15C4A] mb-1">
                    This item was not accepted. Contact us if you have questions.
                  </p>
                )}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-grayx">
                    Submitted {new Date(c.submitted_at).toLocaleDateString()} · Reference #{c.id.slice(0, 8).toUpperCase()}
                  </p>
                  <Link href={`/consign/status/${c.id}`} className="text-sm font-medium text-gold hover:underline">
                    View details
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}