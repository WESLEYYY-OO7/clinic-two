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

export const auth = {
  setToken,
  getToken,
  clearToken,

  login: async (tenantSlug: string, email: string, password: string) => {
    const res = await api.post<{
      data: { token: string; user: { id: string; email: string; role: string; tenantId: string } };
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