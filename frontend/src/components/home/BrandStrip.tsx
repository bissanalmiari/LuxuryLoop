const brands = ["Chanel", "Rolex", "Cartier", "Hermès", "Louis Vuitton", "Gucci"];

export function BrandStrip() {
  return (
    <div className="max-w-[1240px] mx-auto px-8">
      <div className="flex justify-between items-center flex-wrap gap-5 py-9 border-y border-beige">
        {brands.map((brand) => (
          <span key={brand} className="font-serif text-xl text-grayx">{brand}</span>
        ))}
      </div>
    </div>
  );
}