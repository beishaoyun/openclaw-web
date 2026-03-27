import { useState, useEffect } from 'react';
import { skillService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface Skill {
  id: string;
  name: string;
  description: string;
  type: string;
  config: Record<string, any>;
  status: 'active' | 'inactive';
  isPublic: boolean;
  createdAt: string;
}

export default function SkillManager() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'custom',
    config: '{}',
  });
  const [error, setError] = useState('');
  const [publicSkills, setPublicSkills] = useState<Skill[]>([]);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const response = await skillService.list();
      setSkills(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPublicSkills = async () => {
    try {
      const response = await skillService.getPublic();
      setPublicSkills(response.data?.data || []);
      setShowImportModal(true);
    } catch (err) {
      setError('无法获取公开技能列表');
    }
  };

  const handleAdd = async () => {
    setError('');
    try {
      let config;
      try {
        config = JSON.parse(formData.config);
      } catch {
        setError('配置必须是有效的 JSON 格式');
        return;
      }
      await skillService.add({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        config,
      });
      setShowAddModal(false);
      loadSkills();
    } catch (err: any) {
      setError(err.response?.data?.message || '添加失败');
    }
  };

  const handleImport = async (id: string) => {
    try {
      await skillService.import(id);
      setShowImportModal(false);
      loadSkills();
    } catch (err) {
      setError('导入失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此技能吗？')) return;
    try {
      await skillService.delete(id);
      loadSkills();
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const handleTest = async (id: string) => {
    try {
      await skillService.test(id);
      alert('技能测试成功！');
    } catch (err: any) {
      alert('技能测试失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleExecute = async (id: string) => {
    const input = prompt('请输入执行参数：');
    if (!input) return;
    try {
      const { data } = await skillService.execute(id, input);
      alert('执行结果：' + JSON.stringify(data));
    } catch (err: any) {
      alert('执行失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'custom': return 'bg-blue-100 text-blue-600';
      case 'template': return 'bg-purple-100 text-purple-600';
      case 'webhook': return 'bg-green-100 text-green-600';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">技能管理</h1>
          <p className="text-sm text-zinc-500 mt-1">配置和管理自动化技能</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPublicSkills} className="gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导入公开技能
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建技能
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
      ) : skills.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center">
            <svg className="w-16 h-16 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-lg font-medium text-zinc-900">暂无技能</p>
            <p className="text-sm text-zinc-500 mt-1 mb-4">从公开库导入或手动新建</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={loadPublicSkills}>
                导入公开技能
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                新建技能
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {skills.map((skill) => (
            <Card key={skill.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-zinc-900">{skill.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeColor(skill.type)}`}>
                      {skill.type}
                    </span>
                    {skill.isPublic && (
                      <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                        公开
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500">{skill.description || '暂无描述'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(skill.id)}
                  >
                    测试
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExecute(skill.id)}
                  >
                    执行
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(skill.id)}
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

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新建技能"
        description="配置自动化技能参数"
      >
        <div className="space-y-4 py-4">
          <Input
            label="技能名称"
            placeholder="例如：数据清洗技能"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="描述"
            placeholder="描述此技能的功能"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              技能类型
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="custom">自定义</option>
              <option value="template">模板</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              配置 (JSON)
            </label>
            <textarea
              value={formData.config}
              onChange={(e) => setFormData({ ...formData, config: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono text-sm"
              rows={6}
              placeholder='{"key": "value"}'
            />
          </div>
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

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="导入公开技能"
        description="从公开库选择要导入的技能"
      >
        <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
          {publicSkills.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">暂无公开技能</p>
          ) : (
            publicSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50"
              >
                <div>
                  <h4 className="font-medium text-zinc-900">{skill.name}</h4>
                  <p className="text-sm text-zinc-500">{skill.description}</p>
                </div>
                <Button size="sm" onClick={() => handleImport(skill.id)}>
                  导入
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
