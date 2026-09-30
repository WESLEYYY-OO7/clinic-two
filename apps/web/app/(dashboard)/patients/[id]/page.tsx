"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

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
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "fhir">("overview");

  useEffect(() => {
    if (!id) return;
    api
      .get<{ data: Patient }>(`/api/patients/${id}`)
      .then((res) => setPatient(res.data))
      .catch((err) => setError(err?.message || "Failed to load"));
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
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← Back
        </button>
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {(["overview", "fhir"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t === "overview" ? "Overview" : "FHIR Resource"}
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