"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, encounters as encApi, type EncounterRecord } from "@/lib/api";

interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  bloodGroup: string | null;
  allergies: string[];
  fhirResource: any;
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "encounters" | "fhir">("overview");

  useEffect(() => {
    if (!id) return;
    api
      .get<{ data: Patient }>(`/api/patients/${id}`)
      .then((res) => setPatient(res.data))
      .catch((err) => setError(err?.message || "Failed to load"));

    encApi
      .list(id)
      .then((res) => setEncounters(res.data))
      .catch(() => setEncounters([]));
  }, [id]);

  if (error) {
    return (
      <div className="card">
        <p className="text-red-700">{error}</p>
        <button className="btn btn-secondary mt-4" onClick={() => router.back()}>
          Go back
        </button>
      </div>
    );
  }

  if (!patient) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="muted font-mono text-sm">{patient.mrn}</p>
          <h1 className="text-2xl font-semibold">
            {patient.firstName} {patient.middleName ?? ""} {patient.lastName}
          </h1>
          <p className="muted mt-1">
            {patient.gender} · Born{" "}
            {new Date(patient.dateOfBirth).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/encounters/new?patientId=${patient.id}`}
            className="btn btn-primary"
          >
            + New Encounter
          </Link>
          <button className="btn btn-secondary" onClick={() => router.back()}>
            ← Back
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {(["overview", "encounters", "fhir"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t === "overview"
              ? "Overview"
              : t === "encounters"
              ? `Encounters (${encounters.length})`
              : "FHIR Resource"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card">
            <h2 className="text-sm font-semibold uppercase text-slate-500">
              Contact
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="muted">Phone</dt>
                <dd>{patient.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="muted">Email</dt>
                <dd>{patient.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="muted">Address</dt>
                <dd>{patient.address ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold uppercase text-slate-500">
              Clinical
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="muted">Blood group</dt>
                <dd>{patient.bloodGroup ?? "—"}</dd>
              </div>
              <div>
                <dt className="muted">Allergies</dt>
                <dd>
                  {patient.allergies && patient.allergies.length > 0
                    ? patient.allergies.join(", ")
                    : "None recorded"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {tab === "encounters" && (
        <div className="card p-0">
          {encounters.length === 0 ? (
            <p className="muted p-6">
              No encounters yet. Click <strong>+ New Encounter</strong> to start
              one.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((e) => (
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
      )}

      {tab === "fhir" && (
        <div className="card">
          <p className="muted mb-3 text-sm">
            FHIR R4 resource — portable to any compliant system.
          </p>
          <pre className="overflow-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(patient.fhirResource, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}