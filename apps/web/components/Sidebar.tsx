"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/patients", label: "Patients" },
  { href: "/appointments", label: "Appointments" },
  { href: "/encounters", label: "Encounters" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = auth.getUser();

  const handleLogout = () => {
    auth.logout();
    router.push("/login");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      <div className="border-b p-6">
        <h1 className="text-lg font-semibold">Clinic Two</h1>
        <p className="muted mt-1 text-xs">{user?.email ?? "Signed out"}</p>
        <p className="muted text-xs">{user?.role ?? ""}</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm ${
                active
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={handleLogout}
          className="btn btn-secondary w-full justify-center text-sm"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}