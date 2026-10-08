const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ApiError {
  message: string;
  status: number;
}

const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cura_token");
};

const setToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("cura_token", token);
};

const clearToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("cura_token");
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

    // Auto-logout on auth failures
    if (res.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem("cura_user");
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }

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
      localStorage.setItem("cura_user", JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout: () => {
    clearToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("cura_user");
    }
  },

  getUser: () => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("cura_user");
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated: () => !!getToken(),

  me: () =>
    api.get<{
      data: {
        user: {
          id: string;
          email: string;
          fullName: string;
          role: string;
          tenantId: string;
          lastLoginAt: string | null;
        };
        role: string;
        menu: string[];
        permissions: string[];
      };
    }>("/api/me")
};

// ── Users ──
export interface StaffRecord {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export const users = {
  list: () => api.get<{ data: StaffRecord[] }>("/api/users"),
  create: (payload: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    phone?: string;
  }) => api.post<{ data: StaffRecord }>("/api/users", payload),
  update: (id: string, payload: Partial<StaffRecord>) =>
    api.patch<{ data: StaffRecord }>(`/api/users/${id}`, payload),
  resetPassword: (id: string, password: string) =>
    api.post<{ data: { ok: boolean } }>(`/api/users/${id}/reset-password`, {
      password
    })
};

