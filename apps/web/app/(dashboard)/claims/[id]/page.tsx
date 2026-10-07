"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { claims as claimsApi, type ClaimRecord } from "@/lib/api";

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "PARTIALLY_APPROVED", "DENIED"],
  UNDER_REVIEW: ["APPROVED", "PARTIALLY_APPROVED", "DENIED"],
  APPROVED: ["PAID"],
  PARTIALLY_APPROVED: ["PAID"],
  DENIED: [],
  PAID: []
};

const LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  PARTIALLY_APPROVED: "Partially Approved",
  DENIED: "Denied",
  PAID: "Paid"
};

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const res = await claimsApi.get(id);
      setClaim(res.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async () => {
    if (!claim) return;
    setSaving(true);
    setError("");
    try {
      await claimsApi.submit(id);
      setToast("Claim submitted to " + claim.hmo);
      await refresh();
      setTimeout(() => setToast(null), 5000);
    } catch (e: any) {
      setError(e?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (status: string) => {
    setSaving(true);
    setError("");
    try {
      let approvedAmount: number | undefined;
      let rejectionReason: string | undefined;

      if (status === "APPROVED" || status === "PARTIALLY_APPROVED") {
        const input = prompt(`Approved amount (₦)?`);
        if (input === null) {
          setSaving(false);
          return;
        }
        approvedAmount = Number(input) || 0;
      }

      if (status === "DENIED") {
        const input = prompt("Reason for denial?");
        if (input === null) {
          setSaving(false);
          return;
        }
        rejectionReason = input;
      }

      await claimsApi.setStatus(id, {
        status,
        ...(approvedAmount !== undefined ? { approvedAmount } : {}),
        ...(rejectionReason ? { rejectionReason } : {})
      });

      setToast(`Marked as ${LABELS[status] ?? status}`);
      await refresh();
      setTimeout(() => setToast(null), 5000);
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  if (error && !claim) {
    return (
      <div className="card">
        <p className="text-brand-700">{error}</p>
        <button className="btn btn-secondary mt-4" onClick={() => router.back()}>
          Go back
        </button>
      </div>
    );
  }

  if (!claim) return <p className="muted">Loading…</p>;

  const allowed = TRANSITIONS[claim.status] ?? [];
  const statusBadge = (status: string) => {
    switch (status) {
      case "DRAFT": return "badge-slate";
      case "SUBMITTED": return "badge-blue";
      case "UNDER_REVIEW": return "badge-amber";
      case "APPROVED": return "badge-green";
      case "PARTIALLY_APPROVED": return "badge-amber";
      case "DENIED": return "badge-red";
      case "PAID": return "badge-green";
      default: return "badge-slate";
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="muted font-mono text-sm">
            {claim.claimNumber ?? "DRAFT — not yet submitted"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {claim.patient
              ? `${claim.patient.firstName} ${claim.patient.lastName}`
              : "Unknown patient"}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`badge ${statusBadge(claim.status)}`}>
              {LABELS[claim.status] ?? claim.status}
            </span>
            <span className="muted text-sm">{claim.hmo}</span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← Back
        </button>
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
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            Claim Details
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="muted">Member ID</dt>
                <dd className="font-mono text-slate-900">{claim.hmoMemberId}</dd>
              </div>
              {claim.planCode && (
                <div>
                  <dt className="muted">Plan code</dt>
                  <dd className="font-mono text-slate-900">{claim.planCode}</dd>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="muted">Amount claimed</dt>
                <dd className="text-slate-900">
                  ₦{Number(claim.amount).toLocaleString()}
                </dd>
              </div>
              {claim.approvedAmount && (
                <div>
                  <dt className="muted">Approved amount</dt>
                  <dd className="font-semibold text-green-700">
                    ₦{Number(claim.approvedAmount).toLocaleString()}
                  </dd>
                </div>
              )}
            </div>
            {claim.diagnosisCodes && claim.diagnosisCodes.length > 0 && (
              <div>
                <dt className="muted">Diagnosis codes</dt>
                <dd>
                  {claim.diagnosisCodes.map((code) => (
                    <span
                      key={code}
                      className="mr-1 inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-xs"
                    >
                      {code}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {claim.notes && (
              <div>
                <dt className="muted">Notes</dt>
                <dd className="whitespace-pre-wrap text-slate-900">
                  {claim.notes}
                </dd>
              </div>
            )}
            {claim.rejectionReason && (
              <div>
                <dt className="muted">Rejection reason</dt>
                <dd className="text-brand-700">{claim.rejectionReason}</dd>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {claim.submittedAt && (
                <div>
                  <dt className="muted">Submitted</dt>
                  <dd className="text-slate-900">
                    {new Date(claim.submittedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {claim.resolvedAt && (
                <div>
                  <dt className="muted">Resolved</dt>
                  <dd className="text-slate-900">
                    {new Date(claim.resolvedAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            Actions
          </h2>
          <div className="mt-4 space-y-2">
            {claim.status === "DRAFT" && (
              <button
                className="btn btn-primary w-full justify-center"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Submitting…" : `Submit to ${claim.hmo}`}
              </button>
            )}

            {claim.status !== "DRAFT" &&
              allowed.map((s) => (
                <button
                  key={s}
                  className={`btn w-full justify-center ${
                    s === "DENIED" ? "btn-secondary" : "btn-primary"
                  }`}
                  onClick={() => handleStatus(s)}
                  disabled={saving}
                >
                  Mark as {LABELS[s] ?? s}
                </button>
              ))}

            {claim.status !== "DRAFT" && allowed.length === 0 && (
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