# OpenClaw Web Platform - CLAUDE.md

## 项目概述

OpenClaw Web 平台是一个客户注册平台，支持：
- 服务器托管和 SSH 运维
- 一键安装 OpenClaw（含备用安装方案）
- Web 配置模型/通道/技能

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**: Node.js + TypeScript + Fastify
- **数据库**: PostgreSQL
- **缓存**: Redis
- **部署**: Docker Compose

## 项目结构

```
openclaw-web/
├── backend/          # 后端服务 (Node.js + Fastify)
├── frontend/         # 前端应用 (React + Vite)
├── database/         # 数据库迁移
├── nginx/            # Nginx 配置
└── docs/             # 文档
```

## 快速开始

### 开发环境

```bash
# 安装所有依赖
npm install

# 启动开发服务器
npm run dev

# 或者分别启动
npm run dev:backend  # http://localhost:3000
npm run dev:frontend # http://localhost:5173
```

### Docker 部署

```bash
docker-compose build
docker-compose up -d
docker-compose logs -f
```

## 核心模块

### 后端模块

- `src/modules/auth/` - 用户认证（注册/登录/访客）
- `src/modules/server/` - 服务器管理（SSH 连接池）
- `src/modules/openclaw/` - OpenClaw 安装管理
- `src/modules/model/` - AI 模型配置
- `src/modules/channel/` - 通道管理（集成 openclaw-china）
- `src/modules/skill/` - 技能管理

### 前端页面

- `pages/auth/` - 登录/注册
- `pages/dashboard/` - 控制台/服务器列表
- `pages/server/` - 服务器详情/安装进度
- `pages/openclaw/` - 状态监控/配置编辑
- `pages/model/` - 模型管理
- `pages/channel/` - 通道管理
- `pages/skill/` - 技能管理
- `pages/guest/` - 访客模式

## 数据库

核心表：
- `users` - 用户表
- `guest_sessions` - 访客会话
- `servers` - 服务器表
- `openclaw_instances` - OpenClaw 实例
- `install_tasks` - 安装任务
- `models` - 模型配置
- `channels` - 通道配置
- `skills` - 技能配置
- `config_versions` - 配置版本历史

## API 约定

- 所有 API 端点以 `/api` 为前缀
- 认证使用 JWT Bearer Token
- 错误响应格式：`{ error: string, message: string }`
- 成功响应格式：`{ data: T, message?: string }`

## 开发规范

- TypeScript 严格模式
- 后端使用 Zod 进行请求验证
- 前端使用 Zustand 进行状态管理
- 所有组件使用函数组件 + Hooks

## 待办事项

详见 `TODO.md`

## 相关文档

- [API 文档](docs/API.md)
- [部署指南](docs/DEPLOYMENT.md)
- [架构说明](docs/ARCHITECTURE.md)
