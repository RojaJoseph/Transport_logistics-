import axios from 'axios';

// In Docker: VITE_API_GATEWAY is built as "/api" (relative).
// Nginx proxies /api/* → api-gateway:4000 internally.
// In local dev: Vite proxy in vite.config.ts handles /api → localhost:4000.
// Never hardcode http://localhost:4000 — it breaks in Docker.
const BASE_URL = import.meta.env.VITE_API_GATEWAY ?? '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT from localStorage ──────────────────────────────────
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('transport-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    }
  } catch { /* ignore */ }
  return config;
});

// ── Handle 401 — redirect to login ───────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('transport-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
