import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { adminSystemService } from '../../services/admin.api';

interface Alert {
  id: string;
  type: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  resourceId?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  createdAt: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  threshold: number;
  level: 'warning' | 'error' | 'critical';
  enabled: boolean;
  notifyChannels: string[];
}

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules'>('alerts');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    description: '',
    condition: '',
    threshold: 0,
    level: 'warning',
    enabled: true,
    notifyChannels: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [alertsRes, rulesRes] = await Promise.all([
        adminSystemService.getAlerts(),
        adminSystemService.getAlertRules(),
      ]);
      setAlerts(alertsRes.data.data || []);
      setAlertRules(rulesRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await adminSystemService.acknowledgeAlert(alertId);
      loadData();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      await adminSystemService.createAlertRule(newRule);
      setShowCreateRule(false);
      setNewRule({
        name: '',
        description: '',
        condition: '',
        threshold: 0,
        level: 'warning',
        enabled: true,
        notifyChannels: [],
      });
      loadData();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await adminSystemService.updateAlertRule(ruleId, { enabled });
      loadData();
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-50 text-blue-700 border-blue-200',
      warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      error: 'bg-orange-50 text-orange-700 border-orange-200',
      critical: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[level] || colors.info;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500">加载中...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 标签页 */}
        <div className="flex gap-2 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            告警列表 ({alerts.filter((a) => !a.acknowledged).length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            告警规则
          </button>
        </div>

        {/* 告警列表 */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center text-zinc-500">
                暂无告警
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white rounded-lg border p-4 ${getLevelColor(alert.level)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{alert.title}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium border">
                          {alert.level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm opacity-80">{alert.message}</p>
                      <p className="text-xs mt-2 opacity-60">
                        {new Date(alert.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1 bg-white bg-opacity-50 hover:bg-opacity-70 rounded text-sm font-medium"
                      >
                        确认
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 告警规则 */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateRule(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                新建告警规则
              </button>
            </div>

            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      规则名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      描述
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      条件
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      级别
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      状态
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {alertRules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 text-sm">
                        暂无告警规则
                      </td>
                    </tr>
                  ) : (
                    alertRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-medium text-zinc-900">{rule.name}</td>
                        <td className="px-4 py-3 text-sm text-zinc-600">{rule.description}</td>
                        <td className="px-4 py-3 text-sm text-zinc-600 font-mono">{rule.condition}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            rule.level === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                            rule.level === 'error' ? 'bg-orange-50 text-orange-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {rule.level.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-10 h-5 rounded-full transition-colors ${
                              rule.enabled ? 'bg-green-500' : 'bg-zinc-300'
                            }`}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                                rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                              }`} />
                            </div>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            编辑
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 新建规则弹窗 */}
      {showCreateRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">新建告警规则</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  规则名称
                </label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：CPU 使用率过高"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  描述
                </label>
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="描述规则的用途"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  触发条件
                </label>
                <input
                  type="text"
                  value={newRule.condition}
                  onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：cpu_usage >"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    阈值
                  </label>
                  <input
                    type="number"
                    value={newRule.threshold}
                    onChange={(e) => setNewRule({ ...newRule, threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    告警级别
                  </label>
                  <select
                    value={newRule.level}
                    onChange={(e) => setNewRule({ ...newRule, level: e.target.value as any })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="warning">警告</option>
                    <option value="error">错误</option>
                    <option value="critical">严重</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateRule}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                创建
              </button>
              <button
                onClick={() => setShowCreateRule(false)}
                className="flex-1 bg-zinc-100 text-zinc-700 py-2 rounded-lg hover:bg-zinc-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
