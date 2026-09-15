"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <p className="text-gold text-xs font-semibold tracking-widest text-center mb-3">WELCOME BACK</p>
      <h1 className="font-serif text-3xl font-medium text-center mb-9">Log in to LuxuryLoop</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div>
          <PasswordInput
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end mt-2">
            <Link href="/forgot-password" className="text-xs text-grayx hover:text-gold transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>
        {error && <p className="text-red text-xs">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <p className="text-center text-[13.5px] text-grayx mt-6">
        New to LuxuryLoop?{" "}
        <Link href="/register" className="text-gold font-semibold">Create an account</Link>
      </p>
    </>
  );
}