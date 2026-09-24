"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, MapPin, Phone, Send, ShieldCheck } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const INITIAL = { name: "", email: "", phone: "", subject: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function set(field: keyof typeof INITIAL, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body?.detail === "string" ? body.detail : "Could not send your message");
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-[1240px] mx-auto">
      <section className="bg-charcoal text-white py-20 px-8">
        <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">GET IN TOUCH</p>
        <h1 className="font-serif text-[40px] font-medium mb-5 leading-tight">Contact us</h1>
        <p className="text-[#C9C5BC] text-sm leading-relaxed max-w-[520px]">
          Questions about a piece, an order, or consigning your own? Message us and our team
          will get back to you within one business day.
        </p>
      </section>

      <section className="py-16 px-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-12 items-start">
          <div className="bg-white border border-beige p-8">
            {sent ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-[#E4EBE1] text-[#4C6B4C] flex items-center justify-center">
                  <Send size={24} />
                </div>
                <h2 className="font-serif text-2xl mb-2">Message sent</h2>
                <p className="text-sm text-grayx max-w-[380px] mx-auto mb-6">
                  Thanks, {form.name.split(" ")[0] || "there"}. We&apos;ve received your message and will
                  reply to {form.email} shortly.
                </p>
                <Button onClick={() => { setSent(false); setForm(INITIAL); }}>Send another message</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid grid-cols-2 gap-5">
                <h2 className="col-span-2 font-serif text-2xl mb-1">Send us a message</h2>
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="contact-name" className="block text-[12px] font-semibold uppercase tracking-wide text-grayx mb-1.5">
                    Full name *
                  </label>
                  <Input id="contact-name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="contact-email" className="block text-[12px] font-semibold uppercase tracking-wide text-grayx mb-1.5">
                    Email *
                  </label>
                  <Input id="contact-email" required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
                </div>
                <div className="col-span-2">
                  <label htmlFor="contact-phone" className="block text-[12px] font-semibold uppercase tracking-wide text-grayx mb-1.5">
                    Phone <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <Input id="contact-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+961 3 000 000" />
                </div>
                <div className="col-span-2">
                  <label htmlFor="contact-subject" className="block text-[12px] font-semibold uppercase tracking-wide text-grayx mb-1.5">
                    Subject <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <Input id="contact-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="How can we help?" />
                </div>
                <div className="col-span-2">
                  <label htmlFor="contact-message" className="block text-[12px] font-semibold uppercase tracking-wide text-grayx mb-1.5">
                    Message *
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    minLength={5}
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="Write your message here…"
                    className="w-full min-h-[150px] px-4 py-3 border border-beige text-sm outline-none focus:border-gold resize-y"
                  />
                </div>
                {error && <p className="col-span-2 text-sm text-[#9A4A36] bg-[#FBF1EF] border border-[#E7C9C2] px-4 py-3">{error}</p>}
                <div className="col-span-2">
                  <Button type="submit" disabled={sending}>
                    <Send size={15} /> {sending ? "Sending…" : "Send message"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="border border-beige bg-white p-6">
              <p className="font-serif text-lg mb-4">Our branches</p>
              <ul className="flex flex-col gap-4 text-sm text-grayx">
                <li className="flex items-start gap-3"><MapPin size={17} className="text-gold mt-0.5 shrink-0" /> Beirut Main — Hamra St, Beirut</li>
                <li className="flex items-start gap-3"><MapPin size={17} className="text-gold mt-0.5 shrink-0" /> Jounieh Branch — Kfarhabida, Jounieh</li>
                <li className="flex items-start gap-3"><MapPin size={17} className="text-gold mt-0.5 shrink-0" /> Tripoli Branch — Tripoli Souk, Tripoli</li>
              </ul>
            </div>
            <div className="border border-beige bg-white p-6">
              <p className="font-serif text-lg mb-4">Prefer to call?</p>
              <ul className="flex flex-col gap-4 text-sm text-grayx">
                <li className="flex items-center gap-3"><Phone size={16} className="text-gold" /> +961 1 123 456</li>
                <li className="flex items-center gap-3"><Mail size={16} className="text-gold" /> care@luxuryloop.com</li>
              </ul>
            </div>
            <div className="border border-beige bg-white p-6 flex items-start gap-3">
              <ShieldCheck size={18} className="text-green-700 mt-0.5 shrink-0" />
              <p className="text-[13px] text-grayx leading-relaxed">
                We usually reply within one business day. For urgent authentication or
                order questions, visit your nearest branch during opening hours.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}