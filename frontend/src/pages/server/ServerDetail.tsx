import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serverService, openclawService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [server, setServer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);

  useEffect(() => {
    loadServer();
  }, [id]);

  const loadServer = async () => {
    setIsLoading(true);
    try {
      const response = await serverService.get(id!);
      setServer(response.data?.data || null);
    } catch (err) {
      console.error('Failed to load server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOperation = async (operation: 'reboot' | 'shutdown' | 'refresh') => {
    const confirmMsg = operation === 'reboot' ? '重启' : operation === 'shutdown' ? '关机' : '刷新';
    if (!confirm(`确定要${confirmMsg}此服务器吗？`)) return;
    setIsOperating(true);
    try {
      await serverService[operation](id!);
      loadServer();
      alert(`${confirmMsg}成功！`);
    } catch (err: any) {
      alert(`${confirmMsg}失败：${err.response?.data?.message || '未知错误'}`);
    } finally {
      setIsOperating(false);
    }
  };

  const handleInstallOpenClaw = () => {
    navigate(`/install/${id}`);
  };

  const handleManageOpenClaw = () => {
    navigate(`/openclaw/${id}`);
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

  if (!server) {
    return (
      <Card className="p-12 text-center">
        <p className="text-lg font-medium text-zinc-900">服务器不存在</p>
        <Button variant="outline" onClick={() => navigate('/servers')} className="mt-4">
          返回列表
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{server.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">{server.host}:{server.port}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/servers')}>
          返回列表
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Server Info */}
        <Card title="服务器信息">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-sm text-zinc-500">主机地址</span>
              <span className="text-sm font-medium text-zinc-900">{server.host}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-sm text-zinc-500">SSH 端口</span>
              <span className="text-sm font-medium text-zinc-900">{server.port}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-sm text-zinc-500">用户名</span>
              <span className="text-sm font-medium text-zinc-900">{server.username}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-zinc-500">状态</span>
              <span className={`text-sm font-medium ${
                server.status === 'online' ? 'text-green-600' :
                server.status === 'error' ? 'text-red-600' :
                'text-zinc-500'
              }`}>
                {server.status === 'online' ? '在线' : server.status === 'error' ? '错误' : '离线'}
              </span>
            </div>
          </div>
        </Card>

        {/* OpenClaw Status */}
        <Card title="OpenClaw 状态">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                server.openclawStatus === 'running' ? 'bg-green-500' :
                server.openclawStatus === 'error' ? 'bg-red-500' :
                'bg-zinc-400'
              }`} />
              <span className="text-sm font-medium text-zinc-900">
                {server.openclawStatus === 'running' ? '运行中' :
                 server.openclawStatus === 'error' ? '错误' :
                 server.openclawInstalled ? '已安装' : '未安装'}
              </span>
            </div>
            {server.openclawInstalled ? (
              <Button onClick={handleManageOpenClaw} className="w-full">
                管理 OpenClaw
              </Button>
            ) : (
              <Button onClick={handleInstallOpenClaw} className="w-full gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                安装 OpenClaw
              </Button>
            )}
          </div>
        </Card>

        {/* Operations */}
        <Card title="服务器操作" className="md:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              variant="outline"
              onClick={() => handleOperation('refresh')}
              disabled={isOperating}
              className="gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新状态
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleOperation('reboot')}
              disabled={isOperating}
              className="gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重启服务器
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOperation('shutdown')}
              disabled={isOperating}
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              关机
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
