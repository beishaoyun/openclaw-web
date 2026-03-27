import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { adminSystemService } from '../../services/admin.api';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalServers: number;
  runningServers: number;
  pendingTickets: number;
  activeAlerts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalServers: 0,
    runningServers: 0,
    pendingTickets: 0,
    activeAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 获取仪表板统计数据
    // 暂时使用模拟数据
    setStats({
      totalUsers: 12,
      activeUsers: 8,
      totalServers: 24,
      runningServers: 18,
      pendingTickets: 3,
      activeAlerts: 2,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500">加载中...</div>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { title: '注册用户', value: stats.totalUsers, sub: `${stats.activeUsers} 活跃`, color: 'blue' },
    { title: '服务器', value: stats.totalServers, sub: `${stats.runningServers} 运行中`, color: 'green' },
    { title: '待处理工单', value: stats.pendingTickets, sub: '需要处理', color: 'yellow' },
    { title: '活跃告警', value: stats.activeAlerts, sub: '需要关注', color: 'red' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-lg p-6 border border-zinc-200 shadow-sm"
            >
              <h3 className="text-sm font-medium text-zinc-500">{card.title}</h3>
              <p className="text-3xl font-bold text-zinc-900 mt-2">{card.value}</p>
              <p className={`text-sm mt-1 ${
                card.color === 'green' ? 'text-green-600' :
                card.color === 'yellow' ? 'text-yellow-600' :
                card.color === 'red' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        {/* 待处理工单 */}
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900">待处理工单</h3>
          </div>
          <div className="p-6">
            <div className="text-zinc-500 text-sm">
              暂无待处理工单
            </div>
          </div>
        </div>

        {/* 活跃告警 */}
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900">活跃告警</h3>
          </div>
          <div className="p-6">
            <div className="text-zinc-500 text-sm">
              暂无活跃告警
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
