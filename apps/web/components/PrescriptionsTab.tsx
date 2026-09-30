"use client";
import { useEffect, useMemo, useState } from "react";
import {
  drugs as drugsApi,
  prescriptions as rxApi,
  type DrugRecord,
  type PrescriptionRecord,
  type CdsAlert
} from "@/lib/api";

interface Props {
  patientId: string;
  encounterId?: string;
}

export function PrescriptionsTab({ patientId, encounterId }: Props) {
  const [catalogue, setCatalogue] = useState<DrugRecord[]>([]);
  const [list, setList] = useState<PrescriptionRecord[]>([]);
  const [drugSearch, setDrugSearch] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<DrugRecord | null>(null);
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("TID");
  const [durationDays, setDurationDays] = useState(5);
  const [alerts, setAlerts] = useState<CdsAlert[]>([]);
  const [blocking, setBlocking] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const refresh = async () => {
    try {
      const [cat, rx] = await Promise.all([
        drugsApi.list(),
        rxApi.list(patientId)
      ]);
      setCatalogue(cat.data);
      setList(rx.data);
    } catch {}
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (!selectedDrug) {
      setAlerts([]);
      setBlocking(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await rxApi.preview(patientId, selectedDrug.id);
        setAlerts(res.data.alerts);
        setBlocking(res.data.blocking);
      } catch {
        setAlerts([]);
        setBlocking(false);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDrug?.id, patientId]);

  const filteredCatalogue = useMemo(() => {
    if (!drugSearch.trim()) return [];
    const q = drugSearch.toLowerCase();
    return catalogue
      .filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.genericName ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [drugSearch, catalogue]);

  const canPrescribe =
    !!selectedDrug &&
    !!dose.trim() &&
    durationDays > 0 &&
    (!blocking || overrideReason.trim().length >= 10);

  const handlePrescribe = async () => {
    if (!selectedDrug || !canPrescribe) return;
    setSaving(true);
    setToast(null);
    try {
      await rxApi.create({
        patientId,
        drugId: selectedDrug.id,
        encounterId,
        dose,
        frequency,
        durationDays,
        ...(blocking && overrideReason ? { overrideReason } : {})
      });
      setToast({
        kind: "success",
        text: blocking
          ? `Prescribed ${selectedDrug.name} with override. Logged in audit trail.`
          : `Prescribed ${selectedDrug.name}.`
      });
      setSelectedDrug(null);
      setDrugSearch("");
      setDose("");
      setDurationDays(5);
      setOverrideReason("");
      setAlerts([]);
      setBlocking(false);
      await refresh();
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      setToast({ kind: "error", text: err?.message || "Failed to prescribe" });
    } finally {
      setSaving(false);
    }
  };

  const sevColor = (s: string) =>
    s === "critical"
      ? "border-red-300 bg-red-50 text-red-800"
      : s === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : "border-blue-300 bg-blue-50 text-blue-800";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="card">
        <h2 className="text-lg font-semibold">New Prescription</h2>

        <div className="mt-4">
          <label className="label">Drug *</label>
          <input
            className="input"
            placeholder="Type drug name (e.g. Augmentin, Paracetamol)…"
            value={
              selectedDrug
                ? `${selectedDrug.name} — ${selectedDrug.genericName ?? ""}`
                : drugSearch
            }
            onChange={(e) => {
              setSelectedDrug(null);
              setDrugSearch(e.target.value);
            }}
          />
          {!selectedDrug && filteredCatalogue.length > 0 && (
            <div className="mt-1 max-h-64 overflow-auto rounded-md border bg-white shadow-lg">
              {filteredCatalogue.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDrug(d);
                    setDrugSearch("");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium">{d.name}</span>
                  {d.genericName && (
                    <span className="muted ml-2 text-xs">{d.genericName}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedDrug && (
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs">
            <p>
              <strong>{selectedDrug.name}</strong>
            </p>
            {selectedDrug.genericName && (
              <p className="muted">Generic: {selectedDrug.genericName}</p>
            )}
            {selectedDrug.strength && (
              <p className="muted">Strength: {selectedDrug.strength}</p>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div>
            <label className="label">Dose</label>
            <input
              className="input"
              placeholder="500mg"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Frequency</label>
            <select
              className="input"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="OD">OD (once)</option>
              <option value="BD">BD (twice)</option>
              <option value="TID">TID (thrice)</option>
              <option value="QID">QID (four)</option>
              <option value="PRN">PRN (as needed)</option>
            </select>
          </div>
          <div>
            <label className="label">Days</label>
            <input
              type="number"
              className="input"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        {loading && selectedDrug && (
          <p className="muted mt-4 text-xs">Running clinical checks…</p>
        )}

        {!loading && alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`rounded-md border p-3 text-sm ${sevColor(a.severity)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {a.severity === "critical"
                    ? "🚫 Critical — Blocked"
                    : a.severity === "warning"
                    ? "⚠️ Warning"
                    : "ℹ️ Info"}
                </p>
                <p className="mt-1">{a.message}</p>
                <p className="muted mt-1 text-xs">Source: {a.source}</p>
              </div>
            ))}
          </div>
        )}

        {blocking && (
          <div className="mt-4">
            <label className="label text-red-700">
              Clinical justification (required to override) *
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder="Explain why you're overriding this alert…"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
            <p className="muted mt-1 text-xs">
              {overrideReason.trim().length < 10
                ? `At least 10 characters (${overrideReason.trim().length}/10)`
                : "✓ Justification logged to audit trail"}
            </p>
          </div>
        )}

        {toast && (
          <div
            className={`mt-4 rounded-md p-3 text-sm ${
              toast.kind === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {toast.text}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={`btn ${
              blocking ? "bg-red-600 text-white hover:bg-red-700" : "btn-primary"
            }`}
            disabled={!canPrescribe || saving}
            onClick={handlePrescribe}
          >
            {saving
              ? "Prescribing…"
              : blocking
              ? "Override & Prescribe"
              : "Prescribe"}
          </button>
          {selectedDrug && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelectedDrug(null);
                setDrugSearch("");
                setAlerts([]);
                setBlocking(false);
                setOverrideReason("");
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">
          Prescriptions ({list.length})
        </h2>
        {list.length === 0 ? (
          <p className="muted mt-4">No prescriptions yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {list.map((p) => (
              <div key={p.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {p.drug.name}
                      {p.drug.genericName && (
                        <span className="muted ml-2 text-xs">
                          {p.drug.genericName}
                        </span>
                      )}
                    </p>
                    <p className="muted mt-1 text-xs">
                      {p.dose} · {p.frequency} · {p.durationDays} days
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                      p.status === "DISPENSED"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}