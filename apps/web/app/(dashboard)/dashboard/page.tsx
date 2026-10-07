"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  auth,
  patients,
  encounters,
  invoices,
  claims as claimsApi,
  items as itemsApi,
  stock as stockApi,
  type BillingStats,
  type EncounterStats,
  type ClaimRecord,
  type ItemRecord,
  type StockLevelRecord
} from "@/lib/api";

const COLORS = ["#7C3AED", "#DC2626", "#10B981", "#F59E0B", "#3B82F6"];

export default function DashboardPage() {
  const [role, setRole] = useState("");
  const [mounted, setMounted] = useState(false);

  const [billing, setBilling] = useState<BillingStats | null>(null);
  const [encounterStats, setEncounterStats] = useState<EncounterStats | null>(null);
  const [claimList, setClaimList] = useState<ClaimRecord[]>([]);
  const [lowStock, setLowStock] = useState<StockLevelRecord[]>([]);
  const [counts, setCounts] = useState({ patients: 0, encounters: 0 });

  useEffect(() => {
    setMounted(true);

    auth.me().then((res) => setRole(res.data.user.role)).catch(() => {});

    // Patients + encounters counts
    Promise.all([
      patients.list().then((r) => r.data.length).catch(() => 0),
      encounters.list().then((r) => r.data.length).catch(() => 0)
    ]).then(([p, e]) => setCounts({ patients: p, encounters: e }));

    // Billing stats
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/invoices/stats`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cura_token")}`
        }
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => body && setBilling(body.data))
      .catch(() => {});

    // Encounter stats (diagnoses + monthly)
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/encounters/stats`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cura_token")}`
        }
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => body && setEncounterStats(body.data))
      .catch(() => {});

    // Claims
    claimsApi
      .list()
      .then((r) => setClaimList(r.data))
      .catch(() => setClaimList([]));

    // Low stock
    stockApi
      .levels()
      .then((r) =>
        setLowStock(
          r.data
            .filter((i) => i.total < i.reorderLevel)
            .sort((a, b) => a.total - b.total)
            .slice(0, 5)
        )
      )
      .catch(() => setLowStock([]));
  }, []);

  const canAddPatient = ["CLINIC_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"].includes(role);
  const canAddEncounter = ["CLINIC_ADMIN", "DOCTOR", "NURSE"].includes(role);
  const canAddInvoice = ["CLINIC_ADMIN", "BILLING"].includes(role);

  const formatMonth = (m: string) => {
    const [y, month] = m.split("-");
    const d = new Date(Number(y), Number(month) - 1, 1);
    return d.toLocaleDateString("en-NG", { month: "short" });
  };

  const claimPipeline = ["DRAFT", "SUBMITTED", "APPROVED", "DENIED", "PAID"].map(
    (s) => ({
      status: s,
      count: claimList.filter((c) => c.status === s).length
    })
  ).filter((x) => x.count > 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="muted mt-1">
        {mounted ? `Signed in as ${role || "…"}` : "Loading…"}
      </p>

      {/* ── Top stats ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card border-l-4 border-l-accent-500">
          <p className="muted text-sm">Total Patients</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {counts.patients}
          </p>
        </div>
        <div className="card border-l-4 border-l-brand-500">
          <p className="muted text-sm">Encounters</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {counts.encounters}
          </p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="muted text-sm">Revenue (6mo)</p>
          <p className="mt-2 text-3xl font-semibold text-green-700">
            ₦{(billing?.totals.revenue ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="card border-l-4 border-l-amber-500">
          <p className="muted text-sm">Outstanding</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">
            ₦{(billing?.totals.outstanding ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Charts row 1 ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Revenue — Last 6 Months
          </h2>
          {billing ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={billing.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    stroke="#6B7280"
                    fontSize={12}
                  />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    formatter={(v: number) => `₦${v.toLocaleString()}`}
                    labelFormatter={(l) => formatMonth(String(l))}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#DC2626"
                    strokeWidth={2}
                    dot={{ fill: "#DC2626" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted mt-4">Loading…</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Patient Volume — Last 6 Months
          </h2>
          {encounterStats ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={encounterStats.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    stroke="#6B7280"
                    fontSize={12}
                  />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    labelFormatter={(l) => formatMonth(String(l))}
                  />
                  <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted mt-4">Loading…</p>
          )}
        </div>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Top Diagnoses
          </h2>
          {encounterStats && encounterStats.topDiagnoses.length > 0 ? (
            <div className="mt-4 space-y-2">
              {encounterStats.topDiagnoses.slice(0, 5).map((d) => (
                <div
                  key={d.code}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="font-mono text-xs text-slate-500">{d.code}</p>
                    <p className="text-sm font-medium text-slate-900">
                      {d.display}
                    </p>
                  </div>
                  <span className="badge badge-purple">{d.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted mt-4">No diagnoses recorded yet.</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Claims Pipeline
          </h2>
          {claimPipeline.length > 0 ? (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={claimPipeline}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {claimPipeline.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted mt-4">No claims yet.</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Low Stock Alerts
          </h2>
          {lowStock.length > 0 ? (
            <div className="mt-4 space-y-2">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border-l-4 border-l-amber-500 bg-amber-50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="muted text-xs">
                      {item.total} / {item.reorderLevel} min
                    </p>
                  </div>
                  <span className="badge badge-amber">Low</span>
                </div>
              ))}
              <Link
                href="/inventory"
                className="mt-2 block text-center text-sm font-medium text-accent-600 hover:underline"
              >
                View inventory →
              </Link>
            </div>
          ) : (
            <p className="muted mt-4">All stock at healthy levels.</p>
          )}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="mt-6 card">
        <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {canAddPatient && (
            <Link href="/patients/new" className="btn btn-primary">
              + New Patient
            </Link>
          )}
          <Link href="/patients" className="btn btn-secondary">
            View Patients
          </Link>
          {canAddEncounter && (
            <Link href="/encounters/new" className="btn btn-secondary">
              New Encounter
            </Link>
          )}
          {canAddInvoice && (
            <Link href="/billing/new" className="btn btn-secondary">
              New Invoice
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}