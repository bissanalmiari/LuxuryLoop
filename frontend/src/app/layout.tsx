import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "LuxuryLoop",
  description: "Multi-branch second-hand luxury store platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-ivory text-charcoal antialiased">{children}</body>
    </html>
  );
}
