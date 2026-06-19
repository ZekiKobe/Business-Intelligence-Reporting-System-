import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

/** Plain client for refresh calls — avoids interceptor recursion. */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 15000,
});

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 15000,
});

const AUTH_PATH_HINTS = ["auth/login", "auth/register", "auth/token/refresh"];

function isAuthRequest(config) {
  const url = `${config?.baseURL || ""}${config?.url || ""}`;
  return AUTH_PATH_HINTS.some((h) => url.includes(h));
}

let refreshPromise = null;

function clearAuthAndRedirectToLogin() {
  localStorage.removeItem("bi_token");
  localStorage.removeItem("bi_refresh");
  sessionStorage.setItem("bi_auth_notice", "session_expired");
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem("bi_refresh");
  if (!refresh) {
    clearAuthAndRedirectToLogin();
    throw new Error("no_refresh_token");
  }
  const { data } = await refreshClient.post("/auth/token/refresh/", { refresh });
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

apiClient.interceptors.request.use((config) => {
  // Never send a stale Bearer on login/register/refresh — JWT auth runs first and would reject
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;

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
      return apiClient(original);
    } catch {
      clearAuthAndRedirectToLogin();
      return Promise.reject(error);
    }
  }
);

export default apiClient;
