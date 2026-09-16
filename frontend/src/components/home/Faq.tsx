const items = [
  {
    q: "How does AI authentication work?",
    a: "Every consigned item is screened by our AI model against known authenticity markers, then confirmed in person by a specialist before listing.",
  },
  {
    q: "Can I return an item?",
    a: "Yes, items can be returned within 7 days of delivery in original condition. See our Returns policy for details.",
  },
  {
    q: "How do I get paid for a consignment?",
    a: "Once your item is approved and sold, payout is transferred to your account minus our commission percentage.",
  },
];

export function Faq() {
  return (
    <section className="py-14 max-w-[800px] mx-auto px-8">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">FAQ</p>
          <h2 className="font-serif text-[32px] font-medium">Common questions</h2>
        </div>
      </div>
      {items.map((item) => (
        <details key={item.q} className="border-b border-beige py-5">
          <summary className="font-semibold text-[14.5px] cursor-pointer">{item.q}</summary>
          <p className="text-[13.5px] text-grayx mt-2.5 leading-relaxed">{item.a}</p>
        </details>
      ))}
    </section>
  );
}