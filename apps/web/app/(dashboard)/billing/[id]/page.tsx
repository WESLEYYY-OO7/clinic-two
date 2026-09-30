"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  invoices as invApi,
  payments as payApi,
  type InvoiceRecord
} from "@/lib/api";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [error, setError] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "CASH" as "CASH" | "TRANSFER" | "POS" | "HMO" | "CARD",
    reference: ""
  });
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!id) return;
    try {
      const res = await invApi.get(id);
      setInvoice(res.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await payApi.record({
        invoiceId: id,
        amount: Number(payForm.amount),
        method: payForm.method,
        reference: payForm.reference || undefined
      });
      setShowPay(false);
      setPayForm({ amount: "", method: "CASH", reference: "" });
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  if (error && !invoice) {
    return (
      <div className="card">
        <p className="text-brand-700">{error}</p>
        <button
          className="btn btn-secondary mt-4"
          onClick={() => router.back()}
        >
          Go back
        </button>
      </div>
    );
  }

  if (!invoice) return <p className="muted">Loading…</p>;

  const balance = Number(invoice.balance);
  const isVoided = invoice.status === "VOID";

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="muted font-mono text-sm">{invoice.number}</span>
            <span
              className={`badge ${
                invoice.status === "PAID"
                  ? "badge-green"
                  : invoice.status === "PARTIALLY_PAID"
                  ? "badge-amber"
                  : invoice.status === "VOID"
                  ? "badge-slate"
                  : "badge-blue"
              }`}
            >
              {invoice.status}
            </span>
          </div>
          {invoice.patient && (
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              {invoice.patient.firstName} {invoice.patient.lastName}
            </h1>
          )}
          <p className="muted mt-1">
            Issued{" "}
            {invoice.issuedAt
              ? new Date(invoice.issuedAt).toLocaleString()
              : "—"}
          </p>
        </div>
        <div className="flex gap-3">
          {!isVoided && balance > 0.01 && (
            <button
              className="btn btn-primary"
              onClick={() => setShowPay(true)}
            >
              Record Payment
            </button>
          )}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Unit</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((li) => (
                <tr key={li.id} className="border-t">
                  <td className="py-2">{li.description}</td>
                  <td className="py-2 text-right">{li.quantity}</td>
                  <td className="py-2 text-right">
                    ₦{Number(li.unitPrice).toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    ₦{Number(li.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2">
              <tr>
                <td colSpan={3} className="pt-3 text-right text-sm">
                  Subtotal
                </td>
                <td className="pt-3 text-right">
                  ₦{Number(invoice.subtotal).toLocaleString()}
                </td>
              </tr>
              {Number(invoice.tax) > 0 && (
                <tr>
                  <td colSpan={3} className="text-right text-sm">
                    Tax
                  </td>
                  <td className="text-right">
                    ₦{Number(invoice.tax).toLocaleString()}
                  </td>
                </tr>
              )}
              {Number(invoice.discount) > 0 && (
                <tr>
                  <td colSpan={3} className="text-right text-sm">
                    Discount
                  </td>
                  <td className="text-right">
                    -₦{Number(invoice.discount).toLocaleString()}
                  </td>
                </tr>
              )}
              <tr className="font-semibold">
                <td colSpan={3} className="pt-2 text-right">
                  Total
                </td>
                <td className="pt-2 text-right">
                  ₦{Number(invoice.total).toLocaleString()}
                </td>
              </tr>
              <tr className="font-semibold text-brand-700">
                <td colSpan={3} className="text-right">
                  Balance
                </td>
                <td className="text-right">₦{balance.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Payments ({invoice.payments.length})
          </h2>
          {invoice.payments.length === 0 ? (
            <p className="muted mt-4">No payments recorded.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {invoice.payments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border-l-4 border-l-green-500 bg-slate-50 p-3"
                >
                  <p className="font-medium text-slate-900">
                    ₦{Number(p.amount).toLocaleString()}
                  </p>
                  <p className="muted text-xs">
                    {p.method} · {new Date(p.receivedAt).toLocaleString()}
                  </p>
                  {p.reference && (
                    <p className="muted text-xs">Ref: {p.reference}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handlePayment}
            className="card w-full max-w-md shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Record Payment
            </h2>
            <p className="muted mt-1 text-sm">
              Outstanding: ₦{balance.toLocaleString()}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Amount (₦) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm({ ...payForm, amount: e.target.value })
                  }
                  max={balance}
                  required
                />
              </div>
              <div>
                <label className="label">Method *</label>
                <select
                  className="input"
                  value={payForm.method}
                  onChange={(e) =>
                    setPayForm({ ...payForm, method: e.target.value as any })
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Bank Transfer</option>
                  <option value="POS">POS</option>
                  <option value="HMO">HMO</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
              <div>
                <label className="label">Reference (optional)</label>
                <input
                  className="input"
                  value={payForm.reference}
                  onChange={(e) =>
                    setPayForm({ ...payForm, reference: e.target.value })
                  }
                  placeholder="Bank ref, POS slip, etc."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={saving}
              >
                {saving ? "Recording…" : "Record payment"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPay(false)}
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