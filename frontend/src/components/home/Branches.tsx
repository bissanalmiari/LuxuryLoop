const branches = [
  { name: "Beirut — Downtown", address: "Rue Gouraud, Gemmayzeh", phone: "+961 1 456 789", imageClass: "bg-taupe" },
  { name: "Jounieh — Kaslik", address: "Kaslik Highway", phone: "+961 9 234 567", imageClass: "bg-grayx" },
  { name: "Tripoli — Azmi St.", address: "Azmi Street", phone: "+961 6 345 678", imageClass: "bg-gold" },
];

export function Branches() {
  return (
    <section className="py-14 max-w-[1240px] mx-auto px-8" id="about">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-gold text-[13px] font-semibold tracking-[.14em] mb-3.5">Visit Us</p>
          <h2 className="font-serif text-[32px] font-medium">Our branches</h2>
        </div>
        <p className="text-[14.5px] text-grayx max-w-[380px]">Three locations across Lebanon, one collection.</p>
      </div>
      <div className="grid grid-cols-3 gap-7">
        {branches.map((b) => (
          <div key={b.name} className="card overflow-hidden">
            <div className={`h-[140px] ${b.imageClass}`} />
            <div className="p-5">
              <h4 className="text-[15px] font-semibold mb-1.5">{b.name}</h4>
              <p className="text-[13px] text-grayx mb-1">{b.address}</p>
              <p className="text-[13px] text-grayx">{b.phone}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}