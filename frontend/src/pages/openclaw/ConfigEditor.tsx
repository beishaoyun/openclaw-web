import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { openclawService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

export default function ConfigEditor() {
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState('');
  const [originalConfig, setOriginalConfig] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadConfig();
    loadVersions();
  }, [id]);

  const loadConfig = async () => {
    try {
      const response = await openclawService.getConfig(id!);
      const data = response.data?.data;
      const configStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
      setConfig(configStr);
      setOriginalConfig(configStr);
    } catch (err) {
      console.error('Failed to load config:', err);
      setError('无法加载配置');
    }
  };

  const loadVersions = async () => {
    try {
      const response = await openclawService.getConfigVersions(id!);
      setVersions(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      let parsed;
      try {
        parsed = JSON.parse(config);
      } catch {
        setError('配置必须是有效的 JSON 格式');
        setIsSaving(false);
        return;
      }
      await openclawService.updateConfig(id!, parsed);
      setOriginalConfig(config);
      setSuccess('配置保存成功！');
      loadVersions();
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    setError('');
    try {
      let parsed;
      try {
        parsed = JSON.parse(config);
      } catch {
        setError('配置必须是有效的 JSON 格式');
        return;
      }
      await openclawService.validateConfig(id!, parsed);
      setSuccess('配置验证通过！');
    } catch (err: any) {
      setError(err.response?.data?.message || '验证失败');
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('确定要回滚到此版本吗？')) return;
    try {
      await openclawService.rollbackConfig(id!, versionId);
      setShowVersions(false);
      loadConfig();
      setSuccess('配置回滚成功！');
    } catch (err: any) {
      setError(err.response?.data?.message || '回滚失败');
    }
  };

  const hasChanges = config !== originalConfig;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">配置编辑</h1>
          <p className="text-sm text-zinc-500 mt-1">服务器 ID: {id}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowVersions(true)}
            disabled={isSaving}
            className="gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            历史版本 ({versions.length})
          </Button>
          <Button
            variant="secondary"
            onClick={handleValidate}
            disabled={isSaving || !config}
            className="gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            验证
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            保存
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-zinc-900">配置文件</h3>
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              未保存的更改
            </span>
          )}
        </div>
        <textarea
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          className="w-full h-96 px-3 py-2 border border-zinc-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          placeholder='{"key": "value"}'
        />
        <p className="text-xs text-zinc-500 mt-2">
          提示：按 Ctrl/Cmd + S 快速保存
        </p>
      </Card>

      {/* Version History Modal */}
      <Modal
        isOpen={showVersions}
        onClose={() => setShowVersions(false)}
        title="配置历史版本"
        description="选择要回滚的版本"
      >
        <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">暂无历史版本</p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50"
              >
                <div>
                  <h4 className="font-medium text-zinc-900">版本 {version.version}</h4>
                  <p className="text-sm text-zinc-500">
                    {new Date(version.createdAt).toLocaleString('zh-CN')}
                  </p>
                  {version.description && (
                    <p className="text-xs text-zinc-400 mt-1">{version.description}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRollback(version.id)}
                >
                  回滚
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Keyboard shortcut */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('keydown', function(e) {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                document.querySelector('button:contains("保存")')?.click();
              }
            });
          `,
        }}
      />
    </div>
  );
}
