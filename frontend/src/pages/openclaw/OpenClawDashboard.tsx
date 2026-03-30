import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serverService, openclawService, modelService, channelService, skillService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

interface Model {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'inactive' | 'error';
  isDefault: boolean;
}

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  status: 'active' | 'inactive' | 'error';
}

interface Skill {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

const PRESET_MODELS = [
  { value: 'custom', label: '自定义模型' },
  { value: 'tencent-coding', label: '腾讯云 Coding Plan' },
  { value: 'deepseek', label: '腾讯云 DeepSeek' },
  { value: 'baidu-qianfan', label: '百度 (文心一言)' },
  { value: 'alibaba', label: '阿里云 (千问)' },
  { value: 'minimax', label: 'MiniMax (国内)' },
  { value: 'moonshot', label: 'Moonshot AI (Kimi 国内)' },
  { value: 'zhipu', label: '智谱 AI (GLM 国内)' },
  { value: 'volcengine', label: '火山引擎 (豆包)' },
];

const PRESET_CHANNELS = [
  { value: 'qq', label: 'QQ' },
  { value: 'wecom', label: '企业微信' },
  { value: 'feishu', label: '飞书' },
  { value: 'dingtalk', label: '钉钉' },
  { value: 'telegram', label: 'Telegram' },
];

export default function OpenClawDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [server, setServer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 模型状态
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelProvider, setSelectedModelProvider] = useState('tencent-coding');
  const [modelForm, setModelForm] = useState({
    name: '',
    provider: 'tencent-coding',
    apiKey: '',
    baseUrl: '',
  });

