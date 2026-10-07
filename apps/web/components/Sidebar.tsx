"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/api";

const NAV = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard" },
  { key: "patients", href: "/patients", label: "Patients" },
  { key: "appointments", href: "/appointments", label: "Appointments" },
  { key: "encounters", href: "/encounters", label: "Encounters" },
  { key: "claims", href: "/claims", label: "HMO Claims" },
  { key: "inventory", href: "/inventory", label: "Inventory" },
  { key: "billing", href: "/billing", label: "Billing" },
  { key: "settings", href: "/settings", label: "Settings" }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [menu, setMenu] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Read cached user immediately so there's no flash
    const cached = auth.getUser();
    if (cached) {
      setUser({ email: cached.email, role: cached.role });
    }

    // Then fetch fresh data from /me
    auth
      .me()
      .then((res) => {
        setUser({
          email: res.data.user.email,
          role: res.data.user.role
        });
        setMenu(res.data.menu);
      })
      .catch(() => {
        // If /me fails, log out
        auth.logout();
        router.push("/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    auth.logout();
    router.push("/login");
  };

  // Filter menu based on what /me returned
  const visibleNav =
    menu.length > 0
      ? NAV.filter((item) => menu.includes(item.key))
      : NAV; // fallback: show all until /me loads

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Brand */}
      <div className="border-b p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 text-lg font-bold text-white shadow-sm">
            C
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900">
              CURA
            </h1>
            <p className="text-[10px] font-medium leading-tight tracking-[0.2em] text-brand-600">
              HEALTH
            </p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="border-b bg-slate-50 px-6 py-4">
        {mounted && user ? (
          <>
            <p className="text-sm font-medium text-slate-800 truncate">
              {user.email}
            </p>
            <p className="text-xs text-accent-600 font-medium mt-0.5">
              {user.role}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-400">—</p>
            <p className="text-xs text-slate-400 mt-0.5">Loading…</p>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {visibleNav.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand-50 font-semibold text-brand-700"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t p-3">
        <button
          onClick={handleLogout}
          className="w-full rounded-lg border border-accent-200 bg-white px-3 py-2 text-sm font-medium text-accent-700 transition-colors hover:bg-accent-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}