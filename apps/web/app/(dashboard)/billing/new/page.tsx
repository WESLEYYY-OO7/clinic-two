"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, invoices } from "@/lib/api";

interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 }
  ]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ data: Patient[] }>("/api/patients")
      .then((res) => setPatients(res.data))
      .catch(() => setPatients([]));
  }, []);

  const updateItem = (i: number, field: keyof LineItem, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = () =>
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);

  const removeItem = (i: number) =>
    setItems(items.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = subtotal + tax - discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const validItems = items.filter(
        (i) => i.description.trim() && i.quantity > 0
      );
      if (validItems.length === 0)
        throw new Error("Add at least one line item");

      const res = await invoices.create({
        patientId,
        tax,
        discount,
        lineItems: validItems
      });

      router.push(`/billing/${res.data.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">New Invoice</h1>
      <p className="muted mt-1">Create a patient invoice</p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-6">
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
          <div className="mb-3 flex items-center justify-between">
            <label className="label m-0">Line Items</label>
            <button
              type="button"
              className="text-sm font-medium text-accent-600 hover:text-accent-800"
              onClick={addItem}
            >
              + Add line
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  className="input col-span-6"
                  placeholder="Description (e.g. Consultation)"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(i, "description", e.target.value)
                  }
                />
                <input
                  type="number"
                  className="input col-span-2"
                  placeholder="Qty"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(i, "quantity", Number(e.target.value) || 1)
                  }
                />
                <input
                  type="number"
                  className="input col-span-3"
                  placeholder="Unit (₦)"
                  min={0}
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(i, "unitPrice", Number(e.target.value) || 0)
                  }
                />
                <button
                  type="button"
                  className="col-span-1 text-lg text-brand-600 hover:text-brand-800"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tax (₦)</label>
            <input
              type="number"
              className="input"
              min={0}
              value={tax}
              onChange={(e) => setTax(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label">Discount (₦)</label>
            <input
              type="number"
              className="input"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-gradient-to-br from-slate-50 to-white p-5">
          <div className="flex justify-between text-sm">
            <span className="muted">Subtotal</span>
            <span>₦{subtotal.toLocaleString()}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="muted">Tax</span>
            <span>₦{tax.toLocaleString()}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="muted">Discount</span>
            <span>-₦{discount.toLocaleString()}</span>
          </div>
          <div className="mt-3 flex justify-between border-t pt-3 text-lg font-semibold text-slate-900">
            <span>Total</span>
            <span>₦{total.toLocaleString()}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creating…" : "Create invoice"}
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