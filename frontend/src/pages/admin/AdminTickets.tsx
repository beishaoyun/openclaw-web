import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { adminTicketService } from '../../services/admin.api';

interface Ticket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  content: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  assignedTo?: string;
}

interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replies, setReplies] = useState<TicketReply[]>([]);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await adminTicketService.list({ page: 1, pageSize: 50 });
      setTickets(response.data.data || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    try {
      const response = await adminTicketService.get(ticketId);
      setSelectedTicket(response.data.data);
      setReplies(response.data.replies || []);
    } catch (error) {
      console.error('Failed to load ticket detail:', error);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await adminTicketService.updateStatus(ticketId, newStatus);
      loadTickets();
      if (selectedTicket?.id === ticketId) {
        loadTicketDetail(ticketId);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyContent.trim()) return;
    try {
      await adminTicketService.reply(selectedTicket.id, replyContent);
      setReplyContent('');
      setShowReplyModal(false);
      loadTicketDetail(selectedTicket.id);
      loadTickets();
    } catch (error) {
      console.error('Failed to reply:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待处理',
      in_progress: '处理中',
      resolved: '已解决',
      closed: '已关闭',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      in_progress: 'blue',
      resolved: 'green',
      closed: 'gray',
    };
    return colors[status] || 'gray';
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-zinc-600',
      medium: 'text-blue-600',
      high: 'text-red-600',
    };
    return colors[priority] || 'text-zinc-600';
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
          <h2 className="text-lg font-semibold text-zinc-900">工单列表</h2>
          <div className="flex gap-2">
            <select className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">全部状态</option>
              <option value="pending">待处理</option>
              <option value="in_progress">处理中</option>
              <option value="resolved">已解决</option>
              <option value="closed">已关闭</option>
            </select>
            <select className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">全部优先级</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
            <input
              type="text"
              placeholder="搜索..."
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
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">工单标题</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">提交人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">优先级</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">创建时间</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 text-sm">
                    暂无工单
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{ticket.subject}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{ticket.userName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                        ticket.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                        ticket.status === 'resolved' ? 'bg-green-50 text-green-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(ticket.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => loadTicketDetail(ticket.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 工单详情弹窗 */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-zinc-900">工单详情</h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-zinc-400 hover:text-zinc-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 工单信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-500">标题</label>
                  <p className="font-medium text-zinc-900">{selectedTicket.subject}</p>
                </div>
                <div>
                  <label className="text-sm text-zinc-500">提交人</label>
                  <p className="font-medium text-zinc-900">{selectedTicket.userName}</p>
                </div>
                <div>
                  <label className="text-sm text-zinc-500">状态</label>
                  <div>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                      className="px-2 py-1 rounded-lg border border-zinc-300 text-sm"
                    >
                      <option value="pending">待处理</option>
                      <option value="in_progress">处理中</option>
                      <option value="resolved">已解决</option>
                      <option value="closed">已关闭</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-zinc-500">优先级</label>
                  <p className={`font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                    {getPriorityLabel(selectedTicket.priority)}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-zinc-500">问题描述</label>
                  <p className="text-zinc-900 mt-1 whitespace-pre-wrap">{selectedTicket.content}</p>
                </div>
              </div>

              {/* 回复列表 */}
              <div className="border-t border-zinc-200 pt-4">
                <h4 className="font-medium text-zinc-900 mb-3">回复记录</h4>
                <div className="space-y-3">
                  {replies.length === 0 ? (
                    <p className="text-zinc-500 text-sm">暂无回复</p>
                  ) : (
                    replies.map((reply) => (
                      <div key={reply.id} className="bg-zinc-50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-zinc-900">{reply.userName}</span>
                          <span className="text-xs text-zinc-500">
                            {new Date(reply.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-zinc-700 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowReplyModal(true)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                回复工单
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 回复弹窗 */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">回复工单</h3>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="请输入回复内容..."
              rows={6}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReply}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                发送回复
              </button>
              <button
                onClick={() => setShowReplyModal(false)}
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
