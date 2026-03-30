import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serverService, openclawService, modelService, channelService, skillService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [server, setServer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: server?.name || '',
    host: server?.host || '',
    port: server?.port || 22,
    username: server?.username || 'root',
    password: '',
  });

  // OpenClaw 版本信息
  const [openclawVersion, setOpenclawVersion] = useState<{ installed: boolean; version: string; latest: boolean } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  // 三栏布局状态
  const [models, setModels] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [selectedModelProvider, setSelectedModelProvider] = useState('tencent-coding');
  const [modelForm, setModelForm] = useState({ name: '', provider: 'tencent-coding', apiKey: '', baseUrl: '' });
  const [selectedChannelType, setSelectedChannelType] = useState('qq');
  const [channelForm, setChannelForm] = useState({ name: '', channel_type: 'qq', appId: '', appSecret: '' });
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    loadServer();
  }, [id]);

  const loadServer = async () => {
    setIsLoading(true);
    try {
      const response = await serverService.get(id!);
      setServer(response.data?.data || null);
      // 如果已安装 OpenClaw，检查版本
      if (response.data?.data?.openclaw_status === 'running' || response.data?.data?.openclaw_status === 'stopped') {
        checkOpenClawVersion();
        loadModels();
        loadChannels();
        loadSkills();
      }
    } catch (err) {
      console.error('Failed to load server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkOpenClawVersion = async () => {
    setIsCheckingUpdate(true);
    try {
      const { data } = await openclawService.checkVersion(id!);
      setOpenclawVersion({
        installed: data.installed,
        version: data.version,
        latest: data.isLatest,
      });
    } catch (err: any) {
      console.error('Failed to check version:', err);
      setOpenclawVersion({ installed: true, version: '未知', latest: true });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleUpdateOpenClaw = async () => {
    if (!confirm('确定要更新 OpenClaw 到最新版本吗？')) return;
    setIsOperating(true);
    try {
      await openclawService.update(id!);
      alert('更新成功！');
      checkOpenClawVersion();
      loadServer();
    } catch (err: any) {
      alert('更新失败：' + (err.response?.data?.message || '未知错误'));
    } finally {
      setIsOperating(false);
    }
  };

  const handleUninstallOpenClaw = async () => {
    if (!confirm('确定要卸载 OpenClaw 吗？此操作不可逆！')) return;
    setIsUninstalling(true);
    try {
      // 通过 SSH 执行卸载命令
      await serverService.executeCommand(id!, 'rm -rf /opt/openclaw && pkill -f openclaw || true');
      alert('卸载成功！');
      loadServer();
    } catch (err: any) {
      alert('卸载失败：' + (err.response?.data?.message || '未知错误'));
    } finally {
      setIsUninstalling(false);
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

  const handleEdit = () => {
    setEditForm({
      name: server.name || '',
      host: server.host,
      port: server.port,
      username: server.username,
      password: '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    try {
      await serverService.update(id!, editForm);
      setShowEditModal(false);
      loadServer();
      alert('服务器信息已更新');
    } catch (err: any) {
      alert('更新失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  // 模型操作
  const loadModels = async () => {
    try {
      const response = await modelService.list();
      setModels(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const handleAddModel = async () => {
    try {
      await modelService.add({
        name: modelForm.name || modelForm.provider,
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
  const loadChannels = async () => {
    try {
      const response = await channelService.list();
      setChannels(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const handleAddChannel = async () => {
    try {
      await channelService.add({
        name: channelForm.name || channelForm.channel_type,
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
  const loadSkills = async () => {
    try {
      const response = await skillService.list();
      setSkills(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  };

  const handleInstallSkill = async (skillName: string) => {
    try {
      await skillService.add({ name: skillName, description: '已安装技能' });
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

  const PRESET_SKILLS = [
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
          <p className="text-sm text-zinc-500 mt-1">{server.host}:{server.port} · 用户：{server.username}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>编辑</Button>
          <Button variant="outline" onClick={() => navigate('/servers')}>返回</Button>
          {server.openclaw_status === 'not_installed' ? (
            <Button onClick={handleInstallOpenClaw}>安装 OpenClaw</Button>
          ) : (
            <Button onClick={handleManageOpenClaw}>管理 OpenClaw</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Server Info */}
        <Card title="服务器信息">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-sm text-zinc-500">主机地址</span>
              <span className="text-sm font-medium text-zinc-900">{server.public_ip || server.host}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-sm text-zinc-500">SSH 端口</span>
              <span className="text-sm font-medium text-zinc-900">{server.ssh_port || server.port}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-sm text-zinc-500">用户名</span>
              <span className="text-sm font-medium text-zinc-900">{server.ssh_user || server.username}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-sm text-zinc-500">SSH 状态</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  server.ssh_status === 'online' ? 'bg-green-500' :
                  server.ssh_status === 'offline' ? 'bg-red-500' :
                  'bg-zinc-400'
                }`} />
                <span className="text-sm font-medium">
                  {server.ssh_status === 'online' ? '在线' : server.ssh_status === 'offline' ? '离线' : '未知'}
                </span>
              </div>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-zinc-500">添加时间</span>
              <span className="text-sm font-medium">
                {server.created_at ? new Date(server.created_at).toLocaleDateString('zh-CN') : '未知'}
              </span>
            </div>
          </div>
        </Card>

        {/* OpenClaw Status */}
        <Card title="OpenClaw 状态">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                server.openclaw_status === 'running' ? 'bg-green-500' :
                server.openclaw_status === 'error' ? 'bg-red-500' :
                server.openclaw_status === 'not_installed' ? 'bg-zinc-400' :
                'bg-yellow-500'
              }`} />
              <span className="text-sm font-medium text-zinc-900">
                {server.openclaw_status === 'running' ? 'OpenClaw 运行中' :
                 server.openclaw_status === 'stopped' ? '已安装（已停止）' :
                 server.openclaw_status === 'not_installed' ? '未安装 OpenClaw' :
                 server.openclaw_status === 'unknown' ? 'SSH 连接失败，无法检测' :
                 server.openclaw_status === 'error' ? 'OpenClaw 错误' : '检测中...'}
              </span>
              {openclawVersion && !openclawVersion.latest && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  有新版本
                </span>
              )}
            </div>
            {openclawVersion && openclawVersion.installed && (
              <div className="text-sm text-zinc-600">
                版本：{openclawVersion.version} {openclawVersion.latest ? '✓ 最新' : ''}
              </div>
            )}
            {server.openclaw_status === 'not_installed' ? (
              <Button onClick={handleInstallOpenClaw} className="w-full gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                安装 OpenClaw
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/openclaw/${id}`)}
                >
                  配置管理
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleUpdateOpenClaw}
                  disabled={isCheckingUpdate || isOperating}
                  className="gap-2"
                >
                  {isCheckingUpdate ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      检查中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      更新
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUninstallOpenClaw}
                  disabled={isUninstalling}
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  卸载
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* OpenClaw Management - Models, Channels, Skills */}
      {(server.openclaw_status === 'running' || server.openclaw_status === 'stopped') && (
        <div className="grid grid-cols-3 gap-6 mt-6">
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
                          设默认
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
                {PRESET_SKILLS
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
      )}

      {/* Server Operations */}
      <Card title="服务器操作" className="mt-6">
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

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑服务器"
        description="修改服务器的 SSH 连接信息"
      >
        <div className="space-y-4 py-4">
          <Input
            label="服务器名称"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <Input
            label="主机地址"
            value={editForm.host}
            onChange={(e) => setEditForm({ ...editForm, host: e.target.value })}
            required
          />
          <Input
            label="SSH 端口"
            type="number"
            value={editForm.port}
            onChange={(e) => setEditForm({ ...editForm, port: parseInt(e.target.value) })}
            required
          />
          <Input
            label="用户名"
            value={editForm.username}
            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
            required
          />
          <Input
            label="密码"
            type="password"
            placeholder="留空则保持不变"
            value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowEditModal(false)}>
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
