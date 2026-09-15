"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";

export default function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: "customer" } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/login");
  }

  return (
    <>
      <p className="text-gold text-xs font-semibold tracking-widest text-center mb-3">JOIN LUXURYLOOP</p>
      <h1 className="font-serif text-3xl font-medium text-center mb-9">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordInput placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red text-xs">{error}</p>}
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