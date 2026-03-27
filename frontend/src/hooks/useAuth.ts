import { useState, useCallback } from 'react';
import { authService } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  const { setToken, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (account: string, password: string, captcha?: string, rememberMe?: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await authService.login({ account, password, captcha, rememberMe });
      localStorage.setItem('token', data.token);
      setToken(data.token, { id: 'user-id' }); // TODO: 解析实际用户信息
      return { success: true };
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
      return { success: false, error: err.response?.data?.message };
    } finally {
      setIsLoading(false);
    }
  }, [setToken]);

  const register = useCallback(async (account: string, email: string, password: string, captcha: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.register({ account, email, password, captcha });
      return { success: true };
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败');
      return { success: false, error: err.response?.data?.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      logout();
      localStorage.removeItem('token');
    }
  }, [logout]);

  return {
    isLoading,
    error,
    login,
    register,
    logout: handleLogout,
  };
}
