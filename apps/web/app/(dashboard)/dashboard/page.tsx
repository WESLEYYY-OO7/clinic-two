"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, auth } from "@/lib/api";

export default function DashboardPage() {
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const user = auth.getUser();

  useEffect(() => {
    api
      .get<{ data: any[] }>("/api/patients")
      .then((res) => setPatientCount(res.data.length))
      .catch(() => setPatientCount(0));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="muted mt-1">Signed in as {user?.email}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="muted text-sm">Total Patients</p>
          <p className="mt-2 text-3xl font-semibold">
            {patientCount === null ? "—" : patientCount}
          </p>
        </div>
        <div className="card">
          <p className="muted text-sm">Appointments Today</p>
          <p className="mt-2 text-3xl font-semibold">0</p>
        </div>
        <div className="card">
          <p className="muted text-sm">Outstanding Invoices</p>
          <p className="mt-2 text-3xl font-semibold">0</p>
        </div>
      </div>

      <div className="mt-8 card">
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <div className="mt-4 flex gap-3">
          <Link href="/patients/new" className="btn btn-primary">
            + New Patient
          </Link>
          <Link href="/patients" className="btn btn-secondary">
            View Patients
          </Link>
        </div>
      </div>
    </div>
  );
}