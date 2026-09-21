"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

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
const inputErrCls = "border-[#B15C4A] focus:border-[#B15C4A]";
const labelCls = "block text-[13px] font-semibold mb-1.5";

function FieldError({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p className="text-[#B15C4A] text-[11px] mt-1">{msg}</p>;
}

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length >= 3 && parseInt(d.slice(0, 2), 10) > 12) {
    return `12/${d.slice(2)}`;
  }
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

function luhnValid(num: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = parseInt(num[i], 10);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function isFutureExpiryMMYY(v: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const mm = parseInt(m[1], 10);
  const yy = 2000 + parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return false;
  const endOfMonth = new Date(yy, mm, 0, 23, 59, 59);
  return endOfMonth.getTime() >= Date.now();
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<{ items: any[]; subtotal: number }>({ items: [], subtotal: 0 });
  const [fulfillment, setFulfillment] = useState("delivery");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const mark = useCallback((key: string) => {
    setTouched((t) => ({ ...t, [key]: true }));
  }, []);

  const shippingErrors = {
    fullName: !fullName.trim() ? "Full name is required" : "",
    phone:
      !phone.trim() || phone.replace(/\D/g, "").length < 8 ? "Enter a valid phone number" : "",
    address1: fulfillment === "delivery" && !address1.trim() ? "Address is required" : "",
    city: fulfillment === "delivery" && !city.trim() ? "City is required" : "",
  };

  const cardErrors = {
    cardNumber: (() => {
      const d = cardNumber.replace(/\D/g, "");
      if (!cardNumber) return "Card number is required";
      if (d.length < 12) return "Card number is incomplete";
      return luhnValid(d) ? "" : "Invalid card number";
    })(),
    expiry: !expiry
      ? "Expiry date is required"
      : !/^\d{2}\/\d{2}$/.test(expiry)
        ? "Use MM/YY"
        : isFutureExpiryMMYY(expiry)
          ? ""
          : "Card has expired",
    cvc: !cvc ? "CVC is required" : cvc.length < 3 ? "CVC must be 3–4 digits" : "",
  };

  const show = (key: string, msg: string) => (touched[key] && msg ? msg : "");

  const hasErrors = Object.values(shippingErrors).some(Boolean) || Object.values(cardErrors).some(Boolean);

  const loadCart = useCallback(() => {
    setLoadingCart(true);
    setCartError(null);
    authedFetch("/cart")
      .then((d) => setCart({ items: d.items || [], subtotal: d.subtotal || 0 }))
      .catch((e) => setCartError(e instanceof Error ? e.message : "Unable to load your cart"))
      .finally(() => setLoadingCart(false));
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);

  const count = cart.items.filter((it: any) => it.status === "available").length;

  async function placeOrder() {
    Object.keys({ ...shippingErrors, ...cardErrors }).forEach(mark);
    if (hasErrors) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setError(null);
    setPlacing(true);
    try {
      await authedFetch("/orders/checkout", {
        method: "POST",
        body: JSON.stringify({
          fulfillment_type: fulfillment,
          address:
            fulfillment === "delivery"
              ? { full_name: fullName, phone, address_line1: address1, city }
              : undefined,
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
    <div className="max-w-[1000px] mx-auto px-8 py-14">
      <div className="stepper flex items-center justify-center gap-6 mb-12">
        <Link href="/cart" className="flex items-center gap-2">
          <Step num="1" label="Cart" state="done" />
        </Link>
        <div className="h-px w-12 bg-gold" />
        <Step num="2" label="Checkout" state="active" />
        <div className="h-px w-12 bg-beige" />
        <Step num="3" label="Confirmation" state="todo" />
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-10 items-start">
        <div className="space-y-6">
          <Panel title="Shipping details">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Full name</label>
                <input
                  className={`${inputCls} ${show("fullName", shippingErrors.fullName) ? inputErrCls : ""}`}
                  placeholder="Lea Haddad"
                  value={fullName}
                  onBlur={() => mark("fullName")}
                  onChange={(e) => { setFullName(e.target.value); mark("fullName"); }}
                />
                <FieldError msg={show("fullName", shippingErrors.fullName)} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  className={`${inputCls} ${show("phone", shippingErrors.phone) ? inputErrCls : ""}`}
                  placeholder="+961 71 234 567"
                  value={phone}
                  onBlur={() => mark("phone")}
                  onChange={(e) => { setPhone(e.target.value); mark("phone"); }}
                />
                <FieldError msg={show("phone", shippingErrors.phone)} />
              </div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Address</label>
              <input
                className={`${inputCls} ${show("address1", shippingErrors.address1) ? inputErrCls : ""}`}
                placeholder="Rue Gouraud, Gemmayzeh"
                value={address1}
                disabled={fulfillment === "pickup"}
                onBlur={() => mark("address1")}
                onChange={(e) => { setAddress1(e.target.value); mark("address1"); }}
              />
              <FieldError msg={show("address1", shippingErrors.address1)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>City</label>
                <input
                  className={`${inputCls} ${show("city", shippingErrors.city) ? inputErrCls : ""}`}
                  placeholder="Beirut"
                  value={city}
                  disabled={fulfillment === "pickup"}
                  onBlur={() => mark("city")}
                  onChange={(e) => { setCity(e.target.value); mark("city"); }}
                />
                <FieldError msg={show("city", shippingErrors.city)} />
              </div>
              <div>
                <label className={labelCls}>Pickup or delivery</label>
                <select
                  value={fulfillment}
                  onChange={(e) => setFulfillment(e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="delivery">Home delivery</option>
                  <option value="pickup">Pick up in branch</option>
                </select>
              </div>
            </div>
          </Panel>

          <Panel title="Payment">
            <div className="mb-4">
              <label className={labelCls}>Card number</label>
              <input
                className={`${inputCls} ${show("cardNumber", cardErrors.cardNumber) ? inputErrCls : ""}`}
                inputMode="numeric"
                placeholder="•••• •••• •••• 4242"
                value={cardNumber}
                onBlur={() => mark("cardNumber")}
                onChange={(e) => { setCardNumber(formatCardNumber(e.target.value)); mark("cardNumber"); }}
              />
              <FieldError msg={show("cardNumber", cardErrors.cardNumber)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Expiry</label>
                <input
                  className={`${inputCls} ${show("expiry", cardErrors.expiry) ? inputErrCls : ""}`}
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={expiry}
                  onBlur={() => mark("expiry")}
                  onChange={(e) => { setExpiry(formatExpiry(e.target.value)); mark("expiry"); }}
                />
                <FieldError msg={show("expiry", cardErrors.expiry)} />
              </div>
              <div>
                <label className={labelCls}>CVC</label>
                <input
                  className={`${inputCls} ${show("cvc", cardErrors.cvc) ? inputErrCls : ""}`}
                  inputMode="numeric"
                  placeholder="•••"
                  maxLength={4}
                  value={cvc}
                  onBlur={() => mark("cvc")}
                  onChange={(e) => { setCvc(e.target.value.replace(/\D/g, "")); mark("cvc"); }}
                />
                <FieldError msg={show("cvc", cardErrors.cvc)} />
              </div>
            </div>
          </Panel>
        </div>

        <div className="border border-beige bg-white p-6 h-fit">
          <h3 className="font-serif text-base font-medium mb-4">Order summary</h3>
          {loadingCart ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-beige/50" />
              <div className="h-4 bg-beige/50" />
              <div className="h-4 bg-beige/50 w-2/3 mb-3" />
              <div className="h-11 w-full bg-beige/50" />
            </div>
          ) : cartError ? (
            <div>
              <p className="text-[#B15C4A] text-xs">{cartError}</p>
              <Button variant="outline" onClick={loadCart} className="w-full justify-center mt-4">
                Retry
              </Button>
            </div>
          ) : cart.items.length === 0 ? (
            <div>
              <p className="text-sm text-grayx">Your cart is empty.</p>
              <Link href="/shop" className="block text-sm font-medium text-gold hover:underline mt-4">
                Browse the shop
              </Link>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-2.5">
                <span>{count} {count === 1 ? "item" : "items"}</span>
                <span>${cart.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mb-2.5">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-beige pt-3 mt-3 mb-5">
                <span>Total</span>
                <span>${cart.subtotal.toLocaleString()}</span>
              </div>
              {error && <p className="text-[#B15C4A] text-xs mb-3">{error}</p>}
              <Button
                onClick={placeOrder}
                disabled={placing || cart.subtotal <= 0}
                className="w-full justify-center"
              >
                {placing ? "Processing payment..." : "Pay & place order"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}