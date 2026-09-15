import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-charcoal text-[#B9B5AC] py-14">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid grid-cols-4 gap-10 pb-9 border-b border-[#333]">
          <div>
            <div className="font-serif text-xl text-white mb-3">
              Luxury<span className="italic text-gold">Loop</span>
            </div>
            <p className="text-[13.5px] leading-relaxed max-w-[260px]">
              A centralized home for pre-loved luxury — verified, priced fairly, ready for their next story.
            </p>
          </div>
          <FooterCol title="Shop" items={["Watches", "Handbags", "Jewelry", "Shoes"]} />
          <FooterCol title="Company" items={["About us", "Branches", "Consign an item", "Careers"]} />
          <FooterCol title="Support" items={["Contact", "Shipping", "Returns", "FAQ"]} />
        </div>
        <div className="pt-6 flex justify-between text-xs text-[#8A867E]">
          <span>© 2026 LuxuryLoop. All rights reserved.</span>
          <span>Beirut · Jounieh · Tripoli</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-white text-[13px] font-semibold mb-4">{title}</h4>
      <ul className="flex flex-col gap-2.5">
        {items.map((i) => (
          <li key={i}>
            <Link href="#" className="text-[13.5px] hover:text-white transition-colors">{i}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
