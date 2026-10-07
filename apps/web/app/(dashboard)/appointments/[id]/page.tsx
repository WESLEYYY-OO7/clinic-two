"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  appointments as apptApi,
  type AppointmentRecord
} from "@/lib/api";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  NO_SHOW: ["SCHEDULED"],
  CANCELLED: ["SCHEDULED"]
};

const LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  ARRIVED: "Arrived",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled"
};

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [appt, setAppt] = useState<AppointmentRecord | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const res = await apptApi.get(id);
      setAppt(res.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatus = async (status: string) => {
    setSaving(true);
    setError("");
    try {
      await apptApi.setStatus(id, status);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleRemind = async () => {
    setReminding(true);
    setError("");
    try {
      await apptApi.remind(id);
      setToast("SMS reminder queued");
      setTimeout(() => setToast(null), 5000);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to send reminder");
    } finally {
      setReminding(false);
    }
  };

  if (error && !appt) {
    return (
      <div className="card">
        <p className="text-brand-700">{error}</p>
        <button className="btn btn-secondary mt-4" onClick={() => router.back()}>
          Go back
        </button>
      </div>
    );
  }

  if (!appt) return <p className="muted">Loading…</p>;

  const allowed = ALLOWED_TRANSITIONS[appt.status] ?? [];

  const statusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED": return "badge-blue";
      case "CONFIRMED": return "badge-purple";
      case "ARRIVED": return "badge-amber";
      case "COMPLETED": return "badge-green";
      case "NO_SHOW": return "badge-red";
      case "CANCELLED": return "badge-slate";
      default: return "badge-slate";
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="muted font-mono text-sm">{appt.id.slice(0, 8)}…</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {appt.patient
              ? `${appt.patient.firstName} ${appt.patient.lastName}`
              : "Unknown patient"}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`badge ${statusBadge(appt.status)}`}>
              {LABELS[appt.status] ?? appt.status}
            </span>
            {appt.reminderSentAt && (
              <span className="muted text-xs">
                Reminder sent {new Date(appt.reminderSentAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={() => router.back()}>
            ← Back
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          {error}
        </div>
      )}

      {toast && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          ✅ {toast}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Details */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            Details
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="muted">When</dt>
              <dd className="text-slate-900">
                {new Date(appt.startsAt).toLocaleString("en-NG", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
                {" → "}
                {new Date(appt.endsAt).toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </dd>
            </div>
            <div>
              <dt className="muted">Reason</dt>
              <dd className="text-slate-900">{appt.reason ?? "—"}</dd>
            </div>
            {appt.notes && (
              <div>
                <dt className="muted">Notes</dt>
                <dd className="text-slate-900 whitespace-pre-wrap">
                  {appt.notes}
                </dd>
              </div>
            )}
            {appt.patient?.phone && (
              <div>
                <dt className="muted">Patient phone</dt>
                <dd className="text-slate-900">{appt.patient.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Actions */}
        <div className="card">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            Actions
          </h2>
          <div className="mt-4 space-y-2">
            {allowed.map((s) => (
              <button
                key={s}
                className={`btn w-full justify-center ${
                  s === "CANCELLED" || s === "NO_SHOW"
                    ? "btn-secondary"
                    : "btn-primary"
                }`}
                onClick={() => handleStatus(s)}
                disabled={saving}
              >
                Mark as {LABELS[s] ?? s}
              </button>
            ))}

            {appt.patient?.phone && (
              <button
                className="btn btn-accent w-full justify-center"
                onClick={handleRemind}
                disabled={reminding}
              >
                {reminding ? "Sending…" : "📱 Send SMS reminder"}
              </button>
            )}

            {allowed.length === 0 && (
              <p className="muted text-center text-xs">
                No further transitions available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}