
**Ctrl+S.**

---

### 📄 File 6 — `apps/web/package.json` (optional — for internal name)

Open it. Change the `"name"` field from `@clinic-two/web` to `@cura/web`.

**Then do the same across the workspace:**

| File | Old name | New name |
|---|---|---|
| `apps/web/package.json` | `@clinic-two/web` | `@cura/web` |
| `apps/api/package.json` | `@clinic-two/api` | `@cura/api` |
| `apps/worker/package.json` | `@clinic-two/worker` | `@cura/worker` |
| `packages/db-client/package.json` | `@clinic-two/db-client` | `@cura/db-client` |
| `packages/auth/package.json` | `@clinic-two/auth` | `@cura/auth` |
| `packages/audit/package.json` | `@clinic-two/audit` | `@cura/audit` |
| `packages/config/package.json` | `@clinic-two/config` | `@cura/config` |
| `packages/fhir-models/package.json` | `@clinic-two/fhir-models` | `@cura/fhir-models` |
| `packages/ui/package.json` | `@clinic-two/ui` | `@cura/ui` |
| `services/emr/package.json` | `@clinic-two/emr` | `@cura/emr` |
| `services/billing/package.json` | `@clinic-two/billing` | `@cura/billing` |
| `services/pharmacy/package.json` | `@clinic-two/pharmacy` | `@cura/pharmacy` |
| `services/lab/package.json` | `@clinic-two/lab` | `@cura/lab` |
| `services/hr/package.json` | `@clinic-two/hr` | `@cura/hr` |
| `services/hmo/package.json` | `@clinic-two/hmo` | `@cura/hmo` |
| `services/cds/package.json` | `@clinic-two/cds` | `@cura/cds` |

**AND every `import { ... } from "@clinic-two/X"` across the codebase needs to become `@cura/X`.**

**⚠️ This is a big mechanical change.** Skip it for now — do it later as a dedicated "rename" commit. The **user-facing name** is what matters most. Internal package names can stay `@clinic-two/*` forever without anyone knowing or caring.

**My recommendation:** skip this file for now. Just change the display name.

---

## 🔧 Then restart everything

**In the API terminal:**

```powershell
# Ctrl+C
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
pnpm --filter @clinic-two/api dev