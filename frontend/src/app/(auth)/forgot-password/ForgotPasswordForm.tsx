"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const site = window.location.origin;
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/api/auth/callback?redirectTo=/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <p className="text-gold text-xs font-semibold tracking-widest text-center mb-3">CHECK YOUR INBOX</p>
        <h1 className="font-serif text-3xl font-medium text-center mb-6">Reset link sent</h1>
        <p className="text-grayx text-sm text-center mb-8">
          If an account exists for <span className="text-charcoal font-semibold">{email}</span>, you&apos;ll receive an
          email with a link to set a new password.
        </p>
        <Link href="/login" className="block text-center text-gold text-sm font-semibold">
          Back to login
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="text-gold text-xs font-semibold tracking-widest text-center mb-3">RESET PASSWORD</p>
      <h1 className="font-serif text-3xl font-medium text-center mb-3">Forgot your password?</h1>
      <p className="text-grayx text-sm text-center mb-8">Enter your email and we&apos;ll send you a reset link.</p>
      <form onSubmit={handleSubmit}>
        <Field label="Email">
          <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {error && <p className="text-red text-xs mb-4">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      <p className="text-center text-[13.5px] text-grayx mt-6">
        Remembered it?{" "}
        <Link href="/login" className="text-gold font-semibold">Log in</Link>
      </p>
    </>
  );
}