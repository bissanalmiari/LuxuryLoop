const testimonials = [
  {
    quote: "The authentication process gave me total peace of mind. My Birkin arrived exactly as described.",
    name: "Lea Haddad",
    location: "Beirut",
    initials: "LH",
  },
  {
    quote: "Consigning my watch was effortless — the AI screening was fast and the payout was fair.",
    name: "Tony Khoury",
    location: "Jounieh",
    initials: "TK",
  },
  {
    quote: "Three branches to choose from made pickup so convenient. Will absolutely shop again.",
    name: "Dina Semaan",
    location: "Tripoli",
    initials: "DS",
  },
];

export function Testimonials() {
  return (
    <section className="py-14 max-w-[1240px] mx-auto px-8">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">Testimonials</p>
          <h2 className="font-serif text-[32px] font-medium">Loved by our customers</h2>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-7">
        {testimonials.map((t) => (
          <div key={t.name} className="bg-white border border-beige p-7">
            <div className="text-gold mb-3.5 tracking-[2px]">★★★★★</div>
            <p className="text-sm text-grayx leading-relaxed mb-4.5">&ldquo;{t.quote}&rdquo;</p>
            <div className="flex items-center gap-3">
              <div className="w-[38px] h-[38px] rounded-full bg-taupe text-white text-[13px] font-bold flex items-center justify-center">
                {t.initials}
              </div>
              <div>
                <div className="text-[13.5px] font-semibold">{t.name}</div>
                <div className="text-xs text-grayx">{t.location}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}