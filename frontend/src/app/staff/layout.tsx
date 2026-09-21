"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getRole, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: "PIPELINE",
    items: [{ href: "/staff/consignments", label: "Review queue" }],
  },
  {
    group: "OPERATIONS",
    items: [
      { href: "/staff/inventory", label: "Inventory" },
      { href: "/staff/products", label: "Products" },
      { href: "/staff/sales", label: "Sales (POS)" },
      { href: "/staff/orders", label: "Orders" },
      { href: "/staff/customers", label: "Customers" },
      { href: "/staff/pricing", label: "Pricing" },
    ],
  },
];

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("staff");

  useEffect(() => {
    let mounted = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setUser(data?.user ?? null);
        return getRole();
      })
      .then((resolvedRole) => {
        if (!mounted) return;
        if (resolvedRole) setRole(resolvedRole);
      })
      .then(() => requireRole("staff", "admin"))
      .then((allowed) => {
        if (!allowed && mounted) router.replace("/login");
      })
      .catch(() => mounted && router.replace("/login"));
    return () => {
      mounted = false;
    };
  }, [router]);

  const userMeta = user?.user_metadata ?? {};
  const fullName = userMeta.full_name?.trim() || user?.email?.split("@")[0] || "Staff";

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const linkBase =
    "flex items-center gap-3 px-[14px] py-[11px] text-[13.5px] font-medium rounded-[3px] mb-[2px]";

  return (
    <div className="flex min-h-screen bg-ivory text-charcoal">
      <aside className="w-[236px] bg-charcoal text-[#C9C5BC] flex-col shrink-0 flex">
        <div className="px-6 pt-[26px] pb-6 border-b border-[#333]">
          <Link href="/" className="font-serif text-[26px] text-white">
            Luxury<span className="text-gold italic">Loop</span>
          </Link>
        </div>
        <nav className="px-3 py-[18px] flex-1">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="text-[10.5px] tracking-[.12em] text-[#7A766E] px-[14px] pt-[18px] pb-2 font-semibold">
                {g.group}
              </p>
              {g.items.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`${linkBase} ${
                    pathname.startsWith(n.href)
                      ? "bg-[rgba(198,161,91,0.15)] text-gold"
                      : "hover:text-white"
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-6 py-[18px] border-t border-[#333] flex items-center gap-[11px]">
          <div className="w-[34px] h-[34px] rounded-full bg-gold text-charcoal font-bold text-[13px] flex items-center justify-center">
            {user ? initialsOf(fullName) : "···"}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white truncate">{fullName}</div>
            <div className="text-[11.5px] text-[#8A867E] capitalize">{role}</div>
          </div>
          <button
            onClick={logout}
            className="ml-auto text-[11.5px] text-[#8A867E] hover:text-gold"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-10 py-8">{children}</main>
    </div>
  );
}
