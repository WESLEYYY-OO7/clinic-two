"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, patients, encounters, invoices } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    patients: 0,
    encounters: 0,
    outstanding: 0
  });
  const [role, setRole] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    auth
      .me()
      .then((res) => {
        setRole(res.data.user.role);
      })
      .catch(() => {});

    Promise.all([
      patients.list().then((r) => r.data.length).catch(() => 0),
      encounters.list().then((r) => r.data.length).catch(() => 0),
      invoices
        .list()
        .then((r) =>
          r.data
            .filter((i) => Number(i.balance) > 0.01)
            .reduce((s, i) => s + Number(i.balance), 0)
        )
        .catch(() => 0)
    ]).then(([p, e, out]) => {
      setStats({ patients: p, encounters: e, outstanding: out });
    });
  }, []);

  // Which roles can do what
  const canAddPatient = ["CLINIC_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"].includes(role);
  const canAddEncounter = ["CLINIC_ADMIN", "DOCTOR", "NURSE"].includes(role);
  const canAddInvoice = ["CLINIC_ADMIN", "BILLING"].includes(role);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
      <p className="muted mt-1">
        {mounted ? "Signed in" : "Loading…"}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card border-l-4 border-l-accent-500">
          <p className="muted text-sm">Total Patients</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {stats.patients}
          </p>
        </div>
        <div className="card border-l-4 border-l-brand-500">
          <p className="muted text-sm">Encounters</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {stats.encounters}
          </p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="muted text-sm">Outstanding</p>
          <p className="mt-2 text-3xl font-semibold text-brand-700">
            ₦{stats.outstanding.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-8 card">
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