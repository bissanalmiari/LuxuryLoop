"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { Field } from "@/components/ui/Field";
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    let role = data.user?.app_metadata?.role ?? data.user?.user_metadata?.role;
    try {
      const me = await authedFetch("/auth/me");
      if (me?.role) role = me.role;
    } catch {
      // fall back to JWT metadata role
    }
    router.push(role === "admin" ? "/admin" : "/");
    router.refresh();
  }

  return (
    <>
      <p className="text-gold text-[12.5px] font-semibold tracking-widest text-center mb-3">Welcome back</p>
      <h1 className="font-serif text-[30px] font-medium text-center mb-9">Log in to LuxuryLoop</h1>
      <form onSubmit={handleSubmit}>
        <Field label="Email">
          <Input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <div className="flex justify-between items-center text-[13px] mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-gold" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-gold">
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-red text-xs mb-4">{error}</p>}
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