"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

const STATUS_FILTERS = ["", "new", "in_progress", "resolved"];

const STATUS_BADGE: Record<string, "gold" | "green" | "red" | "gray"> = {
  new: "gold",
  in_progress: "gray",
  resolved: "green",
};

export default function AdminContactPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  function load() {
    setLoading(true);
    authedFetch(`/contact${filter ? `?status=${filter}` : ""}`)
      .then((d) => setMessages(d.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const nextStatus: Record<string, string> = {
    new: "in_progress",
    in_progress: "resolved",
    resolved: "new",
  };

  async function cycleStatus(message: any) {
    setUpdating(message.id);
    setError("");
    try {
      await authedFetch(`/contact/${message.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus[message.status] || "resolved" }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setUpdating(null);
    }
  }

  const counts = {
    new: messages.filter((m) => m.status === "new").length,
    in_progress: messages.filter((m) => m.status === "in_progress").length,
    resolved: messages.filter((m) => m.status === "resolved").length,
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1">Contact messages</h1>
          <p className="text-sm text-grayx">Messages submitted through the contact page.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STATUS_FILTERS.map((status) => {
          const active = filter === status;
          return (
            <button
              key={status || "all"}
              type="button"
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-[13px] font-semibold border ${
                active ? "bg-charcoal text-white border-charcoal" : "bg-white text-grayx border-beige hover:border-taupe"
              }`}
            >
              {status ? (
                <>
                  {status.replace("_", " ")}
                  <span className="ml-1.5 opacity-70">({counts[status as keyof typeof counts]})</span>
                </>
              ) : (
                <>All</>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="mb-4 border border-[#E7C9C2] bg-[#FBF1EF] px-4 py-3 text-sm text-[#9A4A36]">{error}</p>}

      <div className="bg-white border border-beige">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-beige/60 px-6 py-5 animate-pulse">
              <div className="h-4 w-56 bg-beige/50 mb-2" />
              <div className="h-3 w-80 bg-beige/40" />
            </div>
          ))
        ) : messages.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-grayx">No messages{filter ? ` with status "${filter.replace("_", " ")}"` : ""}.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="border-b border-beige/60">
              <button
                type="button"
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-ivory"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[15px] truncate">
                    {m.subject || "No subject"}
                    <span className="ml-2 font-normal text-xs text-grayx">— {m.name}</span>
                  </p>
                  <p className="text-xs text-grayx">
                    {m.email}{m.phone ? ` · ${m.phone}` : ""} · {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Badge tone={STATUS_BADGE[m.status] || "gray"}>{m.status.replace("_", " ")}</Badge>
                  <span
                    className="text-gold font-semibold text-xs cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      cycleStatus(m);
                    }}
                  >
                    {updating === m.id ? "…" : "Advance →"}
                  </span>
                </div>
              </button>
              {expanded === m.id && (
                <div className="px-6 pb-6">
                  <div className="border-t border-beige pt-4">
                    <p className="text-[13px] text-charcoal leading-relaxed whitespace-pre-wrap">{m.message}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}