"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  api,
  encounters as encApi,
  type EncounterRecord
} from "@/lib/api";

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
  const [showRawJson, setShowRawJson] = useState(false);

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
        <p className="text-brand-700">{error}</p>
        <button
          className="btn btn-secondary mt-4"
          onClick={() => router.back()}
        >
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
          <h1 className="text-2xl font-semibold text-slate-900">
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
                ? "border-b-2 border-brand-600 text-brand-600"
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
                <dd className="text-slate-900">{patient.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="muted">Email</dt>
                <dd className="text-slate-900">{patient.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="muted">Address</dt>
                <dd className="text-slate-900">{patient.address ?? "—"}</dd>
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
                <dd className="text-slate-900">{patient.bloodGroup ?? "—"}</dd>
              </div>
              <div>
                <dt className="muted">Allergies</dt>
                <dd className="text-slate-900">
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
              No encounters yet. Click <strong>+ New Encounter</strong> to
              start one.
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
                        className={`badge ${
                          e.status === "FINISHED"
                            ? "badge-green"
                            : e.status === "IN_PROGRESS"
                            ? "badge-blue"
                            : "badge-slate"
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/encounters/${e.id}`}
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
      )}

      {tab === "fhir" && <FhirPanel resource={patient.fhirResource} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FHIR Panel — friendly summary by default, raw JSON on demand
// ═══════════════════════════════════════════════════════

function FhirPanel({ resource }: { resource: any }) {
  const [showRaw, setShowRaw] = useState(false);

  if (!resource) {
    return (
      <div className="card">
        <p className="muted">
          No FHIR resource generated for this patient yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            FHIR R4 Resource
          </h3>
          <p className="muted text-sm">
            Portable to any FHIR-compliant system worldwide
          </p>
        </div>
        <button
          className="btn btn-secondary text-sm"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? "Hide raw JSON" : "Show raw JSON"}
        </button>
      </div>

      <FhirReadable resource={resource} />

      {showRaw && (
        <div className="mt-4">
          <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(resource, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function FhirReadable({ resource }: { resource: any }) {
  const r = resource;

  if (r.resourceType === "Patient") {
    const name = r.name?.[0] ?? {};
    const given = (name.given ?? []).join(" ");
    const family = name.family ?? "";
    const fullName = `${given} ${family}`.trim() || "Unknown";
    const mrn = r.identifier?.[0]?.value ?? "—";
    const phones = (r.telecom ?? []).filter((t: any) => t.system === "phone");
    const emails = (r.telecom ?? []).filter((t: any) => t.system === "email");

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h4 className="text-sm font-semibold uppercase text-slate-500">
            Identity
          </h4>
          <dl className="mt-3 space-y-3 text-sm">
            <Field label="Full name" value={fullName} />
            <Field label="Gender" value={r.gender ?? "—"} capitalize />
            <Field label="Date of birth" value={r.birthDate ?? "—"} />
            <Field label="MRN" value={mrn} mono />
          </dl>
        </div>

        <div className="card">
          <h4 className="text-sm font-semibold uppercase text-slate-500">
            Contact
          </h4>
          <dl className="mt-3 space-y-3 text-sm">
            {phones.length > 0 ? (
              phones.map((t: any, i: number) => (
                <Field key={i} label="Phone" value={t.value} />
              ))
            ) : (
              <Field label="Phone" value="—" />
            )}
            {emails.length > 0 ? (
              emails.map((t: any, i: number) => (
                <Field key={i} label="Email" value={t.value} />
              ))
            ) : (
              <Field label="Email" value="—" />
            )}
            {r.address && r.address.length > 0 && (
              <Field
                label="Address"
                value={(r.address ?? [])
                  .map((a: any) => a.text)
                  .filter(Boolean)
                  .join(", ")}
              />
            )}
          </dl>
        </div>
      </div>
    );
  }

  if (r.resourceType === "Encounter") {
    return (
      <div className="card max-w-2xl">
        <h4 className="text-sm font-semibold uppercase text-slate-500">
          Encounter
        </h4>
        <dl className="mt-3 space-y-3 text-sm">
          <Field
            label="Status"
            value={(r.status ?? "—").replace("-", " ")}
            capitalize
          />
          <Field label="Type" value={r.class?.code ?? "—"} />
          {r.period?.start && (
            <Field
              label="Started"
              value={new Date(r.period.start).toLocaleString()}
            />
          )}
          {r.period?.end && (
            <Field
              label="Ended"
              value={new Date(r.period.end).toLocaleString()}
            />
          )}
          <Field
            label="Patient reference"
            value={r.subject?.reference ?? "—"}
            mono
          />
        </dl>
      </div>
    );
  }

  if (r.resourceType === "Observation") {
    return (
      <div className="card max-w-2xl">
        <h4 className="text-sm font-semibold uppercase text-slate-500">
          Observation
        </h4>
        <dl className="mt-3 space-y-3 text-sm">
          <Field label="Status" value={r.status ?? "—"} capitalize />
          {r.code?.coding?.[0] && (
            <>
              <Field
                label="Code"
                value={r.code.coding[0].code ?? "—"}
                mono
              />
              <Field
                label="Display"
                value={r.code.coding[0].display ?? "—"}
              />
            </>
          )}
          {r.valueQuantity && (
            <Field
              label="Value"
              value={`${r.valueQuantity.value} ${r.valueQuantity.unit ?? ""}`}
            />
          )}
          {r.effectiveDateTime && (
            <Field
              label="Recorded"
              value={new Date(r.effectiveDateTime).toLocaleString()}
            />
          )}
        </dl>
      </div>
    );
  }

  // Fallback — unknown resource type
  return (
    <div className="card">
      <p className="muted text-sm">
        Resource type: <strong>{r.resourceType ?? "unknown"}</strong>
      </p>
      <p className="muted mt-2 text-xs">
        Click <strong>Show raw JSON</strong> to inspect the full resource.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  capitalize,
  mono
}: {
  label: string;
  value: string | number;
  capitalize?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="muted">{label}</dt>
      <dd
        className={`text-slate-900 ${capitalize ? "capitalize" : ""} ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}