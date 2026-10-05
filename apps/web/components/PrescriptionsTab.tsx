"use client";
import { useEffect, useMemo, useState } from "react";
import {
  drugs as drugsApi,
  prescriptions as rxApi,
  items as itemsApi,
  locations as locsApi,
  type DrugRecord,
  type PrescriptionRecord,
  type CdsAlert,
  type ItemRecord,
  type StockLocationRecord
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
  const [dispenseFor, setDispenseFor] = useState<PrescriptionRecord | null>(null);

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

  const statusBadge = (s: string) => {
    if (s === "DISPENSED") return "badge-green";
    if (s === "CANCELLED") return "badge-slate";
    return "badge-amber";
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Prescribe form */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900">
          New Prescription
        </h2>

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
            <div className="mt-1 max-h-64 overflow-auto rounded-lg border bg-white shadow-lg">
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
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
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
                className={`rounded-lg border p-3 text-sm ${sevColor(a.severity)}`}
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
            className={`mt-4 rounded-lg p-3 text-sm ${
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

      {/* Existing prescriptions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900">
          Prescriptions ({list.length})
        </h2>
        {list.length === 0 ? (
          <p className="muted mt-4">No prescriptions yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {list.map((p) => (
              <div key={p.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
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
                    <p className="muted mt-1 text-xs">
                      {new Date(p.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`badge ${statusBadge(p.status)}`}>
                    {p.status}
                  </span>
                </div>

                {p.status === "PENDING" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDispenseFor(p)}
                      className="text-sm font-medium text-accent-600 hover:text-accent-800"
                    >
                      💊 Dispense →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispense modal */}
      {dispenseFor && (
        <DispenseModal
          prescription={dispenseFor}
          onClose={() => setDispenseFor(null)}
          onDispensed={() => {
            setDispenseFor(null);
            refresh();
            setToast({ kind: "success", text: "Dispensed successfully" });
            setTimeout(() => setToast(null), 5000);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Dispense Modal
// ─────────────────────────────────────────────
function DispenseModal({
  prescription,
  onClose,
  onDispensed
}: {
  prescription: PrescriptionRecord;
  onClose: () => void;
  onDispensed: () => void;
}) {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [locations, setLocations] = useState<StockLocationRecord[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemRecord | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [quantity, setQuantity] = useState(prescription.durationDays);
  const [itemSearch, setItemSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [i, l] = await Promise.all([itemsApi.list(), locsApi.list()]);
        setItems(i.data);
        setLocations(l.data);

        // Default location: first PHARMACY
        const pharmacy = l.data.find((x) => x.type === "PHARMACY");
        if (pharmacy) setSelectedLocation(pharmacy.id);

        // Auto-match item by drug name
        const drugName = prescription.drug.name.toLowerCase();
        const match =
          i.data.find((x) => x.name.toLowerCase() === drugName) ??
          i.data.find((x) => x.name.toLowerCase().includes(drugName)) ??
          i.data.find((x) =>
            drugName.includes(x.name.toLowerCase().split(" ")[0])
          );
        if (match) setSelectedItem(match);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return [];
    const q = itemSearch.toLowerCase();
    return items
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [itemSearch, items]);

  const handleDispense = async () => {
    if (!selectedItem || !selectedLocation || quantity <= 0) return;
    setDispensing(true);
    setError("");
    try {
      await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        }/api/prescriptions/${prescription.id}/dispense`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("cura_token")}`
          },
          body: JSON.stringify({
            itemId: selectedItem.id,
            locationId: selectedLocation,
            quantity
          })
        }
      ).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed (${res.status})`);
        }
        return res.json();
      });
      onDispensed();
    } catch (e: any) {
      setError(e?.message || "Dispense failed");
    } finally {
      setDispensing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-lg shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Dispense Prescription
        </h2>
        <p className="muted mt-1 text-sm">
          {prescription.drug.name} — {prescription.dose} ·{" "}
          {prescription.frequency} × {prescription.durationDays}d
        </p>

        {loading ? (
          <p className="muted mt-6">Loading inventory…</p>
        ) : (
          <>
            <div className="mt-4 space-y-4">
              {/* Item */}
              <div>
                <label className="label">Inventory item *</label>
                <input
                  className="input"
                  placeholder="Search item…"
                  value={
                    selectedItem
                      ? `${selectedItem.name} (${selectedItem.code})`
                      : itemSearch
                  }
                  onChange={(e) => {
                    setSelectedItem(null);
                    setItemSearch(e.target.value);
                  }}
                />
                {!selectedItem && filteredItems.length > 0 && (
                  <div className="mt-1 max-h-48 overflow-auto rounded-lg border bg-white shadow-lg">
                    {filteredItems.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => {
                          setSelectedItem(i);
                          setItemSearch("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-medium">{i.name}</span>
                        <span className="muted ml-2 text-xs">{i.code}</span>
                        <span className="muted ml-2 text-xs">
                          ({i.totalStock ?? 0} in stock)
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="label">From location *</label>
                <select
                  className="input"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="">— Select location —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="label">Quantity *</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                />
                <p className="muted mt-1 text-xs">
                  Defaults to duration ({prescription.durationDays} units)
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={handleDispense}
                disabled={
                  !selectedItem ||
                  !selectedLocation ||
                  quantity <= 0 ||
                  dispensing
                }
              >
                {dispensing ? "Dispensing…" : "Dispense"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}