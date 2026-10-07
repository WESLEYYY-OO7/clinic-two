"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  claims as claimsApi,
  type PatientRecord,
  type EligibilityResult
} from "@/lib/api";

export default function NewClaimPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [hmos, setHmos] = useState<string[]>([]);

  const [patientId, setPatientId] = useState("");
  const [hmo, setHmo] = useState("");
  const [hmoMemberId, setHmoMemberId] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [amount, setAmount] = useState("");
  const [diagnosisCodes, setDiagnosisCodes] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [notes, setNotes] = useState("");

  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [p, h] = await Promise.all([
          api.get<{ data: PatientRecord[] }>("/api/patients"),
          claimsApi.listHmos()
        ]);
        setPatients(p.data);
        setHmos(h.data);
        if (h.data.length > 0) setHmo(h.data[0]);
      } catch (e: any) {
        setError(e?.message || "Failed to load");
      }
    })();
  }, []);

  const handleVerify = async () => {
    if (!hmo || !hmoMemberId) return;
    setVerifying(true);
    setEligibility(null);
    setError("");
    try {
      const res = await claimsApi.verify({
        hmo,
        hmoMemberId,
        planCode: planCode || undefined
      });
      setEligibility(res.data);
    } catch (e: any) {
      setError(e?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const claim = await claimsApi.create({
        patientId,
        hmo,
        hmoMemberId,
        planCode: planCode || undefined,
        amount: Number(amount),
        diagnosisCodes: diagnosisCodes
          ? diagnosisCodes.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        serviceDate: serviceDate
          ? new Date(serviceDate).toISOString()
          : undefined,
        notes: notes || undefined
      });
      router.push(`/claims/${claim.data.id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create claim");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">New HMO Claim</h1>
      <p className="muted mt-1">Submit a claim to a health insurance provider</p>

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">HMO *</label>
            <select
              className="input"
              value={hmo}
              onChange={(e) => setHmo(e.target.value)}
              required
            >
              <option value="">— Select HMO —</option>
              {hmos.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Plan code</label>
            <input
              className="input"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              placeholder="e.g. HYG-GOLD"
            />
          </div>
        </div>

        <div>
          <label className="label">Member ID *</label>
          <div className="flex gap-2">
            <input
              className="input"
              value={hmoMemberId}
              onChange={(e) => setHmoMemberId(e.target.value)}
              placeholder="e.g. HYG-987654321"
              required
            />
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              onClick={handleVerify}
              disabled={!hmoMemberId || verifying}
            >
              {verifying ? "Verifying…" : "Verify"}
            </button>
          </div>
        </div>

        {eligibility && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              eligibility.eligible
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-brand-200 bg-brand-50 text-brand-800"
            }`}
          >
            {eligibility.eligible ? (
              <>
                <p className="font-semibold">✅ Eligible</p>
                <p className="mt-1">Plan: {eligibility.plan}</p>
                {eligibility.copay !== undefined && (
                  <p>Patient copay: {Math.round(eligibility.copay * 100)}%</p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">❌ Not eligible</p>
                <p className="mt-1">{eligibility.reason}</p>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount claimed (₦) *</label>
            <input
              type="number"
              className="input"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Service date</label>
            <input
              type="date"
              className="input"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Diagnosis codes (comma-separated)</label>
          <input
            className="input"
            value={diagnosisCodes}
            onChange={(e) => setDiagnosisCodes(e.target.value)}
            placeholder="e.g. J06.9, R50.9"
          />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Description of services…"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create draft claim"}
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