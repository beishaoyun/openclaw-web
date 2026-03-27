import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function GuestDeploy() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    host: '',
    port: 22,
    username: 'root',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 启动访客会话
      const { data } = await authService.guestStart();
      setSessionToken(data.sessionToken);

      // TODO: 使用会话 token 和服务器信息开始部署
      // 这里应该调用后端 API 开始安装流程
      console.log('Guest session started:', data);
      console.log('Server info:', formData);

      // 模拟跳转到安装进度页面
      setTimeout(() => {
        navigate('/guest/progress');
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || '启动会话失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionToken) return;
    try {
      await authService.guestEnd(sessionToken);
      navigate('/');
    } catch (err) {
      console.error('Failed to end guest session:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            OpenClaw
          </h1>
          <p className="text-zinc-600 mt-2">访客单次部署 - 24 小时有效</p>
        </div>

        {/* Form */}
        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">服务器信息</h2>
            <p className="text-sm text-zinc-500">填写您的服务器 SSH 连接信息</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="服务器 IP"
              type="text"
              placeholder="1.2.3.4"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="SSH 端口"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                required
              />
              <Input
                label="SSH 用户"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            <Input
              label="SSH 密码"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              敏感信息仅临时加密存储，会话结束后自动清除
            </p>

            <Button type="submit" className="w-full" loading={isLoading}>
              开始部署
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-200">
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">访客模式限制</p>
                <p className="text-xs text-amber-700 mt-1">
                  仅限单次部署，无法使用服务器管理、配置管理等功能。
                  建议注册账号获得完整体验。
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-600">
            已有账号？{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 font-medium hover:underline"
            >
              立即登录
            </button>
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            还没有账号？{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 font-medium hover:underline"
            >
              免费注册
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
