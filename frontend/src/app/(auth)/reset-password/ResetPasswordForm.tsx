"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const linkError = searchParams.get("error");
    if (linkError) setError(decodeURIComponent(linkError));
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

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
      <p className="text-gold text-xs font-semibold tracking-widest text-center mb-3">NEW PASSWORD</p>
      <h1 className="font-serif text-3xl font-medium text-center mb-9">Set a new password</h1>
      <form onSubmit={handleSubmit}>
        <Field label="New password">
          <PasswordInput
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </Field>
        <Field label="Confirm new password">
          <PasswordInput
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </Field>
        {error && <p className="text-red text-xs mb-4">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </>
  );
}