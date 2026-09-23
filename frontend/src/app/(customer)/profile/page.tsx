"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

function initialsOf(name: string) {
  return (name || "You")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [counts, setCounts] = useState({ orders: 0, favorites: 0, consignments: 0 });
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authedFetch("/auth/me"),
      authedFetch("/orders/me").catch(() => ({ orders: [] })),
      authedFetch("/favorites").catch(() => ({ favorites: [] })),
      authedFetch("/consignments/me").catch(() => ({ consignments: [] })),
    ])
      .then(([me, orders, favs, cons]) => {
        setProfile(me);
        setFullName(me.full_name || "");
        setPhone(me.phone || "");
        setCounts({
          orders: orders.orders?.length ?? 0,
          favorites: favs.favorites?.length ?? 0,
          consignments: cons.consignments?.length ?? 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await authedFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim() }),
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
    setSaving(false);
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    if (!profile?.email) {
      setPasswordError("Your account email could not be loaded.");
      setPasswordSaving(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });
    if (signInError) {
      setPasswordError("Current password is incorrect.");
      setPasswordSaving(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    }
    setPasswordSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-8 py-16 animate-pulse">
        <div className="h-6 bg-beige/60 max-w-[360px] mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
          <div className="h-80 bg-beige/40" />
          <div className="h-80 bg-beige/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto">
      <section className="bg-charcoal text-white py-14 mb-12">
        <div className="px-8 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-gold text-charcoal font-serif text-2xl font-semibold flex items-center justify-center shrink-0">
            {initialsOf(fullName)}
          </div>
          <div>
            <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-2">MY ACCOUNT</p>
            <h1 className="font-serif text-[32px] font-medium leading-tight">
              {fullName || "Welcome back"}
            </h1>
            <p className="text-[#C9C5BC] text-sm mt-1.5">
              {profile?.email}
              {profile?.role !== "customer" && (
                <span className="ml-3 capitalize text-gold text-xs">{profile?.role}</span>
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="px-8 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 items-start pb-20">
        <section className="card p-8">
          <div className="mb-7">
            <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-2.5">PERSONAL DETAILS</p>
            <h2 className="font-serif text-[26px] font-medium">Your information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[12.5px] text-grayx mb-2">Full name</label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-[12.5px] text-grayx mb-2">Phone</label>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[12.5px] text-grayx mb-2">Email</label>
              <input
                className="input bg-ivory text-grayx cursor-not-allowed"
                value={profile?.email || ""}
                readOnly
              />
              <p className="text-[11.5px] text-grayx mt-1.5">Email is tied to your sign-in and can&apos;t be changed here.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-8">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && <span className="text-sm text-[#5E7A5E]">Saved ✓</span>}
          </div>
        </section>

        <section className="card p-8">
          <div className="mb-7">
            <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-2.5">SECURITY</p>
            <h2 className="font-serif text-[26px] font-medium">Change password</h2>
            <p className="text-sm text-grayx mt-2">Use a new password with at least 6 characters.</p>
          </div>

          <form onSubmit={changePassword} className="max-w-[560px] space-y-5">
            <div>
              <label className="block text-[12.5px] text-grayx mb-2">Current password</label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[12.5px] text-grayx mb-2">New password</label>
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-[12.5px] text-grayx mb-2">Confirm new password</label>
                <input
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  minLength={6}
                  required
                />
              </div>
            </div>
            {passwordError && <p className="text-sm text-red">{passwordError}</p>}
            {passwordMessage && <p className="text-sm text-[#5E7A5E]">{passwordMessage}</p>}
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Updating…" : "Update password"}
            </Button>
          </form>
        </section>

        <div className="space-y-8">
          <section className="card p-6">
            <p className="text-gold text-[11px] font-semibold tracking-[.14em] mb-5">YOUR ACTIVITY</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="border-r border-beige">
                <p className="font-serif text-[26px] mb-1">{counts.orders}</p>
                <p className="text-[11px] text-grayx uppercase tracking-wide">Orders</p>
              </div>
              <div className="border-r border-beige">
                <p className="font-serif text-[26px] mb-1">{counts.favorites}</p>
                <p className="text-[11px] text-grayx uppercase tracking-wide">Saved</p>
              </div>
              <div>
                <p className="font-serif text-[26px] mb-1">{counts.consignments}</p>
                <p className="text-[11px] text-grayx uppercase tracking-wide">Consigned</p>
              </div>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="p-6 border-b border-beige">
              <p className="text-gold text-[11px] font-semibold tracking-[.14em]">QUICK LINKS</p>
            </div>
            <div className="divide-y divide-beige">
              {[
                { label: "Order history", href: "/orders", sub: `${counts.orders} orders` },
                { label: "Saved items", href: "/favorites", sub: `${counts.favorites} saved` },
                { label: "Track consignments", href: "/consign/status", sub: `${counts.consignments} submitted` },
                { label: "Consign a new item", href: "/consign", sub: "Start an AI screening" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex items-center justify-between px-6 py-4 hover:bg-ivory transition-colors">
                  <span className="text-[14px] font-medium">{l.label}</span>
                  <span className="text-[12.5px] text-grayx">→</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-charcoal text-white p-6">
            <p className="text-gold text-[11px] font-semibold tracking-[.14em] mb-2.5">AUTHENTICITY PROMISE</p>
            <p className="font-serif text-[19px] mb-1.5">{fullName || "Member"}</p>
            <p className="text-[12.5px] text-[#C9C5BC] leading-relaxed">
              Every purchase is AI-screened and authenticated in person before it is listed.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}