"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  auth,
  patients,
  encounters,
  invoices,
  claims as claimsApi,
  stock as stockApi,
  workflow,
  type AppointmentWithVisit,
  type VisitQueue,
  type BillingStats,
  type ClaimRecord,
  type StockLevelRecord
} from "@/lib/api";

type Role =
  | "SUPER_ADMIN"
  | "CLINIC_ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "PHARMACIST"
  | "LAB_TECH"
  | "RECEPTIONIST"
  | "BILLING"
  | "HR"
  | "";

interface VisitItem {
  id: string;
  patientName: string;
  mrn: string;
  reason: string | null;
  startsAt: string;
  visitStatus: string;
  phone: string | null;
  allergies?: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("");
  const [mounted, setMounted] = useState(false);

  const [queue, setQueue] = useState<VisitQueue | null>(null);
  const [stats, setStats] = useState({
    patients: 0,
    encounters: 0,
    revenue: 0,
    outstanding: 0
  });
  const [lowStock, setLowStock] = useState<StockLevelRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);

  useEffect(() => {
    setMounted(true);

    auth
      .me()
      .then((res) => setRole(res.data.user.role as Role))
      .catch(() => {});

    // Queue is universal — filtered by what each role cares about
    workflow
      .queue()
      .then((res) => setQueue(res.data))
      .catch(() => setQueue(null));

    // Fetch some counts (fail silently for roles that can't read them)
    Promise.all([
      patients.list().then((r) => r.data.length).catch(() => 0),
      encounters.list().then((r) => r.data.length).catch(() => 0)
    ]).then(([p, e]) =>
      setStats((s) => ({ ...s, patients: p, encounters: e }))
    );

    // Billing stats (admin, billing only)
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/invoices/stats`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("cura_token")}` }
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b?.data) {
          setStats((s) => ({
            ...s,
            revenue: b.data.totals.revenue,
            outstanding: b.data.totals.outstanding
          }));
        }
      })
      .catch(() => {});

    // Low stock (pharmacist, admin)
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

    // Claims (admin, billing)
    claimsApi
      .list()
      .then((r) => setClaims(r.data))
      .catch(() => setClaims([]));
  }, []);

  if (!mounted) {
    return <p className="muted">Loading…</p>;
  }

  // Helper to convert a queue appointment to display
  const toItem = (a: AppointmentWithVisit): VisitItem => ({
    id: a.id,
    patientName: a.patient
      ? `${a.patient.firstName} ${a.patient.lastName}`
      : "Unknown",
    mrn: a.patient?.mrn ?? "—",
    reason: a.reason,
    startsAt: a.startsAt,
    visitStatus: a.visitStatus,
    phone: a.patient?.phone ?? null,
    allergies: (a.patient as any)?.allergies
  });

  // ── Role-specific home screens ──

  if (role === "RECEPTIONIST") {
    return (
      <ReceptionistHome
        queue={queue}
        router={router}
        stats={stats}
      />
    );
  }

  if (role === "NURSE") {
    return (
      <NurseHome queue={queue} router={router} stats={stats} />
    );
  }

  if (role === "DOCTOR") {
    return (
      <DoctorHome queue={queue} router={router} stats={stats} />
    );
  }

  if (role === "PHARMACIST") {
    return (
      <PharmacistHome
        queue={queue}
        router={router}
        lowStock={lowStock}
      />
    );
  }

  if (role === "LAB_TECH") {
    return <LabTechHome queue={queue} router={router} />;
  }

  if (role === "BILLING") {
    return (
      <BillingHome
        queue={queue}
        router={router}
        stats={stats}
        claims={claims}
      />
    );
  }

  // Default: admin or unknown → Live Operations
  return (
    <AdminHome
      queue={queue}
      router={router}
      stats={stats}
      lowStock={lowStock}
      claims={claims}
    />
  );
}

