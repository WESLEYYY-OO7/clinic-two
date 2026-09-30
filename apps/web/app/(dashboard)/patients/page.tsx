"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string | null;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get<{ data: Patient[] }>(
          `/api/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`
        );
        setPatients(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(fetchPatients, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="muted mt-1">{patients.length} total</p>
        </div>
        <Link href="/patients/new" className="btn btn-primary">
          + New Patient
        </Link>
      </div>

      <div className="mb-4">
        <input
          className="input"
          placeholder="Search by name, MRN, or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <p className="muted p-6">Loading…</p>
        ) : patients.length === 0 ? (
          <p className="muted p-6">No patients yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">MRN</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">DOB</th>
                <th className="px-4 py-3">Phone</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.mrn}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-blue-600"
                    >
                      {p.firstName} {p.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.gender}</td>
                  <td className="px-4 py-3">
                    {new Date(p.dateOfBirth).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{p.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
