import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { extractPostIdFromUrl } from '../utils/instagram-utils.js';
import {
    validateCreateAutomation,
    validateUpdateAutomation
} from '../utils/validation.js';
import { Automation, User } from '../types/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { automationValidator } from '../services/automation-validator.service.js';
import { authService } from '../services/auth.service.js';

/**
 * Automation CRUD Routes
 * Phase 1: Creator-safe automation management
 * All routes require authentication
 */

interface AutomationParams {
    id: string;
}

interface CreateAutomationBody {
    name: string;
    enabled?: boolean;
    priority?: number;
    scope: 'global' | 'post';
    post_id?: string;
    trigger_type: 'keyword' | 'intent';
    trigger_value: string;
    actions: any;
    stop_after_execution?: boolean;
}

export async function registerAutomationRoutes(app: FastifyInstance) {
    /**
     * GET /automations
     * List all automations for the user
     */
    app.get(
        '/automations',
        { preHandler: authMiddleware },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Not authenticated',
                    });
                }

                const userId = request.user.userId;

                const automations = await db.query<Automation>(
                    `SELECT * FROM automations
                 WHERE user_id = $1
                 ORDER BY priority DESC, created_at DESC`,
                    [userId]
                );

                return {
                    success: true,
                    data: automations,
                    count: automations.length,
                };
            } catch (error: any) {
                logger.error({ error }, 'Error fetching automations');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch automations',
                });
            }
        });

    /**
     * GET /automations/:id
     * Get single automation by ID
     */
    app.get<{ Params: AutomationParams }>(
        '/automations/:id',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }
                const { id } = request.params;
                const userId = request.user.userId;

                const automations = await db.query<Automation>(
                    'SELECT * FROM automations WHERE id = $1 AND user_id = $2',
                    [id, userId]
                );

                if (automations.length === 0) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Automation not found',
                    });
                }

                return {
                    success: true,
                    data: automations[0],
                };
            } catch (error: any) {
                logger.error({ error }, 'Error fetching automation');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch automation',
                });
            }
        }
    );

    /**
     * POST /automations
     * Create new automation
     */
    app.post<{ Body: CreateAutomationBody }>(
        '/automations',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }
                const userId = request.user.userId;

                // Get user with tier information
                const user = await authService.getUserById(userId);
                if (!user) {
                    return reply.status(401).send({ success: false, error: 'User not found' });
                }

                // Get Instagram account for user
                const igAccounts = await db.query(
                    'SELECT id FROM instagram_accounts WHERE user_id = $1 LIMIT 1',
                    [userId]
                );

                if (igAccounts.length === 0) {
                    return reply.status(400).send({
                        success: false,
                        error: 'No Instagram account connected. Please connect your account first.',
                    });
                }

                const instagramAccountId = igAccounts[0].id;

                // Phase 2.0: Validate with tier-based feature gating
                const validation = automationValidator.validateAutomation(request.body, user);
                if (!validation.success) {
                    // Check if any errors are tier-related
                    const hasTierError = validation.errors?.some(e => e.code === 'TIER_REQUIRED');
                    const statusCode = hasTierError ? 403 : 400;

                    return reply.status(statusCode).send({
                        success: false,
                        errors: validation.errors,
                    });
                }

                const data = validation.data!;

                // Extract post ID from URL if provided
                const postId = data.post_id ? extractPostIdFromUrl(data.post_id) : null;

                // Insert automation with Phase 2.0 fields
                const result = await db.query<Automation>(
                    `INSERT INTO automations 
                     (user_id, instagram_account_id, name, enabled, priority, scope, post_id, 
                      trigger_type, trigger_value, actions, stop_after_execution, schema_version, tier, first_n_commenters, follow_gate)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                     RETURNING *`,
                    [
                        userId,
                        instagramAccountId,
                        data.name,
                        data.enabled ?? true,
                        data.priority ?? 0,
                        data.scope,
                        postId,
                        data.trigger_type,
                        data.trigger_value,
                        JSON.stringify(data.actions),
                        data.stop_after_execution ?? false,
                        2, // schema_version = 2 for new automations
                        user.tier, // Set tier from user
                        data.first_n_commenters || null,
                        data.follow_gate ?? false, // Phase 2.0 Extension: Default to false
                    ]
                );

                logger.info({ automationId: result[0].id }, 'Automation created');

                return reply.status(201).send({
                    success: true,
                    data: result[0],
                });
            } catch (error: any) {
                logger.error({ error }, 'Error creating automation');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to create automation',
                });
            }
        }
    );

    /**
     * PUT /automations/:id
     * Update automation
     */
    app.put<{ Params: AutomationParams; Body: Partial<CreateAutomationBody> }>(
        '/automations/:id',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }
                const { id } = request.params;
                const userId = request.user.userId;

                // Check automation exists
                const existing = await db.query<Automation>(
                    'SELECT * FROM automations WHERE id = $1 AND user_id = $2',
                    [id, userId]
                );

                if (existing.length === 0) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Automation not found',
                    });
                }

                // Validate input
                const validation = validateUpdateAutomation(request.body);
                if (!validation.success) {
                    return reply.status(400).send({
                        success: false,
                        errors: validation.errors,
                    });
                }

                const data: any = validation.data!; // Cast to any to allow post_id

                // Build update query dynamically
                const updates: string[] = [];
                const values: any[] = [];
                let paramIndex = 1;

                if (data.name !== undefined) {
                    updates.push(`name = $${paramIndex++}`);
                    values.push(data.name);
                }
                if (data.enabled !== undefined) {
                    updates.push(`enabled = $${paramIndex++}`);
                    values.push(data.enabled);
                }
                if (data.priority !== undefined) {
                    updates.push(`priority = $${paramIndex++}`);
                    values.push(data.priority);
                }
                if (data.trigger_value !== undefined) {
                    updates.push(`trigger_value = $${paramIndex++}`);
                    values.push(data.trigger_value);
                }
                if (data.actions !== undefined) {
                    updates.push(`actions = $${paramIndex++}`);
                    values.push(JSON.stringify(data.actions));
                }
                if (data.stop_after_execution !== undefined) {
                    updates.push(`stop_after_execution = $${paramIndex++}`);
                    values.push(data.stop_after_execution);
                }
                if (data.post_id !== undefined) {
                    updates.push(`post_id = $${paramIndex++}`);
                    // Extract post ID from URL if provided
                    const postId = data.post_id ? extractPostIdFromUrl(data.post_id) : null;
                    values.push(postId);
                }

                updates.push(`updated_at = NOW()`);


                if (updates.length === 1) {
                    // Only updated_at, nothing to update
                    return {
                        success: true,
                        data: existing[0],
                    };
                }

                values.push(id, userId);

                const result = await db.query<Automation>(
                    `UPDATE automations 
                     SET ${updates.join(', ')}
                     WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
                     RETURNING *`,
                    values
                );

                logger.info({ automationId: id }, 'Automation updated');

                return {
                    success: true,
                    data: result[0],
                };
            } catch (error: any) {
                logger.error({ error }, 'Error updating automation');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to update automation',
                });
            }
        }
    );

    /**
     * DELETE /automations/:id
     * Delete automation
     */
    app.delete<{ Params: AutomationParams }>(
        '/automations/:id',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }
                const { id } = request.params;
                const userId = request.user.userId;

                const result = await db.query(
                    'DELETE FROM automations WHERE id = $1 AND user_id = $2 RETURNING id',
                    [id, userId]
                );

                if (result.length === 0) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Automation not found',
                    });
                }

                logger.info({ automationId: id }, 'Automation deleted');

                return {
                    success: true,
                    message: 'Automation deleted successfully',
                };
            } catch (error: any) {
                logger.error({ error }, 'Error deleting automation');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to delete automation',
                });
            }
        }
    );

    /**
     * POST /automations/:id/enable
     * Enable automation
     */
    app.post<{ Params: AutomationParams }>(
        '/automations/:id/enable',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }
                const { id } = request.params;
                const userId = request.user.userId;

                // Update automation directly using user_id
                const result = await db.query<Automation>(
                    `UPDATE automations
                     SET enabled = true, updated_at = NOW()
                     WHERE id = $1 AND user_id = $2
                     RETURNING *`,
                    [id, userId]
                );

                if (result.length === 0) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Automation not found',
                    });
                }

                logger.info({ automationId: id }, 'Automation enabled');

                return {
                    success: true,
                    data: result[0],
                };
            } catch (error: any) {
                logger.error({ error }, 'Error enabling automation');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to enable automation',
                });
            }
        }
    );

    /**
     * POST /automations/:id/disable
     * Disable automation
     */
    app.post<{ Params: AutomationParams }>(
        '/automations/:id/disable',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({ success: false, error: 'Not authenticated' });
                }
                const { id } = request.params;
                const userId = request.user.userId;

                // Update automation directly using user_id
                const result = await db.query<Automation>(
                    `UPDATE automations
                     SET enabled = false, updated_at = NOW()
                     WHERE id = $1 AND user_id = $2
                     RETURNING *`,
                    [id, userId]
                );

                if (result.length === 0) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Automation not found',
                    });
                }

                logger.info({ automationId: id }, 'Automation disabled');

                return {
                    success: true,
                    data: result[0],
                };
            } catch (error: any) {
                logger.error({ error }, 'Error disabling automation');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to disable automation',
                });
            }
        }
    );
}
