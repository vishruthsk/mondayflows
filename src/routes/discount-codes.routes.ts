import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { discountCodeService } from '../services/discount-code.service.js';
import { logger } from '../utils/logger.js';

/**
 * Phase 2.1: Discount Code Routes
 * Manage code pools and view assignments
 */

interface CreatePoolBody {
    name: string;
    description?: string;
    codes: string[];
}

export async function registerDiscountCodeRoutes(app: FastifyInstance) {
    /**
     * POST /discount-codes/pools
     * Create a new code pool
     */
    app.post<{ Body: CreatePoolBody }>(
        '/discount-codes/pools',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }

                const { name, description, codes } = request.body;

                // Validation
                if (!name || name.trim().length === 0) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Pool name is required',
                    });
                }

                if (!codes || !Array.isArray(codes) || codes.length === 0) {
                    return reply.status(400).send({
                        success: false,
                        error: 'At least one code is required',
                    });
                }

                if (codes.length > 10000) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Maximum 10,000 codes per pool',
                    });
                }

                // Validate code format
                for (const code of codes) {
                    if (typeof code !== 'string' || code.trim().length === 0) {
                        return reply.status(400).send({
                            success: false,
                            error: 'All codes must be non-empty strings',
                        });
                    }
                    if (code.length > 50) {
                        return reply.status(400).send({
                            success: false,
                            error: 'Codes must be 50 characters or less',
                        });
                    }
                }

                const pool = await discountCodeService.createPool(
                    request.user.userId,
                    name,
                    codes,
                    description
                );

                return reply.status(201).send({
                    success: true,
                    data: pool,
                });
            } catch (error: any) {
                logger.error({ error }, 'Error creating code pool');

                if (error.message?.includes('duplicate')) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Code pool contains duplicate codes',
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error: 'Failed to create code pool',
                });
            }
        }
    );

    /**
     * GET /discount-codes/pools
     * List user's code pools
     */
    app.get(
        '/discount-codes/pools',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }

                const pools = await discountCodeService.getUserPools(request.user.userId);

                return {
                    success: true,
                    data: pools,
                    count: pools.length,
                };
            } catch (error: any) {
                logger.error({ error }, 'Error fetching code pools');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch code pools',
                });
            }
        }
    );

    /**
     * GET /discount-codes/pools/:id
     * Get pool details and statistics
     */
    app.get<{ Params: { id: string } }>(
        '/discount-codes/pools/:id',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }

                const pool = await discountCodeService.getPoolStats(request.params.id);

                if (!pool) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Pool not found',
                    });
                }

                // Verify ownership
                if (pool.user_id !== request.user.userId) {
                    return reply.status(403).send({
                        success: false,
                        error: 'Access denied',
                    });
                }

                return {
                    success: true,
                    data: pool,
                };
            } catch (error: any) {
                logger.error({ error }, 'Error fetching pool stats');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch pool stats',
                });
            }
        }
    );

    /**
     * GET /discount-codes/pools/:id/assignments
     * Get assignments for a pool
     */
    app.get<{ Params: { id: string } }>(
        '/discount-codes/pools/:id/assignments',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }

                // Verify pool ownership
                const pool = await discountCodeService.getPoolStats(request.params.id);
                if (!pool) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Pool not found',
                    });
                }

                if (pool.user_id !== request.user.userId) {
                    return reply.status(403).send({
                        success: false,
                        error: 'Access denied',
                    });
                }

                const assignments = await discountCodeService.getPoolAssignments(request.params.id);

                return {
                    success: true,
                    data: assignments,
                    count: assignments.length,
                };
            } catch (error: any) {
                logger.error({ error }, 'Error fetching pool assignments');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch assignments',
                });
            }
        }
    );

    /**
     * GET /discount-codes/pools/:id/codes
     * Get all codes in a pool (for editing)
     */
    app.get<{ Params: { id: string } }>(
        '/discount-codes/pools/:id/codes',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }

                // Verify pool ownership
                const pool = await discountCodeService.getPoolStats(request.params.id);
                if (!pool) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Pool not found',
                    });
                }

                if (pool.user_id !== request.user.userId) {
                    return reply.status(403).send({
                        success: false,
                        error: 'Access denied',
                    });
                }

                // Helper to get raw codes list from service/db
                // We'll run a direct query here for simplicity since service doesn't have a "getAllCodes"
                // But generally better to use service.
                // Let's query DB directly for now as this is a specific UI need
                const result = await import('../utils/database.js').then(m => m.db.query<{ code: string }>(
                    'SELECT code FROM discount_codes WHERE pool_id = $1 ORDER BY created_at ASC',
                    [request.params.id]
                ));

                const codes = result.map(r => r.code);

                return {
                    success: true,
                    data: codes,
                };
            } catch (error: any) {
                logger.error({ error }, 'Error fetching pool codes');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch codes',
                });
            }
        }
    );

    /**
     * PUT /discount-codes/pools/:id
     * Update pool details
     */
    app.put<{ Params: { id: string }; Body: { name?: string; description?: string; codes?: string[] } }>(
        '/discount-codes/pools/:id',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }

                const { name, description, codes } = request.body;

                if (!name && description === undefined && codes === undefined) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Nothing to update',
                    });
                }

                // Validate codes if provided
                if (codes !== undefined) {
                    if (!Array.isArray(codes)) {
                        return reply.status(400).send({
                            success: false,
                            error: 'Codes must be an array',
                        });
                    }
                    if (codes.length > 10000) {
                        return reply.status(400).send({
                            success: false,
                            error: 'Maximum 10,000 codes per pool',
                        });
                    }
                    // Validate code format
                    for (const code of codes) {
                        if (typeof code !== 'string' || code.trim().length === 0) {
                            return reply.status(400).send({
                                success: false,
                                error: 'All codes must be non-empty strings',
                            });
                        }
                        if (code.length > 50) {
                            return reply.status(400).send({
                                success: false,
                                error: 'Codes must be 50 characters or less',
                            });
                        }
                    }
                    // Check duplicates in input
                    const uniqueCodes = new Set(codes);
                    if (uniqueCodes.size !== codes.length) {
                        return reply.status(400).send({
                            success: false,
                            error: 'Input contains duplicate codes',
                        });
                    }
                }

                const updatedPool = await discountCodeService.updatePool(
                    request.params.id,
                    request.user.userId,
                    name,
                    description,
                    codes
                );

                if (!updatedPool) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Pool not found or access denied',
                    });
                }

                return {
                    success: true,
                    data: updatedPool,
                };
            } catch (error: any) {
                logger.error({ error }, 'Error updating pool');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to update pool',
                });
            }
        }
    );

    /**
     * DELETE /discount-codes/pools/:id
     * Delete pool
     */
    app.delete<{ Params: { id: string } }>(
        '/discount-codes/pools/:id',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }

                try {
                    const deleted = await discountCodeService.deletePool(
                        request.params.id,
                        request.user.userId
                    );

                    if (!deleted) {
                        return reply.status(404).send({
                            success: false,
                            error: 'Pool not found or access denied',
                        });
                    }

                    return {
                        success: true,
                        message: 'Pool deleted successfully',
                    };
                } catch (error: any) {
                    // Check for FK constraint violation (assigned codes)
                    if (error.code === '23503') {
                        return reply.status(409).send({
                            success: false,
                            error: 'Cannot delete pool with assigned codes',
                        });
                    }
                    throw error;
                }
            } catch (error: any) {
                logger.error({ error }, 'Error deleting pool');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to delete pool',
                });
            }
        }
    );

    logger.info('Discount code routes registered');
}
