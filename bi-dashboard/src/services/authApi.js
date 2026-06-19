import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

/** Plain POST — same rationale as logout: no Bearer on credential exchange. */
export const adminLoginApi = (credentials) =>
  axios.post(`${API_BASE_URL}/auth/login/`, credentials, {
    withCredentials: true,
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
  });

/** Plain POST so expired Bearer does not run the apiClient refresh flow. */
export const logoutApi = () =>
  axios.post(`${API_BASE_URL}/auth/logout/`, {}, { withCredentials: true, timeout: 15000 });