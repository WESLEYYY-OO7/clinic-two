"use client";
import { useEffect, useMemo, useState } from "react";
import {
  lab as labApi,
  type LabOrderRecord,
  type LabTestRecord
} from "@/lib/api";

interface Props {
  patientId: string;
  encounterId: string;
  isFinished?: boolean;
}

export function LabTab({ patientId, encounterId, isFinished }: Props) {
  const [catalogue, setCatalogue] = useState<LabTestRecord[]>([]);
  const [orders, setOrders] = useState<LabOrderRecord[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [selectedTest, setSelectedTest] = useState<LabTestRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resultFor, setResultFor] = useState<LabOrderRecord | null>(null);
  const [resultValue, setResultValue] = useState("");
  const [resultFlag, setResultFlag] = useState<
    "NORMAL" | "ABNORMAL" | "CRITICAL" | ""
  >("");
  const [resultSaving, setResultSaving] = useState(false);

  const refresh = async () => {
    try {
      const [cat, ord] = await Promise.all([
        labApi.tests(),
        labApi.list({ encounterId })
      ]);
      setCatalogue(cat.data);
      setOrders(ord.data);
    } catch {}
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  const filtered = useMemo(() => {
    if (!testSearch.trim()) return [];
    const q = testSearch.toLowerCase();
    return catalogue
      .filter(
        (t) =>
          t.code.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [testSearch, catalogue]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;
    setSaving(true);
    setError("");
    try {
      await labApi.create({
        encounterId,
        patientId,
        testId: selectedTest.id,
        notes: notes || undefined
      });
      setSelectedTest(null);
      setTestSearch("");
      setNotes("");
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to order test");
    } finally {
      setSaving(false);
    }
  };

  const openResultForm = (order: LabOrderRecord) => {
    setResultFor(order);
    setResultValue(order.resultValue ?? "");
    setResultFlag((order.resultFlag as any) ?? "");
  };

  const submitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultFor || !resultValue.trim()) return;
    setResultSaving(true);
    setError("");
    try {
      await labApi.result(resultFor.id, {
        resultValue: resultValue.trim(),
        ...(resultFlag ? { resultFlag } : {})
      });
      setResultFor(null);
      setResultValue("");
      setResultFlag("");
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to save result");
    } finally {
      setResultSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "COMPLETED") return "badge-green";
    if (status === "IN_PROGRESS") return "badge-blue";
    if (status === "CANCELLED") return "badge-slate";
    return "badge-amber";
  };

  const flagBadge = (flag: string | null) => {
    if (!flag || flag === "NORMAL") return "badge-green";
    if (flag === "CRITICAL") return "badge-red";
    return "badge-amber";
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {!isFinished ? (
        <form onSubmit={handleOrder} className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Order Lab Test
          </h2>
          <p className="muted mt-1 text-sm">{catalogue.length} tests available</p>

          <div className="mt-4">
            <label className="label">Test *</label>
            <input
              className="input"
              placeholder="Type test name or code (e.g. Malaria, FBC, MRDT)…"
              value={
                selectedTest
                  ? `${selectedTest.name} (${selectedTest.code})`
                  : testSearch
              }
              onChange={(e) => {
                setSelectedTest(null);
                setTestSearch(e.target.value);
              }}
            />
            {!selectedTest && filtered.length > 0 && (
              <div className="mt-1 max-h-64 overflow-auto rounded-lg border bg-white shadow-lg">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTest(t);
                      setTestSearch("");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="muted ml-2 text-xs">{t.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTest && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
              <p>
                <strong>{selectedTest.name}</strong> ({selectedTest.code})
              </p>
              <p className="muted">Specimen: {selectedTest.specimen}</p>
              <p className="muted">
                Reference: {selectedTest.referenceRange}{" "}
                {selectedTest.unit !== "—" && `(${selectedTest.unit})`}
              </p>
            </div>
          )}

          <div className="mt-4">
            <label className="label">Clinical notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for request…"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary mt-4"
            disabled={!selectedTest || saving}
          >
            {saving ? "Ordering…" : "Order test"}
          </button>
        </form>
      ) : (
        <div className="card">
          <p className="muted">
            Encounter is finished. New tests cannot be ordered.
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900">
          Lab Orders ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <p className="muted mt-4">No tests ordered yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {o.test?.name ?? "Unknown test"}
                    </p>
                    <p className="muted text-xs">
                      {o.test?.code} · {new Date(o.createdAt).toLocaleString()}
                    </p>
                    {o.notes && (
                      <p className="muted mt-1 text-xs">Note: {o.notes}</p>
                    )}
                  </div>
                  <span className={`badge ${statusBadge(o.status)}`}>
                    {o.status}
                  </span>
                </div>

                {o.resultValue && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Result: {o.resultValue}
                          {o.test?.unit && o.test.unit !== "—" && (
                            <span className="muted ml-1">{o.test.unit}</span>
                          )}
                        </p>
                        <p className="muted text-xs">
                          Ref: {o.test?.referenceRange} ·{" "}
                          {o.resultedAt &&
                            new Date(o.resultedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`badge ${flagBadge(o.resultFlag)}`}>
                        {o.resultFlag ?? "—"}
                      </span>
                    </div>
                  </div>
                )}

                {!isFinished && o.status !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => openResultForm(o)}
                    className="mt-3 text-sm font-medium text-accent-600 hover:text-accent-800"
                  >
                    Enter result →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {resultFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitResult}
            className="card w-full max-w-md shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Enter Result
            </h2>
            <p className="muted mt-1 text-sm">
              {resultFor.test?.name} ({resultFor.test?.code})
            </p>
            <p className="muted text-xs">
              Reference: {resultFor.test?.referenceRange}
              {resultFor.test?.unit &&
                resultFor.test.unit !== "—" &&
                ` (${resultFor.test.unit})`}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Result value *</label>
                <input
                  className="input"
                  value={resultValue}
                  onChange={(e) => setResultValue(e.target.value)}
                  placeholder={
                    resultFor.test?.unit && resultFor.test.unit !== "—"
                      ? `e.g. 42 ${resultFor.test.unit}`
                      : "e.g. Positive / Negative"
                  }
                  required
                />
              </div>
              <div>
                <label className="label">
                  Flag (auto-detected if left blank)
                </label>
                <select
                  className="input"
                  value={resultFlag}
                  onChange={(e) => setResultFlag(e.target.value as any)}
                >
                  <option value="">Auto-detect</option>
                  <option value="NORMAL">Normal</option>
                  <option value="ABNORMAL">Abnormal</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={!resultValue.trim() || resultSaving}
              >
                {resultSaving ? "Saving…" : "Save result"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResultFor(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}