// ── Patients ──
export interface PatientRecord {
  id: string;
  mrn: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  bloodGroup: string | null;
  allergies?: string[];
  nextOfKin?: any;
  fhirResource?: any;
  encounters?: any[];
  invoices?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export const patients = {
  list: (q?: string) =>
    api.get<{ data: PatientRecord[] }>(
      `/api/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),
  get: (id: string) =>
    api.get<{ data: PatientRecord }>(`/api/patients/${id}`)
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

// ── Prescriptions ──
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

// ── Invoices + Payments ──
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: string;
  method: string;
  reference: string | null;
  receivedAt: string;
}

export interface InvoiceRecord {
  id: string;
  patientId: string;
  number: string;
  status: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  balance: string;
  issuedAt: string | null;
  createdAt: string;
  lineItems: InvoiceLineItem[];
  payments: PaymentRecord[];
  patient?: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
  };
}

export const invoices = {
  list: (patientId?: string) =>
    api.get<{ data: InvoiceRecord[] }>(
      `/api/invoices${patientId ? `?patientId=${patientId}` : ""}`
    ),
  get: (id: string) =>
    api.get<{ data: InvoiceRecord }>(`/api/invoices/${id}`),
  create: (payload: {
    patientId: string;
    tax?: number;
    discount?: number;
    lineItems: { description: string; quantity: number; unitPrice: number }[];
  }) => api.post<{ data: InvoiceRecord }>("/api/invoices", payload),
  void: (id: string) =>
    api.patch<{ data: InvoiceRecord }>(`/api/invoices/${id}/void`, {})
};

export const payments = {
  record: (payload: {
    invoiceId: string;
    amount: number;
    method: "CASH" | "TRANSFER" | "POS" | "HMO" | "CARD";
    reference?: string;
  }) =>
    api.post<{ data: { payment: PaymentRecord; invoice: InvoiceRecord } }>(
      "/api/payments",
      payload
    )
};

// ── Lab ──
export interface LabTestRecord {
  id: string;
  code: string;
  name: string;
  specimen: string;
  unit: string;
  referenceRange: string;
  isActive: boolean;
}

export interface LabOrderRecord {
  id: string;
  encounterId: string;
  patientId: string;
  testId: string;
  status: string;
  resultValue: string | null;
  resultFlag: string | null;
  resultedAt: string | null;
  resultedById: string | null;
  notes: string | null;
  fhirResource: any;
  createdAt: string;
  test: LabTestRecord | null;
}

export const lab = {
  tests: () => api.get<{ data: LabTestRecord[] }>("/api/lab-orders/tests"),
  list: (filter?: { encounterId?: string; patientId?: string }) => {
    const q = new URLSearchParams();
    if (filter?.encounterId) q.set("encounterId", filter.encounterId);
    if (filter?.patientId) q.set("patientId", filter.patientId);
    const qs = q.toString();
    return api.get<{ data: LabOrderRecord[] }>(
      `/api/lab-orders${qs ? `?${qs}` : ""}`
    );
  },
  get: (id: string) =>
    api.get<{ data: LabOrderRecord }>(`/api/lab-orders/${id}`),
  create: (payload: {
    encounterId: string;
    patientId: string;
    testId: string;
    notes?: string;
  }) => api.post<{ data: LabOrderRecord }>("/api/lab-orders", payload),
  result: (id: string, payload: { resultValue: string; resultFlag?: string }) =>
    api.patch<{ data: LabOrderRecord }>(
      `/api/lab-orders/${id}/result`,
      payload
    )
};

// ── Inventory ──
export interface ItemRecord {
  id: string;
  code: string;
  name: string;
  category: "DRUG" | "INJECTION" | "CONSUMABLE" | "EQUIPMENT" | "REAGENT";
  unit: string;
  reorderLevel: number;
  isActive: boolean;
  totalStock?: number;
  createdAt: string;
}

export interface StockLocationRecord {
  id: string;
  name: string;
  type: "STORE" | "PHARMACY" | "WARD" | "THEATRE" | "LAB";
  isActive: boolean;
}

export interface StockBatchRecord {
  id: string;
  itemId: string;
  locationId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  costPrice: string;
  supplier: string | null;
  location?: StockLocationRecord;
}

export interface StockLevelRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  reorderLevel: number;
  total: number;
  status: "OUT" | "LOW" | "OK";
  perLocation: Record<string, number>;
}

export interface StockMovementRecord {
  id: string;
  itemId: string;
  batchId: string | null;
  locationId: string;
  type: string;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  performedById: string | null;
  createdAt: string;
  item: { id: string; code: string; name: string; unit: string };
  location: { id: string; name: string };
  batch: { id: string; batchNumber: string; expiryDate: string } | null;
}

export const items = {
  list: (filter?: { q?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (filter?.q) q.set("q", filter.q);
    if (filter?.category) q.set("category", filter.category);
    const qs = q.toString();
    return api.get<{ data: ItemRecord[] }>(
      `/api/items${qs ? `?${qs}` : ""}`
    );
  },
  get: (id: string) =>
    api.get<{ data: ItemRecord & { batches: StockBatchRecord[] } }>(
      `/api/items/${id}`
    ),
  create: (payload: {
    code: string;
    name: string;
    category: string;
    unit: string;
    reorderLevel?: number;
  }) => api.post<{ data: ItemRecord }>("/api/items", payload),
  update: (id: string, payload: Partial<ItemRecord>) =>
    api.patch<{ data: ItemRecord }>(`/api/items/${id}`, payload)
};

export const locations = {
  list: () =>
    api.get<{ data: StockLocationRecord[] }>("/api/stock-locations"),
  create: (payload: { name: string; type: string }) =>
    api.post<{ data: StockLocationRecord }>("/api/stock-locations", payload)
};

export const stock = {
  levels: () =>
    api.get<{ data: StockLevelRecord[] }>("/api/stock/levels"),
  movements: (filter?: {
    itemId?: string;
    locationId?: string;
    type?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (filter?.itemId) q.set("itemId", filter.itemId);
    if (filter?.locationId) q.set("locationId", filter.locationId);
    if (filter?.type) q.set("type", filter.type);
    if (filter?.limit) q.set("limit", String(filter.limit));
    const qs = q.toString();
    return api.get<{ data: StockMovementRecord[] }>(
      `/api/stock/movements${qs ? `?${qs}` : ""}`
    );
  },
  receive: (payload: {
    itemId: string;
    locationId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    costPrice?: number;
    supplier?: string;
    reason?: string;
  }) =>
    api.post<{
      data: { batch: StockBatchRecord; movement: StockMovementRecord };
    }>("/api/stock/receive", payload),
  dispense: (payload: {
    itemId: string;
    locationId: string;
    quantity: number;
    reason?: string;
  }) =>
    api.post<{
      data: { movements: StockMovementRecord[]; quantityDispensed: number };
    }>("/api/stock/dispense", payload),
  transfer: (payload: {
    itemId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    reason?: string;
  }) =>
    api.post<{
      data: { from: StockMovementRecord[]; to: StockMovementRecord };
    }>("/api/stock/transfer", payload),
  adjust: (payload: {
    itemId: string;
    locationId: string;
    batchId: string;
    newQuantity: number;
    reason: string;
  }) =>
    api.post<{ data: StockMovementRecord }>("/api/stock/adjust", payload),
  fefoPreview: (payload: {
    itemId: string;
    locationId: string;
    quantity: number;
  }) =>
    api.post<{ data: { batch: StockBatchRecord | null } }>(
      "/api/stock/fefo-preview",
      payload
    )
};

// ── Appointments ──
export interface AppointmentRecord {
  id: string;
  patientId: string;
  providerId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string | null;
  notes: string | null;
  reminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
}

export const appointments = {
  list: (filters?: {
    patientId?: string;
    providerId?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (filters?.patientId) q.set("patientId", filters.patientId);
    if (filters?.providerId) q.set("providerId", filters.providerId);
    if (filters?.status) q.set("status", filters.status);
    if (filters?.from) q.set("from", filters.from);
    if (filters?.to) q.set("to", filters.to);
    if (filters?.limit) q.set("limit", String(filters.limit));
    const qs = q.toString();
    return api.get<{ data: AppointmentRecord[] }>(
      `/api/appointments${qs ? `?${qs}` : ""}`
    );
  },
  get: (id: string) =>
    api.get<{ data: AppointmentRecord }>(`/api/appointments/${id}`),
  create: (payload: {
    patientId: string;
    providerId: string;
    startsAt: string;
    endsAt: string;
    reason?: string;
    notes?: string;
  }) => api.post<{ data: AppointmentRecord }>("/api/appointments", payload),
  setStatus: (id: string, status: string) =>
    api.patch<{ data: AppointmentRecord }>(
      `/api/appointments/${id}/status`,
      { status }
    ),
  remind: (id: string) =>
    api.post<{ data: { queued: boolean; jobId: string } }>(
      `/api/appointments/${id}/remind`,
      {}
    )
};
// ── HMO Claims ──
export interface ClaimRecord {
  id: string;
  patientId: string;
  hmo: string;
  claimNumber: string | null;
  hmoMemberId: string;
  planCode: string | null;
  amount: string;
  approvedAmount: string | null;
  status: string;
  diagnosisCodes: string[];
  serviceDate: string | null;
  submittedAt: string | null;
  resolvedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  };
}

export interface EligibilityResult {
  eligible: boolean;
  plan?: string;
  planCode?: string;
  memberName?: string;
  reason?: string;
  copay?: number;
}

export const claims = {
  listHmos: () =>
    api.get<{ data: string[] }>("/api/claims/hmos"),

  list: (filters?: { status?: string; hmo?: string; patientId?: string }) => {
    const q = new URLSearchParams();
    if (filters?.status) q.set("status", filters.status);
    if (filters?.hmo) q.set("hmo", filters.hmo);
    if (filters?.patientId) q.set("patientId", filters.patientId);
    const qs = q.toString();
    return api.get<{ data: ClaimRecord[] }>(
      `/api/claims${qs ? `?${qs}` : ""}`
    );
  },

  get: (id: string) =>
    api.get<{ data: ClaimRecord }>(`/api/claims/${id}`),

  verify: (payload: {
    hmo: string;
    hmoMemberId: string;
    planCode?: string;
  }) =>
    api.post<{ data: EligibilityResult }>("/api/claims/verify", payload),

  create: (payload: {
    patientId: string;
    hmo: string;
    hmoMemberId: string;
    planCode?: string;
    amount: number;
    diagnosisCodes?: string[];
    serviceDate?: string;
    notes?: string;
  }) => api.post<{ data: ClaimRecord }>("/api/claims", payload),

  submit: (id: string) =>
    api.post<{ data: ClaimRecord }>(`/api/claims/${id}/submit`, {}),

  setStatus: (
    id: string,
    payload: {
      status: string;
      approvedAmount?: number;
      rejectionReason?: string;
    }
  ) => api.patch<{ data: ClaimRecord }>(`/api/claims/${id}/status`, payload)
};
// ── Dashboard Stats ──
export interface BillingStats {
  monthly: { month: string; revenue: number; outstanding: number }[];
  totals: { revenue: number; outstanding: number };
}

export interface EncounterStats {
  topDiagnoses: { code: string; display: string; count: number }[];
  monthly: { month: string; count: number }[];
}

export interface ClaimStats {
  byStatus: { status: string; count: number; amount: number }[];
  totals: { count: number; approvedAmount: number };
}

export const dashboard = {
  billing: () => api.get<{ data: BillingStats }>("/api/invoices/stats"),
  encounters: () =>
    api.get<{ data: EncounterStats }>("/api/encounters/stats"),
  claims: () =>
    api
      .list
      ? null
      : null, // claims stats pulled from claims.list() on the client
  lowStock: () =>
    api
      .get<{
        data: {
          id: string;
          code: string;
          name: string;
          total: number;
          reorderLevel: number;
        }[];
      }>("/api/stock/levels")
      .then((res) => ({
        data: res.data
          .filter((i) => i.total < i.reorderLevel)
          .sort((a, b) => a.total - b.total)
          .slice(0, 5)
      }))
};
// ── Workflow ──
export interface AppointmentWithVisit extends AppointmentRecord {
  visitStatus: string;
  encounterId: string | null;
  checkedInAt: string | null;
  vitalsDoneAt: string | null;
  consultationAt: string | null;
  completedAt: string | null;
}

export interface VisitQueue {
  SCHEDULED: AppointmentWithVisit[];
  CHECKED_IN: AppointmentWithVisit[];
  VITALS_DONE: AppointmentWithVisit[];
  IN_CONSULTATION: AppointmentWithVisit[];
  RX_WRITTEN: AppointmentWithVisit[];
  DISPENSED: AppointmentWithVisit[];
  BILLED: AppointmentWithVisit[];
  DONE: AppointmentWithVisit[];
}

export const workflow = {
  queue: () =>
    api.get<{ data: VisitQueue }>("/api/appointments/queue"),

  today: () =>
    api.get<{ data: AppointmentWithVisit[] }>("/api/appointments/today"),

  advance: (appointmentId: string, visitStatus: string, encounterId?: string) =>
    api.patch<{ data: AppointmentWithVisit }>(
      `/api/appointments/${appointmentId}/visit`,
      { visitStatus, ...(encounterId ? { encounterId } : {}) }
    )
};