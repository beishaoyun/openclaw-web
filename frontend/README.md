# OpenClaw Web Platform

## 安装依赖

```bash
# 安装根依赖
npm install

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

## 开发

```bash
# 启动开发服务器（前后端同时启动）
npm run dev

# 或者分别启动
npm run dev:backend  # 后端 http://localhost:3000
npm run dev:frontend # 前端 http://localhost:5173
```

## 构建

```bash
npm run build
```

## Docker 部署

```bash
docker-compose build
docker-compose up -d
```
