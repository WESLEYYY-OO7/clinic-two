"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { invoices, type InvoiceRecord } from "@/lib/api";

export default function BillingPage() {
  const [items, setItems] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");

  useEffect(() => {
    invoices
      .list()
      .then((res) => setItems(res.data))
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) => {
    if (filter === "all") return true;
    if (filter === "unpaid") return Number(i.balance) > 0.01;
    if (filter === "paid") return Number(i.balance) <= 0.01;
    return true;
  });

  const stats = {
    total: items.length,
    outstanding: items
      .filter((i) => Number(i.balance) > 0.01)
      .reduce((s, i) => s + Number(i.balance), 0),
    collected: items.reduce(
      (s, i) => s + Number(i.total) - Number(i.balance),
      0
    )
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
          <p className="muted mt-1">{items.length} invoices</p>
        </div>
        <Link href="/billing/new" className="btn btn-primary">
          + New Invoice
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card border-l-4 border-l-accent-500">
          <p className="muted text-sm">Total Invoices</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="card border-l-4 border-l-brand-500">
          <p className="muted text-sm">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">
            ₦{stats.outstanding.toLocaleString()}
          </p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="muted text-sm">Collected</p>
          <p className="mt-2 text-2xl font-semibold text-green-700">
            ₦{stats.collected.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(["all", "unpaid", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-accent-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:border-accent-300"
            }`}
          >
            {f === "all" ? "All" : f === "unpaid" ? "Unpaid" : "Paid"}
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
          <p className="muted p-6">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{i.number}</td>
                  <td className="px-4 py-3">
                    {i.patient
                      ? `${i.patient.firstName} ${i.patient.lastName}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    ₦{Number(i.total).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {Number(i.balance) > 0.01 ? (
                      <span className="font-medium text-brand-700">
                        ₦{Number(i.balance).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-green-700">Paid</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        i.status === "PAID"
                          ? "badge-green"
                          : i.status === "PARTIALLY_PAID"
                          ? "badge-amber"
                          : i.status === "VOID"
                          ? "badge-slate"
                          : "badge-blue"
                      }`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/billing/${i.id}`}
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
