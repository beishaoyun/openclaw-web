import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 border-b border-zinc-200 bg-white px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          OpenClaw
        </h1>
        <span className="text-sm text-zinc-400">|</span>
        <span className="text-sm text-zinc-600">服务器托管与配置管理平台</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-600">{user?.email || '用户'}</span>
        <div className="w-px h-4 bg-zinc-300" />
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-600 hover:text-red-600 transition-colors"
        >
          退出登录
        </button>
      </div>
    </header>
  );
}
