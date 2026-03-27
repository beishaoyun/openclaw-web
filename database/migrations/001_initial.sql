-- OpenClaw Web Platform - 初始数据库迁移
-- 创建所有核心表

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 用户体系表 =====

-- 用户表
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMP,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    server_limit    INTEGER NOT NULL DEFAULT 5,
    api_quota       INTEGER NOT NULL DEFAULT 1000,
    CONSTRAINT chk_users_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- 用户档案扩展表
CREATE TABLE user_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    nickname        VARCHAR(100),
    avatar_url      VARCHAR(500),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    language        VARCHAR(10) DEFAULT 'zh-CN'
);

-- 访客会话表
CREATE TABLE guest_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token   VARCHAR(255) UNIQUE NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP NOT NULL,
    last_active_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    temp_server_ip  VARCHAR(45),
    temp_server_port INTEGER DEFAULT 22,
    temp_server_user VARCHAR(50),
    temp_server_pass VARCHAR(255),
    deploy_progress JSONB DEFAULT '{}',
    CONSTRAINT chk_guest_expires CHECK (expires_at > created_at)
);

-- 操作日志表
CREATE TABLE operation_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    guest_session_id UUID REFERENCES guest_sessions(id),
    operation_type  VARCHAR(50) NOT NULL,
    target_type     VARCHAR(50),
    target_id       UUID,
    action          VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    error_message   TEXT,
    request_data    JSONB,
    response_data   JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== 服务器管理表 =====

-- 服务器表
CREATE TABLE servers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100),
    public_ip       VARCHAR(45) NOT NULL,
    ssh_port        INTEGER NOT NULL DEFAULT 22,
    ssh_user        VARCHAR(50) NOT NULL DEFAULT 'root',
    ssh_password    VARCHAR(500) NOT NULL,
    group_id        UUID,
    tags            TEXT[],
    status          VARCHAR(20) NOT NULL DEFAULT 'unknown',
    ssh_status      VARCHAR(20) NOT NULL DEFAULT 'unknown',
    openclaw_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
    last_checked_at TIMESTAMP,
    cpu_usage       DECIMAL(5,2),
    memory_usage    DECIMAL(5,2),
    disk_usage      DECIMAL(5,2),
    os_type         VARCHAR(50),
    os_version      VARCHAR(50),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 服务器分组表
