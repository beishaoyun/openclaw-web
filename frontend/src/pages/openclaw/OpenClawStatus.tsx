import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { openclawService, serverService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface OpenClawStatus {
  status: 'running' | 'stopped' | 'error';
  version: string;
  uptime: number;
  lastHeartbeat: string;
  configHash: string;
}

export default function OpenClawStatus() {
  const { id } = useParams<{ id: string }>();
  const [server, setServer] = useState<any>(null);
  const [status, setStatus] = useState<OpenClawStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [serverRes, statusRes] = await Promise.all([
        serverService.get(id!).catch(() => ({ data: null })),
        openclawService.getStatus(id!).catch(() => ({ data: null })),
      ]);
      setServer(serverRes.data?.data || null);
      setStatus(statusRes.data?.data || null);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOperation = async (operation: 'start' | 'stop' | 'restart') => {
    if (!confirm(`确定要${operation === 'start' ? '启动' : operation === 'stop' ? '停止' : '重启'} OpenClaw 吗？`)) return;
    setIsOperating(true);
    try {
      await openclawService[operation](id!);
      loadData();
      alert(`${operation === 'start' ? '启动' : operation === 'stop' ? '停止' : '重启'}成功！`);
    } catch (err: any) {
      alert(`操作失败：${err.response?.data?.message || '未知错误'}`);
    } finally {
      setIsOperating(false);
    }
  };

  const handleViewLogs = async () => {
    try {
      const { data } = await openclawService.getLogs(id!);
      const logs = Array.isArray(data) ? data.join('\n') : JSON.stringify(data, null, 2);
      alert('日志:\n' + logs);
    } catch (err: any) {
      alert('获取日志失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">OpenClaw 状态</h1>
          <p className="text-sm text-zinc-500 mt-1">
            服务器：{server?.name || '未知'} ({server?.host}:{server?.port})
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleViewLogs}
            disabled={isOperating}
            className="gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            查看日志
          </Button>
          <a href={`/config/${id}`}>
            <Button variant="secondary" className="gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              配置
            </Button>
          </a>
        </div>
      </div>

      {!status ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center">
            <svg className="w-16 h-16 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-lg font-medium text-zinc-900">OpenClaw 未安装</p>
            <p className="text-sm text-zinc-500 mt-1 mb-4">此服务器尚未安装 OpenClaw</p>
            <a href={`/install/${id}`}>
              <Button>安装 OpenClaw</Button>
            </a>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  status.status === 'running' ? 'bg-green-500' :
                  status.status === 'error' ? 'bg-red-500' :
                  'bg-zinc-400'
                }`} />
                <div>
                  <p className="text-sm text-zinc-500">运行状态</p>
                  <p className="text-lg font-semibold text-zinc-900">
                    {status.status === 'running' ? '运行中' : status.status === 'error' ? '错误' : '已停止'}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-zinc-500">版本</p>
              <p className="text-lg font-semibold text-zinc-900">{status.version || '未知'}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-zinc-500">运行时间</p>
              <p className="text-lg font-semibold text-zinc-900">
                {status.uptime ? `${Math.round(status.uptime / 3600)} 小时` : '未知'}
              </p>
            </Card>
          </div>

          {/* Operations */}
          <Card title="操作" description="控制 OpenClaw 服务">
            <div className="flex gap-3">
              {status.status !== 'running' ? (
                <Button
                  onClick={() => handleOperation('start')}
                  disabled={isOperating}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  启动
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleOperation('stop')}
                  disabled={isOperating}
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  停止
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => handleOperation('restart')}
                disabled={isOperating}
                className="gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重启
              </Button>
            </div>
          </Card>

          {/* Info */}
          <Card title="详细信息">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-zinc-100">
                <span className="text-sm text-zinc-500">最后心跳</span>
                <span className="text-sm font-medium text-zinc-900">
                  {status.lastHeartbeat ? new Date(status.lastHeartbeat).toLocaleString('zh-CN') : '无'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-zinc-500">配置哈希</span>
                <span className="text-sm font-mono text-zinc-900">{status.configHash || '未知'}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
