import { ShieldCheck, Store, Lock, Headset } from "lucide-react";

const items = [
  { icon: ShieldCheck, title: "Verified products", sub: "Quality you can trust" },
  { icon: Store, title: "Multiple branches", sub: "Shop near you" },
  { icon: Lock, title: "Secure shopping", sub: "Safe & easy payments" },
  { icon: Headset, title: "Expert support", sub: "We're here to help" },
];

export function ValueStrip() {
  return (
    <div className="border-b border-beige bg-white">
      <div className="max-w-[1240px] mx-auto grid grid-cols-4">
        {items.map(({ icon: Icon, title, sub }, i) => (
          <div
            key={title}
            className={`flex items-center gap-3.5 py-6 px-8 ${i > 0 ? "border-l border-beige" : ""}`}
          >
            <Icon size={24} className="text-gold shrink-0" />
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-[12.5px] text-grayx mt-0.5">{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}