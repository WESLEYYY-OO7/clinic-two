"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "MALE",
    phone: "",
    email: "",
    address: "",
    bloodGroup: "",
    allergies: ""
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender
      };
      if (form.middleName) payload.middleName = form.middleName;
      if (form.phone) payload.phone = form.phone;
      if (form.email) payload.email = form.email;
      if (form.address) payload.address = form.address;
      if (form.bloodGroup) payload.bloodGroup = form.bloodGroup;
      if (form.allergies) {
        payload.allergies = form.allergies.split(",").map((s) => s.trim()).filter(Boolean);
      }

      const res = await api.post<{ data: { id: string } }>("/api/patients", payload);
      router.push(`/patients/${res.data.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">New Patient</h1>
      <p className="muted mt-1">Register a new patient</p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">First name *</label>
            <input
              className="input"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Middle name</label>
            <input
              className="input"
              value={form.middleName}
              onChange={(e) => update("middleName", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Last name *</label>
            <input
              className="input"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Date of birth *</label>
            <input
              type="date"
              className="input"
              value={form.dateOfBirth}
              onChange={(e) => update("dateOfBirth", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Gender *</label>
            <select
              className="input"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>
          <div>
            <label className="label">Blood group</label>
            <input
              className="input"
              value={form.bloodGroup}
              onChange={(e) => update("bloodGroup", e.target.value)}
              placeholder="e.g. O+"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>

        <div>
          <label className="label">Allergies (comma-separated)</label>
          <input
            className="input"
            value={form.allergies}
            onChange={(e) => update("allergies", e.target.value)}
            placeholder="penicillin, sulfa"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creating…" : "Create patient"}
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