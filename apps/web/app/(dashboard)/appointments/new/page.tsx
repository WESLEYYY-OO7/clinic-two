"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  appointments as apptApi,
  type PatientRecord,
  type StaffRecord,
  users
} from "@/lib/api";

export default function NewAppointmentPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [providers, setProviders] = useState<StaffRecord[]>([]);
  const [patientId, setPatientId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [p, u] = await Promise.all([api.get<{ data: PatientRecord[] }>("/api/patients"), users.list()]);
        setPatients(p.data);
        setProviders(u.data.filter((x) => ["DOCTOR", "NURSE", "CLINIC_ADMIN"].includes(x.role)));
      } catch (e: any) {
        setError(e?.message || "Failed to load");
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Build ISO dates from date + time
      const startsAt = new Date(`${date}T${startTime}:00`);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

      if (isNaN(startsAt.getTime())) throw new Error("Invalid date/time");

      const appt = await apptApi.create({
        patientId,
        providerId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: reason || undefined,
        notes: notes || undefined
      });

      router.push(`/appointments/${appt.data.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        New Appointment
      </h1>
      <p className="muted mt-1">Book a patient visit</p>

      <form onSubmit={handleSubmit} className="card mt-6 max-w-2xl space-y-4">
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
          <label className="label">Provider *</label>
          <select
            className="input"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            required
          >
            <option value="">— Select provider —</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.role})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="label">Date *</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="col-span-1">
            <label className="label">Start time *</label>
            <input
              type="time"
              className="input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="col-span-1">
            <label className="label">Duration (min)</label>
            <select
              className="input"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Reason</label>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Follow-up, consultation"
          />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember about this appointment…"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Booking…" : "Book appointment"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}