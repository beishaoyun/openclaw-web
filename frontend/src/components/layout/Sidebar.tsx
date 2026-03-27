import { NavLink, useLocation } from 'react-router-dom';

const navigation = [
  { name: '📊 控制台', href: '/' },
  { name: '🖥️ 服务器', href: '/servers' },
  { name: '🤖 模型', href: '/models' },
  { name: '🔌 通道', href: '/channels' },
  { name: '⚡ 技能', href: '/skills' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-56 min-h-[calc(100vh-3.5rem)] border-r border-zinc-200 bg-white p-4 flex-shrink-0">
      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border border-blue-100 shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`
              }
            >
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Quick Help */}
      <div className="mt-8 pt-4 border-t border-zinc-200">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-100">
          <p className="text-xs font-medium text-blue-800 mb-1">💡 提示</p>
          <p className="text-xs text-blue-600">
            在服务器页面添加服务器后即可开始使用 OpenClaw
          </p>
        </div>
      </div>
    </aside>
  );
}
