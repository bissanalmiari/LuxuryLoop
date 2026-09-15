import Link from "next/link";
import { Button } from "@/components/ui/Button";
import LogoutButton from "@/components/ui/LogoutButton";

export default function HomePage() {
  return (
    <section className="max-w-[1240px] mx-auto px-8 py-20">
      <div className="flex justify-end mb-6">
        <LogoutButton />
      </div>
      <p className="text-gold text-xs font-semibold tracking-widest mb-3">AUTHENTIC LUXURY</p>
      <h1 className="font-serif text-5xl font-medium mb-5 max-w-xl">Timeless pieces, new stories.</h1>
      <p className="text-grayx text-sm mb-8 max-w-md">
        Discover a curated collection of pre-loved luxury watches, handbags, jewelry and more.
      </p>
      <Link href="/shop">
        <Button>Shop now</Button>
      </Link>
    </section>
  );
}
