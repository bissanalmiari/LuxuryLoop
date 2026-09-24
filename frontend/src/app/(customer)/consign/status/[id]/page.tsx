"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

const STEPS = ["submitted", "under_review", "pending_physical_authentication", "approved"];

function stepLabel(s: string) {
  switch (s) {
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under review";
    case "pending_physical_authentication":
      return "Physical check";
    case "approved":
      return "Approved";
    default:
      return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toneFor(status: string): "gold" | "green" | "red" {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "gold";
}

export default function ConsignStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    let poll: number | undefined;

    async function load() {
      if (!active || requestInFlight) return;
      requestInFlight = true;
      try {
        const next = await authedFetch(`/consignments/${id}`);
        if (!active) return;
        setData(next);
        setError("");
        if (next.ai_assessment || next.status === "approved" || next.status === "rejected") {
          if (poll !== undefined) window.clearInterval(poll);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Unable to load this consignment");
        }
      } finally {
        requestInFlight = false;
      }
    }

    void load();
    poll = window.setInterval(() => {
      void load();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [id]);

  if (!data && !error) {
    return (
      <div className="max-w-[820px] mx-auto px-8 py-14 animate-pulse">
        <div className="h-8 w-64 bg-beige/50 mb-8" />
        <div className="border border-beige bg-white p-6 mb-7 space-y-3">
          <div className="h-5 bg-beige/50 w-72" />
          <div className="h-4 bg-beige/50 w-1/2" />
        </div>
        <div className="bg-charcoal p-7 space-y-3">
          <div className="h-4 bg-beige/30 w-40" />
          <div className="h-6 bg-beige/30 w-32" />
          <div className="h-2 bg-beige/30 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[820px] mx-auto px-8 py-14">
        <Link href="/consign/status" className="text-sm text-grayx hover:text-charcoal inline-block mb-6">
          ← All my consignments
        </Link>
        <div className="border border-beige bg-white p-8 text-center">
          <p className="text-sm text-charcoal mb-3">{error}</p>
          <Link href="/consign/status" className="text-sm font-medium text-gold hover:underline">
            Back to my consignments
          </Link>
        </div>
      </div>
    );
  }

  const isRejected = data.status === "rejected";
  const stepIndex = isRejected ? -1 : STEPS.indexOf(data.status);
  const images = (data.documents || []).filter((d: any) => d.document_type === "image");

  return (
    <div className="max-w-[820px] mx-auto px-8 py-14">
      <Link href="/consign/status" className="text-sm text-grayx hover:text-charcoal inline-block mb-6">
        ← All my consignments
      </Link>

      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium mb-1">Consignment status</h1>
        <p className="text-sm text-grayx">Track your submitted item from review to listing.</p>
      </div>

      <div className="border border-beige bg-white mb-7">
        <div className="px-6 py-4 border-b border-beige flex items-center justify-between gap-4">
          <h3 className="font-serif text-lg font-medium truncate">
            {data.brand_name} {data.model || "Consignment"}
          </h3>
          <Badge tone={toneFor(data.status)}>{statusLabel(data.status)}</Badge>
        </div>
        <div className="p-6">
          {isRejected ? (
            <p className="text-[13px] text-[#B15C4A] mb-1">
              This item was not accepted. Contact us if you have questions.
            </p>
          ) : (
            <div className="flex items-center gap-3 mb-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center shrink-0 ${i <= stepIndex ? "bg-gold text-charcoal" : "bg-beige text-grayx"}`}
                    >
                      {i < stepIndex ? "✓" : i + 1}
                    </span>
                    <span className={`text-[12px] font-semibold whitespace-nowrap ${i <= stepIndex ? "text-charcoal" : "text-grayx"}`}>
                      {stepLabel(s)}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && <span className="h-px w-12 bg-beige shrink-0" />}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-grayx mt-4">
            Submitted {new Date(data.submitted_at).toLocaleDateString()} · Reference #{data.id.slice(0, 8).toUpperCase()}
          </p>
          {data.preferred_branch_name && (
            <p className="text-xs text-grayx mt-2">
              Inspection branch: <span className="text-charcoal font-semibold">{data.preferred_branch_name}</span>
            </p>
          )}
        </div>
      </div>


      <div className="bg-charcoal text-white p-7 mb-7">
        <div className="text-xs text-gold font-semibold tracking-wide mb-1">✦ AI preliminary screening</div>
        {data.ai_assessment?.confidence_score != null ? (
          <>
            <div className="font-serif text-[22px] mb-1">{Math.round(data.ai_assessment.confidence_score)}% confidence</div>
            <div className="h-2 bg-[#333] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gold rounded-full" style={{ width: `${Math.round(data.ai_assessment.confidence_score)}%` }} />
            </div>
            <p className="text-[13px] text-[#C9C5BC] leading-relaxed">{data.ai_assessment.explanation}</p>
          </>
        ) : (
          <>
            <div className="font-serif text-[22px] mb-1">
              {data.ai_assessment ? "Flagged for manual review" : "Awaiting screening"}
            </div>
            <p className="text-[13px] text-[#C9C5BC] leading-relaxed">
              {data.ai_assessment
                ? "Our AI couldn't complete an automatic assessment — a specialist will review this in person."
                : "Our AI is reviewing the photos against known authentic pieces. Check back shortly."}
            </p>
          </>
        )}
      </div>

      <div className="border border-beige bg-white">
        <div className="px-6 py-4 border-b border-beige">
          <h3 className="font-semibold text-[15px]">Submitted photos</h3>
        </div>
        <div className="p-6 grid grid-cols-4 gap-3">
          {images.length > 0 ? (
            images.map((d: any) => (
              <img key={d.id} src={d.file_url} className="aspect-square object-cover border border-beige" />
            ))
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-[#F1EEE7] flex items-center justify-center text-[10px] text-grayx">
                No photo
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}