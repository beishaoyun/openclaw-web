import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    account: '',
    email: '',
    password: '',
    confirmPassword: '',
    captcha: '',
  });
  const [captchaImage, setCaptchaImage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    loadCaptcha();
  }, []);

  useEffect(() => {
    // 计算密码强度
    const pwd = formData.password;
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    setPasswordStrength(strength);
  }, [formData.password]);

  const loadCaptcha = async () => {
    try {
      const { data } = await authService.captcha();
      setCaptchaImage(`data:image/svg+xml;base64,${data.image}`);
    } catch (err) {
      console.error('Failed to load captcha:', err);
    }
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return '密码至少 8 位';
    if (!/[a-z]/.test(password)) return '密码需包含小写字母';
    if (!/[A-Z]/.test(password)) return '密码需包含大写字母';
    if (!/[0-9]/.test(password)) return '密码需包含数字';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    const pwdError = validatePassword(formData.password);
    if (pwdError) {
      setPasswordError(pwdError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.register({
        account: formData.account,
        email: formData.email,
        password: formData.password,
        captcha: formData.captcha,
      });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败');
      loadCaptcha();
      setFormData({ ...formData, captcha: '' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (level: number) => {
    if (level <= 2) return 'bg-red-500';
    if (level <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (level: number) => {
    if (level <= 2) return '弱';
    if (level <= 3) return '中';
    return '强';
  };

  return (
    <div className="min-h-screen flex">
      {/* 左侧装饰区 */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 overflow-hidden">
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
              开启您的云端之旅
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              免费注册，立即体验强大的服务器管理功能。
              <br />
              AI 模型配置、数据通道、自动化技能，一站式搞定。
            </p>
          </div>

          {/* 特性列表 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">服务器管理</p>
                <p className="text-sm text-white/70">SSH 连接、批量操作、状态监控</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">一键部署</p>
                <p className="text-sm text-white/70">OpenClaw 快速安装与配置</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">AI 集成</p>
                <p className="text-sm text-white/70">模型、通道、技能全支持</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧注册表单 */}
      <div className="flex-1 flex items-center justify-center px-8 bg-gradient-to-br from-zinc-50 via-white to-purple-50 overflow-y-auto py-12">
        <div className="w-full max-w-md">
          {/* Logo（移动端显示） */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-xl shadow-purple-500/25 mb-4">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              创建账号
            </h1>
            <p className="text-zinc-500 mt-2">加入 OpenClaw 开始使用</p>
          </div>

          {/* 注册卡片 */}
          <Card className="backdrop-blur-sm bg-white/80 border-zinc-200/50 shadow-xl shadow-zinc-200/50" padding="lg">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">免费注册</h2>
              <p className="text-zinc-500">创建账号开始使用 OpenClaw</p>
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
                placeholder="2-20 个字符"
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                required
                minLength={2}
                maxLength={20}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              <Input
                label="邮箱"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    密码
                  </label>
                  <span className={`text-xs ${passwordStrength > 0 ? 'font-medium' : ''} ${
                    passwordStrength <= 2 ? 'text-red-500' :
                    passwordStrength <= 3 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {passwordStrength > 0 && getStrengthText(passwordStrength)}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="8 位以上，含大小写字母和数字"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setPasswordError('');
                    }}
                    required
                    className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-12 py-2.5 text-sm placeholder:text-zinc-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-zinc-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
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
                </div>
                {formData.password && (
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          level <= passwordStrength ? getStrengthColor(passwordStrength) : 'bg-zinc-200'
                        }`}
                      />
                    ))}
                  </div>
                )}
                {passwordError && (
                  <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {passwordError}
                  </p>
                )}
              </div>

              <Input
                label="确认密码"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="再次输入密码"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  setPasswordError('');
                }}
                required
                error={passwordError}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="hover:text-zinc-600 transition-colors"
                  >
                    {showConfirmPassword ? (
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
                    placeholder="4 位验证码"
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
                      className="w-28 h-11 rounded-xl border-2 border-zinc-200 cursor-pointer hover:border-purple-500 hover:shadow-md transition-all duration-200"
                      title="点击刷新验证码"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="w-4 h-4 text-purple-600 border-zinc-300 rounded focus:ring-purple-500 focus:ring-offset-0 mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-zinc-600">
                  我已阅读并同意{' '}
                  <a href="/terms" className="text-purple-600 font-medium hover:underline">
                    服务条款
                  </a>{' '}
                  和{' '}
                  <a href="/privacy" className="text-purple-600 font-medium hover:underline">
                    隐私政策
                  </a>
                </label>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  )
                }
              >
                {isLoading ? '注册中...' : '创建账号'}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-200 text-center">
              <p className="text-sm text-zinc-600">
                已有账号？{' '}
                <Link
                  to="/login"
                  className="text-purple-600 font-medium hover:underline"
                >
                  立即登录
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
