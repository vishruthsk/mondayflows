-- Migration: Phase 2.3 - Add 'skipped' status and improve execution tracking
-- Adds 'skipped' to execution_status for better status semantics
-- Ensures unique constraint exists for idempotency

-- Step 1: Add 'skipped' to execution_status (if using enum, otherwise it's just a varchar)
-- Note: execution_status is VARCHAR(50), so no enum to modify
-- We'll add a check constraint to validate allowed values

-- Step 2: Ensure unique constraint exists (already exists in schema.sql line 64)
-- UNIQUE (comment_id, automation_id) - already present, no action needed

-- Step 3: Add index for analytics queries on execution_status
CREATE INDEX IF NOT EXISTS idx_processed_events_status_created 
ON processed_automation_events(execution_status, processed_at DESC);

-- Step 4: Add check constraint for valid execution statuses
ALTER TABLE processed_automation_events 
DROP CONSTRAINT IF EXISTS check_execution_status;

ALTER TABLE processed_automation_events 
ADD CONSTRAINT check_execution_status 
CHECK (execution_status IN ('success', 'partial', 'skipped', 'failed'));

-- Comments for documentation
COMMENT ON COLUMN processed_automation_events.execution_status IS 
'Execution outcome: success (all actions succeeded), partial (mixed results), skipped (no actions executed due to business logic), failed (all actions failed or exception thrown)';

COMMENT ON CONSTRAINT check_execution_status ON processed_automation_events IS 
'Phase 2.3: Enforces valid execution status values including new skipped status';
