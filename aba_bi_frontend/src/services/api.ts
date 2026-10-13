// src/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api/";

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const AUTH_PATH_HINTS = ["auth/login", "auth/register", "auth/token/refresh"];

function isAuthRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config) return false;
  const url = `${config.baseURL || ""}${config.url || ""}`;
  return AUTH_PATH_HINTS.some((h) => url.includes(h));
}

let refreshPromise: Promise<string> | null = null;

function clearAuthAndRedirectToLogin() {
  localStorage.removeItem("bi_token");
  localStorage.removeItem("bi_refresh");
  sessionStorage.setItem("bi_auth_notice", "session_expired");
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

async function refreshAccessToken(): Promise<string> {
  const refresh = localStorage.getItem("bi_refresh");
  if (!refresh) {
    clearAuthAndRedirectToLogin();
    throw new Error("no_refresh_token");
  }
  const { data } = await refreshClient.post("auth/token/refresh/", { refresh });
  const access = data.access || data.sessionId;
  if (!access) {
    clearAuthAndRedirectToLogin();
    throw new Error("no_access_in_refresh");
  }
  localStorage.setItem("bi_token", access);
  if (data.refresh) {
    localStorage.setItem("bi_refresh", data.refresh);
  }
  return access;
}

api.interceptors.request.use((config) => {
  if (isAuthRequest(config)) {
    return config;
  }
  const token = localStorage.getItem("bi_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status !== 401 || !original || original._retry || isAuthRequest(original)) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      const token = localStorage.getItem("bi_token");
      if (token) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
      }
      return api(original);
    } catch {
      clearAuthAndRedirectToLogin();
      return Promise.reject(error);
    }
  }
);

/** Logout without Authorization header so expired tokens do not trigger refresh. */
export const logoutRequest = () =>
  axios.post(`${API_BASE_URL}auth/logout/`, {}, { withCredentials: true });

export const login = async (username: string, password: string) => {
  try {
    const response = await api.post("auth/login/", { username, password });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: error.message };
  }
};

export const getReportGroups = async () => {
  const response = await api.get("report-groups/");
  return response.data;
};

export const getReports = async () => {
  const response = await api.get("reports/");
  return response.data;
};

export const getReportById = async (id: string | number) => {
  const response = await api.get(`reports/${id}/`);
  return response.data;
};

/** Public tenant branding (camelCase) — same data source as BI Dashboard settings. */
export type PortalBrandingApi = {
  companyName?: string;
  productName?: string;
  tagline?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  darkMode?: boolean;
};

const tenantSlugForBranding = (): string | undefined =>
  process.env.REACT_APP_TENANT_SLUG?.trim() || localStorage.getItem("bi_tenant_slug") || undefined;

export const fetchPublicBranding = async (): Promise<PortalBrandingApi> => {
  const tenant = tenantSlugForBranding();
  const response = await api.get<PortalBrandingApi>("branding/", {
    params: tenant ? { tenant } : undefined,
  });
  return response.data;
};

export const executeSql = async (payload: {
  connection_id: string;
  sql: string;
  limit?: number | null;
}) => {
  const response = await api.post("v1/sql/execute", payload);
  return response.data;
};

export type CurrentUser = {
  id: number;
  username: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  status?: string;
  joinDate?: string;
};

/** The server derives this identity from the authenticated session/token. */
export const getCurrentUser = async (): Promise<CurrentUser> => {
  const response = await api.get<CurrentUser>("user/me/");
  return response.data;
};

export const executeSavedReport = async (
  reportId: string | number,
  payload: { limit?: number; parameters?: Record<string, string> }
) => {
  const response = await api.post(`v1/reports/${reportId}/execute`, payload);
  return response.data;
};

export default api;
