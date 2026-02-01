import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';

/**
 * Phase 2.1: Discount Code Service
 * 
 * Handles atomic code assignment with:
 * - Idempotency (same comment gets same code)
 * - First N commenters enforcement
 * - Fallback messages when exhausted
 * - Concurrency safety via SELECT FOR UPDATE SKIP LOCKED
 */

export interface CodePool {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    total_codes: number;
    assigned_codes: number;
    created_at: Date;
    updated_at: Date;
}

export interface DiscountCode {
    id: string;
    pool_id: string;
    code: string;
    is_assigned: boolean;
    assigned_at?: Date;
    created_at: Date;
}

export interface CodeAssignment {
    id: string;
    automation_id: string;
    code_id: string;
    pool_id: string;
    comment_id: string;
    commenter_id: string;
    commenter_username?: string;
    assigned_code: string;
    assigned_at: Date;
}

export interface AssignmentResult {
    code: string | null;
    fallback: boolean;
}

export class DiscountCodeService {
    /**
     * Create a new code pool with codes
     */
    async createPool(
        userId: string,
        name: string,
        codes: string[],
        description?: string
    ): Promise<CodePool> {
        if (codes.length === 0) {
            throw new Error('Code pool must contain at least one code');
        }

        // Check for duplicate codes
        const uniqueCodes = new Set(codes);
        if (uniqueCodes.size !== codes.length) {
            throw new Error('Code pool contains duplicate codes');
        }

        try {
            const pool = await db.transaction(async (client) => {
                // Create pool
                const poolResult = await client.query<CodePool>(
                    `INSERT INTO discount_code_pools (user_id, name, description, total_codes)
                     VALUES ($1, $2, $3, $4)
                     RETURNING *`,
                    [userId, name, description || null, codes.length]
                );

                const poolId = poolResult.rows[0].id;

                // Insert codes in batch
                const codeValues = codes.map((_, idx) => `($1, $${idx + 2})`).join(', ');
                const codeParams = [poolId, ...codes];

                await client.query(
                    `INSERT INTO discount_codes (pool_id, code) VALUES ${codeValues}`,
                    codeParams
                );

                return poolResult.rows[0];
            });

            logger.info(
                { poolId: pool.id, totalCodes: codes.length, userId },
                'Discount code pool created'
            );

            return pool;
        } catch (error: any) {
            logger.error(
                {
                    error: error.message || error,
                    stack: error.stack,
                    userId,
                    name,
                    codesCount: codes.length
                },
                'Failed to create discount code pool'
            );
            throw error;
        }
    }

    /**
     * Assign a code atomically with idempotency and first_n enforcement
     */
    async assignCode(
        automationId: string,
        poolId: string,
        commentId: string,
        commenterId: string,
        commenterUsername: string,
        firstNCommenters: number | null
    ): Promise<AssignmentResult> {
        // Step 1: Idempotency check - has this comment already been assigned?
        const existing = await db.query<CodeAssignment>(
            'SELECT assigned_code FROM code_assignments WHERE automation_id = $1 AND comment_id = $2',
            [automationId, commentId]
        );

        if (existing.length > 0) {
            logger.info(
                { commentId, code: existing[0].assigned_code },
                'Code already assigned (idempotent)'
            );
            return { code: existing[0].assigned_code, fallback: false };
        }

        // Step 2: First N commenters check
        if (firstNCommenters !== null && firstNCommenters > 0) {
            const assignmentCount = await db.query<{ count: string }>(
                'SELECT COUNT(*) as count FROM code_assignments WHERE automation_id = $1',
                [automationId]
            );

            const count = parseInt(assignmentCount[0].count);
            if (count >= firstNCommenters) {
                logger.info(
                    { automationId, count, limit: firstNCommenters },
                    'First N limit reached, using fallback'
                );
                return { code: null, fallback: true };
            }
        }

        // Step 3: Atomic code assignment using transaction
        const result = await db.transaction(async (client) => {
            // Lock and select an unassigned code
            // SKIP LOCKED prevents concurrent requests from blocking
            const codeResult = await client.query(
                `SELECT id, code FROM discount_codes 
                 WHERE pool_id = $1 AND is_assigned = false 
                 ORDER BY created_at ASC 
                 LIMIT 1 
                 FOR UPDATE SKIP LOCKED`,
                [poolId]
            );

            if (codeResult.rows.length === 0) {
                return null; // Pool exhausted
            }

            const codeRecord = codeResult.rows[0] as DiscountCode;

            // Mark code as assigned
            await client.query(
                'UPDATE discount_codes SET is_assigned = true, assigned_at = NOW() WHERE id = $1',
                [codeRecord.id]
            );

            // Increment pool counter
            await client.query(
                'UPDATE discount_code_pools SET assigned_codes = assigned_codes + 1, updated_at = NOW() WHERE id = $1',
                [poolId]
            );

            // Create assignment record (ensures idempotency via unique constraint)
            await client.query(
                `INSERT INTO code_assignments 
                 (automation_id, code_id, pool_id, comment_id, commenter_id, commenter_username, assigned_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [automationId, codeRecord.id, poolId, commentId, commenterId, commenterUsername, codeRecord.code]
            );

            return codeRecord.code;
        });

        if (result === null) {
            logger.info({ poolId, automationId }, 'Code pool exhausted, using fallback');
            return { code: null, fallback: true };
        }

        logger.info(
            { code: result, commenterId, automationId },
            'Code assigned successfully'
        );

        return { code: result, fallback: false };
    }

    /**
     * Get pool statistics
     */
    async getPoolStats(poolId: string): Promise<CodePool | null> {
        const pools = await db.query<CodePool>(
            'SELECT * FROM discount_code_pools WHERE id = $1',
            [poolId]
        );

        return pools.length > 0 ? pools[0] : null;
    }

    /**
     * Get user's code pools
     */
    async getUserPools(userId: string): Promise<CodePool[]> {
        return await db.query<CodePool>(
            'SELECT * FROM discount_code_pools WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
    }

    /**
     * Get assignments for an automation
     */
    async getAutomationAssignments(automationId: string): Promise<CodeAssignment[]> {
        return await db.query<CodeAssignment>(
            'SELECT * FROM code_assignments WHERE automation_id = $1 ORDER BY assigned_at DESC',
            [automationId]
        );
    }

    /**
     * Get assignments for a pool
     */
    async getPoolAssignments(poolId: string): Promise<CodeAssignment[]> {
        return await db.query<CodeAssignment>(
            'SELECT * FROM code_assignments WHERE pool_id = $1 ORDER BY assigned_at DESC',
            [poolId]
        );
    }
}

export const discountCodeService = new DiscountCodeService();
