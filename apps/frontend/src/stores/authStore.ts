import { create } from 'zustand';
import { loginUser } from '../api/client';

interface User {
  username: string;
}

interface AuthState {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: async (username, password) => {
    try {
      const result = await loginUser(username, password);
      if (result.success) {
        set({ user: { username: result.username } });
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  },
  logout: () => set({ user: null }),
}));

