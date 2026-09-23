import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BranchImage } from "@/components/home/BranchImage";
import { ShieldCheck, Sparkles, Scale, Recycle, Store, Headset } from "lucide-react";

const values = [
  { icon: ShieldCheck, title: "Authenticity first", sub: "Every piece is AI-screened, then verified by our specialists in person before it is listed." },
  { icon: Scale, title: "Fair pricing", sub: "Transparent commissions and market-based pricing whether you sell or consign." },
  { icon: Recycle, title: "Circular luxury", sub: "Owned once, worn by many — we keep timeless pieces out of landfills and in circulation." },
  { icon: Headset, title: "Human support", sub: "Real experts in every branch, ready to help you buy, sell, or consign." },
];

export default function AboutPage() {
  return (
    <div className="max-w-[1240px] mx-auto">
      {/* Hero */}
      <section className="bg-charcoal text-white py-24 px-8">
        <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">OUR STORY</p>
        <h1 className="font-serif text-[44px] font-medium max-w-[620px] mb-5 leading-tight">
          Timeless pieces, new stories.
        </h1>
        <p className="text-[#C9C5BC] text-sm leading-relaxed max-w-[480px]">
          LuxuryLoop is Lebanon&apos;s multi-branch home for pre-loved luxury. We take
          in watches, handbags, jewelry and shoes — authenticate them with AI and
          human expertise — and find them their next owner.
        </p>
        <div className="flex gap-4 mt-8">
          <Link href="/shop">
            <Button>Browse the collection →</Button>
          </Link>
          <Link href="/consign">
            <Button variant="outline" className="text-white border-[#4A4A4A] hover:border-white">Consign an item</Button>
          </Link>
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-b border-beige bg-white">
        <div className="grid grid-cols-3">
          {[
            { value: "3", label: "Branches across Lebanon" },
            { value: "2-step", label: "AI + expert authentication" },
            { value: "100%", label: "Verification before listing" },
          ].map((s, i) => (
            <div key={s.label} className={`py-8 px-10 text-center ${i > 0 ? "border-l border-beige" : ""}`}>
              <div className="font-serif text-[32px] text-charcoal mb-1.5">{s.value}</div>
              <div className="text-[12.5px] text-grayx">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Story */}
      <section className="py-20 px-8">
        <div className="grid grid-cols-2 gap-14 items-center">
          <div>
            <BranchImage />
          </div>
          <div>
            <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">WHY WE EXIST</p>
            <h2 className="font-serif text-[32px] font-medium mb-5 leading-snug">
              The circular purchase, without the doubt.
            </h2>
            <p className="text-[14.5px] text-grayx leading-relaxed mb-4">
              Buying pre-owned luxury should feel safe. Selling should feel effortless.
              LuxuryLoop was founded to close the loop: a trusted middle step that
              authenticates every piece, prices it fairly, and moves it to a new home
              with full confidence on both sides.
            </p>
            <p className="text-[14.5px] text-grayx leading-relaxed">
              From our branches in Beirut, Jounieh and Tripoli, we bring buyers and
              sellers together — each transaction looped, verified, and ready for its
              next story.
            </p>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-charcoal text-white py-[70px] px-8">
        <div className="mb-10">
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">HOW IT WORKS</p>
          <h2 className="font-serif text-[32px] font-medium max-w-[520px]">
            From your closet to the counter — in three steps.
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-7">
          {[
            { title: "Submit your item", sub: "Upload photos and documents from the consign page. Our AI performs an immediate preliminary assessment." },
            { title: "Authenticated by experts", sub: "Specialists review the AI screening and physically verify the piece in one of our branches." },
            { title: "Listed and sold", sub: "Priced fairly, listed across branches, and shipped or handed over to its new owner." },
          ].map((step, i) => (
            <div key={step.title} className="bg-[#2A2A2A] p-7">
              <div className="w-9 h-9 rounded-full bg-gold text-charcoal font-serif text-lg flex items-center justify-center mb-5">
                {i + 1}
              </div>
              <h4 className="text-[15.5px] font-semibold mb-2.5">{step.title}</h4>
              <p className="text-[13px] text-[#B9B5AC] leading-relaxed">{step.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI promise */}
      <section className="py-20 px-8">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">POWERED BY AI</p>
            <h2 className="font-serif text-[32px] font-medium">Confidence in every purchase</h2>
          </div>
          <p className="text-[14.5px] text-grayx max-w-[380px]">
            Technology speeds up the process — our specialists make the final call.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-7">
          {[
            { icon: Sparkles, title: "AI authentication", sub: "Preliminary authenticity scoring on submission, using your photos and documents." },
            { icon: Store, title: "Human verification", sub: "Every item is confirmed in person by specialists before it reaches the floor." },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="card p-7 flex gap-4">
              <Icon size={24} className="text-gold shrink-0" />
              <div>
                <div className="font-semibold mb-1.5">{title}</div>
                <p className="text-[13px] text-grayx leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="pb-20 px-8">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">WHAT WE STAND FOR</p>
            <h2 className="font-serif text-[32px] font-medium">The LuxuryLoop promise</h2>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-7">
          {values.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="card p-6">
              <Icon size={22} className="text-gold mb-5" />
              <h4 className="text-[15px] font-semibold mb-2">{title}</h4>
              <p className="text-[13px] text-grayx leading-relaxed">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 px-8">
        <div className="bg-ivory border border-beige py-16 px-12 text-center">
          <div className="w-10 h-px bg-gold mx-auto mb-6" />
          <h2 className="font-serif italic text-2xl mb-4">&ldquo;Owned once, worn forever.&rdquo;</h2>
          <p className="text-[14px] text-grayx mb-7 max-w-[440px] mx-auto">
            Find your next timeless piece, or give one a new life.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/shop">
              <Button>Shop luxury</Button>
            </Link>
            <Link href="/consign">
              <Button variant="outline">Consign an item</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}