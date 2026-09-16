import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="bg-charcoal text-white py-20">
      <div className="max-w-[1240px] mx-auto px-8">
        <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">AUTHENTIC LUXURY</p>
        <h1 className="font-serif text-[44px] font-medium max-w-[520px] mb-4.5">
          Timeless pieces, new stories.
        </h1>
        <p className="text-[#C9C5BC] text-sm max-w-[420px] mb-7">
          Discover a curated collection of pre-loved luxury watches, handbags, jewelry and more.
        </p>
        <Link href="/shop">
          <Button>Shop now →</Button>
        </Link>
      </div>
    </section>
  );
}