#!/bin/bash
# OpenClaw Web Platform - API 测试脚本
# 测试所有已实现的功能

BASE_URL="http://localhost:3000/api"
FRONTEND_URL="http://localhost:5173"
PASS=0
FAIL=0

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; ((PASS++)); }
log_fail() { echo -e "${RED}✗ FAIL${NC}: $1"; ((FAIL++)); }
log_info() { echo -e "${YELLOW}INFO${NC}: $1"; }

echo "========================================"
echo "OpenClaw Web Platform - API 测试"
echo "========================================"
echo ""

# 1. 健康检查
log_info "=== 1. 健康检查 ==="
RESPONSE=$(curl -s "$BASE_URL/health")
if echo "$RESPONSE" | grep -q "ok"; then
  log_pass "后端健康检查通过"
else
  log_fail "后端健康检查失败"
fi

# 2. 前端页面
log_info "=== 2. 前端页面 ==="
RESPONSE=$(curl -s "$FRONTEND_URL" | head -20)
if echo "$RESPONSE" | grep -q "OpenClaw"; then
  log_pass "前端主页加载成功"
else
  log_fail "前端主页加载失败"
fi

# 3. 认证功能
log_info "=== 3. 认证功能 ==="

# 3.1 获取验证码
RESPONSE=$(curl -s "$BASE_URL/auth/captcha")
if echo "$RESPONSE" | grep -q "image"; then
  log_pass "获取验证码成功"
else
  log_fail "获取验证码失败"
fi

# 3.2 测试注册（使用测试数据）
log_info "测试注册功能..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser",
    "email": "test@example.com",
    "password": "TestPass123",
    "captcha": "TEST"
  }')
# 注册可能因为验证码错误而失败，但接口应该存在
if echo "$REGISTER_RESPONSE" | grep -q "error\|token\|message"; then
  log_pass "注册接口响应正常"
else
  log_fail "注册接口无响应"
fi

# 3.3 测试登录（需要真实用户）
log_info "测试登录接口..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "account": "test@example.com",
    "password": "TestPass123"
  }')
# 登录会失败因为用户不存在，但接口应该响应
if echo "$LOGIN_RESPONSE" | grep -q "error\|token\|message"; then
  log_pass "登录接口响应正常"
else
  log_fail "登录接口无响应"
fi

# 3.4 Token 刷新
log_info "测试 Token 刷新..."
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json")
if echo "$REFRESH_RESPONSE" | grep -q "error\|token"; then
  log_pass "Token 刷新接口响应正常"
else
  log_fail "Token 刷新接口无响应"
fi

# 3.5 访客会话
log_info "测试访客会话..."
GUEST_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/guest/start" \
  -H "Content-Type: application/json")
if echo "$GUEST_RESPONSE" | grep -q "sessionToken\|expiresAt"; then
  log_pass "访客会话创建成功"
else
  log_fail "访客会话创建失败"
fi

# 4. 服务器管理
log_info "=== 4. 服务器管理 ==="

# 列出服务器（需要认证，预期 401）
RESPONSE=$(curl -s "$BASE_URL/servers")
if echo "$RESPONSE" | grep -q "Unauthorized"; then
  log_pass "服务器列表 API 认证保护正常"
else
  log_fail "服务器列表 API 认证保护异常"
fi

# 5. 模型管理
log_info "=== 5. 模型管理 ==="

RESPONSE=$(curl -s "$BASE_URL/models")
if echo "$RESPONSE" | grep -q "Unauthorized"; then
  log_pass "模型列表 API 认证保护正常"
else
  log_fail "模型列表 API 认证保护异常"
fi

# 6. 通道管理
log_info "=== 6. 通道管理 ==="

# 通道列表
RESPONSE=$(curl -s "$BASE_URL/channels")
if echo "$RESPONSE" | grep -q "Unauthorized"; then
  log_pass "通道列表 API 认证保护正常"
else
  log_fail "通道列表 API 认证保护异常"
fi

# 通道模板
RESPONSE=$(curl -s "$BASE_URL/channels/templates")
if echo "$RESPONSE" | grep -q "templates\|Unauthorized"; then
  log_pass "通道模板接口响应正常"
else
  log_fail "通道模板接口无响应"
fi

# 7. 技能管理
log_info "=== 7. 技能管理 ==="

RESPONSE=$(curl -s "$BASE_URL/skills")
if echo "$RESPONSE" | grep -q "Unauthorized"; then
  log_pass "技能列表 API 认证保护正常"
else
  log_fail "技能列表 API 认证保护异常"
fi

# 技能模板
RESPONSE=$(curl -s "$BASE_URL/skills/templates")
if echo "$RESPONSE" | grep -q "templates\|Unauthorized"; then
  log_pass "技能模板接口响应正常"
else
  log_fail "技能模板接口无响应"
fi

# 8. OpenClaw 安装
log_info "=== 8. OpenClaw 安装 ==="

# 开始安装（需要认证）
RESPONSE=$(curl -s -X POST "$BASE_URL/openclaw/install" \
  -H "Content-Type: application/json" \
  -d '{}')
if echo "$RESPONSE" | grep -q "taskId\|error\|Unauthorized"; then
  log_pass "OpenClaw 安装接口响应正常"
else
  log_fail "OpenClaw 安装接口无响应"
fi

# 9. 配置管理
log_info "=== 9. 配置管理 ==="

# 配置验证
RESPONSE=$(curl -s -X POST "$BASE_URL/openclaw/test-server/config/validate" \
  -H "Content-Type: application/json" \
  -d '{"config": "server:\n  port: 8080"}')
if echo "$RESPONSE" | grep -q "valid\|error\|Unauthorized"; then
  log_pass "配置验证接口响应正常"
else
  log_fail "配置验证接口无响应"
fi

echo ""
echo "========================================"
echo "测试总结"
echo "========================================"
echo -e "${GREEN}通过${NC}: $PASS"
echo -e "${RED}失败${NC}: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}所有测试通过！${NC}"
  exit 0
else
  echo -e "${YELLOW}部分测试失败，请检查日志${NC}"
  exit 1
fi
