import { api } from './api';

// 管理员认证
export const adminAuthService = {
  login: (data: { username: string; password: string; captcha?: string }) =>
    api.post('/admin/auth/login', data),
  logout: () => api.post('/admin/auth/logout'),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/admin/auth/change-password', data),
};

// 客户管理
export const adminClientService = {
  list: (params?: { page?: number; pageSize?: number; keyword?: string; status?: string }) =>
    api.get('/admin/clients/users', { params }),
  get: (id: string) => api.get(`/admin/clients/users/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put(`/admin/clients/users/${id}/status`, { status }),
  updateQuota: (id: string, data: { serverLimit?: number; apiQuota?: number }) =>
    api.put(`/admin/clients/users/${id}/quota`, data),
  resetPassword: (id: string) =>
    api.post(`/admin/clients/users/${id}/reset-password`),
  getServers: (id: string) => api.get(`/admin/clients/users/${id}/servers`),
  getLogs: (id: string) => api.get(`/admin/clients/users/${id}/logs`),
};

// 工单管理
export const adminTicketService = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    priority?: string;
    keyword?: string;
  }) => api.get('/admin/tickets/tickets', { params }),
  get: (id: string) => api.get(`/admin/tickets/tickets/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put(`/admin/tickets/tickets/${id}/status`, { status }),
  assign: (id: string, assignedTo: string) =>
    api.put(`/admin/tickets/tickets/${id}/assign`, { assignedTo }),
  reply: (id: string, content: string, attachments?: string[]) =>
    api.post(`/admin/tickets/tickets/${id}/reply`, { content, attachments }),
};

// 系统管理
export const adminSystemService = {
  getAlerts: () => api.get('/admin/system/alerts'),
  acknowledgeAlert: (id: string) =>
    api.post(`/admin/system/alerts/${id}/acknowledge`),
  getAlertRules: () => api.get('/admin/system/alert-rules'),
  createAlertRule: (data: any) => api.post('/admin/system/alert-rules', data),
  updateAlertRule: (id: string, data: any) =>
    api.put(`/admin/system/alert-rules/${id}`, data),
  getConfigs: () => api.get('/admin/system/configs'),
  updateConfig: (key: string, data: any) =>
    api.put(`/admin/system/configs/${key}`, data),
};

// 日志管理
export const adminLogService = {
  getAdminLogs: (params?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    action?: string;
  }) => api.get('/admin/logs/logs', { params }),
  getOperationLogs: (params?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) => api.get('/admin/logs/operation-logs', { params }),
};
