FROM node:20-alpine AS builder

WORKDIR /app

# 安装所有依赖（包括 devDependencies 用于构建）
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 构建 TypeScript
RUN npm run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache openssl curl

# 复制构建产物和 node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
