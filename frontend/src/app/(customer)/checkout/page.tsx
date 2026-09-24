"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Branch } from "@/lib/types/domain";

function Step({ num, label, state }: { num: string; label: string; state: "done" | "active" | "todo" }) {
  const circle =
    state === "done"
      ? "bg-gold text-white border-gold"
      : state === "active"
        ? "bg-charcoal text-white border-charcoal"
        : "bg-ivory text-grayx border-beige";
  const text = state === "active" ? "text-charcoal" : "text-grayx";
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-7 h-7 rounded-full text-[12px] font-semibold border flex items-center justify-center ${circle}`}>
        {state === "done" ? "✓" : num}
      </span>
      <span className={`text-[13px] font-semibold ${text}`}>{label}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-beige bg-white">
      <div className="px-6 py-4 border-b border-beige">
        <h3 className="font-serif text-lg font-medium">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold bg-white";
const labelCls = "block text-[13px] font-semibold mb-1.5";

function CheckoutForm({ items, subtotal }: { items: any[]; subtotal: number }) {
  const [fulfillment, setFulfillment] = useState("delivery");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pickupBranchId, setPickupBranchId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [placing, setPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/branches`)
      .then((r) => r.json())
      .catch(() => [])
      .then(setBranches);
    authedFetch("/auth/me")
      .then((me) => {
        setFullName(me.full_name || "");
        setPhone(me.phone || "");
      })
      .catch(() => {});
  }, []);

  async function placeOrder() {
    setErrorMsg("");
    if (subtotal <= 0) return;

    const payload: Record<string, unknown> = {
      fulfillment_type: fulfillment,
      payment_method: "card",
    };
    if (fulfillment === "pickup") {
      if (!pickupBranchId) {
        setErrorMsg("Please choose the branch you'll pick up from.");
        return;
      }
      payload.pickup_branch_id = pickupBranchId;
    } else {
      if (!fullName.trim() || !phone.trim() || !address1.trim() || !city.trim()) {
        setErrorMsg("Please fill in your name, phone, delivery address and city.");
        return;
      }
      payload.address = { full_name: fullName, phone, address_line1: address1, city };
    }

    setPlacing(true);
    try {
      const checkout = await authedFetch("/orders/checkout", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      window.location.href = checkout.checkout_url;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Checkout failed");
    }
    setPlacing(false);
  }

  const selectedBranch = branches.find((b) => b.id === pickupBranchId);
  const count = items.filter((it: any) => it.status === "available").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
      <div className="space-y-6">
        {errorMsg && <p className="text-[#B15C4A] text-xs">{errorMsg}</p>}
        <Panel title="Pickup or delivery">
          <div className="mb-4">
            <label className={labelCls}>How do you want to receive your order?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillment("delivery")}
                className={`border px-4 py-3.5 text-left text-sm transition-colors ${
                  fulfillment === "delivery" ? "border-gold bg-ivory/60" : "border-beige bg-white hover:border-gold/50"
                }`}
              >
                <span className="block font-semibold mb-0.5">Home delivery</span>
                <span className="block text-xs text-grayx">Free shipping to your address</span>
              </button>
              <button
                type="button"
                onClick={() => setFulfillment("pickup")}
                className={`border px-4 py-3.5 text-left text-sm transition-colors ${
                  fulfillment === "pickup" ? "border-gold bg-ivory/60" : "border-beige bg-white hover:border-gold/50"
                }`}
              >
                <span className="block font-semibold mb-0.5">Pick up in branch</span>
                <span className="block text-xs text-grayx">Collect at your preferred branch</span>
              </button>
            </div>
          </div>

          {fulfillment === "delivery" ? (
            <>
              <p className="text-xs text-grayx mb-3">
                We&apos;ll deliver to the address below. You&apos;ll be asked for your name and phone at the door.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Full name</label>
                  <input
                    className={inputCls}
                    placeholder="Lea Haddad"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    className={inputCls}
                    placeholder="+961 71 234 567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className={labelCls}>Delivery address</label>
                <input
                  className={inputCls}
                  placeholder="Rue Gouraud, Gemmayzeh"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input
                  className={inputCls}
                  placeholder="Beirut"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs text-grayx mb-3">
                Your order will be held at the branch you choose. Just bring your ID when you collect it.
              </p>
              <label className={labelCls}>Pickup branch</label>
              <select
                value={pickupBranchId}
                onChange={(e) => setPickupBranchId(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">Choose a branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.city ? ` — ${b.city}` : ""}
                  </option>
                ))}
              </select>
              {selectedBranch && (
                <p className="text-xs text-grayx mt-2">
                  Pickup at <span className="font-medium text-charcoal">{selectedBranch.name}</span>
                  {selectedBranch.address ? `, ${selectedBranch.address}` : ""}.
                </p>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Payment">
          <p className="text-xs text-grayx mb-3">
            You&apos;ll be taken to Stripe&apos;s secure payment page to complete your order. We never see your card details.
          </p>
        </Panel>
      </div>

      <div className="border border-beige bg-white p-6 h-fit lg:sticky lg:top-24">
        <h3 className="font-serif text-base font-medium mb-4">Order summary</h3>
        <div className="space-y-3 mb-5 max-h-64 overflow-y-auto pr-1">
          {items.map((it: any, idx: number) => (
            <div key={it.id || idx} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-ivory border border-beige shrink-0 overflow-hidden flex items-center justify-center">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] text-grayx">{it.brand_name?.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{it.title}</p>
                <p className="text-[11px] text-grayx">${it.selling_price.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm mb-2.5">
          <span>{count} {count === 1 ? "item" : "items"}</span>
          <span>${subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm mb-2.5">
          <span>Shipping</span>
          <span>Free</span>
        </div>
        <div className="flex justify-between font-semibold border-t border-beige pt-3 mt-3 mb-5">
          <span>Total</span>
          <span>${subtotal.toLocaleString()}</span>
        </div>
        <Button onClick={placeOrder} disabled={placing || subtotal <= 0} className="w-full justify-center">
          {placing ? "Processing payment…" : `Pay ${subtotal ? `$${subtotal.toLocaleString()}` : ""}`}
        </Button>
        <p className="text-[11px] text-grayx text-center mt-3">
          <Lock size={11} className="inline mr-1 -mt-0.5" />
          Secured by Stripe
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<{ items: any[]; subtotal: number }>({ items: [], subtotal: 0 });
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);

  const loadCart = useCallback(() => {
    setLoadingCart(true);
    setCartError(null);
    authedFetch("/cart")
      .then((d) => setCart({ items: d.items || [], subtotal: d.subtotal || 0 }))
      .catch((e) => setCartError(e instanceof Error ? e.message : "Unable to load your cart"))
      .finally(() => setLoadingCart(false));
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);

  return (
    <div className="max-w-[1000px] mx-auto px-5 py-14 md:px-8">
      <div className="stepper flex items-center justify-center gap-6 mb-12 overflow-x-auto">
        <Link href="/cart" className="flex items-center gap-2">
          <Step num="1" label="Cart" state="done" />
        </Link>
        <div className="h-px w-12 bg-gold" />
        <Step num="2" label="Checkout" state="active" />
        <div className="h-px w-12 bg-beige" />
        <Step num="3" label="Confirmation" state="todo" />
      </div>

      <h1 className="font-serif text-3xl font-medium mb-1">Checkout</h1>
      <p className="text-sm text-grayx mb-8">Almost there — confirm where you&apos;ll receive your order and pay securely.</p>

      {loadingCart ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
          <div className="h-72 bg-beige/40 animate-pulse" />
          <div className="h-52 bg-beige/40 animate-pulse" />
        </div>
      ) : cartError ? (
        <div className="border border-beige bg-white p-6">
          <p className="text-[#B15C4A] text-xs">{cartError}</p>
          <Button variant="outline" onClick={loadCart} className="w-full justify-center mt-4">
            Retry
          </Button>
        </div>
      ) : cart.items.length === 0 ? (
        <div className="border border-beige bg-white p-8 text-center">
          <p className="text-sm text-grayx mb-3">Your cart is empty.</p>
          <Link href="/shop" className="block text-sm font-medium text-gold hover:underline">
            Browse the shop
          </Link>
        </div>
      ) : (
        <CheckoutForm items={cart.items} subtotal={cart.subtotal} />
      )}
    </div>
  );
}