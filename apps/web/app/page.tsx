"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (auth.isAuthenticated()) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="muted">Loading Clinic Two…</p>
    </div>
  );
}
