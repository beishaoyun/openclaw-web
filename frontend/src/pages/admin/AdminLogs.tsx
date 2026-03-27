import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { adminLogService } from '../../services/admin.api';

interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  createdAt: string;
}

interface OperationLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: any;
  createdAt: string;
}

export default function AdminLogs() {
  const [activeTab, setActiveTab] = useState<'admin' | 'operation'>('admin');
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    keyword: '',
  });

  useEffect(() => {
    loadLogs();
  }, [activeTab]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (activeTab === 'admin') {
        const response = await adminLogService.getAdminLogs({
          page: 1,
          pageSize: 50,
          startDate: filters.startDate,
          endDate: filters.endDate,
          action: filters.action,
        });
        setAdminLogs(response.data.data || []);
      } else {
        const response = await adminLogService.getOperationLogs({
          page: 1,
          pageSize: 50,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
        setOperationLogs(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleSearch = () => {
    loadLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      action: '',
      keyword: '',
    });
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
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'admin'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            管理员日志
          </button>
          <button
            onClick={() => setActiveTab('operation')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'operation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            用户操作日志
          </button>
        </div>

        {/* 筛选器 */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                开始日期
              </label>
              <input
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                结束日期
              </label>
              <input
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                操作类型
              </label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                placeholder="如：login, update"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                查询
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-sm hover:bg-zinc-200"
              >
                重置
              </button>
            </div>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  时间
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  用户
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  操作
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  资源
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  详情
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  IP 地址
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {(activeTab === 'admin' ? adminLogs : operationLogs).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 text-sm">
                    暂无日志数据
                  </td>
                </tr>
              ) : (
                (activeTab === 'admin' ? adminLogs : operationLogs).map((log: any) => (
                  <tr key={log.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {'adminName' in log ? log.adminName : log.userName}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 font-mono">
                      {log.resource || `${log.resourceType}/${log.resourceId}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {log.details ? (
                        <pre className="text-xs bg-zinc-50 p-2 rounded overflow-auto max-w-md">
                          {typeof log.details === 'string'
                            ? log.details
                            : JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 font-mono">
                      {'ipAddress' in log ? log.ipAddress : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
