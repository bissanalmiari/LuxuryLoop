
"use client";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { authedFetch("/orders").then((d) => setOrders(d.orders)); }, []);
  const tone: Record<string, "gold" | "green" | "red" | "gray"> = { pending: "gold", paid: "green", cancelled: "red", refunded: "gray", completed: "green" };

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium mb-8">Orders</h1>
      <table className="w-full text-sm bg-white border border-beige">
        <thead><tr className="border-b border-beige text-[11px] text-grayx uppercase"><th className="text-left px-6 py-3">Order</th><th className="text-left px-6 py-3">Total</th><th className="text-left px-6 py-3">Status</th><th className="text-left px-6 py-3">Date</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-beige/50">
              <td className="px-6 py-3">#{o.id.slice(0, 8)}</td>
              <td className="px-6 py-3">${o.total_amount.toLocaleString()}</td>
              <td className="px-6 py-3"><Badge tone={tone[o.status] ?? "gray"}>{o.status}</Badge></td>
              <td className="px-6 py-3">{new Date(o.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}