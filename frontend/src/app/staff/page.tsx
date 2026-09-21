"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { requireRole } from "@/lib/auth";

export default function StaffHome() {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let mounted = true;
    requireRole("staff", "admin").then((allowed) => {
      if (!mounted) return;
      if (allowed) setOk(true);
      else router.replace("/login");
    });
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    if (ok) router.replace("/staff/inventory");
  }, [ok, router]);

  return null;
}