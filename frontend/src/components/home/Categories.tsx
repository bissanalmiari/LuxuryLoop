import Link from "next/link";
import { ShoppingBag, Clock, Gem, Footprints } from "lucide-react";

const categories = [
  { name: "Handbags", icon: ShoppingBag },
  { name: "Watches", icon: Clock },
  { name: "Jewelry", icon: Gem },
  { name: "Shoes", icon: Footprints },
];

export function Categories() {
  return (
    <section className="max-w-[1240px] mx-auto px-8 pb-14">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">Categories</p>
          <h2 className="font-serif text-[32px] font-medium">Shop by category</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {categories.map(({ name, icon: Icon }) => (
          <Link key={name} href={`/shop?category=${encodeURIComponent(name)}`} className="card group">
            <div className="aspect-square bg-[#F1EEE7] flex items-center justify-center">
              <Icon size={44} strokeWidth={1.4} className="text-grayx group-hover:text-gold transition-colors" />
            </div>
            <div className="p-[18px] text-center font-semibold text-[15px]">{name}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}