# OpenClaw Web 平台 - 部署文档

## 目录

- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [Docker 部署 (推荐)](#docker-部署推荐)
- [开发环境部署](#开发环境部署)
- [配置说明](#配置说明)
- [运维指南](#运维指南)
- [故障排查](#故障排查)

---

## 快速开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd openclaw-web

# 2. 复制环境变量文件
cp .env.example .env.production

# 3. 生成安全密钥
openssl rand -hex 32  # 生成 ENCRYPTION_KEY
openssl rand -hex 32  # 生成 JWT_SECRET

# 4. 编辑 .env.production 填入密钥

# 5. 启动所有服务
docker-compose up -d

# 6. 访问应用
# 浏览器打开：http://localhost:10000
```

---

## 环境要求

### 最低配置
- **CPU**: 2 核心
- **内存**: 2GB RAM
- **磁盘**: 10GB 可用空间
- **系统**: Linux (Ubuntu 20.04+ / Debian 11+) 或 macOS

### 推荐配置
- **CPU**: 4 核心
- **内存**: 4GB RAM
- **磁盘**: 20GB SSD
- **系统**: Ubuntu 22.04 LTS

### 依赖软件
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (仅开发环境需要)

---

## Docker 部署 (推荐)

### 1. 安装 Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker
```

**检查 Docker 版本:**
```bash
docker --version
docker compose version
```

### 2. 准备环境变量

```bash
cd openclaw-web

# 复制生产环境配置模板
cp .env.example .env.production

# 生成安全密钥
ENCRYPTION_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

# 编辑 .env.production，填入生成的密钥
nano .env.production
```

### 3. 修改端口 (可选)

默认访问端口为 **10000**，如需修改：

```bash
# 编辑 docker-compose.yml
nano docker-compose.yml

# 修改这一行：
# ports:
#   - "10000:80"  # 改为其他端口，如 "8080:80"
```

### 4. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看启动日志
docker-compose logs -f

# 检查服务状态
docker-compose ps
```

### 5. 执行数据库迁移

```bash
# 进入后端容器
docker-compose exec backend sh

# 执行数据库迁移
npm run migrate

# (可选) 插入初始数据
npm run seed

# 退出容器
exit
```

### 6. 验证部署

```bash
# 健康检查
curl http://localhost:10000/api/health

# 应该返回:
# {"status":"ok","timestamp":"2024-xx-xxTxx:xx:xx.xxxZ"}
```

### 7. 访问应用

- **前端页面**: http://localhost:10000
- **管理员登录**: http://localhost:10000/admin/login
- **API 文档**: (待添加)

### 默认账号

**超级管理员:**
- 账号：`admin`
- 密码：`admin123456`

**⚠️ 首次部署后请立即修改默认密码！**

---

## 开发环境部署

### 1. 安装依赖

```bash
# 安装所有依赖 (根目录)
npm install

# 后端依赖 (backend/)
cd backend && npm install

# 前端依赖 (frontend/)
cd frontend && npm install
```

### 2. 配置环境变量

```bash
# 复制开发环境配置
cp .env.example .env

# 编辑 .env 文件
nano .env
```

### 3. 启动 PostgreSQL 和 Redis

**使用 Docker:**
```bash
docker-compose up -d postgres redis
```

**或本地安装:**
```bash
# Ubuntu
sudo apt install postgresql redis-server

# macOS (Homebrew)
brew install postgresql@15 redis
```

### 4. 执行数据库迁移

```bash
cd backend
npm run migrate
```

### 5. 启动开发服务器

```bash
# 根目录 - 同时启动前后端
npm run dev

# 或分别启动
npm run dev:backend  # http://localhost:3000
npm run dev:frontend # http://localhost:5173
```

---

## 配置说明

### 环境变量 (.env.production)

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `ENCRYPTION_KEY` | AES-256 加密密钥 (32 字节 hex) | - | ✅ |
| `JWT_SECRET` | JWT 签名密钥 | - | ✅ |
| `DATABASE_URL` | PostgreSQL 连接字符串 | - | ✅ |
| `REDIS_URL` | Redis 连接字符串 | - | ✅ |
| `NODE_ENV` | 运行环境 | `production` | - |
| `PORT` | 后端服务端口 | `3000` | - |
| `FRONTEND_URL` | 前端 URL | `http://localhost:10000` | - |
| `LOG_LEVEL` | 日志级别 | `info` | - |
| `MAX_FILE_SIZE` | 最大上传文件大小 | `104857600` (100MB) | - |

### 生成安全密钥

```bash
# 生成 ENCRYPTION_KEY
openssl rand -hex 32

# 生成 JWT_SECRET
openssl rand -hex 32

# 示例输出:
# a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

### Docker Compose 配置

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| `nginx` | nginx:alpine | 10000:80 | 反向代理 + 静态资源 |
| `backend` | node:20-alpine | - | Node.js API 服务 |
| `postgres` | postgres:15-alpine | - | PostgreSQL 数据库 |
| `redis` | redis:7-alpine | - | Redis 缓存 + WebSocket |

---

## 运维指南

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
```

### 数据备份

```bash
# 备份 PostgreSQL 数据库
docker-compose exec postgres pg_dump -U openclaw openclaw > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup_20240101.sql | docker-compose exec -T postgres psql -U openclaw openclaw

# 备份 Redis 数据
docker-compose exec redis redis-cli SAVE

# Redis 数据文件位置
# redis-data:/data/dump.rdb
```

### 日志管理

```bash
# 日志文件位置
# 后端：./backend/logs/app.log
# Nginx: ./nginx/logs/access.log, ./nginx/logs/error.log

# 查看最近 100 行日志
docker-compose logs --tail=100 backend

# 导出日志到文件
docker-compose logs backend > backend_logs.txt
```

### 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建并重启
docker-compose up -d --build

# 3. 执行数据库迁移 (如有更新)
docker-compose exec backend npm run migrate

# 4. 验证服务
docker-compose ps
curl http://localhost:10000/api/health
```

### SSL/HTTPS 配置 (可选)

```bash
# 1. 使用 Let's Encrypt 生成证书
# 安装 certbot
sudo apt install certbot

# 2. 生成证书
sudo certbot certonly --standalone -d yourdomain.com

# 3. 复制证书到 nginx/ssl 目录
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# 4. 修改 nginx/nginx.conf 启用 HTTPS
# (取消 443 端口配置注释)

# 5. 重启 nginx
docker-compose restart nginx
```

---

## 故障排查

### 常见问题

#### 1. 容器无法启动

```bash
# 检查日志
docker-compose logs backend

# 检查端口占用
sudo lsof -i :10000
sudo lsof -i :3000
sudo lsof -i :5432
sudo lsof -i :6379

# 释放端口或修改配置
```

#### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker-compose ps postgres

# 查看数据库日志
docker-compose logs postgres

# 测试数据库连接
docker-compose exec postgres psql -U openclaw -c "SELECT 1"
```

#### 3. 前端无法访问

```bash
# 检查 nginx 配置
docker-compose exec nginx nginx -t

# 检查静态文件是否存在
docker-compose exec nginx ls -la /usr/share/nginx/html

# 重新构建前端
cd frontend && npm run build
docker-compose restart nginx
```

#### 4. WebSocket 连接失败

```bash
# 检查 Redis 是否运行
docker-compose ps redis
docker-compose exec redis redis-cli ping

# 应该返回：PONG
```

#### 5. JWT 认证失败

```bash
# 检查 .env.production 中的 JWT_SECRET 是否正确
docker-compose exec backend env | grep JWT_SECRET

# 确保前后端使用相同的密钥
# 重启后端服务
docker-compose restart backend
```

### 性能优化

#### 数据库优化

```sql
-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_install_tasks_created ON install_tasks(created_at);

-- 分析表
ANALYZE;
```

#### Redis 优化

```bash
# 配置 Redis 内存限制
# 在 redis.conf 中添加:
# maxmemory 256mb
# maxmemory-policy allkeys-lru
```

### 监控和告警

#### 健康检查端点

| 端点 | 说明 |
|------|------|
| `GET /api/health` | 服务健康状态 |

#### 监控指标 (待实现)

- API 响应时间
- 数据库连接数
- Redis 内存使用
- WebSocket 连接数

---

## 管理员后台使用

### 登录管理员后台

1. 访问 http://localhost:10000/admin/login
2. 使用默认账号登录：
   - 账号：`admin`
   - 密码：`admin123456`

### 功能模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 仪表板 | `/admin/dashboard` | 统计数据、待处理工单、活跃告警 |
| 客户管理 | `/admin/users` | 用户列表、状态管理、配额调整 |
| 工单管理 | `/admin/tickets` | 工单列表、回复处理 |
| 告警管理 | `/admin/alerts` | 告警列表、规则配置 |
| 系统配置 | `/admin/settings` | 系统参数配置 |
| 操作日志 | `/admin/logs` | 管理员日志、用户操作日志 |

---

## 附录

### 项目结构

```
openclaw-web/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── modules/     # 业务模块
│   │   ├── middleware/  # 中间件
│   │   ├── database/    # 数据库配置
│   │   └── app.ts       # Fastify 应用
│   ├── Dockerfile
│   └── package.json
├── frontend/             # 前端应用
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 通用组件
│   │   ├── services/    # API 服务
│   │   └── store/       # 状态管理
│   ├── Dockerfile
│   └── package.json
├── database/             # 数据库迁移
│   └── migrations/
├── nginx/                # Nginx 配置
│   └── nginx.conf
├── docker-compose.yml
├── .env.production
└── DEPLOYMENT.md
```

### 相关文档

- [API 文档](docs/API.md)
- [架构说明](docs/ARCHITECTURE.md)
- [开发指南](docs/DEVELOPMENT.md)

### 技术支持

如有问题请提交 Issue 或联系开发团队。