CREATE TABLE server_groups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 服务器操作日志表
CREATE TABLE server_operations (
    id              BIGSERIAL PRIMARY KEY,
    server_id       UUID REFERENCES servers(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    operation_type  VARCHAR(50) NOT NULL,
    command         TEXT,
    status          VARCHAR(20) NOT NULL,
    output          TEXT,
    error_message   TEXT,
    duration_ms     INTEGER,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 监控历史表
CREATE TABLE server_metrics (
    id              BIGSERIAL PRIMARY KEY,
    server_id       UUID REFERENCES servers(id) ON DELETE CASCADE,
    timestamp       TIMESTAMP NOT NULL DEFAULT NOW(),
    cpu_usage       DECIMAL(5,2),
    memory_total    BIGINT,
    memory_used     BIGINT,
    disk_total      BIGINT,
    disk_used       BIGINT,
    network_rx      BIGINT,
    network_tx      BIGINT,
    load_1m         DECIMAL(5,2),
    load_5m         DECIMAL(5,2),
    load_15m        DECIMAL(5,2)
);

-- ===== OpenClaw 实例表 =====

CREATE TABLE openclaw_instances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id       UUID REFERENCES servers(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    version         VARCHAR(20),
    install_dir     VARCHAR(255) DEFAULT '/opt/openclaw',
    config_file     VARCHAR(255) DEFAULT '/opt/openclaw/config.yaml',
    status          VARCHAR(20) NOT NULL DEFAULT 'unknown',
    process_id      INTEGER,
    listen_port     INTEGER DEFAULT 8080,
    cpu_usage       DECIMAL(5,2),
    memory_usage    DECIMAL(5,2),
    uptime_seconds  BIGINT,
    installed_at    TIMESTAMP,
    last_checked_at TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 安装任务表
CREATE TABLE install_tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id       UUID REFERENCES servers(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    status          VARCHAR(20) NOT NULL,
    current_step    INTEGER NOT NULL DEFAULT 0,
    total_steps     INTEGER NOT NULL DEFAULT 6,
    install_method  VARCHAR(20) NOT NULL DEFAULT 'online',
    logs            JSONB DEFAULT '[]',
    error_step      INTEGER,
    error_message   TEXT,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== 模型/通道/技能表 =====

-- 模型配置表
CREATE TABLE models (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    model_type      VARCHAR(50) NOT NULL,
    provider        VARCHAR(50) NOT NULL,
    api_endpoint    VARCHAR(500) NOT NULL,
    api_key         VARCHAR(500) NOT NULL,
    max_tokens      INTEGER DEFAULT 4096,
    temperature     DECIMAL(3,2) DEFAULT 0.7,
    top_p           DECIMAL(3,2) DEFAULT 1.0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_unique_default UNIQUE (user_id, is_default)
);

-- 通道配置表
CREATE TABLE channels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    channel_type    VARCHAR(50) NOT NULL,
    base_url        VARCHAR(500) NOT NULL,
    api_path        VARCHAR(200) DEFAULT '/v1/chat/completions',
    auth_type       VARCHAR(20) DEFAULT 'bearer',
    auth_value      VARCHAR(500),
    upstream_urls   JSONB,
    health_check    JSONB,
    rate_limit      INTEGER,
    burst_limit     INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_health_at  TIMESTAMP,
    health_status   VARCHAR(20) DEFAULT 'unknown',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 通道模板表
CREATE TABLE channel_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    channel_type    VARCHAR(50) NOT NULL,
    base_url        VARCHAR(500) NOT NULL,
    api_path        VARCHAR(200),
    auth_type       VARCHAR(20),
    is_official     BOOLEAN NOT NULL DEFAULT false,
    usage_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 技能表
CREATE TABLE skills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    model_id        UUID REFERENCES models(id),
    channel_id      UUID REFERENCES channels(id),
    system_prompt   TEXT,
    user_prompt_template TEXT,
    temperature     DECIMAL(3,2),
    max_tokens      INTEGER,
    category        VARCHAR(50),
    tags            TEXT[],
    is_active       BOOLEAN NOT NULL DEFAULT true,
    is_public       BOOLEAN NOT NULL DEFAULT false,
    usage_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== 配置版本历史表 =====

CREATE TABLE config_versions (
    id              BIGSERIAL PRIMARY KEY,
    config_type     VARCHAR(20) NOT NULL,
    config_id       UUID NOT NULL,
    user_id         UUID REFERENCES users(id),
    snapshot        JSONB NOT NULL,
    version_number  INTEGER NOT NULL,
    change_type     VARCHAR(20) NOT NULL,
    change_summary  VARCHAR(255),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== 索引 =====

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_guest_sessions_token ON guest_sessions(session_token);
CREATE INDEX idx_guest_sessions_expires ON guest_sessions(expires_at);

CREATE INDEX idx_operation_logs_user ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_type ON operation_logs(operation_type, created_at);

CREATE INDEX idx_servers_user ON servers(user_id);
CREATE INDEX idx_servers_status ON servers(status);

CREATE INDEX idx_server_ops_server ON server_operations(server_id, created_at);

CREATE INDEX idx_server_metrics_server_ts ON server_metrics(server_id, timestamp DESC);

CREATE INDEX idx_openclaw_instances_server ON openclaw_instances(server_id);

CREATE INDEX idx_install_tasks_server ON install_tasks(server_id);
CREATE INDEX idx_install_tasks_user ON install_tasks(user_id, created_at);

CREATE INDEX idx_models_user ON models(user_id);
CREATE INDEX idx_channels_user ON channels(user_id);
CREATE INDEX idx_skills_user ON skills(user_id);

CREATE INDEX idx_config_versions_config ON config_versions(config_type, config_id);

-- ===== 插入初始通道模板数据 =====

INSERT INTO channel_templates (name, description, channel_type, base_url, api_path, auth_type, is_official) VALUES
('Cloudflare Workers', '适合个人开发者，低成本中转', 'proxy', 'https://your-worker.your-subdomain.workers.dev', '/v1/chat/completions', 'bearer', true),
('Nginx 反向代理', '适合自建中转服务', 'proxy', 'http://your-server.com', '/v1/chat/completions', 'bearer', true),
('负载均衡', '多上游服务器，高可用', 'load_balanced', 'http://lb-server.com', '/v1/chat/completions', 'bearer', true),
('Direct OpenAI', '直连 OpenAI 官方 API', 'direct', 'https://api.openai.com', '/v1/chat/completions', 'bearer', true),
('Direct Anthropic', '直连 Anthropic 官方 API', 'direct', 'https://api.anthropic.com', '/v1/messages', 'api_key', true);

-- ===== 触发器：自动更新 updated_at =====

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
