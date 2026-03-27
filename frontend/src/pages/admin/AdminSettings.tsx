import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { adminSystemService } from '../../services/admin.api';

interface SystemConfig {
  key: string;
  value: any;
  description: string;
  updatedAt?: string;
}

export default function AdminSettings() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await adminSystemService.getConfigs();
      setConfigs(response.data.data || []);
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: SystemConfig) => {
    setEditingConfig(config);
    setEditValue(typeof config.value === 'string' ? config.value : JSON.stringify(config.value));
  };

  const handleSave = async () => {
    if (!editingConfig) return;
    try {
      let parsedValue = editValue;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        // Keep as string if not valid JSON
      }
      await adminSystemService.updateConfig(editingConfig.key, { value: parsedValue });
      setEditingConfig(null);
      loadConfigs();
    } catch (error) {
      console.error('Failed to update config:', error);
    }
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
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-zinc-900">系统配置</h2>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  配置项
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  值
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  描述
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  更新时间
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 text-sm">
                    暂无配置数据
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config.key} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{config.key}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 font-mono">
                      {typeof config.value === 'string'
                        ? config.value
                        : JSON.stringify(config.value)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{config.description}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {config.updatedAt
                        ? new Date(config.updatedAt).toLocaleString('zh-CN')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
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

      {/* 编辑配置弹窗 */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">
              编辑配置 - {editingConfig.key}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-600 mb-2">
                  {editingConfig.description}
                </label>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  支持 JSON 格式或纯文本
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => setEditingConfig(null)}
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
