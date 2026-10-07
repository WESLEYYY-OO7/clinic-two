"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { claims as claimsApi, type ClaimRecord } from "@/lib/api";

export default function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    claimsApi
      .list()
      .then((res) => setClaims(res.data))
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return claims;
    return claims.filter((c) => c.status === filter);
  }, [claims, filter]);

  const stats = useMemo(() => {
    const total = claims.length;
    const submitted = claims.filter(
      (c) => c.status === "SUBMITTED" || c.status === "UNDER_REVIEW"
    ).length;
    const approvedAmount = claims
      .filter((c) => c.status === "APPROVED" || c.status === "PAID")
      .reduce((s, c) => s + Number(c.approvedAmount ?? 0), 0);
    const pendingAmount = claims
      .filter((c) => c.status === "SUBMITTED" || c.status === "UNDER_REVIEW")
      .reduce((s, c) => s + Number(c.amount), 0);
    return { total, submitted, approvedAmount, pendingAmount };
  }, [claims]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "DRAFT": return "badge-slate";
      case "SUBMITTED": return "badge-blue";
      case "UNDER_REVIEW": return "badge-amber";
      case "APPROVED": return "badge-green";
      case "PARTIALLY_APPROVED": return "badge-amber";
      case "DENIED": return "badge-red";
      case "PAID": return "badge-green";
      default: return "badge-slate";
    }
  };

  const statuses = ["ALL", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "DENIED", "PAID"];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">HMO Claims</h1>
          <p className="muted mt-1">
            {filtered.length} shown of {claims.length}
          </p>
        </div>
        <Link href="/claims/new" className="btn btn-primary">
          + New Claim
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="card border-l-4 border-l-accent-500">
          <p className="muted text-sm">Total Claims</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="card border-l-4 border-l-blue-500">
          <p className="muted text-sm">In Progress</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">
            {stats.submitted}
          </p>
        </div>
        <div className="card border-l-4 border-l-amber-500">
          <p className="muted text-sm">Pending ₦</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">
            ₦{stats.pendingAmount.toLocaleString()}
          </p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="muted text-sm">Approved ₦</p>
          <p className="mt-2 text-2xl font-semibold text-green-700">
            ₦{stats.approvedAmount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-accent-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:border-accent-300"
            }`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")}
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
          <p className="muted p-6">No claims.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Claim #</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">HMO</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.claimNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.patient ? (
                      <div>
                        <p className="font-medium text-slate-900">
                          {c.patient.firstName} {c.patient.lastName}
                        </p>
                        <p className="muted text-xs">{c.patient.mrn}</p>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.hmo}</td>
                  <td className="px-4 py-3 text-right">
                    ₦{Number(c.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusBadge(c.status)}`}>
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/claims/${c.id}`}
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