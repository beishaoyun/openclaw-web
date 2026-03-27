# OpenClaw Web Platform

客户注册平台，支持服务器托管、一键安装 OpenClaw，Web 配置模型/通道/技能。

## 核心功能

- **用户体系**: 注册用户 + 访客模式（24 小时临时会话）
- **服务器管理**: 添加服务器、SSH 运维、状态监控、批量操作
- **OpenClaw 安装**: 一键安装、备用方案、实时进度推送
- **模型管理**: Web 配置 AI 模型
- **通道管理**: 集成 openclaw-china 项目，支持模板库
- **技能管理**: 预定义任务模板，Web 查看和执行

## 技术栈

- **前端**: React + TypeScript + Vite + shadcn/ui
- **后端**: Node.js + TypeScript + Fastify
- **数据库**: PostgreSQL
- **缓存**: Redis
- **部署**: Docker Compose

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/beishaoyun/openclaw-web.git
cd openclaw-web
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入合适的密钥
```

### 4. 启动开发环境

```bash
# 启动所有服务（前端 + 后端 + 数据库 + Redis）
npm run dev

# 或者分别启动
npm run dev:backend  # 后端 (http://localhost:3000)
npm run dev:frontend # 前端 (http://localhost:5173)
```

### 5. Docker 部署

```bash
# 构建并启动
docker-compose build
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

## 项目结构

```
openclaw-web/
├── backend/          # 后端服务
├── frontend/         # 前端应用
├── database/         # 数据库迁移
├── docker/           # Docker 配置
├── docs/             # 文档
└── scripts/          # 部署脚本
```

## 开发文档

- [API 文档](docs/API.md)
- [部署指南](docs/DEPLOYMENT.md)
- [架构说明](docs/ARCHITECTURE.md)

## License

MIT
