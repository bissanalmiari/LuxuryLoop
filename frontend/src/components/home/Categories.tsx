import Link from "next/link";

const categories = [
  { name: "Handbags", imageClass: "bg-charcoal" },
  { name: "Watches", imageClass: "bg-gold" },
  { name: "Jewelry", imageClass: "bg-taupe" },
  { name: "Shoes", imageClass: "bg-grayx" },
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
      <div className="grid grid-cols-4 gap-6">
        {categories.map(({ name, imageClass }) => (
          <Link key={name} href={`/shop?category=${encodeURIComponent(name)}`} className="card">
            <div className="aspect-square bg-[#F1EEE7] flex items-center justify-center">
              <div className={`w-3/5 h-3/5 ${imageClass}`} />
            </div>
            <div className="p-[18px] text-center font-semibold text-[15px]">{name}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}