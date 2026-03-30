import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  status: 'online' | 'offline' | 'error';
  ssh_status: 'online' | 'offline' | 'unknown';
  openclaw_status: 'running' | 'stopped' | 'error' | 'unknown' | 'not_installed';
  createdAt: string;
}

interface VerifyResult {
  success: boolean;
  verified: boolean;
  message: string;
  osInfo?: string;
  responseTime?: number;
}

export default function ServerList() {
  const navigate = useNavigate();
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'root',
    password: '',
  });
  const [error, setError] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<Record<string, VerifyResult | null>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // 加载服务器列表
  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setIsLoading(true);
    try {
      const response = await serverService.list();
      const serversData = response.data?.data || [];
      setServers(serversData);

      // 异步刷新每个服务器的实时状态（不阻塞 UI）
      serversData.forEach(async (server: Server) => {
        try {
          const detail = await serverService.get(server.id);
          const freshData = detail.data?.data;
          if (freshData) {
            setServers(prev => prev.map(s => s.id === server.id ? freshData : s));
          }
        } catch (err) {
          console.error(`Failed to refresh server ${server.id}:`, err);
        }
      });

      // 从 localStorage 加载上次的验证状态
      const savedStatus = localStorage.getItem('sshVerifyStatus');
      if (savedStatus) {
        setVerifyStatus(JSON.parse(savedStatus));
      }
    } catch (err) {
      console.error('Failed to load servers:', err);
      setServers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAllServers = async () => {
    setIsVerifying(true);
    try {
      const result = await serverService.batchVerifyAll();
      const verifyData = result.data?.data || [];

      const statusMap: Record<string, VerifyResult> = {};
      verifyData.forEach((item: any) => {
        statusMap[item.id] = {
          success: item.success,
          verified: item.success,
          message: item.success ? '验证成功' : '验证失败',
          osInfo: item.osInfo || undefined,
        };
      });

      setVerifyStatus(statusMap);
      // 保存到 localStorage
      localStorage.setItem('sshVerifyStatus', JSON.stringify(statusMap));
    } catch (err) {
      console.error('Batch verification failed:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAdd = async () => {
    setError('');
    try {
      await serverService.add(formData);
      setShowAddModal(false);
      loadServers();
    } catch (err: any) {
      setError(err.response?.data?.message || '添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此服务器吗？')) return;
    try {
      await serverService.delete(id);
      loadServers();
    } catch (err) {
      console.error('Failed to delete server:', err);
    }
  };

  const handleTest = async (id: string) => {
    try {
      await serverService.testConnection(id);
      alert('SSH 连接测试成功！');
    } catch (err: any) {
      alert('SSH 连接测试失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const response = await serverService.verifyCredentials(id);
      const result: VerifyResult = response.data;

      setVerifyStatus(prev => ({ ...prev, [id]: result }));

      if (result.verified) {
        // 验证成功后刷新服务器状态
        loadServers();
      }
    } catch (err: any) {
      const result: VerifyResult = {
        success: false,
        verified: false,
        message: err.response?.data?.message || '验证失败',
      };
      setVerifyStatus(prev => ({ ...prev, [id]: result }));
    }
  };

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setFormData({
      name: server.name || '',
      host: server.host,
      port: server.port,
      username: server.username,
      password: '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    setError('');
    if (!editingServer) return;
    try {
      await serverService.update(editingServer.id, formData);
      setShowEditModal(false);
      setEditingServer(null);
      loadServers();
    } catch (err: any) {
      setError(err.response?.data?.message || '更新失败');
    }
  };

  const getSshStatusColor = (server: Server) => {
    const verifyResult = verifyStatus[server.id];

    if (verifyResult) {
      return verifyResult.verified ? 'bg-green-500' : 'bg-red-500';
    }

    // 如果没有验证结果，使用服务器的 ssh_status
    switch (server.ssh_status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-zinc-400';
    }
  };

  const getSshStatusText = (server: Server) => {
    const verifyResult = verifyStatus[server.id];

    if (verifyResult) {
      return verifyResult.verified
        ? `已验证 ${verifyResult.osInfo ? '- ' + verifyResult.osInfo : ''}`
        : verifyResult.message;
    }

    switch (server.ssh_status) {
      case 'online': return 'SSH 在线';
      case 'offline': return 'SSH 离线';
      default: return '未验证';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">服务器列表</h1>
          <p className="text-sm text-zinc-500 mt-1">
            管理您的服务器和 SSH 连接
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => verifyAllServers()}
            disabled={isVerifying}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {isVerifying ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                验证中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                一键验证
              </>
            )}
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加服务器
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : servers.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center">
            <svg className="w-16 h-16 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <p className="text-lg font-medium text-zinc-900">暂无服务器</p>
            <p className="text-sm text-zinc-500 mt-1 mb-4">添加第一台服务器开始使用</p>
            <Button onClick={() => setShowAddModal(true)}>
              添加服务器
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => {
            const verifyResult = verifyStatus[server.id];
            return (
              <div
                key={server.id}
                className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/servers/${server.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getSshStatusColor(server)}`}
                           title={getSshStatusText(server)} />
                      <h3 className="font-semibold text-zinc-900">{server.name}</h3>
                    </div>
                    <span className="text-xs text-zinc-500">{server.host}:{server.port}</span>
                  </div>
                  <div className="text-sm text-zinc-600 mb-4">
                    <p>用户：{server.username}</p>
                    <p className="text-xs mt-1 flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        server.openclaw_status === 'running' ? 'bg-green-500' :
                        server.openclaw_status === 'stopped' ? 'bg-yellow-500' :
                        server.openclaw_status === 'not_installed' ? 'bg-zinc-400' :
                        server.openclaw_status === 'unknown' ? 'bg-zinc-300' :
                        server.openclaw_status === 'error' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`} />
                      <span className={
                        server.openclaw_status === 'running' ? 'text-green-600' :
                        server.openclaw_status === 'stopped' ? 'text-yellow-600' :
                        server.openclaw_status === 'not_installed' ? 'text-zinc-500' :
                        server.openclaw_status === 'unknown' ? 'text-zinc-400' :
                        'text-red-600'
                      }>
                        {server.openclaw_status === 'running' ? 'OpenClaw 运行中' :
                         server.openclaw_status === 'stopped' ? '已安装（已停止）' :
                         server.openclaw_status === 'not_installed' ? '未安装 OpenClaw' :
                         server.openclaw_status === 'unknown' ? 'SSH 连接失败' :
                         server.openclaw_status === 'error' ? 'OpenClaw 错误' : '已安装'}
                      </span>
                    </p>
                    <p className="text-xs mt-1"
                       style={{ color: verifyResult?.verified ? '#22c55e' : verifyResult ? '#ef4444' : '#71717a' }}>
                      {getSshStatusText(server)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-2">
                      添加于 {server.createdAt ? new Date(server.createdAt).toLocaleDateString('zh-CN') : '未知'}
                    </p>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(server.id)}
                      className="flex-1"
                    >
                      {verifyResult ? '重新验证' : '验证账号'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(server)}
                      className="flex-1"
                    >
                      编辑
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/servers/${server.id}`)}
                      className="flex-1"
                    >
                      管理
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(server.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="添加服务器"
        description="填写服务器的 SSH 连接信息"
      >
        <div className="space-y-4 py-4">
          <Input
            label="服务器名称"
            placeholder="例如：生产环境 -01"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="主机地址"
            placeholder="例如：192.168.1.100"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            required
          />
          <Input
            label="SSH 端口"
            type="number"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
            required
          />
          <Input
            label="用户名"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <Input
            label="密码"
            type="password"
            placeholder="SSH 密码或密钥 passphrase"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowAddModal(false)}>
            取消
          </Button>
          <Button onClick={handleAdd}>
            添加服务器
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingServer(null);
        }}
        title="编辑服务器"
        description="修改服务器的 SSH 连接信息"
      >
        <div className="space-y-4 py-4">
          <Input
            label="服务器名称"
            placeholder="例如：生产环境 -01"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="主机地址"
            placeholder="例如：192.168.1.100"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            required
          />
          <Input
            label="SSH 端口"
            type="number"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
            required
          />
          <Input
            label="用户名"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <Input
            label="密码"
            type="password"
            placeholder="留空则保持不变"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => {
            setShowEditModal(false);
            setEditingServer(null);
          }}>
            取消
          </Button>
          <Button onClick={handleUpdate}>
            保存修改
          </Button>
        </div>
      </Modal>
    </div>
  );
}
