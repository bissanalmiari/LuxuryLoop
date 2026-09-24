"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { authedFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { downloadCsv } from "@/lib/csv";

export default function AdminSalesPage() {
  const [data, setData] = useState<any>({ sales: [], total_revenue: 0 });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authedFetch(`/reports/sales${status ? `?status=${status}` : ""}`)
      .then((d) => setData(d))
      .catch(() => setData({ sales: [], total_revenue: 0 }))
      .finally(() => setLoading(false));
  }, [status]);

  const tone: any = { paid: "green", completed: "green", pending: "gold", cancelled: "red", refunded: "gray" };

  function exportSales() {
    const rows = data.sales.map((sale: any) => ({
      order: sale.id,
      buyer: sale.customer_name,
      payout_recipient: sale.payout_recipients?.join("; ") || "",
      branch: sale.branch_name,
      items: sale.items.map((item: any) => item.title).join("; "),
      shop_revenue: sale.total_amount,
      customer_payout: sale.customer_payout_total ?? 0,
      status: sale.status,
      date: sale.created_at ? new Date(sale.created_at).toLocaleDateString() : "",
    }));
    downloadCsv(`luxuryloop-sales-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1">Sales records</h1>
          <p className="text-sm text-grayx">Filtered view over orders — paid + completed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={loading || data.sales.length === 0}
            onClick={exportSales}
            className="inline-flex items-center gap-2 border border-beige bg-white px-3 py-2 text-sm text-charcoal hover:border-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={15} /> Export CSV
          </button>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-beige bg-white text-sm"
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <div className="bg-charcoal text-white px-5 py-3">
            <p className="text-[11px] uppercase tracking-wide text-gold font-semibold">Shop revenue</p>
            <p className="font-serif text-[22px] leading-none mt-1">${data.total_revenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-beige overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="border-b border-beige text-[11px] text-grayx uppercase">
            <th className="text-left px-6 py-3">Order</th>
            <th className="text-left px-6 py-3">Customer</th>
            <th className="text-left px-6 py-3">Payout recipient</th>
            <th className="text-left px-6 py-3">Branch</th>
            <th className="text-left px-6 py-3">Items</th>
            <th className="text-left px-6 py-3">Shop revenue</th>
            <th className="text-left px-6 py-3">Customer payout</th>
            <th className="text-left px-6 py-3">Status</th>
            <th className="text-left px-6 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-beige/50 animate-pulse">
                <td className="px-6 py-4" colSpan={9}><div className="h-4 bg-beige/50 w-full" /></td>
              </tr>
            ))
          ) : data.sales.length === 0 ? (
            <tr><td colSpan={9} className="px-6 py-12 text-center text-grayx text-sm">No sales recorded.</td></tr>
          ) : data.sales.map((s: any) => (
            <tr key={s.id} className="border-b border-beige/50">
              <td className="px-6 py-3">#{s.id.slice(0, 8)}</td>
              <td className="px-6 py-3">{s.customer_name}</td>
              <td className="px-6 py-3">{s.payout_recipients?.join(", ") || "—"}</td>
              <td className="px-6 py-3">{s.branch_name}</td>
              <td className="px-6 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-[220px]">
                  {s.items.map((i: any) => (
                    <span key={i.id} className="inline-flex items-center gap-1.5">
                      {i.title}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-6 py-3 font-mono">${s.total_amount.toLocaleString()}</td>
              <td className="px-6 py-3 font-mono">${(s.customer_payout_total ?? 0).toLocaleString()}</td>
              <td className="px-6 py-3"><Badge tone={tone[s.status] ?? "gray"}>{s.status}</Badge></td>
              <td className="px-6 py-3">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}