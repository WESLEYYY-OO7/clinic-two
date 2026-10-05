"use client";
import { useEffect, useState } from "react";
import { auth, users, type StaffRecord } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  CLINIC_ADMIN: "Clinic Admin",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  PHARMACIST: "Pharmacist",
  LAB_TECH: "Lab Technician",
  RECEPTIONIST: "Receptionist",
  BILLING: "Billing",
  HR: "HR"
};

export default function SettingsPage() {
  const [tab, setTab] = useState<"users" | "profile">("users");
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const currentUser = auth.getUser();

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await users.list();
      setStaff(res.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="muted mt-1">Manage your clinic</p>

      <div className="mb-6 mt-6 flex gap-1 border-b">
        {(["users", "profile"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t === "users" ? "Staff & Roles" : "My Profile"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          {error}
        </div>
      )}

      {tab === "users" && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="muted">{staff.length} staff members</p>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              + Add Staff
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            {loading ? (
              <p className="muted p-6">Loading…</p>
            ) : staff.length === 0 ? (
              <p className="muted p-6">No staff yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {s.fullName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className="badge badge-purple">
                          {ROLE_LABELS[s.role] ?? s.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            s.isActive ? "badge-green" : "badge-red"
                          }`}
                        >
                          {s.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {s.lastLoginAt
                          ? new Date(s.lastLoginAt).toLocaleString()
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === "profile" && (
        <div className="card max-w-lg">
          <h2 className="text-lg font-semibold text-slate-900">
            My Profile
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="muted">Email</dt>
              <dd className="text-slate-900">{currentUser?.email}</dd>
            </div>
            <div>
              <dt className="muted">Role</dt>
              <dd className="text-slate-900">
                {ROLE_LABELS[currentUser?.role ?? ""] ?? currentUser?.role}
              </dd>
            </div>
            <div>
              <dt className="muted">Tenant ID</dt>
              <dd className="font-mono text-xs text-slate-900">
                {currentUser?.tenantId}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {showCreate && (
        <CreateStaffModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function CreateStaffModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("DOCTOR");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await users.create({
        email,
        password,
        fullName,
        role,
        ...(phone ? { phone } : {})
      });
      onCreated();
    } catch (e: any) {
      setErr(e?.message || "Failed to create user");
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
        <h2 className="text-lg font-semibold text-slate-900">Add Staff</h2>
        <p className="muted mt-1 text-sm">
          Create a new user with a specific role
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Full name *</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password *</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="label">Role *</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="DOCTOR">Doctor</option>
              <option value="NURSE">Nurse</option>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="LAB_TECH">Lab Technician</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="BILLING">Billing</option>
              <option value="HR">HR</option>
              <option value="CLINIC_ADMIN">Clinic Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234..."
            />
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            {err}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={saving}
          >
            {saving ? "Creating…" : "Create user"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}