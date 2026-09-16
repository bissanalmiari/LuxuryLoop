import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="flex justify-center px-8 py-24 min-h-screen">
        <div className="w-[420px]">{children}</div>
      </div>
      <Footer />
    </>
  );
}