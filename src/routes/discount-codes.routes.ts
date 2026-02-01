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

    logger.info('Discount code routes registered');
}
