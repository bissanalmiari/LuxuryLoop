import { ProductCard } from "@/components/ui/ProductCard";

const items = [
  { brand: "Chanel", title: "Classic Flap Bag", price: "$1,850", location: "Beirut", imageClass: "bg-charcoal" },
  { brand: "Rolex", title: "Datejust 36 Two-Tone", price: "$8,400", location: "Jounieh", imageClass: "bg-gold" },
  { brand: "Cartier", title: "Love Bracelet, 18k Gold", price: "$4,200", location: "Beirut", imageClass: "bg-taupe" },
  { brand: "Christian Louboutin", title: "So Kate Pumps, 100mm", price: "$540", location: "Tripoli", imageClass: "bg-grayx" },
];

export function NewArrivals() {
  return (
    <section className="py-14 max-w-[1240px] mx-auto px-8">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">New Arrivals</p>
          <h2 className="font-serif text-[32px] font-medium">Freshly authenticated pieces</h2>
        </div>
        <p className="text-[14.5px] text-grayx max-w-[380px]">Added to the collection this week.</p>
      </div>
      <div className="grid grid-cols-4 gap-7">
        {items.map((item) => (
          <ProductCard key={item.title} {...item} />
        ))}
      </div>
    </section>
  );
}