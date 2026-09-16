"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function Newsletter() {
  const [email, setEmail] = useState("");

  return (
    <div className="bg-beige py-14 text-center">
      <div className="max-w-[1240px] mx-auto px-8">
        <h3 className="font-serif text-2xl mb-2.5">Stay in the loop</h3>
        <p className="text-sm text-grayx mb-6">New arrivals and exclusive drops, straight to your inbox.</p>
        <form
          className="flex max-w-[420px] mx-auto gap-2.5"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 border border-taupe text-sm bg-white outline-none focus:border-gold"
            required
          />
          <Button type="submit">Subscribe</Button>
        </form>
      </div>
    </div>
  );
}