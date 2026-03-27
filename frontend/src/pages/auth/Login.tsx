import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function Login() {
  const navigate = useNavigate();
  const { setToken } = useAuthStore();
  const [formData, setFormData] = useState({
    account: '',
    password: '',
    captcha: '',
    rememberMe: false,
  });
  const [captchaImage, setCaptchaImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadCaptcha();
  }, []);

  const loadCaptcha = async () => {
    try {
      const { data } = await authService.captcha();
      setCaptchaImage(`data:image/svg+xml;base64,${data.image}`);
    } catch (err) {
      console.error('Failed to load captcha:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await authService.login({
        account: formData.account,
        password: formData.password,
        captcha: formData.captcha,
        rememberMe: formData.rememberMe,
      });
      localStorage.setItem('token', data.token);
      setToken(data.token, { id: 'user-id', email: data.email || '' });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
      loadCaptcha();
      setFormData({ ...formData, captcha: '' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* 左侧装饰区 */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 overflow-hidden">
        {/* 动态背景圆 */}
        <div className="absolute inset-0">
          <div className="absolute w-96 h-96 bg-white/10 rounded-full -top-48 -left-48 blur-3xl animate-pulse" />
          <div className="absolute w-[32rem] h-[32rem] bg-white/10 rounded-full -bottom-32 -right-32 blur-3xl animate-pulse delay-1000" />
          <div className="absolute w-64 h-64 bg-white/10 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse delay-500" />
        </div>

        {/* 内容区 */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h1 className="text-5xl font-bold">OpenClaw</h1>
            </div>
            <h2 className="text-3xl font-semibold mb-4">
              服务器托管与配置管理平台
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              一站式管理您的服务器资源，轻松部署 AI 模型、配置数据通道、
              <br />
              创建自动化技能，让运维工作更高效。
            </p>
          </div>

          {/* 特性列表 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              <span className="text-lg">服务器托管与 SSH 运维</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg">一键安装 OpenClaw</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-lg">AI 模型配置管理</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="text-lg">数据通道与技能管理</span>
            </div>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="absolute bottom-8 left-16 right-16">
          <div className="h-px bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center px-8 bg-gradient-to-br from-zinc-50 via-white to-blue-50">
        <div className="w-full max-w-md">
          {/* Logo（移动端显示） */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-xl shadow-blue-500/25 mb-4">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              OpenClaw
            </h1>
            <p className="text-zinc-500 mt-2">服务器托管与配置管理平台</p>
          </div>

          {/* 登录卡片 */}
          <Card className="backdrop-blur-sm bg-white/80 border-zinc-200/50 shadow-xl shadow-zinc-200/50" padding="lg">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">欢迎回来</h2>
              <p className="text-zinc-500">请输入您的账号信息登录</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="账号"
                type="text"
                placeholder="请输入账号"
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              <Input
                label="密码"
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                }
              />

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  验证码
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="请输入验证码"
                    value={formData.captcha}
                    onChange={(e) => setFormData({ ...formData, captcha: e.target.value })}
                    maxLength={4}
                    required
                    className="flex-1"
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    }
                  />
                  {captchaImage && (
                    <img
                      src={captchaImage}
                      alt="验证码"
                      onClick={loadCaptcha}
                      className="w-28 h-11 rounded-xl border-2 border-zinc-200 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all duration-200"
                      title="点击刷新验证码"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="group-hover:text-zinc-900 transition-colors">记住我</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  忘记密码？
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                gradient
                size="lg"
                leftIcon={
                  !isLoading && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  )
                }
              >
                {isLoading ? '登录中...' : '登 录'}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-sm text-zinc-500 flex-shrink-0">还没有账号？</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>
              <Link
                to="/register"
                className="mt-4 block w-full"
              >
                <Button variant="outline" className="w-full" size="lg">
                  立即注册
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </Link>
            </div>

            <div className="mt-4">
              <Link to="/guest" className="block">
                <Button variant="ghost" className="w-full" size="lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  访客单次部署
                </Button>
              </Link>
            </div>
          </Card>

          {/* 底部说明 */}
          <p className="text-center text-xs text-zinc-500 mt-8">
            登录即表示您同意我们的{' '}
            <a href="/terms" className="text-blue-600 hover:underline">
              服务条款
            </a>{' '}
            和{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              隐私政策
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
