"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState("ivie-specialist");
  const [email, setEmail] = useState("adaeze@ivie-specialist.ng");
  const [password, setPassword] = useState("Lagos2026!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.login(tenantSlug, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 text-3xl font-bold text-white shadow-lg">
            C
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            CURA
          </h1>
          <p className="mt-1 text-[11px] font-medium tracking-[0.3em] text-brand-600">
            HEALTH
          </p>
          <p className="muted mt-4 text-sm">The clinical record, cured.</p>
        </div>

        {/* Form */}
        <div className="card shadow-xl">
          <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
          <p className="muted mt-1 text-sm">
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Clinic</label>
              <input
                className="input"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="muted mt-6 text-center text-xs">
          Demo credentials pre-filled for first-run convenience
        </p>
      </div>
    </div>
  );
}
