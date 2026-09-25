"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";

export default function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!agree) {
      setError("Please accept the Terms & Privacy Policy");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const site = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: "customer" },
        emailRedirectTo: `${site}/api/auth/callback?redirectTo=/login`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <p className="text-gold text-[12.5px] font-semibold tracking-widest text-center mb-3">Join LuxuryLoop</p>
      <h1 className="font-serif text-[30px] font-medium text-center mb-9">Create your account</h1>
      <form onSubmit={handleSubmit}>
        <Field label="Full name">
          <Input
            placeholder="Lea Haddad"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Field>
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
        <label className="flex items-center gap-2 text-[12.5px] mb-6 cursor-pointer">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="accent-gold" />
          I agree to the Terms &amp; Privacy Policy
        </label>
        {error && <p className="text-red text-xs mb-4">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="text-center text-[13.5px] text-grayx mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-gold font-semibold">Log in</Link>
      </p>
    </>
  );
}