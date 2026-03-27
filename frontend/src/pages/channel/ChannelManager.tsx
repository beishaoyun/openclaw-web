import { useState, useEffect } from 'react';
import { channelService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface Channel {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  createdAt: string;
}

export default function ChannelManager() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'http',
    url: '',
    timeout: 30,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setIsLoading(true);
    try {
      const response = await channelService.list();
      setChannels(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load channels:', err);
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    setError('');
    try {
      await channelService.add({
        name: formData.name,
        type: formData.type,
        config: {
          url: formData.url,
          timeout: formData.timeout,
        },
      });
      setShowAddModal(false);
      loadChannels();
    } catch (err: any) {
      setError(err.response?.data?.message || '添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此通道吗？')) return;
    try {
      await channelService.delete(id);
      loadChannels();
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

  const handleTest = async (id: string) => {
    try {
      await channelService.test(id);
      alert('通道测试成功！');
    } catch (err: any) {
      alert('通道测试失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleHealthCheck = async (id: string) => {
    try {
      await channelService.healthCheck(id);
      alert('健康检查通过！');
      loadChannels();
    } catch (err: any) {
      alert('健康检查失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'http': return 'bg-blue-100 text-blue-600';
      case 'websocket': return 'bg-purple-100 text-purple-600';
      case 'grpc': return 'bg-green-100 text-green-600';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">通道管理</h1>
          <p className="text-sm text-zinc-500 mt-1">配置数据通信通道</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建通道
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : channels.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center">
            <svg className="w-16 h-16 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-lg font-medium text-zinc-900">暂无通道配置</p>
            <p className="text-sm text-zinc-500 mt-1 mb-4">创建第一个通信通道</p>
            <Button onClick={() => setShowAddModal(true)}>
              新建通道
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {channels.map((channel) => (
            <Card key={channel.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(channel.type)}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900">{channel.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        channel.status === 'active' ? 'bg-green-100 text-green-700' :
                        channel.status === 'error' ? 'bg-red-100 text-red-700' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {channel.status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">
                      类型：{channel.type} {channel.healthStatus === 'healthy' && '• 健康'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(channel.id)}
                  >
                    测试
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleHealthCheck(channel.id)}
                  >
                    健康检查
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(channel.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新建通道"
        description="配置通信通道参数"
      >
        <div className="space-y-4 py-4">
          <Input
            label="通道名称"
            placeholder="例如：主数据通道"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              通道类型
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="http">HTTP/HTTPS</option>
              <option value="websocket">WebSocket</option>
              <option value="grpc">gRPC</option>
            </select>
          </div>
          <Input
            label="目标 URL"
            placeholder="https://api.example.com/webhook"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            required
          />
          <Input
            label="超时时间 (秒)"
            type="number"
            value={formData.timeout}
            onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
            min={1}
            max={300}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowAddModal(false)}>
            取消
          </Button>
          <Button onClick={handleAdd}>
            创建
          </Button>
        </div>
      </Modal>
    </div>
  );
}
