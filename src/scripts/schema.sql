-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  telegram_chat_id BIGINT UNIQUE,
  tier VARCHAR(20) DEFAULT 'free',
  tier_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email_code ON otp_codes(email, code) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at) WHERE used = FALSE;

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
  
  -- Phase 2 columns
  schema_version INTEGER DEFAULT 1,
  tier VARCHAR(20) DEFAULT 'free',
  follow_gate BOOLEAN DEFAULT false,
  first_n_commenters INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_enabled ON automations(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_scope_post ON automations(scope, post_id);
CREATE INDEX IF NOT EXISTS idx_instagram_account_id ON automations(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_automations_schema_version ON automations(schema_version);
CREATE INDEX IF NOT EXISTS idx_automations_tier ON automations(tier);
CREATE INDEX IF NOT EXISTS idx_automations_follow_gate ON automations(follow_gate) WHERE follow_gate = true;

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

-- Discount code engines (Phase 2.1)
CREATE TABLE IF NOT EXISTS discount_code_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_codes INTEGER NOT NULL,
    assigned_codes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_code_pools_user_id ON discount_code_pools(user_id);

CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES discount_code_pools(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    is_assigned BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pool_id, code)
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_pool_id ON discount_codes(pool_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_unassigned ON discount_codes(pool_id, is_assigned) WHERE is_assigned = false;

CREATE TABLE IF NOT EXISTS code_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    pool_id UUID NOT NULL REFERENCES discount_code_pools(id) ON DELETE CASCADE,
    comment_id VARCHAR(255) NOT NULL,
    commenter_id VARCHAR(255) NOT NULL,
    commenter_username VARCHAR(255),
    assigned_code VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(automation_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_code_assignments_automation_id ON code_assignments(automation_id);

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
