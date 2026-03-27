import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  username: string;
  role: 'super_admin' | 'operator' | 'support';
  isAdmin: true;
}

interface AdminAuthState {
  token: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  setToken: (token: string, admin: AdminUser) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isAuthenticated: false,
      setToken: (token, admin) => set({ token, admin, isAuthenticated: true }),
      logout: () => set({ token: null, admin: null, isAuthenticated: false }),
    }),
    {
      name: 'admin-auth-storage',
    }
  )
);