  // 通道状态
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelType, setSelectedChannelType] = useState('qq');
  const [channelForm, setChannelForm] = useState({
    name: '',
    channel_type: 'qq',
    appId: '',
    appSecret: '',
  });

  // 技能状态
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    loadServer();
    loadModels();
    loadChannels();
    loadSkills();
  }, [id]);

  const loadServer = async () => {
    try {
      const response = await serverService.get(id!);
      setServer(response.data?.data || null);
    } catch (err) {
      console.error('Failed to load server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const response = await modelService.list();
      setModels(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await channelService.list();
      setChannels(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const loadSkills = async () => {
    try {
      const response = await skillService.list();
      setSkills(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  };

  // 模型操作
  const handleAddModel = async () => {
    try {
      await modelService.add({
        name: modelForm.name || PRESET_MODELS.find(m => m.value === modelForm.provider)?.label || modelForm.provider,
        provider: modelForm.provider,
        api_key: modelForm.apiKey,
        base_url: modelForm.baseUrl,
      });
      loadModels();
      setModelForm({ name: '', provider: selectedModelProvider, apiKey: '', baseUrl: '' });
    } catch (err: any) {
      alert('添加失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('确定要删除此模型吗？')) return;
    try {
      await modelService.delete(modelId);
      loadModels();
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  const handleTestModel = async (modelId: string) => {
    try {
      await modelService.test(modelId);
      alert('模型测试成功！');
    } catch (err: any) {
      alert('模型测试失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleSetDefaultModel = async (modelId: string) => {
    try {
      await modelService.setDefault(modelId);
      loadModels();
    } catch (err: any) {
      alert('设置失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  // 通道操作
  const handleAddChannel = async () => {
    try {
      await channelService.add({
        name: channelForm.name || PRESET_CHANNELS.find(c => c.value === channelForm.channel_type)?.label || channelForm.channel_type,
        channel_type: channelForm.channel_type,
        config: {
          app_id: channelForm.appId,
          app_secret: channelForm.appSecret,
        },
      });
      loadChannels();
      setChannelForm({ name: '', channel_type: selectedChannelType, appId: '', appSecret: '' });
    } catch (err: any) {
      alert('添加失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('确定要删除此通道吗？')) return;
    try {
      await channelService.delete(channelId);
      loadChannels();
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

  const handleTestChannel = async (channelId: string) => {
    try {
      await channelService.test(channelId);
      alert('通道测试成功！');
    } catch (err: any) {
      alert('通道测试失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleHealthCheckChannel = async (channelId: string) => {
    try {
      await channelService.healthCheck(channelId);
      alert('健康检查完成！');
    } catch (err: any) {
      alert('健康检查失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  // 技能操作
  const handleInstallSkill = async (skillName: string) => {
    try {
      await skillService.add({
        name: skillName,
        description: '已安装技能',
      });
      loadSkills();
    } catch (err: any) {
      alert('安装失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('确定要删除此技能吗？')) return;
    try {
      await skillService.delete(skillId);
      loadSkills();
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const handleTestSkill = async (skillId: string) => {
    try {
      await skillService.test(skillId);
      alert('技能测试成功！');
    } catch (err: any) {
      alert('技能测试失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const presetSkills = [
    { name: '每日天气', description: '查询指定城市的天气信息' },
    { name: '新闻摘要', description: '获取最新新闻摘要' },
    { name: '翻译助手', description: '多语言翻译技能' },
    { name: '待办事项', description: '管理和提醒待办事项' },
  ];

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
    <div className="max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">OpenClaw 管理</h1>
          <p className="text-sm text-zinc-500 mt-1">
            服务器：{server?.name} ({server?.host}:{server?.port})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/servers')}>返回服务器列表</Button>
          <Button variant="secondary" onClick={() => navigate(`/config/${id}`)}>配置编辑</Button>
        </div>
      </div>

      {/* 三栏布局 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 1. 模型 (Models) */}
        <Card className="flex flex-col">
          <div className="p-4 border-b border-zinc-100">
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <span className="text-blue-600">1.</span>
              模型 (Models)
            </h2>
            <p className="text-xs text-zinc-500 mt-1">请先配置模型，添加至少 1 个模型后，OpenClaw 才能正常工作</p>
          </div>

          <div className="p-4 flex-1 overflow-auto">
            {/* 模型选择 */}
            <div className="mb-4">
              <select
                value={selectedModelProvider}
                onChange={(e) => {
                  setSelectedModelProvider(e.target.value);
                  setModelForm({ ...modelForm, provider: e.target.value });
                }}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRESET_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
            </div>

            {/* 自定义模型配置 */}
            {selectedModelProvider === 'custom' && (
              <div className="space-y-3 mb-4">
                <Input
                  label="模型名称"
                  value={modelForm.name}
                  onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                  placeholder="例如：GPT-4"
                />
                <Input
                  label="API Key"
                  type="password"
                  value={modelForm.apiKey}
                  onChange={(e) => setModelForm({ ...modelForm, apiKey: e.target.value })}
                />
                <Input
                  label="Base URL"
                  value={modelForm.baseUrl}
                  onChange={(e) => setModelForm({ ...modelForm, baseUrl: e.target.value })}
                  placeholder="可选"
                />
              </div>
            )}

            {/* 添加按钮 */}
            <Button
              className="w-full mb-4"
              onClick={handleAddModel}
            >
              一键添加并应用
            </Button>

            {/* 已添加的模型列表 */}
            {models.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">已配置模型</p>
                {models.map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{model.name}</span>
                      {model.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">默认</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTestModel(model.id)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        测试
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        onClick={() => handleSetDefaultModel(model.id)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        设为默认
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        onClick={() => handleDeleteModel(model.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 2. 通道 (Channels) */}
        <Card className="flex flex-col">
          <div className="p-4 border-b border-zinc-100">
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <span className="text-green-600">2.</span>
              通道 (Channels)
            </h2>
            <p className="text-xs text-zinc-500 mt-1">选择需要接入的 IM 平台，配置成功后即可接收消息</p>
          </div>

          <div className="p-4 flex-1 overflow-auto">
            {/* 通道类型选择 */}
            <div className="mb-4">
              <select
                value={selectedChannelType}
                onChange={(e) => {
                  setSelectedChannelType(e.target.value);
                  setChannelForm({ ...channelForm, channel_type: e.target.value });
                }}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {PRESET_CHANNELS.map((channel) => (
                  <option key={channel.value} value={channel.value}>{channel.label}</option>
                ))}
              </select>
            </div>

            {/* 通道配置 */}
            <div className="space-y-3 mb-4">
              <Input
                label="通道名称"
                value={channelForm.name}
                onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                placeholder="例如：客服 QQ"
              />
              <Input
                label="App ID"
                value={channelForm.appId}
                onChange={(e) => setChannelForm({ ...channelForm, appId: e.target.value })}
              />
              <Input
                label="App Secret"
                type="password"
                value={channelForm.appSecret}
                onChange={(e) => setChannelForm({ ...channelForm, appSecret: e.target.value })}
              />
            </div>

            {/* 添加按钮 */}
            <Button
              className="w-full mb-4 bg-green-600 hover:bg-green-700"
              onClick={handleAddChannel}
            >
              一键添加并应用
            </Button>

            {/* 已添加的通道列表 */}
            {channels.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">已配置通道</p>
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{channel.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        channel.status === 'active' ? 'bg-green-100 text-green-700' :
                        channel.status === 'error' ? 'bg-red-100 text-red-700' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {channel.status === 'active' ? '运行中' : channel.status === 'error' ? '错误' : '未激活'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTestChannel(channel.id)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        测试
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        onClick={() => handleHealthCheckChannel(channel.id)}
                        className="text-xs text-green-600 hover:text-green-700"
                      >
                        健康检查
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 3. 技能 (Skills) */}
        <Card className="flex flex-col">
          <div className="p-4 border-b border-zinc-100">
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <span className="text-purple-600">3.</span>
              技能 (Skills)
            </h2>
            <p className="text-xs text-zinc-500 mt-1">为 AI 助手添加工具能力，例如查询天气、设置提醒等</p>
          </div>

          <div className="p-4 flex-1 overflow-auto">
            {/* 技能搜索 */}
            <div className="mb-4">
              <Input
                placeholder="搜索技能..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />
            </div>

            {/* 可安装技能列表 */}
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">可安装技能</p>
              {presetSkills
                .filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()))
                .map((skill) => (
                  <div key={skill.name} className="flex items-center justify-between p-3 bg-zinc-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{skill.name}</p>
                      <p className="text-xs text-zinc-500">{skill.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInstallSkill(skill.name)}
                    >
                      安装
                    </Button>
                  </div>
                ))}
            </div>

            {/* 已安装技能 */}
            {skills.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs text-zinc-500">已安装技能</p>
                {skills.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{skill.name}</p>
                      <p className="text-xs text-zinc-500">{skill.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTestSkill(skill.id)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        测试
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
