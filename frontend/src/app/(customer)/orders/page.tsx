
"use client";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { authedFetch("/orders/me").then((d) => setOrders(d.orders)); }, []);

  const tone: Record<string, "gold" | "green" | "red" | "gray"> = { pending: "gold", paid: "green", cancelled: "red", refunded: "gray", completed: "green" };

  return (
    <div className="max-w-[1000px] mx-auto px-8 py-14">
      <h1 className="font-serif text-3xl font-medium mb-8">My orders</h1>
      <div className="border border-beige bg-white divide-y divide-beige">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">#{o.id.slice(0, 8)}</p>
              <p className="text-xs text-grayx">{o.items.map((i: any) => i.title).join(", ")} · {o.branch_name}</p>
              <p className="text-xs text-grayx">{new Date(o.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-serif">${o.total_amount.toLocaleString()}</span>
              <Badge tone={tone[o.status] ?? "gray"}>{o.status}</Badge>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="p-6 text-sm text-grayx">No orders yet.</p>}
      </div>
    </div>
  );
}