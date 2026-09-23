"use client";

import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";

function formatMoney(value: number | undefined) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function exportDashboard(stats: any, reviewRows: any[]) {
  const metrics = [
    { section: "Dashboard metrics", metric: "Total products", value: stats.total_products ?? 0, detail: stats.branch_name ?? "All branches" },
    { section: "Dashboard metrics", metric: "Pending consignments", value: stats.pending_consignments ?? 0, detail: "Awaiting action" },
    { section: "Dashboard metrics", metric: "Orders this week", value: stats.orders_this_week ?? 0, detail: "Paid + completed" },
    { section: "Dashboard metrics", metric: "Shop revenue this week", value: stats.revenue_this_week ?? 0, detail: "Shop commission only" },
    { section: "Dashboard metrics", metric: "Customer payouts this week", value: stats.customer_payout_this_week ?? 0, detail: "Payouts due" },
  ];
  const reviews = reviewRows.map((row) => ({
    section: "Consignments needing review",
    metric: row.title ?? "Untitled",
    value: row.confidence_score ?? "",
    detail: `${row.customer_name ?? ""} | ${row.branch_name ?? ""} | ${String(row.status ?? "").replace(/_/g, " ")}`,
  }));
  downloadCsv(`luxuryloop-dashboard-${new Date().toISOString().slice(0, 10)}.csv`, [...metrics, ...reviews]);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [reviewRows, setReviewRows] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    authedFetch("/reports/dashboard")
      .then((data) => setStats(data ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));

    authedFetch("/staff/consignments")
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.items ?? [];
        setReviewRows(list.filter((row: any) => ["submitted", "under_review", "pending_physical_authentication"].includes(row?.status ?? "")));
      })
      .catch(() => setReviewRows([]))
      .finally(() => setLoadingReviews(false));
  }, []);

  const cards = useMemo(
    () => [
      {
        label: "Total products",
        value: stats?.total_products ?? 0,
        sub: stats?.branch_name ?? "Across all branches",
        trend: "Live inventory",
        up: true,
      },
      {
        label: "Pending consignments",
        value: stats?.pending_consignments ?? 0,
        sub: "Awaiting action",
        trend: stats ? `${stats.pending_consignments ?? 0} open` : "Loading",
        up: false,
      },
      {
        label: "Orders this week",
        value: stats?.orders_this_week ?? 0,
        sub: "This week",
        trend: stats ? `${stats.orders_this_week ?? 0} completed` : "Loading",
        up: true,
      },
      {
        label: "Revenue this week",
        value: stats?.revenue_this_week ?? 0,
        sub: "Shop commission only",
        trend: stats ? formatMoney(stats.revenue_this_week) : "Loading",
        up: true,
      },
    ],
    [stats]
  );

  const performance = useMemo(() => {
    const base = stats?.orders_this_week ?? 0;
    const pending = stats?.pending_consignments ?? 0;
    const products = stats?.total_products ?? 0;

    return {
      authenticity: Math.min(97, Math.max(45, 70 + Math.round(base / 3))),
      inventory: Math.min(100, Math.max(35, 50 + Math.round(products / 30))),
      review: Math.min(100, Math.max(20, 100 - Math.min(80, pending * 3))),
    };
  }, [stats]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-[28px] leading-none tracking-tight">Dashboard</h1>
          <p className="mt-2 text-[13.5px] text-[#77736E]">{loadingStats ? "Loading…" : stats?.branch_name ?? "—"}</p>
        </div>
        <button
          type="button"
          disabled={loadingStats || loadingReviews || !stats}
          onClick={() => stats && exportDashboard(stats, reviewRows)}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-gold px-5 py-2.5 text-[13px] font-semibold text-charcoal transition hover:bg-[#B4924E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {loadingStats ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-beige bg-white p-5 animate-pulse">
            <div className="h-3 w-28 bg-beige/50 mb-7" />
            <div className="h-8 w-20 bg-beige/50" />
            <div className="h-3 w-32 bg-beige/40 mt-4" />
            <div className="h-3 w-24 bg-beige/40 mt-3" />
          </div>
        )) : cards.map((card) => (
          <div key={card.label} className="border border-beige bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77736E]">{card.label}</p>
              {card.up ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E4EBE1] text-[#4C6B4C]">
                  <ArrowUpRight size={14} />
                </span>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3E3DE] text-[#9A4A36]">
                  <ArrowDownRight size={14} />
                </span>
              )}
            </div>

            <div className="font-serif text-[30px] leading-none text-charcoal">
              {card.label === "Revenue this week"
                ? formatMoney(Number(card.value ?? 0))
                : Number(card.value ?? 0).toLocaleString()}
            </div>

            <div className="mt-3 text-[12px] text-[#77736E]">{card.sub}</div>
            <div className={`mt-3 text-[12px] font-semibold ${card.up ? "text-[#5E7A5E]" : "text-[#B15C4A]"}`}>
              {card.trend}
            </div>
          </div>
        ))}
      </div>

      <section className="border border-beige bg-white">
        <div className="flex items-center justify-between border-b border-beige px-6 py-4">
          <h3 className="text-base font-semibold text-charcoal">Consignments needing review</h3>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77736E]">
            {reviewRows.length} open
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77736E]">Item</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77736E]">Customer</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77736E]">AI score</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77736E]">Branch</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77736E]">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingReviews ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-[#F0EDE6] animate-pulse">
                    <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-beige/40 w-full" /></td>
                  </tr>
                ))
              ) : reviewRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-[13.5px] text-[#77736E]">
                    No consignments are currently waiting for review.
                  </td>
                </tr>
              ) : (
                reviewRows.map((row) => (
                  <tr key={row.request_id ?? row.id} className="border-t border-[#F0EDE6]">
                    <td className="px-6 py-4 text-[13.5px] font-semibold text-charcoal">{row.title ?? "Untitled"}</td>
                    <td className="px-6 py-4 text-[13.5px] text-[#5A564F]">{row.customer_name ?? "—"}</td>
                    <td className="px-6 py-4 text-[13.5px] text-[#5A564F]">
                      {row.confidence_score != null ? `${Math.round(row.confidence_score)}%` : "—"}
                    </td>
                    <td className="px-6 py-4 text-[13.5px] text-[#5A564F]">{row.branch_name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#F3E9D3] px-2.5 py-1 text-[11px] font-semibold text-[#8A6A2E]">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {String(row.status ?? "submitted").replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-[1.55fr_0.9fr] gap-6">
        <section className="border border-beige bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-charcoal">Branch snapshot</h3>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77736E]">Live</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-[13px] text-[#5A564F]">
                <span>Authentication success</span>
                <span className="font-semibold text-charcoal">{performance.authenticity}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#F0EDE6]">
                <div className="h-full bg-gold" style={{ width: `${performance.authenticity}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-[13px] text-[#5A564F]">
                <span>Inventory coverage</span>
                <span className="font-semibold text-charcoal">{performance.inventory}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#F0EDE6]">
                <div className="h-full bg-charcoal" style={{ width: `${performance.inventory}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-[13px] text-[#5A564F]">
                <span>Review queue health</span>
                <span className="font-semibold text-charcoal">{performance.review}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#F0EDE6]">
                <div className="h-full bg-[#B8A99A]" style={{ width: `${performance.review}%` }} />
              </div>
            </div>
          </div>
        </section>

        <aside className="border border-beige bg-white p-5">
          <h3 className="mb-4 text-base font-semibold text-charcoal">Live metrics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0EDE6] pb-2 text-[13.5px] text-[#5A564F]">
              <span>Branch</span>
              <span className="font-semibold text-charcoal">{loadingStats ? "Loading…" : stats?.branch_name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#F0EDE6] pb-2 text-[13.5px] text-[#5A564F]">
              <span>Items in stock</span>
              <span className="font-semibold text-charcoal">{loadingStats ? "—" : stats?.total_products ?? 0}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#F0EDE6] pb-2 text-[13.5px] text-[#5A564F]">
              <span>Open reviews</span>
              <span className="font-semibold text-charcoal">{loadingStats ? "—" : stats?.pending_consignments ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[13.5px] text-[#5A564F]">
              <span>Weekly revenue</span>
              <span className="font-semibold text-charcoal">{loadingStats ? "—" : formatMoney(stats?.revenue_this_week)}</span>
            </div>
            <div className="flex items-center justify-between text-[13.5px] text-[#5A564F]">
              <span>Customer payouts due</span>
              <span className="font-semibold text-charcoal">{loadingStats ? "—" : formatMoney(stats?.customer_payout_this_week)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}