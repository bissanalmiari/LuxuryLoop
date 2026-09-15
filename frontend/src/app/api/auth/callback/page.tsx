"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const { search, hash } = window.location;

    const searchParams = new URLSearchParams(search);
    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirectTo") ?? "/";
    const errorDescription = searchParams.get("error_description") ?? hashParams.get("error_description");

    async function handle() {
      if (errorDescription) {
        const target = redirectTo === "/reset-password"
          ? `${redirectTo}?error=${encodeURIComponent(errorDescription)}`
          : redirectTo;
        router.replace(target);
        return;
      }
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
      window.history.replaceState(null, "", window.location.pathname + search);
      router.replace(redirectTo);
      router.refresh();
    }

    handle();
  }, [router]);

  return null;
}