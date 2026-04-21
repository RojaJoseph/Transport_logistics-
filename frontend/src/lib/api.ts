import axios from 'axios';

/**
 * In development:  Vite proxy forwards /api → localhost:4000
 * In production:   VITE_API_GATEWAY is set by Render to the gateway's public URL
 */
const BASE_URL = import.meta.env.VITE_API_GATEWAY ?? 'http://localhost:4000';

const api = axios.create({
  baseURL:  BASE_URL,
  timeout:  30_000,
  headers: { 'Content-Type': 'application/json' },
  // Allow cross-origin cookies if needed
  withCredentials: false,
});

// ── Attach JWT ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('transport-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
  } catch { /* ignore parse errors */ }
  return config;
});

// ── Handle 401 ───────────────────────────────────────────────────
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
