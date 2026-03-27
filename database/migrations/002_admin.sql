-- OpenClaw Web Platform - 管理员后台表
-- 迁移编号：002

-- ===== 管理员账号表 =====

CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL,  -- super_admin, operator, support
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== 客户问题工单表 =====

CREATE TABLE support_tickets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_to     UUID REFERENCES admin_users(id),

    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    category        VARCHAR(50) NOT NULL,  -- install_error, config_issue, billing, other
    priority        VARCHAR(20) NOT NULL DEFAULT 'medium',  -- low, medium, high, urgent

    status          VARCHAR(20) NOT NULL DEFAULT 'open',  -- open, in_progress, resolved, closed

    server_id       UUID,

    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMP,
    resolved_by     UUID REFERENCES admin_users(id)
);

-- ===== 工单回复表 =====

CREATE TABLE ticket_replies (
    id              BIGSERIAL PRIMARY KEY,
    ticket_id       UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id         UUID,
    is_admin        BOOLEAN NOT NULL DEFAULT false,
    content         TEXT NOT NULL,
    attachments     JSONB DEFAULT '[]',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== 系统配置表 =====

CREATE TABLE system_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key      VARCHAR(100) UNIQUE NOT NULL,
    config_value    JSONB NOT NULL,
    description     TEXT,
    updated_by      UUID REFERENCES admin_users(id),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== 告警规则表 =====

CREATE TABLE alert_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    rule_type       VARCHAR(50) NOT NULL,
    condition       JSONB NOT NULL,
    threshold       INTEGER,
    window_minutes  INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    notify_emails   TEXT[],
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== 告警记录表 =====

CREATE TABLE alert_logs (
    id              BIGSERIAL PRIMARY KEY,
    rule_id         UUID REFERENCES alert_rules(id),
    triggered_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    severity        VARCHAR(20) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    details         JSONB,
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES admin_users(id),
    acknowledged_at TIMESTAMP
);

-- ===== 管理员操作日志表 =====

CREATE TABLE admin_operation_logs (
    id              BIGSERIAL PRIMARY KEY,
    admin_id        UUID REFERENCES admin_users(id),
    action          VARCHAR(100) NOT NULL,
    target_type     VARCHAR(50),
    target_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== 索引 =====

CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_role ON admin_users(role);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);

CREATE INDEX idx_ticket_replies_ticket ON ticket_replies(ticket_id);

CREATE INDEX idx_system_configs_key ON system_configs(config_key);

CREATE INDEX idx_alert_rules_active ON alert_rules(is_active);
CREATE INDEX idx_alert_logs_triggered ON alert_logs(triggered_at DESC);
CREATE INDEX idx_alert_logs_acknowledged ON alert_logs(is_acknowledged);

CREATE INDEX idx_admin_logs_admin ON admin_operation_logs(admin_id);
CREATE INDEX idx_admin_logs_created ON admin_operation_logs(created_at DESC);

-- ===== 触发器：自动更新 updated_at =====

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 插入初始数据 =====

-- 插入默认超级管理员（密码：admin123456，需要 bcrypt 哈希）
-- 注意：实际密码需要在应用层使用 bcrypt 加密后插入
INSERT INTO admin_users (username, email, password_hash, role) VALUES
('admin', 'admin@openclaw.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- 插入默认系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('guest_settings', '{"enabled": true, "session_duration_hours": 24, "max_servers": 1}', '访客模式配置')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_configs (config_key, config_value, description) VALUES
('user_default_quota', '{"server_limit": 5, "api_quota": 1000}', '用户默认配额')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_configs (config_key, config_value, description) VALUES
('install_settings', '{"timeout_seconds": 600, "max_retries": 3}', 'OpenClaw 安装配置')
ON CONFLICT (config_key) DO NOTHING;

-- 插入默认告警规则
INSERT INTO alert_rules (name, rule_type, condition, threshold, window_minutes) VALUES
('安装失败率过高', 'install_failure',
 '{"field": "status", "operator": "=", "value": "error"}',
 5, 60)
ON CONFLICT DO NOTHING;

INSERT INTO alert_rules (name, rule_type, condition, threshold, window_minutes) VALUES
('服务器批量离线', 'server_offline',
 '{"field": "status", "operator": "=", "value": "offline"}',
 3, 10)
ON CONFLICT DO NOTHING;
