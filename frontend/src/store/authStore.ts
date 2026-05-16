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
  guestLogin:      () => void;
  logout:          () => void;
  refreshToken:    () => Promise<void>;
  hasPermission:   (perm: string) => boolean;
}

const GATEWAY = import.meta.env.VITE_API_GATEWAY ?? 'http://localhost:4000';

// Demo guest user — no API call needed
const GUEST_USER: User = {
  id:          'guest-0000',
  name:        'Demo Guest',
  email:       'guest@transportos.com',
  role:        'SUPER_ADMIN',
  tenant:      'ENTERPRISE',
  permissions: [],
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      isLoading:       false,

      // ── Instant guest access — no backend required ──────────────────
      guestLogin: () => {
        set({
          user:            GUEST_USER,
          token:           'guest-demo-token',
          isAuthenticated: true,
        });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await axios.post(
            `${GATEWAY}/auth/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
          );
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
        if (!token || token === 'guest-demo-token') return;
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
        if (state?.token && state.token !== 'guest-demo-token') {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);
