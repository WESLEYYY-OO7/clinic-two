"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  encounters as encApi,
  vitals as vitalsApi,
  notes as notesApi,
  diagnoses as diagApi,
  api,
  type EncounterRecord,
  type VitalRecord,
  type NoteRecord
} from "@/lib/api";

interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  allergies: string[];
}

export default function EncounterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [encounter, setEncounter] = useState<EncounterRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<VitalRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [tab, setTab] = useState<"vitals" | "notes" | "diagnoses" | "fhir">("vitals");
  const [error, setError] = useState("");

  const [vitalForm, setVitalForm] = useState({
    temperatureC: "",
    heartRateBpm: "",
    respRateBpm: "",
    bpSystolic: "",
    bpDiastolic: "",
    spo2: "",
    weightKg: "",
    heightCm: ""
  });

  const [noteContent, setNoteContent] = useState("");

  const [diagForm, setDiagForm] = useState({
    code: "",
    display: "",
    certainty: "provisional"
  });

  const refresh = async () => {
    if (!id) return;
    try {
      const encRes = await encApi.get(id);
      setEncounter(encRes.data);

      const patientRes = await api.get<{ data: Patient }>(
        `/api/patients/${encRes.data.patientId}`
      );
      setPatient(patientRes.data);

      const vitalsRes = await vitalsApi.list(id);
      setVitals(vitalsRes.data);

      const notesRes = await notesApi.list(id);
      setNotes(notesRes.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load encounter");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toNum = (s: string) => (s === "" ? undefined : Number(s));

  const submitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await vitalsApi.create({
        encounterId: id,
        temperatureC: toNum(vitalForm.temperatureC),
        heartRateBpm: toNum(vitalForm.heartRateBpm),
        respRateBpm: toNum(vitalForm.respRateBpm),
        bpSystolic: toNum(vitalForm.bpSystolic),
        bpDiastolic: toNum(vitalForm.bpDiastolic),
        spo2: toNum(vitalForm.spo2),
        weightKg: toNum(vitalForm.weightKg),
        heightCm: toNum(vitalForm.heightCm)
      });
      setVitalForm({
        temperatureC: "",
        heartRateBpm: "",
        respRateBpm: "",
        bpSystolic: "",
        bpDiastolic: "",
        spo2: "",
        weightKg: "",
        heightCm: ""
      });
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to save vitals");
    }
  };

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setError("");
    try {
      await notesApi.create({ encounterId: id, content: noteContent.trim() });
      setNoteContent("");
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to save note");
    }
  };

  const submitDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await diagApi.create({
        encounterId: id,
        code: diagForm.code,
        display: diagForm.display,
        certainty: diagForm.certainty
      });
      setDiagnoses((d) => [res.data, ...d]);
      setDiagForm({ code: "", display: "", certainty: "provisional" });
    } catch (err: any) {
      setError(err?.message || "Failed to add diagnosis");
    }
  };

  const finishEncounter = async () => {
    if (!encounter || encounter.status === "FINISHED") return;
    if (!confirm("Finish this encounter? It cannot be edited afterward.")) return;
    try {
      await encApi.finish(id);
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to finish encounter");
    }
  };

  if (error && !encounter) {
    return (
      <div className="card">
        <p className="text-red-700">{error}</p>
        <button className="btn btn-secondary mt-4" onClick={() => router.back()}>
          Go back
        </button>
      </div>
    );
  }

  if (!encounter || !patient) return <p className="muted">Loading…</p>;

  const isFinished = encounter.status === "FINISHED";

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={`/patients/${patient.id}`}
              className="muted font-mono text-sm hover:underline"
            >
              {patient.mrn}
            </Link>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                isFinished
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {encounter.status}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="muted mt-1">
            {encounter.type} · Started{" "}
            {new Date(encounter.startedAt).toLocaleString()}
          </p>
          {encounter.reason && (
            <p className="muted mt-1">Reason: {encounter.reason}</p>
          )}
        </div>
        <div className="flex gap-3">
          {!isFinished && (
            <button className="btn btn-primary" onClick={finishEncounter}>
              Finish Encounter
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => router.back()}>
            ← Back
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-1 border-b">
        {(["vitals", "notes", "diagnoses", "fhir"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "vitals" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {!isFinished && (
            <form onSubmit={submitVitals} className="card">
              <h2 className="text-lg font-semibold">Record Vitals</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={vitalForm.temperatureC}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, temperatureC: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Heart rate (bpm)</label>
                  <input
                    type="number"
                    className="input"
                    value={vitalForm.heartRateBpm}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, heartRateBpm: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Resp rate (/min)</label>
                  <input
                    type="number"
                    className="input"
                    value={vitalForm.respRateBpm}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, respRateBpm: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">SpO₂ (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={vitalForm.spo2}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, spo2: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">BP systolic</label>
                  <input
                    type="number"
                    className="input"
                    value={vitalForm.bpSystolic}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, bpSystolic: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">BP diastolic</label>
                  <input
                    type="number"
                    className="input"
                    value={vitalForm.bpDiastolic}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, bpDiastolic: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={vitalForm.weightKg}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, weightKg: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={vitalForm.heightCm}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, heightCm: e.target.value })
                    }
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary mt-4">
                Save vitals
              </button>
            </form>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold">
              Vital History ({vitals.length})
            </h2>
            {vitals.length === 0 ? (
              <p className="muted mt-4">No vitals recorded yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {vitals.map((v) => (
                  <div key={v.id} className="border-l-2 border-blue-500 pl-3">
                    <p className="muted text-xs">
                      {new Date(v.recordedAt).toLocaleString()}
                    </p>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {v.temperatureC != null && <span>🌡️ {v.temperatureC}°C</span>}
                      {v.heartRateBpm != null && <span>❤️ {v.heartRateBpm} bpm</span>}
                      {v.respRateBpm != null && <span>🫁 {v.respRateBpm}/min</span>}
                      {v.spo2 != null && <span>💧 SpO₂ {v.spo2}%</span>}
                      {v.bpSystolic != null && v.bpDiastolic != null && (
                        <span>🩸 {v.bpSystolic}/{v.bpDiastolic}</span>
                      )}
                      {v.weightKg != null && <span>⚖️ {v.weightKg} kg</span>}
                      {v.heightCm != null && <span>📏 {v.heightCm} cm</span>}
                      {v.bmi != null && (
                        <span className="font-medium">BMI {v.bmi.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "notes" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {!isFinished && (
            <form onSubmit={submitNote} className="card">
              <h2 className="text-lg font-semibold">New Note</h2>
              <textarea
                className="input mt-4"
                rows={10}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="S: Subjective&#10;O: Objective&#10;A: Assessment&#10;P: Plan"
              />
              <button
                type="submit"
                className="btn btn-primary mt-4"
                disabled={!noteContent.trim()}
              >
                Save note
              </button>
            </form>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold">Notes ({notes.length})</h2>
            {notes.length === 0 ? (
              <p className="muted mt-4">No notes yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-md bg-slate-50 p-4">
                    <p className="muted text-xs">
                      v{n.version} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm font-sans">
                      {n.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "diagnoses" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {!isFinished && (
            <form onSubmit={submitDiagnosis} className="card">
              <h2 className="text-lg font-semibold">Add Diagnosis</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="label">ICD-10 code *</label>
                  <input
                    className="input"
                    value={diagForm.code}
                    onChange={(e) =>
                      setDiagForm({ ...diagForm, code: e.target.value })
                    }
                    placeholder="e.g. J06.9"
                    required
                  />
                </div>
                <div>
                  <label className="label">Display *</label>
                  <input
                    className="input"
                    value={diagForm.display}
                    onChange={(e) =>
                      setDiagForm({ ...diagForm, display: e.target.value })
                    }
                    placeholder="e.g. Acute upper respiratory infection"
                    required
                  />
                </div>
                <div>
                  <label className="label">Certainty</label>
                  <select
                    className="input"
                    value={diagForm.certainty}
                    onChange={(e) =>
                      setDiagForm({ ...diagForm, certainty: e.target.value })
                    }
                  >
                    <option value="provisional">Provisional</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="differential">Differential</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary mt-4">
                Add diagnosis
              </button>
            </form>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold">
              Diagnoses ({diagnoses.length})
            </h2>
            {diagnoses.length === 0 ? (
              <p className="muted mt-4">No diagnoses added yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {diagnoses.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start gap-3 rounded-md bg-slate-50 p-3"
                  >
                    <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                      {d.code}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{d.display}</p>
                      {d.certainty && (
                        <p className="muted text-xs">{d.certainty}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "fhir" && (
        <div className="card">
          <p className="muted mb-3 text-sm">
            FHIR R4 resources generated from this encounter.
          </p>
          <pre className="overflow-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(encounter.fhirResource, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}