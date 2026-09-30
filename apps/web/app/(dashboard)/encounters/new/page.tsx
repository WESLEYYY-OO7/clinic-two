"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, encounters, auth } from "@/lib/api";

interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

function NewEncounterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetPatientId = searchParams.get("patientId") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(presetPatientId);
  const [type, setType] = useState("OUTPATIENT");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<{ data: Patient[] }>("/api/patients")
      .then((res) => setPatients(res.data))
      .catch(() => setPatients([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = auth.getUser();
      if (!user) throw new Error("Not signed in");

      const res = await encounters.create({
        patientId,
        providerId: user.id,
        type,
        reason: reason || undefined
      });

      router.push(`/encounters/${res.data.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create encounter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">New Encounter</h1>
      <p className="muted mt-1">Start a clinical encounter</p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 max-w-2xl">
        <div>
          <label className="label">Patient *</label>
          <select
            className="input"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
          >
            <option value="">— Select patient —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.mrn} — {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Type *</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="OUTPATIENT">Outpatient</option>
            <option value="INPATIENT">Inpatient</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="TELEMEDICINE">Telemedicine</option>
          </select>
        </div>

        <div>
          <label className="label">Reason for visit</label>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Routine checkup, fever, follow-up"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Starting…" : "Start encounter"}
          </button>
          <Link href="/encounters" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewEncounterPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <NewEncounterForm />
    </Suspense>
  );
}
