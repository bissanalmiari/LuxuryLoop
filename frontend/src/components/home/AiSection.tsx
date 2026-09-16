import { Sparkles, User } from "lucide-react";

const cards = [
  {
    icon: Sparkles,
    title: "AI authentication",
    sub: "Get a preliminary authenticity assessment based on your photos and documents.",
  },
  {
    icon: User,
    title: "AI personal stylist",
    sub: "Upload your photos and budget to get personalized product recommendations.",
  },
];

export function AiSection() {
  return (
    <section className="bg-charcoal text-white py-[70px]">
      <div className="max-w-[1240px] mx-auto px-8 grid grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">Powered by AI</p>
          <h2 className="font-serif text-[32px] font-medium mb-4">Confidence in every purchase</h2>
          <p className="text-[#C9C5BC] text-sm max-w-[420px]">
            Every consigned item is screened by our AI before it reaches the floor, then verified
            by hand. Technology speeds up the process — our specialists make the final call.
          </p>
        </div>
        <div className="flex flex-col gap-3.5">
          {cards.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="bg-[#2A2A2A] p-5 flex gap-4">
              <Icon size={22} className="text-gold shrink-0" />
              <div>
                <div className="font-semibold mb-1">{title}</div>
                <div className="text-[13px] text-[#B9B5AC]">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}