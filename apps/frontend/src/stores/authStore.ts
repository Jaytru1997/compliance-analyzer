// apps/frontend/src/stores/useAuthStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { loginUser } from '../api/client';

interface User {
  username: string;
}

interface AuthState {
  user: User | null;
  isHydrated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isHydrated: false,

      login: async (username: string, password: string) => {
        try {
          const result = await loginUser(username, password);

          if (result.success) {
            const userData = { username: result.username || username };
            set({ user: userData });
            return true;
          }
          return false;
        } catch (err) {
          console.error('Login error:', err);
          return false;
        }
      },

      logout: () => {
        set({ user: null });
      },

      setHydrated: (value: boolean) => {
        set({ isHydrated: value });
      },
    }),

    {
      name: 'auth-storage',                    // unique key in localStorage
      storage: createJSONStorage(() => localStorage), // or sessionStorage
      partialize: (state) => ({ user: state.user }), // only persist user
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);