// ═══════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  accent = "accent"
}: {
  label: string;
  value: number | string;
  accent?: "brand" | "accent" | "green" | "amber";
}) {
  const borderClass = {
    brand: "border-l-brand-500",
    accent: "border-l-accent-500",
    green: "border-l-green-500",
    amber: "border-l-amber-500"
  }[accent];

  const textClass = {
    brand: "text-brand-700",
    accent: "text-slate-900",
    green: "text-green-700",
    amber: "text-amber-700"
  }[accent];

  return (
    <div className={`card border-l-4 ${borderClass}`}>
      <p className="muted text-sm">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${textClass}`}>{value}</p>
    </div>
  );
}

function QueueSection({
  title,
  items,
  action,
  emptyMessage = "Nothing right now."
}: {
  title: string;
  items: VisitItem[];
  action: (item: VisitItem) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-900">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="muted mt-4 text-sm">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2"
            >
              <div>
                <p className="font-medium text-slate-900">{item.patientName}</p>
                <p className="muted font-mono text-xs">{item.mrn}</p>
                {item.reason && (
                  <p className="muted text-xs">Reason: {item.reason}</p>
                )}
              </div>
              <button
                className="btn btn-primary text-sm"
                onClick={() => action(item)}
              >
                Continue →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RECEPTIONIST HOME
// ═══════════════════════════════════════════════════════

function ReceptionistHome({
  queue,
  router,
  stats
}: {
  queue: VisitQueue | null;
  router: any;
  stats: any;
}) {
  const toItem = (a: AppointmentWithVisit): VisitItem => ({
    id: a.id,
    patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Unknown",
    mrn: a.patient?.mrn ?? "—",
    reason: a.reason,
    startsAt: a.startsAt,
    visitStatus: a.visitStatus,
    phone: a.patient?.phone ?? null
  });

  const scheduled = (queue?.SCHEDULED ?? []).map(toItem);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Front Desk</h1>
      <p className="muted mt-1">Today's arrivals and check-ins</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Today's Appointments" value={scheduled.length} accent="accent" />
        <StatCard label="Waiting to Check In" value={scheduled.length} accent="brand" />
        <StatCard label="Total Patients" value={stats.patients} accent="green" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QueueSection
          title="Check In"
          items={scheduled}
          action={(item) => router.push(`/appointments/${item.id}`)}
          emptyMessage="No patients waiting to check in."
        />

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <Link href="/patients/new" className="btn btn-primary w-full justify-center">
              + Register New Patient
            </Link>
            <Link href="/appointments/new" className="btn btn-secondary w-full justify-center">
              + Book Appointment
            </Link>
            <Link href="/appointments" className="btn btn-secondary w-full justify-center">
              View All Appointments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NURSE HOME
// ═══════════════════════════════════════════════════════

function NurseHome({
  queue,
  router,
  stats
}: {
  queue: VisitQueue | null;
  router: any;
  stats: any;
}) {
  const toItem = (a: AppointmentWithVisit): VisitItem => ({
    id: a.id,
    patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Unknown",
    mrn: a.patient?.mrn ?? "—",
    reason: a.reason,
    startsAt: a.startsAt,
    visitStatus: a.visitStatus,
    phone: a.patient?.phone ?? null,
    allergies: (a.patient as any)?.allergies
  });

  const waiting = (queue?.CHECKED_IN ?? []).map(toItem);
  const vitalsDone = (queue?.VITALS_DONE ?? []).map(toItem);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Vitals Queue</h1>
      <p className="muted mt-1">Patients waiting for vitals</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Waiting for Vitals" value={waiting.length} accent="brand" />
        <StatCard label="Ready for Doctor" value={vitalsDone.length} accent="green" />
        <StatCard label="Total Patients Today" value={stats.patients} accent="accent" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QueueSection
          title="Waiting for Vitals"
          items={waiting}
          action={(item) => router.push(`/appointments/${item.id}`)}
          emptyMessage="No patients waiting for vitals."
        />

        <QueueSection
          title="Ready for Doctor"
          items={vitalsDone}
          action={(item) => router.push(`/appointments/${item.id}`)}
          emptyMessage="No patients waiting to see the doctor."
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DOCTOR HOME
// ═══════════════════════════════════════════════════════

function DoctorHome({
  queue,
  router,
  stats
}: {
  queue: VisitQueue | null;
  router: any;
  stats: any;
}) {
  const toItem = (a: AppointmentWithVisit): VisitItem => ({
    id: a.id,
    patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Unknown",
    mrn: a.patient?.mrn ?? "—",
    reason: a.reason,
    startsAt: a.startsAt,
    visitStatus: a.visitStatus,
    phone: a.patient?.phone ?? null,
    allergies: (a.patient as any)?.allergies
  });

  const ready = (queue?.VITALS_DONE ?? []).map(toItem);
  const inProgress = (queue?.IN_CONSULTATION ?? []).map(toItem);
  const rxWritten = (queue?.RX_WRITTEN ?? []).map(toItem);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">My Queue</h1>
      <p className="muted mt-1">Patients ready to be seen</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Ready to See" value={ready.length} accent="brand" />
        <StatCard label="In Consultation" value={inProgress.length} accent="amber" />
        <StatCard label="Awaiting Pharmacy" value={rxWritten.length} accent="green" />
      </div>

      <div className="mt-6 space-y-4">
        <QueueSection
          title="Ready to See (Vitals Done)"
          items={ready}
          action={(item) => router.push(`/appointments/${item.id}`)}
          emptyMessage="No patients waiting to be seen."
        />

        <QueueSection
          title="In Consultation"
          items={inProgress}
          action={(item) => router.push(`/appointments/${item.id}`)}
          emptyMessage="No consultations in progress."
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PHARMACIST HOME
// ═══════════════════════════════════════════════════════

function PharmacistHome({
  queue,
  router,
  lowStock
}: {
  queue: VisitQueue | null;
  router: any;
  lowStock: StockLevelRecord[];
}) {
  const toItem = (a: AppointmentWithVisit): VisitItem => ({
    id: a.id,
    patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Unknown",
    mrn: a.patient?.mrn ?? "—",
    reason: a.reason,
    startsAt: a.startsAt,
    visitStatus: a.visitStatus,
    phone: a.patient?.phone ?? null
  });

  const toFill = (queue?.RX_WRITTEN ?? []).map(toItem);
  const dispensed = (queue?.DISPENSED ?? []).map(toItem);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Pharmacy</h1>
      <p className="muted mt-1">Prescriptions to dispense</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="To Fill" value={toFill.length} accent="brand" />
        <StatCard label="Dispensed Today" value={dispensed.length} accent="green" />
        <StatCard label="Low Stock Items" value={lowStock.length} accent="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QueueSection
          title="Prescriptions to Fill"
          items={toFill}
          action={(item) => router.push(`/appointments/${item.id}`)}
          emptyMessage="No prescriptions waiting."
        />

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Low Stock ({lowStock.length})
          </h2>
          {lowStock.length === 0 ? (
            <p className="muted mt-4 text-sm">All stock at healthy levels.</p>
          ) : (
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
                  <Link
                    href="/inventory"
                    className="text-xs text-accent-600 hover:underline"
                  >
                    Restock →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LAB TECH HOME
// ═══════════════════════════════════════════════════════

function LabTechHome({
  queue,
  router
}: {
  queue: VisitQueue | null;
  router: any;
}) {
  const toItem = (a: AppointmentWithVisit): VisitItem => ({
    id: a.id,
    patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Unknown",
    mrn: a.patient?.mrn ?? "—",
    reason: a.reason,
    startsAt: a.startsAt,
    visitStatus: a.visitStatus,
    phone: a.patient?.phone ?? null
  });

  const inConsultation = (queue?.IN_CONSULTATION ?? []).map(toItem);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Laboratory</h1>
      <p className="muted mt-1">Tests to run</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Active Encounters" value={inConsultation.length} accent="brand" />
        <Link href="/lab" className="card border-l-4 border-l-accent-500">
          <p className="muted text-sm">Lab Orders</p>
          <p className="mt-2 text-2xl font-semibold text-accent-700">
            View All →
          </p>
        </Link>
      </div>

      <div className="mt-6">
        <QueueSection
          title="Encounters Needing Lab Work"
          items={inConsultation}
          action={(item) => router.push(`/appointments/${item.id}`)}
          emptyMessage="No active encounters."
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// BILLING HOME
// ═══════════════════════════════════════════════════════

function BillingHome({
  queue,
  router,
  stats,
  claims
}: {
  queue: VisitQueue | null;
  router: any;
  stats: any;
  claims: ClaimRecord[];
}) {
  const toItem = (a: AppointmentWithVisit): VisitItem => ({
    id: a.id,
    patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Unknown",
    mrn: a.patient?.mrn ?? "—",
    reason: a.reason,
    startsAt: a.startsAt,
    visitStatus: a.visitStatus,
    phone: a.patient?.phone ?? null
  });

  const toBill = (queue?.DISPENSED ?? []).map(toItem);
  const pendingClaims = claims.filter(
    (c) => c.status === "SUBMITTED" || c.status === "UNDER_REVIEW"
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
      <p className="muted mt-1">Today's collections and outstanding</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          label="Revenue (6mo)"
          value={`₦${stats.revenue.toLocaleString()}`}
          accent="green"
        />
        <StatCard
          label="Outstanding"
          value={`₦${stats.outstanding.toLocaleString()}`}
          accent="amber"
        />
        <StatCard label="Patients to Bill" value={toBill.length} accent="brand" />
        <StatCard label="Pending Claims" value={pendingClaims.length} accent="accent" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QueueSection
          title="Ready to Bill"
          items={toBill}
          action={(item) => router.push(`/appointments/${item.id}`)}
          emptyMessage="No patients waiting for billing."
        />

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <Link href="/billing/new" className="btn btn-primary w-full justify-center">
              + New Invoice
            </Link>
            <Link href="/billing" className="btn btn-secondary w-full justify-center">
              View All Invoices
            </Link>
            <Link href="/claims" className="btn btn-secondary w-full justify-center">
              HMO Claims ({claims.length})
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADMIN HOME (Live Operations)
// ═══════════════════════════════════════════════════════

function AdminHome({
  queue,
  router,
  stats,
  lowStock,
  claims
}: {
  queue: VisitQueue | null;
  router: any;
  stats: any;
  lowStock: StockLevelRecord[];
  claims: ClaimRecord[];
}) {
  const toItem = (a: AppointmentWithVisit): VisitItem => ({
    id: a.id,
    patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Unknown",
    mrn: a.patient?.mrn ?? "—",
    reason: a.reason,
    startsAt: a.startsAt,
    visitStatus: a.visitStatus,
    phone: a.patient?.phone ?? null
  });

  const stages = [
    { key: "CHECKED_IN", label: "Checked In" },
    { key: "VITALS_DONE", label: "Vitals Done" },
    { key: "IN_CONSULTATION", label: "Consultation" },
    { key: "RX_WRITTEN", label: "Awaiting Pharmacy" },
    { key: "DISPENSED", label: "Awaiting Billing" },
    { key: "BILLED", label: "Billed" },
    { key: "DONE", label: "Completed" }
  ];

  const activeVisits = stages.reduce((sum, s) => {
    const list = (queue as any)?.[s.key] ?? [];
    if (["DONE"].includes(s.key)) return sum;
    return sum + list.length;
  }, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Live Operations</h1>
      <p className="muted mt-1">
        {activeVisits} patients in the clinic right now
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Patients" value={stats.patients} accent="accent" />
        <StatCard label="Total Encounters" value={stats.encounters} accent="brand" />
        <StatCard
          label="Revenue (6mo)"
          value={`₦${stats.revenue.toLocaleString()}`}
          accent="green"
        />
        <StatCard
          label="Outstanding"
          value={`₦${stats.outstanding.toLocaleString()}`}
          accent="amber"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stages.map((s) => {
          const count = (queue as any)?.[s.key]?.length ?? 0;
          return (
            <div key={s.key} className="card text-center py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {count}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Patients Waiting ({(queue?.CHECKED_IN ?? []).length})
          </h2>
          {(queue?.CHECKED_IN ?? []).length === 0 ? (
            <p className="muted mt-4 text-sm">
              No patients currently waiting.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {(queue?.CHECKED_IN ?? []).map((a) => {
                const item = toItem(a);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.patientName}
                      </p>
                      <p className="muted font-mono text-xs">{item.mrn}</p>
                    </div>
                    <Link
                      href={`/appointments/${a.id}`}
                      className="text-xs text-accent-600 hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Alerts
          </h2>
          <div className="mt-4 space-y-2">
            {lowStock.length > 0 && (
              <div className="rounded-lg border-l-4 border-l-amber-500 bg-amber-50 p-3">
                <p className="text-sm font-medium text-slate-900">
                  {lowStock.length} items below reorder level
                </p>
                <Link
                  href="/inventory"
                  className="mt-1 text-xs text-accent-600 hover:underline"
                >
                  Review inventory →
                </Link>
              </div>
            )}
            {claims.filter((c) => c.status === "SUBMITTED").length > 0 && (
              <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-3">
                <p className="text-sm font-medium text-slate-900">
                  {claims.filter((c) => c.status === "SUBMITTED").length} HMO claims awaiting submission
                </p>
                <Link
                  href="/claims"
                  className="mt-1 text-xs text-accent-600 hover:underline"
                >
                  Review claims →
                </Link>
              </div>
            )}
            {lowStock.length === 0 &&
              claims.filter((c) => c.status === "SUBMITTED").length === 0 && (
                <p className="muted text-sm">All clear — no alerts.</p>
              )}
          </div>
        </div>
      </div>

      <div className="mt-6 card">
        <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/patients" className="btn btn-secondary">
            All Patients
          </Link>
          <Link href="/encounters" className="btn btn-secondary">
            All Encounters
          </Link>
          <Link href="/billing" className="btn btn-secondary">
            Billing
          </Link>
          <Link href="/settings" className="btn btn-secondary">
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}