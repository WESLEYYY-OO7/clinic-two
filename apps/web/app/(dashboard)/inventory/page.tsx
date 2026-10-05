"use client";
import { useEffect, useMemo, useState } from "react";
import {
  items as itemsApi,
  locations as locsApi,
  stock as stockApi,
  type ItemRecord,
  type StockLocationRecord,
  type StockLevelRecord,
  type StockMovementRecord,
  type StockBatchRecord
} from "@/lib/api";

type Tab = "catalogue" | "levels" | "movements" | "receive" | "dispense";

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("catalogue");
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [locations, setLocations] = useState<StockLocationRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [i, l] = await Promise.all([itemsApi.list(), locsApi.list()]);
      setItems(i.data);
      setLocations(l.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "catalogue", label: "Catalogue" },
    { key: "levels", label: "Stock Levels" },
    { key: "movements", label: "Movements" },
    { key: "receive", label: "Receive" },
    { key: "dispense", label: "Dispense" }
  ];

  const stats = useMemo(() => {
    const low = items.filter(
      (i) => i.totalStock !== undefined && i.totalStock > 0 && i.totalStock < i.reorderLevel
    ).length;
    const out = items.filter((i) => i.totalStock === 0).length;
    return { total: items.length, low, out };
  }, [items]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
          <p className="muted mt-1">
            {stats.total} items · {stats.low} low stock · {stats.out} out of stock
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card border-l-4 border-l-accent-500">
          <p className="muted text-sm">Total Items</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="card border-l-4 border-l-amber-500">
          <p className="muted text-sm">Low Stock</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">
            {stats.low}
          </p>
        </div>
        <div className="card border-l-4 border-l-brand-500">
          <p className="muted text-sm">Out of Stock</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">
            {stats.out}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          {error}
        </div>
      )}

      {tab === "catalogue" && <CatalogueTab items={items} loading={loading} onRefresh={refresh} />}
      {tab === "levels" && <LevelsTab locations={locations} />}
      {tab === "movements" && <MovementsTab items={items} locations={locations} />}
      {tab === "receive" && (
        <ReceiveTab items={items} locations={locations} onComplete={refresh} />
      )}
      {tab === "dispense" && (
        <DispenseTab items={items} locations={locations} onComplete={refresh} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Catalogue Tab
// ─────────────────────────────────────────────
function CatalogueTab({
  items,
  loading,
  onRefresh
}: {
  items: ItemRecord[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = items.filter((i) => {
    if (category && i.category !== category) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !i.name.toLowerCase().includes(s) &&
        !i.code.toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  const catLabel: Record<string, string> = {
    DRUG: "Drug",
    INJECTION: "Injection",
    CONSUMABLE: "Consumable",
    EQUIPMENT: "Equipment",
    REAGENT: "Reagent"
  };

  const statusBadge = (item: ItemRecord) => {
    const total = item.totalStock ?? 0;
    if (total === 0) return { cls: "badge-red", label: "Out" };
    if (total < item.reorderLevel) return { cls: "badge-amber", label: "Low" };
    return { cls: "badge-green", label: "OK" };
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="input max-w-sm"
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-[200px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          <option value="DRUG">Drugs</option>
          <option value="INJECTION">Injections</option>
          <option value="CONSUMABLE">Consumables</option>
          <option value="EQUIPMENT">Equipment</option>
          <option value="REAGENT">Reagents</option>
        </select>
        <button className="btn btn-primary ml-auto" onClick={() => setShowNew(true)}>
          + New Item
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <p className="muted p-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="muted p-6">No items.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">In Stock</th>
                <th className="px-4 py-3 text-right">Reorder</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const s = statusBadge(i);
                return (
                  <tr key={i.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{i.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {i.name}
                    </td>
                    <td className="px-4 py-3">{catLabel[i.category] ?? i.category}</td>
                    <td className="px-4 py-3 text-slate-500">{i.unit}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {i.totalStock ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {i.reorderLevel}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.cls}`}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewItemModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Levels Tab
// ─────────────────────────────────────────────
function LevelsTab({ locations }: { locations: StockLocationRecord[] }) {
  const [levels, setLevels] = useState<StockLevelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stockApi
      .levels()
      .then((r) => setLevels(r.data))
      .catch(() => setLevels([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading…</p>;

  const statusCls = (s: string) =>
    s === "OUT" ? "badge-red" : s === "LOW" ? "badge-amber" : "badge-green";

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3 text-right">Total</th>
            {locations.map((loc) => (
              <th key={loc.id} className="px-4 py-3 text-right">
                {loc.name}
              </th>
            ))}
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((l) => (
            <tr key={l.id} className="border-t hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{l.name}</p>
                <p className="muted font-mono text-xs">{l.code}</p>
              </td>
              <td className="px-4 py-3 text-right font-medium">{l.total}</td>
              {locations.map((loc) => {
                const qty = l.perLocation[loc.id] ?? 0;
                return (
                  <td
                    key={loc.id}
                    className={`px-4 py-3 text-right ${
                      qty === 0 ? "text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {qty}
                  </td>
                );
              })}
              <td className="px-4 py-3">
                <span className={`badge ${statusCls(l.status)}`}>
                  {l.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Movements Tab
// ─────────────────────────────────────────────
function MovementsTab({
  items,
  locations
}: {
  items: ItemRecord[];
  locations: StockLocationRecord[];
}) {
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterItem, setFilterItem] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const load = () => {
    setLoading(true);
    stockApi
      .movements({
        itemId: filterItem || undefined,
        locationId: filterLocation || undefined,
        limit: 200
      })
      .then((r) => setMovements(r.data))
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterItem, filterLocation]);

  const typeBadge = (t: string) => {
    if (t === "RECEIVE" || t === "TRANSFER_IN" || t === "ADJUST_IN" || t === "RETURN")
      return "badge-green";
    if (t === "DISPENSE" || t === "TRANSFER_OUT" || t === "ADJUST_OUT" || t === "EXPIRE")
      return "badge-red";
    return "badge-slate";
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="input max-w-[220px]"
          value={filterItem}
          onChange={(e) => setFilterItem(e.target.value)}
        >
          <option value="">All items</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[200px]"
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <p className="muted p-6">Loading…</p>
        ) : movements.length === 0 ? (
          <p className="muted p-6">No movements.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{m.item.name}</p>
                    <p className="muted font-mono text-xs">{m.item.code}</p>
                  </td>
                  <td className="px-4 py-3">{m.location.name}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${typeBadge(m.type)}`}>
                      {m.type}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      m.quantity < 0 ? "text-brand-700" : "text-green-700"
                    }`}
                  >
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {m.reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Receive Tab
// ─────────────────────────────────────────────
function ReceiveTab({
  items,
  locations,
  onComplete
}: {
  items: ItemRecord[];
  locations: StockLocationRecord[];
  onComplete: () => void;
}) {
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await stockApi.receive({
        itemId,
        locationId,
        batchNumber,
        expiryDate: new Date(expiryDate).toISOString(),
        quantity: Number(quantity),
        costPrice: costPrice ? Number(costPrice) : undefined,
        supplier: supplier || undefined,
        reason: notes || undefined
      });
      setSuccess(
        `Received ${quantity} ${res.data.batch.batchNumber}`
      );
      setItemId("");
      setLocationId("");
      setBatchNumber("");
      setExpiryDate("");
      setQuantity("");
      setCostPrice("");
      setSupplier("");
      setNotes("");
      onComplete();
    } catch (e: any) {
      setError(e?.message || "Failed to receive");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-900">Receive Stock</h2>
      <p className="muted mt-1 text-sm">
        Records a Goods Received Note (GRN). Creates a new batch and logs a RECEIVE movement.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">Item *</label>
          <select
            className="input"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            required
          >
            <option value="">— Select item —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.code} — {i.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Location *</label>
          <select
            className="input"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
          >
            <option value="">— Select location —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Batch number *</label>
            <input
              className="input"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="e.g. BATCH-2026-003"
              required
            />
          </div>
          <div>
            <label className="label">Expiry date *</label>
            <input
              type="date"
              className="input"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quantity *</label>
            <input
              type="number"
              className="input"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Cost price per unit (₦)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              min={0}
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Supplier</label>
          <input
            className="input"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="e.g. Emzor Pharmaceuticals"
          />
        </div>

        <div>
          <label className="label">Reason / notes</label>
          <input
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Monthly restock"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            ✅ {success}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Receiving…" : "Receive stock"}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dispense Tab
// ─────────────────────────────────────────────
function DispenseTab({
  items,
  locations,
  onComplete
}: {
  items: ItemRecord[];
  locations: StockLocationRecord[];
  onComplete: () => void;
}) {
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await stockApi.dispense({
        itemId,
        locationId,
        quantity: Number(quantity),
        reason: reason || undefined
      });
      setSuccess(`Dispensed ${quantity} units`);
      setItemId("");
      setLocationId("");
      setQuantity("");
      setReason("");
      onComplete();
    } catch (e: any) {
      setError(e?.message || "Failed to dispense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-900">Dispense Stock</h2>
      <p className="muted mt-1 text-sm">
        Uses FEFO (First-Expiry-First-Out). The batch with the earliest expiry is used first.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">Item *</label>
          <select
            className="input"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            required
          >
            <option value="">— Select item —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.code} — {i.name} ({i.totalStock ?? 0} in stock)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">From location *</label>
          <select
            className="input"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
          >
            <option value="">— Select location —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Quantity *</label>
          <input
            type="number"
            className="input"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Reason (optional)</label>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Dispensed to patient"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            ✅ {success}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Dispensing…" : "Dispense stock"}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────
// New Item Modal
// ─────────────────────────────────────────────
function NewItemModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("DRUG");
  const [unit, setUnit] = useState("TABLET");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await itemsApi.create({
        code,
        name,
        category,
        unit,
        reorderLevel: Number(reorderLevel) || 0
      });
      onCreated();
    } catch (e: any) {
      setError(e?.message || "Failed to create item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-md shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">New Item</h2>
        <p className="muted mt-1 text-sm">Add a product to the catalogue</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Code *</label>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. PARA-500"
              required
            />
          </div>
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paracetamol 500mg"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="DRUG">Drug</option>
                <option value="INJECTION">Injection</option>
                <option value="CONSUMABLE">Consumable</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="REAGENT">Reagent</option>
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <select
                className="input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="TABLET">Tablet</option>
                <option value="CAPSULE">Capsule</option>
                <option value="VIAL">Vial</option>
                <option value="AMPOULE">Ampoule</option>
                <option value="BOTTLE">Bottle</option>
                <option value="BOX">Box</option>
                <option value="SACHET">Sachet</option>
                <option value="PIECE">Piece</option>
                <option value="PAIR">Pair</option>
                <option value="SET">Set</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Reorder level</label>
            <input
              type="number"
              className="input"
              min={0}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={saving}
          >
            {saving ? "Creating…" : "Create item"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}