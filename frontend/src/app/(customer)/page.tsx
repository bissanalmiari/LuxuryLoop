import LogoutButton from "@/components/ui/LogoutButton";
import { Hero } from "@/components/home/Hero";
import { ValueStrip } from "@/components/home/ValueStrip";
import { NewArrivals } from "@/components/home/NewArrivals";
import { AiSection } from "@/components/home/AiSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Categories } from "@/components/home/Categories";
import { Testimonials } from "@/components/home/Testimonials";
import { BrandStrip } from "@/components/home/BrandStrip";
import { Branches } from "@/components/home/Branches";
import { Faq } from "@/components/home/Faq";
import { Newsletter } from "@/components/home/Newsletter";
import { QuoteSection } from "@/components/home/QuoteSection";

export default function HomePage() {
  return (
    <>
      <div className="max-w-[1240px] mx-auto px-8 flex justify-end pt-4">
        <LogoutButton />
      </div>
      <Hero />
      <ValueStrip />
      <NewArrivals />
      <AiSection />
      <HowItWorks />
      <Categories />
      <Testimonials />
      <BrandStrip />
      <Branches />
      <Faq />
      <Newsletter />
      <QuoteSection />
    </>
  );
}