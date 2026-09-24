"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

export default function OrderHistoryPage() {
  return (
    <Suspense fallback={null}>
      <OrderHistoryInner />
    </Suspense>
  );
}

function OrderHistoryInner() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const checkoutSessionId = searchParams.get("checkout_session_id");
  const [justPaid, setJustPaid] = useState(false);

  const loadOrders = useCallback(() => {
    authedFetch("/orders/me")
      .then((d) =>
        setOrders((d.orders || []).filter((o: any) => o.status === "paid" || o.status === "completed"))
      )
      .catch((e) => setError(e.message || "Something went wrong"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (checkoutSessionId) {
      authedFetch("/orders/confirm-payment", {
        method: "POST",
        body: JSON.stringify({ checkout_session_id: checkoutSessionId }),
      })
        .catch(() => {})
        .finally(() => {
          setJustPaid(true);
          loadOrders();
        });
      return;
    }
    setJustPaid(Boolean(window.location.search.includes("paid=1")));
    loadOrders();
  }, [checkoutSessionId, loadOrders]);

  return (
    <div className="max-w-[1000px] mx-auto px-5 py-14 md:px-8">
      <h1 className="font-serif text-3xl font-medium mb-1">My purchases</h1>
      <p className="text-sm text-grayx mb-8">Items you have paid for.</p>

      {justPaid && (
        <div className="border border-gold bg-ivory/60 p-4 mb-6 text-sm text-charcoal">
          Payment confirmed — thank you! Your order is being prepared.
        </div>
      )}

      {loading && (
        <div className="border border-beige bg-white divide-y divide-beige">
          {[1, 2, 3].map((k) => (
            <div key={k} className="p-5 animate-pulse space-y-3">
              <div className="h-4 bg-beige/50 w-40" />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-beige/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-beige/50 w-1/3" />
                  <div className="h-3 bg-beige/50 w-1/5" />
                </div>
                <div className="h-4 bg-beige/50 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="border border-beige bg-white p-8 text-center">
          <p className="text-sm text-charcoal mb-3">{error}</p>
          <Link href="/login" className="text-sm font-medium text-gold hover:underline">
            Log in to view your purchases
          </Link>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="border border-beige bg-white p-8 text-center">
          <p className="text-sm text-grayx mb-3">No purchases yet.</p>
          <Link href="/shop" className="text-sm font-medium text-gold hover:underline">
            Browse the shop
          </Link>
        </div>
      )}

      {!loading &&
        !error &&
        orders.map((o) => (
          <div key={o.id} className="border border-beige bg-white mb-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-beige">
              <div>
                <p className="text-sm font-medium">Order #{o.id.slice(0, 8)}</p>
                <p className="text-xs text-grayx">
                  {o.fulfillment_type === "pickup" && o.pickup_branch_name
                    ? `Pickup at ${o.pickup_branch_name}`
                    : o.branch_name}{" "}
                  · {new Date(o.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-serif text-base">${o.total_amount.toLocaleString()}</span>
                <Badge tone="green">{o.status}</Badge>
              </div>
            </div>
            <div className="divide-y divide-beige">
              {o.items.map((i: any) => (
                <div key={i.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-14 h-14 bg-ivory border border-beige overflow-hidden shrink-0 flex items-center justify-center">
                    {i.image ? (
                      <img src={i.image} alt={i.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-grayx">No image</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{i.title}</p>
                    <p className="text-xs text-grayx">{o.branch_name}</p>
                  </div>
                  <span className="font-serif">${i.unit_price.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}