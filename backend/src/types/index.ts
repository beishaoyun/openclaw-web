// 通用类型定义

export interface User {
  id: string;
  email?: string;
  phone?: string;
  isGuest?: boolean;
}

export interface Server {
  id: string;
  userId: string;
  name?: string;
  publicIp: string;
  sshPort: number;
  sshUser: string;
  status: 'online' | 'offline' | 'unknown';
  openclawStatus: 'running' | 'stopped' | 'error' | 'unknown';
  createdAt: string;
}

export interface OpenClawInstance {
  id: string;
  serverId: string;
  version?: string;
  status: 'installing' | 'running' | 'stopped' | 'error';
  installDir: string;
  configDir: string;
}

export interface InstallTask {
  id: string;
  serverId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  installMethod: 'online' | 'offline';
  logs: LogEntry[];
  errorMessage?: string;
}

export interface LogEntry {
  timestamp: string;
  step: number;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface Model {
  id: string;
  userId: string;
  name: string;
  modelType: string;
  provider: string;
  apiEndpoint: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface Channel {
  id: string;
  userId: string;
  name: string;
  channelType: 'direct' | 'proxy' | 'load_balanced';
  baseUrl: string;
  isActive: boolean;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
}

export interface Skill {
  id: string;
  userId: string;
  name: string;
  description?: string;
  modelId?: string;
  channelId?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  category?: string;
  isActive: boolean;
}

// API 响应类型
export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}

// 分页类型
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
