# e.map is not a function 错误修复报告

## 修复日期
2026-03-28

## 问题描述

**用户反馈**：访问页面显示 "出错了 e.map is not a function"

用户在访问服务器、模型、通道等页面时，ErrorBoundary 捕获到错误并显示 "e.map is not a function"。

---

## 根本原因

**API 响应格式与前端代码不匹配**

后端 API 返回的格式为：
```json
{"data": []}
```

Axios 响应对象的格式为：
```javascript
{
  data: { data: [] },  // 外层 data 是 Axios 的响应数据，内层 data 是后端返回的数据
  status: 200,
  statusText: 'OK',
  headers: {...},
  config: {...}
}
```

前端代码错误地使用了：
```typescript
const { data } = await serverService.list();
setServers(data || []);  // data 是 { data: [] }，不是 []！
```

当后续代码尝试对 `data` 调用 `.map()` 时，因为`data`是对象`{ data: [] }` 而不是数组 `[]`，所以报错 "e.map is not a function"。

---

## 修复的文件

### 1. Dashboard.tsx
```typescript
// 修复前
const [servers, models, channels] = await Promise.all([
  serverService.list().catch(() => ({ data: [] })),
]);
const serverList = servers.data || [];  // 错误！servers.data 是 { data: [] }

// 修复后
const [serversRes, modelsRes, channelsRes] = await Promise.all([
  serverService.list().catch(() => ({ data: { data: [] } })),
]);
const serverList = serversRes.data?.data || [];  // 正确获取内层 data
```

### 2. ServerList.tsx
```typescript
// 修复前
const { data } = await serverService.list();
setServers(data || []);

// 修复后
const response = await serverService.list();
setServers(response.data?.data || []);
```

### 3. ModelManager.tsx
```typescript
// 修复前
const { data } = await modelService.list();
setModels(data || []);

// 修复后
const response = await modelService.list();
setModels(response.data?.data || []);
```

### 4. ChannelManager.tsx
```typescript
// 修复前
const { data } = await channelService.list();
setChannels(data || []);

// 修复后
const response = await channelService.list();
setChannels(response.data?.data || []);
```

### 5. SkillManager.tsx
```typescript
// 修复前
const { data } = await skillService.list();
setSkills(data || []);

// 修复后
const response = await skillService.list();
setSkills(response.data?.data || []);
```

### 6. ServerDetail.tsx
```typescript
// 修复前
const { data } = await serverService.get(id!);
setServer(data);

// 修复后
const response = await serverService.get(id!);
setServer(response.data?.data || null);
```

### 7. OpenClawStatus.tsx
```typescript
// 修复前
setServer(serverRes.data);
setStatus(statusRes.data);

// 修复后
setServer(serverRes.data?.data || null);
setStatus(statusRes.data?.data || null);
```

### 8. ConfigEditor.tsx
```typescript
// 修复前
const { data } = await openclawService.getConfig(id!);
const configStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;

// 修复后
const response = await openclawService.getConfig(id!);
const data = response.data?.data;
const configStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
```

---

## 构建验证

```bash
cd /root/openclaw-web/frontend && npm run build
```

**结果**：✅ 构建成功
- 130 个模块转换
- 输出文件：
  - `dist/index.html` (0.47 kB)
  - `dist/assets/index-BOe1ZchX.css` (32.39 kB)
  - `dist/assets/index-ZoCszv7O.js` (342.80 kB)

---

## 测试步骤

1. **清除浏览器缓存**（Ctrl+Shift+R 或 Cmd+Shift+R）

2. **访问控制台页面** `http://202.60.232.14:10000/`
   - 应正常显示统计卡片（无错误）

3. **访问服务器页面** `http://202.60.232.14:10000/servers`
   - 应正常显示服务器列表（无错误）

4. **访问模型页面** `http://202.60.232.14:10000/models`
   - 应正常显示模型列表（无错误）

5. **访问通道页面** `http://202.60.232.14:10000/channels`
   - 应正常显示通道列表（无错误）

6. **访问技能页面** `http://202.60.232.14:10000/skills`
   - 应正常显示技能列表（无错误）

---

## 经验教训

### 问题根源
在使用 Axios 时，响应对象有两层 `data`：
- 第一层 `response.data`：Axios 的响应数据对象
- 第二层 `response.data.data`：后端实际返回的数据

### 最佳实践
1. **统一使用 `response.data?.data`** 访问后端返回的数据
2. **避免解构 Axios 响应**：使用 `response.data?.data` 而不是`const { data } = await api.call()`
3. **添加默认值**：使用 `|| []` 或`|| null` 处理可能的空值

### 代码规范建议
```typescript
// ❌ 不推荐：容易混淆
const { data } = await api.list();
setItems(data || []);

// ✅ 推荐：清晰明确
const response = await api.list();
setItems(response.data?.data || []);
```

---

**报告更新时间**：2026-03-28 00:16
**版本**：v0.2.3
