"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ClipboardList,
  BarChart3,
  Heart,
  LogIn,
  LogOut,
  Menu,
  ShoppingBag,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getRole, Role } from "@/lib/auth";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Consign", href: "/consign" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      setRole(data.user ? await getRole() : null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setRole(session?.user ? await getRole() : null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    setAccountOpen(false);
    setMobileOpen(false);
    window.location.assign("/");
  }

  return (
    <header className="border-b border-beige bg-white sticky top-0 z-40">
      <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-4 md:py-5 flex items-center justify-between gap-4">
        <Link href="/" className="font-serif text-[22px] md:text-2xl shrink-0">
          Luxury<span className="text-gold italic">Loop</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-charcoal hover:text-gold transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-3">
          {user && (
            <>
              <Link href="/orders" className="p-2 text-charcoal hover:text-gold transition-colors" aria-label="Orders" title="Orders">
                <ClipboardList size={18} strokeWidth={1.8} />
              </Link>
              <Link href="/cart" className="p-2 text-charcoal hover:text-gold transition-colors" aria-label="Cart" title="Cart">
                <ShoppingBag size={18} strokeWidth={1.8} />
              </Link>
              <Link href="/favorites" className="hidden sm:block p-2 text-charcoal hover:text-gold transition-colors" aria-label="Favorites" title="Favorites">
                <Heart size={18} strokeWidth={1.8} />
              </Link>
            </>
          )}

          {user ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="flex items-center gap-1 p-2 text-charcoal hover:text-gold transition-colors"
                aria-label="Account menu"
                aria-expanded={accountOpen}
                title="Account"
              >
                <UserRound size={19} strokeWidth={1.8} />
                <ChevronDown size={13} strokeWidth={1.8} className="hidden sm:block" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 border border-beige bg-white py-1 shadow-[0_8px_24px_rgba(28,28,28,0.12)] z-50">
                  {(role === "admin" || role === "staff") && (
                    <Link
                      href={role === "admin" ? "/admin" : "/staff"}
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-ivory"
                    >
                      <BarChart3 size={15} strokeWidth={1.8} /> Dashboard
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-ivory"
                  >
                    <UserRound size={15} strokeWidth={1.8} /> Profile
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-charcoal hover:bg-ivory"
                  >
                    <LogOut size={15} strokeWidth={1.8} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="p-2 text-charcoal hover:text-gold transition-colors" aria-label="Log in" title="Log in">
                <LogIn size={18} strokeWidth={1.8} />
              </Link>
              <Link href="/register" className="hidden sm:block p-2 text-charcoal hover:text-gold transition-colors" aria-label="Register" title="Register">
                <UserPlus size={18} strokeWidth={1.8} />
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="lg:hidden p-2 text-charcoal hover:text-gold transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-beige bg-white">
          <nav className="max-w-[1240px] mx-auto px-5 py-3 flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-2 py-3 text-[15px] font-medium text-charcoal hover:text-gold transition-colors border-b border-beige/60 last:border-b-0"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}