# 后端 API 实现报告

## 实现日期
2026-03-28

## 概述

本次实现完成了 OpenClaw Web 平台的完整后端 API，包括服务器管理、模型管理、通道管理、技能管理和管理员后台。

---

## 已实现的模块

### 1. 服务器管理 (`/api/servers`)

**文件**: `backend/src/modules/server/server.routes.ts`

**功能**:
- `GET /` - 列出用户的所有服务器
- `POST /` - 添加新服务器
- `GET /:id` - 获取服务器详情
- `PUT /:id` - 更新服务器信息
- `DELETE /:id` - 删除服务器
- `POST /:id/ssh-test` - SSH 连接测试
- `POST /:id/reboot` - 重启服务器
- `POST /:id/shutdown` - 关机
- `POST /:id/refresh` - 刷新状态
- `POST /batch/reboot` - 批量重启
- `POST /batch/shutdown` - 批量关机
- `GET /:id/metrics` - 获取监控数据

**数据库表**: `servers`

---

### 2. 模型管理 (`/api/models`)

**文件**: `backend/src/modules/model/model.routes.ts`

**功能**:
- `GET /providers` - 获取提供商预设列表
- `GET /` - 列出用户的所有模型
- `POST /` - 添加新模型
- `GET /:id` - 获取模型详情
- `PUT /:id` - 更新模型
- `DELETE /:id` - 删除模型
- `POST /:id/test` - 测试模型连接
- `POST /:id/set-default` - 设置为默认模型

**支持的模型提供商**:
| ID | 名称 | Base URL |
|---|---|---|
| volcengine | 火山引擎 | https://ark.cn-beijing.volces.com/api/v3 |
| aliyun | 阿里云百炼 | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| deepseek | DeepSeek | https://api.deepseek.com/v1 |
| openai | OpenAI | https://api.openai.com/v1 |
| anthropic | Anthropic | https://api.anthropic.com/v1 |
| azure | Azure OpenAI | https://{resource}.openai.azure.com/openai/deployments/{deployment} |
| moonshot | 月之暗面 | https://api.moonshot.cn/v1 |
| minimax | MiniMax | https://api.minimax.chat/v1 |
| zhipu | 智谱 AI | https://open.bigmodel.cn/api/paas/v4 |
| baichuan | 百川智能 | https://api.baichuan-ai.com/v1 |
| stepfun | 阶跃星辰 | https://api.stepfun.com/v1 |
| 01ai | 零一万物 | https://api.lingyiwanwu.com/v1 |
| xai | xAI | https://api.x.ai/v1 |

**数据库表**: `models`

---

### 3. 通道管理 (`/api/channels`)

**文件**: `backend/src/modules/channel/channel.routes.ts`

**功能**:
- `GET /templates` - 获取通道模板列表
- `GET /templates/:id` - 获取模板详情
- `GET /` - 列出用户的所有通道
- `POST /` - 添加新通道
- `GET /:id` - 获取通道详情
- `PUT /:id` - 更新通道
- `DELETE /:id` - 删除通道
- `POST /:id/test` - 测试通道连接
- `POST /:id/health` - 通道健康检查
- `POST /templates/:id/apply` - 应用模板

**支持的通道模板**:
| ID | 名称 | 描述 |
|---|---|---|
| feishu | 飞书 | 飞书开放平台，支持文本、卡片、互动消息 |
| dingtalk | 钉钉 | 钉钉开放平台，支持群机器人、互动消息 |
| wechat | 微信 | 微信公众号/企业微信，支持文本、图片、卡片消息 |
| wecom | 企业微信 | 企业微信，支持群机器人、应用消息 |
| qq | QQ | QQ 机器人，支持私聊、群聊消息 |
| telegram | Telegram | Telegram Bot，支持群组、私聊消息 |
| discord | Discord | Discord Bot，支持服务器、频道消息 |
| slack | Slack | Slack Bot，支持频道、私信消息 |

**数据库表**: `channels`

---

### 4. 技能管理 (`/api/skills`)

**文件**: `backend/src/modules/skill/skill.routes.ts`

**功能**:
- `GET /templates` - 获取技能模板列表
- `GET /public` - 获取公开技能列表
- `GET /` - 列出用户的所有技能
- `POST /` - 添加新技能
- `GET /:id` - 获取技能详情
- `PUT /:id` - 更新技能
- `DELETE /:id` - 删除技能
- `POST /:id/test` - 测试技能
- `POST /:id/execute` - 执行技能
- `POST /:id/import` - 导入公开技能
- `POST /from-template/:templateId` - 从模板创建技能

**技能模板**:
| ID | 名称 | 描述 |
|---|---|---|
| chat-assistant | 智能助手 | 通用对话助手，支持多轮对话、上下文理解 |
| code-helper | 代码助手 | 代码生成、审查、调试助手 |
| translator | 翻译助手 | 多语言翻译，支持中英日韩法等语言 |
| writer | 写作助手 | 文章、报告、邮件等文案创作 |
| analyst | 数据分析 | 数据分析、图表解读、趋势预测 |
| customer-service | 客服助手 | 自动回复客户咨询，处理常见问题 |

**数据库表**: `skills`

---

### 5. 管理员后台 (`/api/admin`)

