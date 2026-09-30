"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { encounters as encApi, type EncounterRecord } from "@/lib/api";

export default function EncountersPage() {
  const [items, setItems] = useState<EncounterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    encApi
      .list()
      .then((res) => setItems(res.data))
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Encounters</h1>
          <p className="muted mt-1">{items.length} total</p>
        </div>
        <Link href="/encounters/new" className="btn btn-primary">
          + New Encounter
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
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
                      className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                        e.status === "FINISHED"
                          ? "bg-green-100 text-green-700"
                          : e.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/encounters/${e.id}`}
                      className="text-blue-600 font-medium"
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
