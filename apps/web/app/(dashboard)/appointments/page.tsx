"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  appointments as apptApi,
  type AppointmentRecord
} from "@/lib/api";

type Filter = "upcoming" | "today" | "all" | "past";

export default function AppointmentsPage() {
  const [items, setItems] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("upcoming");

  useEffect(() => {
    apptApi
      .list()
      .then((res) => setItems(res.data))
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    return items.filter((a) => {
      const starts = new Date(a.startsAt);
      if (filter === "today") return starts >= startOfToday && starts < endOfToday;
      if (filter === "upcoming") return starts >= now;
      if (filter === "past") return starts < now;
      return true;
    });
  }, [items, filter]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "badge-blue";
      case "CONFIRMED":
        return "badge-purple";
      case "ARRIVED":
        return "badge-amber";
      case "COMPLETED":
        return "badge-green";
      case "NO_SHOW":
        return "badge-red";
      case "CANCELLED":
        return "badge-slate";
      default:
        return "badge-slate";
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Appointments
          </h1>
          <p className="muted mt-1">{filtered.length} shown of {items.length}</p>
        </div>
        <Link href="/appointments/new" className="btn btn-primary">
          + New Appointment
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {(["upcoming", "today", "all", "past"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-accent-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:border-accent-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <p className="muted p-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="muted p-6">No appointments.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {new Date(a.startsAt).toLocaleDateString("en-NG", {
                        weekday: "short",
                        day: "numeric",
                        month: "short"
                      })}
                    </p>
                    <p className="muted text-xs">
                      {new Date(a.startsAt).toLocaleTimeString("en-NG", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {a.patient ? (
                      <div>
                        <p className="font-medium text-slate-900">
                          {a.patient.firstName} {a.patient.lastName}
                        </p>
                        <p className="muted font-mono text-xs">
                          {a.patient.mrn}
                        </p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.reason ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/appointments/${a.id}`}
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