#### 5.1 认证路由 (`admin.routes.ts`)

**功能**:
- `POST /login` - 管理员登录
- `POST /logout` - 管理员登出
- `GET /admins` - 管理员列表（仅超级管理员）
- `POST /admins` - 创建管理员（仅超级管理员）
- `PUT /admins/:id` - 更新管理员（仅超级管理员）
- `DELETE /admins/:id` - 删除管理员（仅超级管理员）
- `GET /dashboard/stats` - 获取统计数据
- `GET /dashboard/alerts` - 获取活跃告警
- `GET /dashboard/tickets` - 获取待处理工单
- `GET /dashboard/install-tasks` - 获取最近安装任务

#### 5.2 工单路由 (`admin-ticket.routes.ts`)

**功能**:
- `GET /tickets` - 工单列表（支持筛选）
- `GET /tickets/:id` - 工单详情（含回复列表）
- `PUT /tickets/:id/status` - 修改工单状态
- `PUT /tickets/:id/assign` - 分配工单
- `POST /tickets/:id/reply` - 回复工单
- `POST /tickets` - 创建工单（管理员代用户创建）

#### 5.3 系统路由 (`admin-system.routes.ts`)

**功能**:
- `GET /alerts` - 告警列表
- `POST /alerts/:id/acknowledge` - 确认告警
- `POST /alerts/batch-acknowledge` - 批量确认告警
- `GET /alert-rules` - 告警规则列表
- `POST /alert-rules` - 创建告警规则
- `PUT /alert-rules/:id` - 更新告警规则
- `DELETE /alert-rules/:id` - 删除告警规则
- `GET /configs` - 系统配置列表
- `GET /configs/:key` - 获取单个配置
- `PUT /configs/:key` - 更新系统配置
- `GET /guest-settings` - 获取访客配置
- `PUT /guest-settings` - 更新访客配置

#### 5.4 日志路由 (`admin-log.routes.ts`)

**功能**:
- `GET /logs` - 管理员操作日志
- `GET /operation-logs` - 客户操作日志
- `GET /login-logs` - 登录日志
- `GET /logs/export` - 导出日志（CSV 格式）

#### 5.5 客户管理路由 (`admin-client.routes.ts`)

**功能**:
- `GET /users` - 客户列表
- `GET /users/:id` - 客户详情
- `PUT /users/:id/status` - 修改客户账号状态
- `PUT /users/:id/quota` - 修改客户配额
- `POST /users/:id/reset-password` - 重置客户密码
- `GET /users/:id/servers` - 查看客户服务器列表
- `GET /users/:id/logs` - 查看客户操作日志
- `POST /tickets` - 客户提交工单
- `GET /tickets` - 客户查看自己的工单
- `GET /tickets/:id` - 客户查看工单详情
- `POST /tickets/:id/reply` - 客户回复工单

**数据库表**: `admin_users`, `support_tickets`, `ticket_replies`, `system_configs`, `alert_rules`, `alert_logs`, `admin_operation_logs`

---

## 技术细节

### PostgreSQL 客户端

使用 `postgres` 库进行数据库操作：
```typescript
import { getSql } from '../../database';

const db = getSql();
const servers = await db`SELECT * FROM servers WHERE user_id = ${userId}`;
```

### 认证中间件

- `authMiddleware` - 普通用户认证
- `adminAuthMiddleware` - 管理员认证
- `superAdminMiddleware` - 超级管理员认证

### 密码加密

使用 `bcrypt` 进行密码加密：
```typescript
const passwordHash = await bcrypt.hash(password, 12);
const validPassword = await bcrypt.compare(password, passwordHash);
```

### JWT Token

使用 `@fastify/jwt` 生成和验证 JWT token。

---

## API 响应格式

**成功响应**:
```json
{
  "data": { ... },
  "message": "操作成功"
}
```

**列表响应**:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

**错误响应**:
```json
{
  "error": "Error Type",
  "message": "错误详情"
}
```

---

## 构建和部署

```bash
# 构建后端
cd /root/openclaw-web/backend
npm run build

# 重启后端服务
cd /root/openclaw-web
docker compose restart backend
```

---

## 待实现功能

以下功能在代码中标记为 `TODO`：

1. **SSH 连接** - 实际的 SSH 连接测试、重启、关机命令执行
2. **模型 API 测试** - 实际的模型 API 连接测试
3. **通道连接** - 实际的通道消息发送
4. **技能执行** - 实际的模型调用和通道消息发送
5. **告警触发** - 告警规则的自动检测和触发
6. **邮件通知** - 密码重置邮件、告警通知邮件
7. **Token 黑名单** - 登出后的 token 失效

---

## 测试建议

1. **服务器管理**:
   - 添加服务器并验证列表显示
   - SSH 连接测试（待实现实际功能）

2. **模型管理**:
   - 选择不同提供商添加模型
   - 设置默认模型

3. **通道管理**:
   - 使用模板创建通道
   - 配置飞书/钉钉/企业微信通道

4. **技能管理**:
   - 从模板创建技能
   - 导入公开技能

5. **管理后台**:
   - 管理员登录
   - 查看统计数据
   - 处理工单

---

**报告生成时间**: 2026-03-28
**版本**: v0.3.0
