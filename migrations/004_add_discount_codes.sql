-- Migration: Add discount code engine tables
-- Phase 2.1: Atomic code assignment with first_n_commenters support

-- Create discount code pools table
CREATE TABLE discount_code_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_codes INTEGER NOT NULL,
    assigned_codes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT positive_total_codes CHECK (total_codes > 0),
    CONSTRAINT assigned_lte_total CHECK (assigned_codes <= total_codes)
);

CREATE INDEX idx_discount_code_pools_user_id ON discount_code_pools(user_id);

-- Create discount codes table
CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES discount_code_pools(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    is_assigned BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(pool_id, code)
);

CREATE INDEX idx_discount_codes_pool_id ON discount_codes(pool_id);
CREATE INDEX idx_discount_codes_unassigned ON discount_codes(pool_id, is_assigned) 
    WHERE is_assigned = false;

-- Create code assignments table
CREATE TABLE code_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    pool_id UUID NOT NULL REFERENCES discount_code_pools(id) ON DELETE CASCADE,
    comment_id VARCHAR(255) NOT NULL,
    commenter_id VARCHAR(255) NOT NULL,
    commenter_username VARCHAR(255),
    assigned_code VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate assignments per comment
    UNIQUE(automation_id, comment_id)
);

CREATE INDEX idx_code_assignments_automation_id ON code_assignments(automation_id);
CREATE INDEX idx_code_assignments_commenter_id ON code_assignments(commenter_id);
CREATE INDEX idx_code_assignments_pool_id ON code_assignments(pool_id);

-- Add comments for documentation
COMMENT ON TABLE discount_code_pools IS 'Pools of discount codes created by users';
COMMENT ON TABLE discount_codes IS 'Individual discount codes within pools';
COMMENT ON TABLE code_assignments IS 'Tracks which codes were assigned to which commenters';
COMMENT ON COLUMN discount_codes.is_assigned IS 'Atomic flag for code assignment using SELECT FOR UPDATE SKIP LOCKED';
COMMENT ON COLUMN code_assignments.comment_id IS 'Ensures idempotency - same comment gets same code';
