const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ApiError {
  message: string;
  status: number;
}

const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("clinic_two_token");
};

const setToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("clinic_two_token", token);
};

const clearToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("clinic_two_token");
};

const request = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined)
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {}
    throw { message, status: res.status } as ApiError;
  }

  return res.json() as Promise<T>;
};

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" })
};

// ── Auth ──
export const auth = {
  setToken,
  getToken,
  clearToken,

  login: async (tenantSlug: string, email: string, password: string) => {
    const res = await api.post<{
      data: {
        token: string;
        user: { id: string; email: string; role: string; tenantId: string };
      };
    }>("/api/auth/login", { tenantSlug, email, password });
    setToken(res.data.token);
    if (typeof window !== "undefined") {
      localStorage.setItem("clinic_two_user", JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout: () => {
    clearToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("clinic_two_user");
    }
  },

  getUser: () => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("clinic_two_user");
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated: () => !!getToken()
};

// ── Encounters ──
export interface EncounterRecord {
  id: string;
  patientId: string;
  providerId: string;
  type: string;
  status: string;
  reason: string | null;
  startedAt: string;
  endedAt: string | null;
  fhirResource: any;
}

export const encounters = {
  list: (patientId?: string) =>
    api.get<{ data: EncounterRecord[] }>(
      `/api/encounters${patientId ? `?patientId=${patientId}` : ""}`
    ),
  get: (id: string) =>
    api.get<{ data: EncounterRecord }>(`/api/encounters/${id}`),
  create: (payload: {
    patientId: string;
    providerId: string;
    type: string;
    reason?: string;
  }) => api.post<{ data: EncounterRecord }>("/api/encounters", payload),
  finish: (id: string) =>
    api.patch<{ data: EncounterRecord }>(`/api/encounters/${id}/finish`, {})
};

// ── Vitals ──
export interface VitalRecord {
  id: string;
  encounterId: string;
  recordedAt: string;
  temperatureC: number | null;
  heartRateBpm: number | null;
  respRateBpm: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
}

export const vitals = {
  list: (encounterId: string) =>
    api.get<{ data: VitalRecord[] }>(`/api/vitals/${encounterId}`),
  create: (payload: {
    encounterId: string;
    temperatureC?: number;
    heartRateBpm?: number;
    respRateBpm?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    spo2?: number;
    weightKg?: number;
    heightCm?: number;
  }) => api.post<{ data: VitalRecord }>("/api/vitals", payload)
};

// ── Notes ──
export interface NoteRecord {
  id: string;
  encounterId: string;
  authorId: string;
  content: string;
  version: number;
  createdAt: string;
}

export const notes = {
  list: (encounterId: string) =>
    api.get<{ data: NoteRecord[] }>(`/api/notes/${encounterId}`),
  create: (payload: { encounterId: string; content: string }) =>
    api.post<{ data: NoteRecord }>("/api/notes", payload)
};

// ── Diagnoses ──
export interface DiagnosisRecord {
  id: string;
  encounterId: string;
  code: string;
  display: string;
  certainty: string | null;
  createdAt: string;
}

export const diagnoses = {
  create: (payload: {
    encounterId: string;
    code: string;
    display: string;
    certainty?: string;
  }) => api.post<{ data: DiagnosisRecord }>("/api/diagnoses", payload)
};

// ── Drugs ──
export interface DrugRecord {
  id: string;
  name: string;
  genericName: string | null;
  form: string | null;
  strength: string | null;
}

export const drugs = {
  list: () => api.get<{ data: DrugRecord[] }>("/api/drugs")
};

// ── Prescriptions + CDS ──
export interface PrescriptionRecord {
  id: string;
  patientId: string;
  drugId: string;
  dose: string;
  frequency: string;
  durationDays: number;
  status: string;
  createdAt: string;
  drug: DrugRecord;
}

export interface CdsAlert {
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  source: string;
  drug?: string;
}

export interface CdsResult {
  alerts: CdsAlert[];
  blocking: boolean;
}

export const prescriptions = {
  list: (patientId?: string) =>
    api.get<{ data: PrescriptionRecord[] }>(
      `/api/prescriptions${patientId ? `?patientId=${patientId}` : ""}`
    ),

  preview: (patientId: string, drugId: string) =>
    api.post<{ data: CdsResult }>("/api/prescriptions/preview", {
      patientId,
      drugId
    }),

  create: (payload: {
    patientId: string;
    drugId: string;
    encounterId?: string;
    dose: string;
    frequency: string;
    durationDays: number;
    overrideReason?: string;
  }) =>
    api.post<{
      data: PrescriptionRecord;
      cds: CdsResult & { overridden: boolean };
    }>("/api/prescriptions", payload)
};