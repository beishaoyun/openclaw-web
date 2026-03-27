import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: {
    id: string;
    email?: string;
    isGuest?: boolean;
  } | null;
  isAuthenticated: boolean;
  setToken: (token: string, user: any) => void;
  logout: () => void;
}

// 不使用 persist 包装 isLoading，直接在创建 store 时设置初始值
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
