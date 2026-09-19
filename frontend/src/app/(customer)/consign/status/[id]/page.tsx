"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

const STEPS = ["submitted", "under_review", "pending_physical_authentication", "approved"];

export default function ConsignStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => { authedFetch(`/consignments/${id}`).then(setData).catch(() => setData(null)); }, [id]);

  if (!data) return <div className="max-w-[700px] mx-auto px-8 py-16 text-grayx">Loading...</div>;

  const isRejected = data.status === "rejected";
  const stepIndex = isRejected ? -1 : STEPS.indexOf(data.status);

  return (
    <div className="max-w-[700px] mx-auto px-8 py-14">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-medium">Consignment status</h1>
        <Badge tone={isRejected ? "red" : data.status === "approved" ? "green" : "gold"}>
          {data.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="border border-beige bg-white p-5 mb-4">
        <p className="font-medium mb-1">{data.brand_name} {data.model}</p>
        <p className="text-xs text-grayx mb-4">Submitted {new Date(data.submitted_at).toLocaleDateString()} · Reference #{data.id.slice(0, 8).toUpperCase()}</p>
        {!isRejected && (
          <div className="flex items-center gap-2">
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
      </div>

      <div className="border border-beige bg-white p-5 mb-4">
        <p className="text-[11px] font-semibold text-grayx uppercase mb-2">AI preliminary screening</p>
        <p className="text-sm text-grayx">Awaiting screening — check back shortly.</p>
      </div>

      {data.documents.filter((d: any) => d.document_type === "image").length > 0 && (
        <div className="border border-beige bg-white p-5">
          <p className="text-[11px] font-semibold text-grayx uppercase mb-3">Submitted photos</p>
          <div className="grid grid-cols-4 gap-3">
            {data.documents.filter((d: any) => d.document_type === "image").map((d: any) => (
              <img key={d.id} src={d.file_url} className="aspect-square object-cover border border-beige" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}