// src/components/layout/Navbar.tsx (or wherever the customer nav lives)
import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Consign", href: "/consign" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  return (
    <header className="border-b border-beige bg-white sticky top-0 z-40">
      <div className="max-w-[1240px] mx-auto px-8 py-5 flex items-center justify-between">
        <Link href="/" className="font-serif text-2xl">
          Luxury<span className="text-gold italic">Loop</span>
        </Link>
        <nav className="flex items-center gap-8">
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
        <div className="flex items-center gap-4">
          <Link href="/orders" className="text-sm font-medium hover:text-gold">Orders</Link>
          <Link href="/cart" className="text-sm font-medium hover:text-gold">Cart</Link>
          <Link href="/login" className="text-sm font-medium hover:text-gold">Log in</Link>
        </div>
      </div>
    </header>
  );
}