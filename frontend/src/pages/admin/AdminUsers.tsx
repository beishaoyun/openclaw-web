import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { adminClientService } from '../../services/admin.api';

interface User {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'suspended' | 'inactive';
  serverLimit: number;
  apiQuota: number;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditQuota, setShowEditQuota] = useState(false);
  const [quotaForm, setQuotaForm] = useState({ serverLimit: 0, apiQuota: 0 });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminClientService.list({ page: 1, pageSize: 50 });
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      await adminClientService.updateStatus(userId, newStatus);
      loadUsers();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleOpenQuotaEdit = (user: User) => {
    setSelectedUser(user);
    setQuotaForm({
      serverLimit: user.serverLimit,
      apiQuota: user.apiQuota,
    });
    setShowEditQuota(true);
  };

  const handleUpdateQuota = async () => {
    if (!selectedUser) return;
    try {
      await adminClientService.updateQuota(selectedUser.id, quotaForm);
      setShowEditQuota(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to update quota:', error);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('确定要重置该用户的密码吗？临时密码将发送到用户邮箱。')) return;
    try {
      await adminClientService.resetPassword(userId);
      alert('密码已重置，临时密码已发送到用户邮箱');
    } catch (error) {
      console.error('Failed to reset password:', error);
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
          <h2 className="text-lg font-semibold text-zinc-900">客户列表</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              搜索
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">服务器配额</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">API 配额</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">注册时间</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 text-sm">
                    暂无用户数据
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-zinc-900">{user.username}</div>
                        <div className="text-sm text-zinc-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.status}
                        onChange={(e) => handleUpdateStatus(user.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          user.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : user.status === 'suspended'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        <option value="active">活跃</option>
                        <option value="inactive">未激活</option>
                        <option value="suspended">已停用</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{user.serverLimit} 台</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{user.apiQuota.toLocaleString()} /天</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenQuotaEdit(user)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          修改配额
                        </button>
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="text-zinc-600 hover:text-zinc-800 text-sm"
                        >
                          重置密码
                        </button>
                        <button className="text-zinc-600 hover:text-zinc-800 text-sm">
                          详情
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 修改配额弹窗 */}
      {showEditQuota && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">
              修改用户配额 - {selectedUser.username}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  服务器数量限制
                </label>
                <input
                  type="number"
                  value={quotaForm.serverLimit}
                  onChange={(e) => setQuotaForm({ ...quotaForm, serverLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  API 日配额
                </label>
                <input
                  type="number"
                  value={quotaForm.apiQuota}
                  onChange={(e) => setQuotaForm({ ...quotaForm, apiQuota: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleUpdateQuota}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => setShowEditQuota(false)}
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
