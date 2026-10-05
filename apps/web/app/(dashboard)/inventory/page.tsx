"use client";

export default function InventoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
      <p className="muted mt-1">
        Materials, drugs, injections, and consumables
      </p>

      <div className="mt-8 card text-center py-16">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-accent-50 text-3xl">
          📦
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          Inventory coming soon
        </h2>
        <p className="muted mx-auto mt-2 max-w-md text-sm">
          Full stock control — catalogue, batches, FEFO dispensing, transfers,
          adjustments, and reorder alerts. This is the next major module.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="muted text-xs uppercase tracking-wider">Planned</p>
          <p className="mt-2 font-medium text-slate-900">Item catalogue</p>
        </div>
        <div className="card">
          <p className="muted text-xs uppercase tracking-wider">Planned</p>
          <p className="mt-2 font-medium text-slate-900">Stock levels</p>
        </div>
        <div className="card">
          <p className="muted text-xs uppercase tracking-wider">Planned</p>
          <p className="mt-2 font-medium text-slate-900">Movements ledger</p>
        </div>
        <div className="card">
          <p className="muted text-xs uppercase tracking-wider">Planned</p>
          <p className="mt-2 font-medium text-slate-900">Receive & dispense</p>
        </div>
      </div>
    </div>
  );
}