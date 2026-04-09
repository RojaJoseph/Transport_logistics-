import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
  id:          string;
  name:        string;
  email:       string;
  role:        string;
  tenant:      string;
  permissions: string[];
}

interface AuthState {
  user:            User | null;
  token:           string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (email: string, password: string) => Promise<void>;
  logout:          () => void;
  refreshToken:    () => Promise<void>;
  hasPermission:   (perm: string) => boolean;
}

// Identity service runs on localhost:4005, gateway on localhost:4000
// We call gateway /auth/login which proxies to identity-service
const GATEWAY = import.meta.env.VITE_API_GATEWAY ?? 'http://localhost:4000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      isLoading:       false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await axios.post(`${GATEWAY}/auth/login`, { email, password });
          // Attach token to default axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          set({ user: data.user, token: data.token, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        delete axios.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        const { token } = get();
        if (!token) return;
        const { data } = await axios.post(
          `${GATEWAY}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        set({ token: data.token });
      },

      hasPermission: (perm: string) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        return user.permissions.includes(perm);
      },
    }),
    {
      name: 'transport-auth',
      partialize: (state) => ({
        token:           state.token,
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);
