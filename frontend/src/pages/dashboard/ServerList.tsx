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
  createdAt: string;
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

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setIsLoading(true);
    try {
      const response = await serverService.list();
      setServers(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load servers:', err);
      setServers([]);
    } finally {
      setIsLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-zinc-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-zinc-400';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">服务器列表</h1>
          <p className="text-sm text-zinc-500 mt-1">管理您的服务器和 SSH 连接</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加服务器
        </Button>
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
          {servers.map((server) => (
            <Card key={server.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)}`} />
                  <h3 className="font-semibold text-zinc-900">{server.name}</h3>
                </div>
                <span className="text-xs text-zinc-500">{server.host}:{server.port}</span>
              </div>
              <div className="text-sm text-zinc-600 mb-4">
                <p>用户：{server.username}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  添加于 {new Date(server.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(server.id)}
                  className="flex-1"
                >
                  测试连接
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/servers/${server.id}`)}
                  className="flex-1"
                >
                  详情
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
            </Card>
          ))}
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
    </div>
  );
}
