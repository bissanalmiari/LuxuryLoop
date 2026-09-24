"use client";

import { createClient } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";

export type Role = "customer" | "staff" | "admin";

export async function getRole(): Promise<Role | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return null;

  let role: Role | null =
    (user.app_metadata?.role as Role) ??
    (user.user_metadata?.role as Role) ??
    null;

  try {
    const me = await authedFetch("/auth/me");
    if (me?.role && ["customer", "staff", "admin"].includes(me.role)) {
      role = me.role as Role;
    }
  } catch {
    // fall back to JWT metadata role
  }
  return role;
}

/** Client-side role gate. Returns true when the session resolves to one of `allowed`. */
export async function requireRole(...allowed: Role[]) {
  const role = await getRole();
  return !!role && allowed.includes(role);
}

export const requireStaff = (): Promise<boolean> => requireRole("staff", "admin");
export const requireAdmin = (): Promise<boolean> => requireRole("admin");
