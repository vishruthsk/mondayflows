-- Migration: Add follow_gate column for follower-only automations
-- Phase 2.0 Extension: Validation only, execution logic deferred to Phase 2.4

-- Add follow_gate to automations table
ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS follow_gate BOOLEAN DEFAULT false;

-- Add index for filtering (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_automations_follow_gate 
  ON automations(follow_gate) WHERE follow_gate = true;

-- Add comment for documentation
COMMENT ON COLUMN automations.follow_gate IS 'If true, only execute for followers (requires follower check in Phase 2.4)';
