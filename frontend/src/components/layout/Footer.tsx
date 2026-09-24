"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const SUPPORT_INFO: Record<string, { title: string; body: string[] }> = {
  Shipping: {
    title: "Shipping",
    body: [
      "We ship authenticated pieces across Lebanon via a tracked courier.",
      "Delivery usually arrives within 2–4 business days after your order is confirmed.",
      "Shipping is calculated at checkout based on your delivery address and order weight.",
    ],
  },
  Returns: {
    title: "Returns & Exchanges",
    body: [
      "If a piece does not match its listing, you can request a return within 14 days of delivery.",
      "Items must be returned in their original condition, with the authenticity card and packaging.",
      "Refunds are issued to the original payment method once the returned piece passes inspection.",
    ],
  },
  FAQ: {
    title: "Frequently Asked Questions",
    body: [
      "How do I know a piece is authentic? Every item is AI-screened and physically verified by an expert before it is listed.",
      "Can I consign my own luxury items? Yes — submit the consign form and our team reviews your piece for sale.",
      "Where can I pick up an order? Choose 'pickup' at checkout and collect it from your preferred branch.",
    ],
  },
};

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [infoOpen, setInfoOpen] = useState<{ title: string; body: string[] } | null>(null);

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) {
      setSubscribeError("Please enter a valid email address.");
      return;
    }
    setSubscribing(true);
    setSubscribeError("");
    try {
      const res = await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body?.detail === "string" ? body.detail : "Subscription failed");
      }
      setSubscribed(true);
      setEmail("");
    } catch (e) {
      setSubscribeError(e instanceof Error ? e.message : "Subscription failed. Please try again.");
    } finally {
      setSubscribing(false);
    }
  }

  function openInfo(topic: keyof typeof SUPPORT_INFO) {
    setInfoOpen(SUPPORT_INFO[topic]);
  }

  return (
    <footer className="bg-charcoal text-[#B9B5AC] py-14">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 pb-9 border-b border-[#333]">
          <div className="col-span-2 lg:col-span-2">
            <div className="font-serif text-xl text-white mb-3">
              Luxury<span className="italic text-gold">Loop</span>
            </div>
            <p className="text-[13.5px] leading-relaxed max-w-[300px] mb-5">
              A centralized home for pre-loved luxury — verified, priced fairly, ready for their next story.
            </p>
            {subscribed ? (
              <p className="text-[13px] text-gold">You&apos;re in! We&apos;ll send new arrivals to your inbox.</p>
            ) : (
              <form onSubmit={subscribe} className="max-w-[300px]">
                <label htmlFor="footer-subscribe" className="block text-[12px] uppercase tracking-wide text-[#8A867E] mb-2">
                  Stay in the loop
                </label>
                <div className="flex">
                  <input
                    id="footer-subscribe"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="flex-1 min-w-0 bg-[#2A2A2A] border border-[#3A3A3A] px-3 py-2.5 text-[13px] text-white placeholder:text-[#8A867E] outline-none focus:border-gold"
                  />
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="bg-gold text-charcoal text-[12.5px] font-semibold px-4 disabled:opacity-60"
                  >
                    {subscribing ? "…" : "Subscribe"}
                  </button>
                </div>
                {subscribeError && <p className="mt-2 text-[12px] text-[#E18B7C]">{subscribeError}</p>}
              </form>
            )}
          </div>
          <FooterCol title="Shop" items={[
            { label: "Watches", href: "/shop?category=Watches" },
            { label: "Handbags", href: "/shop?category=Handbags" },
            { label: "Jewelry", href: "/shop?category=Jewelry" },
            { label: "Shoes", href: "/shop?category=Shoes" },
          ]} />
          <FooterCol title="Company" items={[
            { label: "About us", href: "/about" },
            { label: "Branches", href: "/#branches" },
            { label: "Consign an item", href: "/consign" },
          ]} />
          <div>
            <h4 className="text-white text-[13px] font-semibold mb-4">Support</h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link href="/contact" className="text-[13.5px] hover:text-white transition-colors">Contact us</Link>
              </li>
              {(["Shipping", "Returns", "FAQ"] as const).map((topic) => (
                <li key={topic}>
                  <button
                    type="button"
                    onClick={() => openInfo(topic)}
                    className="text-[13.5px] hover:text-white transition-colors"
                  >
                    {topic}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-[#8A867E]">
          <span>© 2026 LuxuryLoop. All rights reserved.</span>
          <span>Beirut · Jounieh · Tripoli</span>
        </div>
      </div>

      {infoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setInfoOpen(null)}
        >
          <div
            className="w-full max-w-md bg-white text-charcoal p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-xl font-medium">{infoOpen.title}</h3>
              <button type="button" onClick={() => setInfoOpen(null)} aria-label="Close" className="text-grayx hover:text-charcoal">
                <X size={18} />
              </button>
            </div>
            <ul className="flex flex-col gap-2.5 text-[13.5px] text-grayx">
              {infoOpen.body.map((line) => (
                <li key={line} className="leading-relaxed">{line}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </footer>
  );
}

interface FooterItem {
  label: string;
  href: string;
}

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h4 className="text-white text-[13px] font-semibold mb-4">{title}</h4>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="text-[13.5px] hover:text-white transition-colors">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}