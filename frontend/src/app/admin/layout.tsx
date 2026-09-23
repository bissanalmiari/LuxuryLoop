"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Boxes,
  GitBranch,
  Tags,
  Gem,
  ClipboardList,
  ShoppingBag,
  Users,
  LogOut,
} from "lucide-react";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data?.user ?? null));
  }, []);

  const userMeta = user?.user_metadata ?? {};
  const fullName = userMeta.full_name?.trim() || user?.email?.split("@")[0] || "Admin";
  const role = userMeta.role ?? "admin";
  const isAdmin = role === "admin";

  // Build NAV here, inside the component, so it can react to role.
  const NAV: { group: string; items: { label: string; icon: typeof BarChart3; href: string | null }[] }[] = [
    {
      group: "OVERVIEW",
      items: [{ label: "Dashboard", icon: BarChart3, href: "/admin" }],
    },
    {
      group: "CATALOG",
      items: [
          { label: "Products", icon: Boxes, href: "/admin/products" },
          { label: "Inventory", icon: GitBranch, href: "/admin/inventory" },
        ...(isAdmin
          ? [
            { label: "Branches", icon: GitBranch, href: "/admin/branches" },
            { label: "Categories", icon: Tags, href: "/admin/categories" },
            { label: "Brands", icon: Gem, href: "/admin/brands" },
            ]
          : []),
      ],
    },
    {
      group: "OPERATIONS",
      items: [
        { label: "Consignments", icon: ClipboardList, href: "/admin/consignments" },
        { label: "Orders", icon: ShoppingBag, href: "/admin/orders" },
        { label: "Customers", icon: Users, href: null },
      ],
    },
  ];

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
          {NAV.map((group) => (
            <div key={group.group}>
              <div className="text-[10.5px] tracking-[.12em] text-[#7A766E] px-[14px] pt-[18px] pb-2 font-semibold">
                {group.group}
              </div>
              {group.items.map((item) => {
                const active = item.href !== null && pathname.startsWith(item.href);
                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`${linkBase} ${
                        active ? "bg-[rgba(198,161,91,0.15)] text-gold" : "hover:text-white"
                      }`}
                    >
                      <item.icon size={17} strokeWidth={1.8} /> {item.label}
                    </Link>
                  );
                }
                return (
                  <span
                    key={item.label}
                    title="Coming soon"
                    className={`${linkBase} opacity-40 cursor-not-allowed`}
                  >
                    <item.icon size={17} strokeWidth={1.8} /> {item.label}
                  </span>
                );
              })}
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
            className="ml-auto text-[#8A867E] hover:text-gold"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-10 py-8">{children}</main>
    </div>
  );
}