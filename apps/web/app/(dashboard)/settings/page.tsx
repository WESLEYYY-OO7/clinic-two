"use client";
import { auth } from "@/lib/api";

export default function SettingsPage() {
  const user = auth.getUser();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="muted mt-1">Workspace and account settings.</p>
      <div className="card mt-6">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="muted">Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt className="muted">Role</dt>
            <dd>{user?.role}</dd>
          </div>
          <div>
            <dt className="muted">Tenant ID</dt>
            <dd className="font-mono text-xs">{user?.tenantId}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
