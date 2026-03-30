import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证令牌
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理认证失败
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // 使用 navigate 而不是 location.href 来避免白屏
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && !currentPath.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API 服务
export const authService = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  guestStart: () => api.post('/auth/guest/start'),
  guestEnd: (token: string) => api.delete(`/auth/guest/${token}`),
  captcha: () => api.get('/auth/captcha'),
};

export const serverService = {
  list: () => api.get('/servers'),
  get: (id: string) => api.get(`/servers/${id}`),
  add: (data: any) => api.post('/servers', data),
  update: (id: string, data: any) => api.put(`/servers/${id}`, data),
  delete: (id: string) => api.delete(`/servers/${id}`),
  testConnection: (id: string) => api.post(`/servers/${id}/ssh-test`),
  verifyCredentials: (id: string) => api.post(`/servers/${id}/verify-credentials`),
  batchVerifyAll: () => api.post('/servers/batch/verify-all'),
  reboot: (id: string) => api.post(`/servers/${id}/reboot`),
  shutdown: (id: string) => api.post(`/servers/${id}/shutdown`),
  refresh: (id: string) => api.post(`/servers/${id}/refresh`),
  batchReboot: (ids: string[]) => api.post('/servers/batch/reboot', { ids }),
  batchShutdown: (ids: string[]) => api.post('/servers/batch/shutdown', { ids }),
  getMetrics: (id: string) => api.get(`/servers/${id}/metrics`),
  executeCommand: (id: string, command: string) => api.post(`/servers/${id}/execute`, { command }),
};

export const openclawService = {
  install: (serverId: string) => api.post('/openclaw/install', { server_id: serverId }),
  checkEnv: (serverId: string) => api.post(`/openclaw/${serverId}/check-env`),
  getTask: (taskId: string) => api.get(`/openclaw/tasks/${taskId}`),
  cancelTask: (taskId: string) => api.post(`/openclaw/tasks/${taskId}/cancel`),
  uploadPackage: (file: File) => {
    const formData = new FormData();
    formData.append('package', file);
    return api.post('/openclaw/offline-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getStatus: (serverId: string) => api.get(`/openclaw/${serverId}/status`),
  checkVersion: (serverId: string) => api.get(`/openclaw/${serverId}/version`),
  update: (serverId: string) => api.post(`/openclaw/${serverId}/update`),
  start: (serverId: string) => api.post(`/openclaw/${serverId}/start`),
  stop: (serverId: string) => api.post(`/openclaw/${serverId}/stop`),
  restart: (serverId: string) => api.post(`/openclaw/${serverId}/restart`),
  getConfig: (serverId: string) => api.get(`/openclaw/${serverId}/config`),
  updateConfig: (serverId: string, config: any) =>
    api.put(`/openclaw/${serverId}/config`, config),
  validateConfig: (serverId: string, config: any) =>
    api.post(`/openclaw/${serverId}/config/validate`, config),
  getConfigVersions: (serverId: string) =>
    api.get(`/openclaw/${serverId}/config/versions`),
  rollbackConfig: (serverId: string, versionId: string) =>
    api.post(`/openclaw/${serverId}/config/rollback`, { versionId }),
  getLogs: (serverId: string) => api.get(`/openclaw/${serverId}/logs`),
};

export const modelService = {
  list: () => api.get('/models'),
  add: (data: any) => api.post('/models', data),
  update: (id: string, data: any) => api.put(`/models/${id}`, data),
  delete: (id: string) => api.delete(`/models/${id}`),
  test: (id: string) => api.post(`/models/${id}/test`),
  setDefault: (id: string) => api.post(`/models/${id}/set-default`),
};

export const channelService = {
  list: () => api.get('/channels'),
  add: (data: any) => api.post('/channels', data),
  update: (id: string, data: any) => api.put(`/channels/${id}`, data),
  delete: (id: string) => api.delete(`/channels/${id}`),
  test: (id: string) => api.post(`/channels/${id}/test`),
  healthCheck: (id: string) => api.post(`/channels/${id}/health`),
  getTemplates: () => api.get('/channels/templates'),
  applyTemplate: (templateId: string) =>
    api.post(`/channels/templates/${templateId}/apply`),
};

export const skillService = {
  list: () => api.get('/skills'),
  add: (data: any) => api.post('/skills', data),
  update: (id: string, data: any) => api.put(`/skills/${id}`, data),
  delete: (id: string) => api.delete(`/skills/${id}`),
  test: (id: string) => api.post(`/skills/${id}/test`),
  execute: (id: string, input: string) =>
    api.post(`/skills/${id}/execute`, { input }),
  getPublic: () => api.get('/skills/public'),
  import: (id: string) => api.post(`/skills/${id}/import`),
};
