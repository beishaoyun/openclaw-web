import { useState, useEffect } from 'react';
import { serverService, openclawService, modelService, channelService } from '@/services/api';

interface DashboardStats {
  serverCount: number;
  onlineCount: number;
  openclawCount: number;
  modelCount: number;
  channelCount: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    serverCount: 0,
    onlineCount: 0,
    openclawCount: 0,
    modelCount: 0,
    channelCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [serversRes, modelsRes, channelsRes] = await Promise.all([
        serverService.list().catch(() => ({ data: { data: [] } })),
        modelService.list().catch(() => ({ data: { data: [] } })),
        channelService.list().catch(() => ({ data: { data: [] } })),
      ]);

      const serverList = serversRes.data?.data || [];
      setStats({
        serverCount: serverList.length,
        onlineCount: serverList.filter((s: any) => s.status === 'online').length,
        openclawCount: serverList.filter((s: any) => s.openclawStatus === 'running').length,
        modelCount: (modelsRes.data?.data || []).length,
        channelCount: (channelsRes.data?.data || []).length,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
    trend
  }: {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }) => (
    <div className="bg-white rounded-lg border border-zinc-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="text-3xl font-bold text-zinc-900 mt-2">{value}</p>
          {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">控制台</h1>
        <p className="text-sm text-zinc-500 mt-1">欢迎回来！这是您的服务器概览</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="服务器总数"
          value={stats.serverCount}
          color="bg-blue-100"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          }
        />
        <StatCard
          title="在线服务器"
          value={stats.onlineCount}
          color="bg-green-100"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="OpenClaw 运行中"
          value={stats.openclawCount}
          color="bg-purple-100"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          title="AI 模型配置"
          value={stats.modelCount}
          color="bg-orange-100"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">快速操作</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/servers"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-zinc-200 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-zinc-900">添加服务器</p>
              <p className="text-sm text-zinc-500">管理您的服务器</p>
            </div>
          </a>
          <a
            href="/models"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-zinc-200 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-zinc-900">配置模型</p>
              <p className="text-sm text-zinc-500">管理 AI 模型</p>
            </div>
          </a>
          <a
            href="/channels"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-zinc-200 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-zinc-900">配置通道</p>
              <p className="text-sm text-zinc-500">管理数据通道</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
