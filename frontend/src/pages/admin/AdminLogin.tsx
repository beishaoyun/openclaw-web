import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/admin-auth.store';
import { adminAuthService } from '../../services/admin.api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { setToken } = useAdminAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    captcha: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await adminAuthService.login(formData);
      const { token, admin } = response.data.data;
      setToken(token, admin);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">OpenClaw</h1>
          <p className="text-zinc-600 mt-2">管理后台</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold text-zinc-900 mb-6">管理员登录</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                账号
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入管理员账号"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                密码
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入密码"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                验证码
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.captcha}
                  onChange={(e) => setFormData({ ...formData, captcha: e.target.value })}
                  className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入验证码"
                />
                <div className="w-24 h-10 bg-zinc-200 rounded-lg flex items-center justify-center text-xs text-zinc-500">
                  验证码图片
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 text-blue-600 border-zinc-300 rounded"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-zinc-600">
                记住我
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
              返回客户登录
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-4">
          默认超级管理员账号：admin / admin123456
        </p>
      </div>
    </div>
  );
}
