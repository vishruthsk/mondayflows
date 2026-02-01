-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  telegram_chat_id BIGINT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Instagram accounts table
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ig_business_account_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP,
  automation_enabled BOOLEAN DEFAULT true,
  default_reply_style VARCHAR(50) DEFAULT 'friendly',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_business_account_id ON instagram_accounts(ig_business_account_id);
CREATE INDEX IF NOT EXISTS idx_user_id ON instagram_accounts(user_id);

-- Automations table
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'post')),
  post_id VARCHAR(255),
  trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('keyword', 'intent')),
  trigger_value TEXT NOT NULL,
  actions JSONB NOT NULL,
  stop_after_execution BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_enabled ON automations(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_scope_post ON automations(scope, post_id);
CREATE INDEX IF NOT EXISTS idx_instagram_account_id ON automations(instagram_account_id);

-- Processed automation events table
CREATE TABLE IF NOT EXISTS processed_automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id VARCHAR(255) NOT NULL,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commenter_id VARCHAR(255) NOT NULL,
  commenter_username VARCHAR(255),
  comment_text TEXT,
  intent_classified VARCHAR(100),
  actions_executed JSONB,
  execution_status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  processed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (comment_id, automation_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_id ON processed_automation_events(comment_id);
CREATE INDEX IF NOT EXISTS idx_user_processed ON processed_automation_events(user_id, processed_at);

-- Rate limit counters table
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  limit_type VARCHAR(50) NOT NULL,
  counter_key VARCHAR(255) NOT NULL,
  count INTEGER DEFAULT 0,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, limit_type, counter_key)
);

CREATE INDEX IF NOT EXISTS idx_user_limit_type ON rate_limit_counters(user_id, limit_type, window_end);

-- Rate limit config table
CREATE TABLE IF NOT EXISTS rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_dms_per_day INTEGER DEFAULT 100,
  max_replies_per_hour INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool_id UUID,
  code VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('static', 'rotating', 'one_time')),
  used_by_commenter_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pool_active ON discount_codes(pool_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_type ON discount_codes(user_id, type);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  severity VARCHAR(20) DEFAULT 'info',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_created ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_severity_created ON audit_logs(severity, created_at);

-- Telegram alerts table
CREATE TABLE IF NOT EXISTS telegram_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sent ON telegram_alerts(user_id, sent);
