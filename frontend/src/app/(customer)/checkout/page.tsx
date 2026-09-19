"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function CheckoutPage() {
  const router = useRouter();
  const [subtotal, setSubtotal] = useState(0);
  const [fulfillment, setFulfillment] = useState("delivery");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => { authedFetch("/cart").then((d) => setSubtotal(d.subtotal)); }, []);

  async function placeOrder() {
    setPlacing(true); setError(null);
    try {
      await authedFetch("/orders/checkout", {
        method: "POST",
        body: JSON.stringify({
          fulfillment_type: fulfillment,
          address: fulfillment === "delivery" ? { full_name: fullName, phone, address_line1: address1, city } : undefined,
          payment_method: "card",
        }),
      });
      router.push("/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    }
    setPlacing(false);
  }

  return (
    <div className="max-w-[900px] mx-auto px-8 py-14 grid grid-cols-[1fr_320px] gap-10">
      <div className="space-y-6">
        <div className="border border-beige bg-white p-5">
          <h2 className="text-sm font-semibold mb-4">Shipping details</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold" />
            <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold" />
          </div>
          <input placeholder="Address" value={address1} onChange={(e) => setAddress1(e.target.value)} className="w-full px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="px-3 py-2.5 border border-beige text-sm outline-none focus:border-gold" />
            <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)} className="px-3 py-2.5 border border-beige text-sm bg-white outline-none">
              <option value="delivery">Home delivery</option>
              <option value="pickup">Branch pickup</option>
            </select>
          </div>
        </div>
        <div className="border border-beige bg-white p-5">
          <h2 className="text-sm font-semibold mb-4">Payment</h2>
          <p className="text-xs text-grayx">Mocked for now — placing the order marks payment as succeeded immediately.</p>
        </div>
      </div>
      <div className="border border-beige bg-white p-5 h-fit">
        <h2 className="text-sm font-semibold mb-4">Order summary</h2>
        <div className="flex justify-between font-semibold mb-5"><span>Total</span><span>${subtotal.toLocaleString()}</span></div>
        {error && <p className="text-red text-xs mb-3">{error}</p>}
        <Button onClick={placeOrder} disabled={placing} className="w-full justify-center">
          {placing ? "Placing order..." : "Pay & place order"}
        </Button>
      </div>
    </div>
  );
}