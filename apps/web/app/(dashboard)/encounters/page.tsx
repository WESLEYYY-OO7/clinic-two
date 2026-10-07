"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, encounters as encApi, type EncounterRecord } from "@/lib/api";

export default function EncountersPage() {
  const [items, setItems] = useState<EncounterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  // Helper: does the current user have a permission?
  const can = (perm: string): boolean => {
    if (permissions.includes("*")) return true;
    if (permissions.includes(perm)) return true;
    const [resource] = perm.split(":");
    return permissions.includes(`${resource}:*`);
  };

  useEffect(() => {
    // Fetch permissions first (needed for button visibility)
    auth
      .me()
      .then((res) => setPermissions(res.data.permissions))
      .catch(() => setPermissions([]));

    // Fetch encounters
    encApi
      .list()
      .then((res) => setItems(res.data))
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const canWrite = can("encounter:write");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Encounters</h1>
          <p className="muted mt-1">{items.length} total</p>
        </div>
        {canWrite && (
          <Link href="/encounters/new" className="btn btn-primary">
            + New Encounter
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <p className="muted p-6">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted p-6">No encounters yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {new Date(e.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{e.type}</td>
                  <td className="px-4 py-3">{e.reason ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        e.status === "FINISHED"
                          ? "badge-green"
                          : e.status === "IN_PROGRESS"
                          ? "badge-blue"
                          : "badge-slate"
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/encounters/${e.id}`}
                      className="font-medium text-accent-600 hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}