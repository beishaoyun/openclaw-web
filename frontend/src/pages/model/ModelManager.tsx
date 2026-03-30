import { useState, useEffect } from 'react';
import { modelService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface Model {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl?: string;
  status: 'active' | 'inactive' | 'error';
  isDefault: boolean;
  createdAt: string;
}

export default function ModelManager() {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const response = await modelService.list();
      setModels(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load models:', err);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    setError('');
    try {
      await modelService.add(formData);
      setShowAddModal(false);
      loadModels();
    } catch (err: any) {
      setError(err.response?.data?.message || '添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此模型配置吗？')) return;
    try {
      await modelService.delete(id);
      loadModels();
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  const handleTest = async (id: string) => {
    try {
      await modelService.test(id);
      alert('模型连接测试成功！');
    } catch (err: any) {
      alert('模型连接测试失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await modelService.setDefault(id);
      loadModels();
    } catch (err) {
      console.error('Failed to set default model:', err);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'volcengine':
      case 'aliyun':
      case 'deepseek':
      case 'moonshot':
      case 'zhipu':
      case 'baichuan':
      case 'stepfun':
      case '01ai':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'openai':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'anthropic':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">模型管理</h1>
          <p className="text-sm text-zinc-500 mt-1">配置 AI 模型 API 连接</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建模型
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : models.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center">
            <svg className="w-16 h-16 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-lg font-medium text-zinc-900">暂无模型配置</p>
            <p className="text-sm text-zinc-500 mt-1 mb-4">添加第一个 AI 模型配置</p>
            <Button onClick={() => setShowAddModal(true)}>
              新建模型
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {models.map((model) => (
            <Card key={model.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    ['volcengine', 'aliyun', 'deepseek', 'moonshot', 'zhipu', 'baichuan', 'stepfun', '01ai'].includes(model.provider)
                      ? 'bg-blue-100 text-blue-600' :
                    model.provider === 'openai' ? 'bg-green-100 text-green-600' :
                    model.provider === 'anthropic' ? 'bg-orange-100 text-orange-600' :
                    'bg-zinc-100 text-zinc-600'
                  }`}>
                    {getProviderIcon(model.provider)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900">{model.name}</h3>
                      {model.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          默认
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">
                      {model.provider} {model.baseUrl && `• ${model.baseUrl}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(model.id)}
                  >
                    测试
                  </Button>
                  {!model.isDefault && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetDefault(model.id)}
                    >
                      设为默认
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(model.id)}
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
        title="新建模型配置"
        description="添加 AI 模型 API 连接信息"
      >
        <div className="space-y-4 py-4">
          <Input
            label="配置名称"
            placeholder="例如：OpenAI 主账号"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              服务提供商
            </label>
            <select
              value={formData.provider}
              onChange={(e) => {
                const provider = e.target.value;
                const baseUrlMap: Record<string, string> = {
                  volcengine: 'https://ark.cn-beijing.volces.com/api/v3',
                  aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                  deepseek: 'https://api.deepseek.com/v1',
                  openai: 'https://api.openai.com/v1',
                  anthropic: 'https://api.anthropic.com/v1',
                  moonshot: 'https://api.moonshot.cn/v1',
                  minimax: 'https://api.minimax.chat/v1',
                  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
                  baichuan: 'https://api.baichuan-ai.com/v1',
                  stepfun: 'https://api.stepfun.com/v1',
                  '01ai': 'https://api.lingyiwanwu.com/v1',
                  xai: 'https://api.x.ai/v1',
                };
                setFormData({
                  ...formData,
                  provider,
                  baseUrl: baseUrlMap[provider] || ''
                });
              }}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="volcengine">火山引擎</option>
              <option value="aliyun">阿里云百炼</option>
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="azure">Azure OpenAI</option>
              <option value="moonshot">月之暗面</option>
              <option value="minimax">MiniMax</option>
              <option value="zhipu">智谱 AI</option>
              <option value="baichuan">百川智能</option>
              <option value="stepfun">阶跃星辰</option>
              <option value="01ai">零一万物</option>
              <option value="xai">xAI</option>
            </select>
          </div>
          <Input
            label="API Key"
            type="password"
            placeholder="sk-..."
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            required
          />
          <Input
            label="Base URL (可选)"
            placeholder="https://api.openai.com/v1"
            value={formData.baseUrl}
            onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
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
