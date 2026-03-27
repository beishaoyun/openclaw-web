#!/bin/bash

# OpenClaw Web 平台 - 快速部署脚本
# 使用端口：10000

set -e

echo "========================================"
echo "OpenClaw Web Platform - 快速部署"
echo "========================================"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：Docker 未安装"
    exit 1
fi

# 检查 Docker Compose (v2 使用 docker compose)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ 错误：Docker Compose 未安装"
    exit 1
fi

echo "✅ Docker 和 Docker Compose 已安装 (${DOCKER_COMPOSE})"
echo ""

# 复制 .env.production 到 .env (如果不存在)
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        echo "📋 复制 .env.production 到 .env"
        cp .env.production .env
    else
        echo "⚠️  .env.production 不存在，正在创建..."
        cp .env.example .env

        # 生成密钥
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        JWT_SECRET=$(openssl rand -hex 32)

        # 更新密钥
        sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=${ENCRYPTION_KEY}/" .env
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env

        echo "✅ 已生成安全密钥"
    fi
fi

# 停止旧服务
echo "🔄 停止旧服务..."
${DOCKER_COMPOSE} down 2>/dev/null || true

# 清理网络（避免网络冲突）
echo "🔄 清理旧网络..."
docker network rm openclaw-web_openclaw-network 2>/dev/null || true

# 启动服务
echo "🚀 启动服务..."
${DOCKER_COMPOSE} up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo ""
echo "📊 服务状态:"
${DOCKER_COMPOSE} ps

echo ""
echo "========================================"
echo "部署完成！"
echo "========================================"
echo ""
echo "访问地址：http://localhost:10000"
echo ""
echo "管理员账号:"
echo "  账号：admin"
echo "  密码：admin123456"
echo ""
echo "常用命令:"
echo "  查看日志：${DOCKER_COMPOSE} logs -f"
echo "  停止服务：${DOCKER_COMPOSE} down"
echo "  重启服务：${DOCKER_COMPOSE} restart"
echo ""

# 健康检查
echo "🔍 执行健康检查..."
if curl -s http://localhost:10000/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务正常"
else
    echo "⚠️  后端服务响应异常，请检查日志"
fi

# 测试管理员登录
echo ""
echo "🔍 测试管理员登录..."
LOGIN_RESULT=$(curl -s -X POST http://localhost:10000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456"}')

if echo "$LOGIN_RESULT" | grep -q "Login successful"; then
    echo "✅ 管理员登录正常"
else
    echo "⚠️  管理员登录异常"
fi

echo ""
echo "📄 详细文档：DEPLOYMENT.md"
echo "📄 测试报告：TEST_REPORT.md"
echo "📄 修复日志：FIXES.md"
echo "📄 项目总结：SUMMARY.md"
echo ""
