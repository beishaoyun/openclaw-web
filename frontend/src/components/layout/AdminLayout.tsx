import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/admin-auth.store';

const menuItems = [
  { path: '/admin/dashboard', label: '仪表板', icon: '📊' },
  { path: '/admin/users', label: '客户管理', icon: '👥' },
  { path: '/admin/tickets', label: '工单管理', icon: '📋' },
  { path: '/admin/alerts', label: '告警管理', icon: '🔔' },
  { path: '/admin/settings', label: '系统配置', icon: '⚙️' },
  { path: '/admin/logs', label: '操作日志', icon: '📜' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAdminAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 text-white flex-shrink-0 flex flex-col h-screen">
        <div className="p-4 border-b border-zinc-700">
          <h1 className="text-lg font-bold">OpenClaw 管理后台</h1>
          {admin && (
            <p className="text-xs text-zinc-400 mt-1">
              {admin.role === 'super_admin' ? '超级管理员' : admin.role === 'operator' ? '运营管理员' : '技术支持'}
            </p>
          )}
        </div>

        <nav className="p-4 flex-1 overflow-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                isActive(item.path)
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-700">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-zinc-400 hover:text-white"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-zinc-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-zinc-900">
              {menuItems.find((item) => item.path === location.pathname)?.label || '管理后台'}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600">{admin?.username}</span>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
