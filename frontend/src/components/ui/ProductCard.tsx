import Link from "next/link";
import { MapPin, Heart } from "lucide-react";

interface ProductCardProps {
  brand: string;
  title: string;
  price: string;
  location: string;
  href: string;
  image?: string | null;
  imageClass?: string;
}

export function ProductCard({ brand, title, price, location, href, image, imageClass = "bg-taupe" }: ProductCardProps) {
  return (
    <div className="card">
      <Link href={href} className="block relative aspect-square bg-[#F1EEE7] flex items-center justify-center overflow-hidden">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-3/5 h-3/5 ${imageClass}`} />
        )}
        <button
          aria-label="Add to wishlist"
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center"
        >
          <Heart size={15} />
        </button>
      </Link>
      <div className="p-[18px]">
        <div className="text-[12.5px] text-grayx mb-0.5">{brand}</div>
        <div className="text-[15px] font-semibold mb-2.5">{title}</div>
        <div className="font-serif text-[19px] mb-3.5">{price}</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[12.5px] text-grayx">
            <MapPin size={12} />
            {location}
          </div>
          <Link
            href={href}
            className="text-[12.5px] font-semibold bg-gold text-charcoal px-4 py-2.5"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
}
