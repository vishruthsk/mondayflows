-- Migration: Add Phase 2.0 columns for schema versioning and tier-based features
-- This migration adds validation support without changing execution logic

-- Add schema_version and tier to automations table
ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'free';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_automations_schema_version 
  ON automations(schema_version);
CREATE INDEX IF NOT EXISTS idx_automations_tier 
  ON automations(tier);

-- Backfill existing automations as v1 free tier
UPDATE automations 
SET schema_version = 1, tier = 'free' 
WHERE schema_version IS NULL;

-- Add tier to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMP;

-- Add index for user tier lookups
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- Backfill existing users as free tier
UPDATE users 
SET tier = 'free' 
WHERE tier IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN automations.schema_version IS 'Automation schema version: 1 = v1 (basic), 2 = v2 (extended features)';
COMMENT ON COLUMN automations.tier IS 'Minimum tier required to use this automation: free, pro, enterprise';
COMMENT ON COLUMN users.tier IS 'User subscription tier: free, pro, enterprise';
COMMENT ON COLUMN users.tier_expires_at IS 'When the current paid tier expires (NULL for free tier)';
