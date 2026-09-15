import Link from "next/link";
import { User } from "lucide-react";

const links = [
  { label: "Home", href: "/" },
];

export function Navbar() {
  return (
    <header className="bg-white border-b border-beige sticky top-0 z-50">
      <nav className="max-w-[1240px] mx-auto flex items-center justify-between px-8 py-5">
        <Link href="/" className="font-serif text-2xl">
          Luxury<span className="italic text-gold">Loop</span>
        </Link>
        <ul className="flex gap-10">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-sm font-medium hover:text-gold transition-colors">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-5">
          <Link href="/login" aria-label="Account" className="text-charcoal"><User size={19} /></Link>
        </div>
      </nav>
    </header>
  );
}
