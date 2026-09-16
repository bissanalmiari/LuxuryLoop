const steps = [
  {
    title: "Submit or browse",
    sub: "Consign an item for AI screening, or browse our full authenticated catalog.",
  },
  {
    title: "Verified by experts",
    sub: "Every piece is checked by AI and confirmed in person by our specialists.",
  },
  {
    title: "Buy, sell, enjoy",
    sub: "Complete your purchase or get paid — pick up in branch or have it delivered.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-14 max-w-[1240px] mx-auto px-8">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">How It Works</p>
          <h2 className="font-serif text-[32px] font-medium">From closet to checkout</h2>
        </div>
        <p className="text-[14.5px] text-grayx max-w-[380px]">
          Three simple steps, whether you&apos;re buying or selling.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-7">
        {steps.map((step, i) => (
          <div key={step.title} className="text-center px-4">
            <div className="w-11 h-11 rounded-full bg-charcoal text-gold font-serif text-lg flex items-center justify-center mx-auto mb-4.5">
              {i + 1}
            </div>
            <h4 className="text-[15.5px] font-semibold mb-2">{step.title}</h4>
            <p className="text-[13px] text-grayx leading-relaxed">{step.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}