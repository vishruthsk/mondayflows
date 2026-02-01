import { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AutomationEngineService } from '../services/automation-engine.service.js';
import { db } from '../utils/database.js';

/**
 * Developer Simulation Routes
 * DEV-ONLY: Simulate Instagram comment events for testing
 * 
 * IMPORTANT: These endpoints are DISABLED in production
 */

interface SimulateCommentBody {
    ig_business_account_id: string;
    comment_id: string;
    comment_text: string;
    commenter_id: string;
    commenter_username: string;
    post_id?: string | null;
}

export async function registerDevSimulationRoutes(app: FastifyInstance) {
    /**
     * POST /dev/simulate/comment
     * Simulate an Instagram comment event
     * 
     * This bypasses Meta webhooks and injects a fake comment
     * directly into the automation pipeline
     */
    app.post<{ Body: SimulateCommentBody }>(
        '/dev/simulate/comment',
        async (request, reply) => {
            // Guard: Only allow in development
            if (config.server.nodeEnv === 'production') {
                return reply.status(403).send({
                    success: false,
                    error: 'Simulation endpoints are disabled in production',
                });
            }

            try {
                const {
                    ig_business_account_id,
                    comment_id,
                    comment_text,
                    commenter_id,
                    commenter_username,
                    post_id,
                } = request.body;

                // Validate required fields
                if (!ig_business_account_id || !comment_id || !comment_text || !commenter_id || !commenter_username) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Missing required fields: ig_business_account_id, comment_id, comment_text, commenter_id, commenter_username',
                    });
                }

                // Verify Instagram account exists
                const igAccounts = await db.query(
                    'SELECT * FROM instagram_accounts WHERE ig_business_account_id = $1',
                    [ig_business_account_id]
                );

                if (igAccounts.length === 0) {
                    return reply.status(404).send({
                        success: false,
                        error: `No Instagram account found with ID: ${ig_business_account_id}`,
                    });
                }

                logger.info(
                    {
                        ig_business_account_id,
                        comment_id,
                        comment_text
                    },
                    '[DEV] Simulating Instagram comment'
                );

                // Create normalized comment object (same format as real webhooks)
                const normalizedComment = {
                    ig_business_account_id,
                    post_id: post_id || '',
                    comment_id,
                    comment_text,
                    commenter_id,
                    commenter_username,
                    is_from_owner: false, // Simulated comments are never from owner
                };

                // Process through automation engine (same as real webhooks)
                const automationEngine = new AutomationEngineService();
                await automationEngine.processComment(normalizedComment);

                return reply.status(200).send({
                    success: true,
                    message: 'Comment simulation enqueued',
                    data: {
                        comment_id,
                        ig_business_account_id,
                        comment_text,
                    },
                });
            } catch (error: any) {
                logger.error({ error }, '[DEV] Error simulating comment');
                return reply.status(500).send({
                    success: false,
                    error: error.message || 'Failed to simulate comment',
                });
            }
        }
    );

    /**
     * POST /dev/simulate/batch
     * Simulate multiple comments at once
     */
    app.post<{ Body: { comments: SimulateCommentBody[] } }>(
        '/dev/simulate/batch',
        async (request, reply) => {
            // Guard: Only allow in development
            if (config.server.nodeEnv === 'production') {
                return reply.status(403).send({
                    success: false,
                    error: 'Simulation endpoints are disabled in production',
                });
            }

            try {
                const { comments } = request.body;

                if (!comments || !Array.isArray(comments)) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Missing or invalid "comments" array',
                    });
                }

                logger.info({ count: comments.length }, '[DEV] Simulating batch comments');

                const results = [];

                for (const comment of comments) {
                    try {
                        const normalizedComment = {
                            ig_business_account_id: comment.ig_business_account_id,
                            post_id: comment.post_id || '',
                            comment_id: comment.comment_id,
                            comment_text: comment.comment_text,
                            commenter_id: comment.commenter_id,
                            commenter_username: comment.commenter_username,
                            is_from_owner: false, // Simulated comments are never from owner
                        };

                        const automationEngine = new AutomationEngineService();
                        await automationEngine.processComment(normalizedComment);

                        results.push({
                            comment_id: comment.comment_id,
                            status: 'enqueued',
                        });
                    } catch (error: any) {
                        results.push({
                            comment_id: comment.comment_id,
                            status: 'failed',
                            error: error.message,
                        });
                    }
                }

                return reply.status(200).send({
                    success: true,
                    message: `Simulated ${comments.length} comments`,
                    data: {
                        total: comments.length,
                        results,
                    },
                });
            } catch (error: any) {
                logger.error({ error }, '[DEV] Error simulating batch comments');
                return reply.status(500).send({
                    success: false,
                    error: error.message || 'Failed to simulate batch comments',
                });
            }
        }
    );

    /**
     * GET /dev/status
     * Check if dev mode is enabled
     */
    app.get('/dev/status', async () => {
        return {
            dev_mode: config.server.nodeEnv !== 'production',
            node_env: config.server.nodeEnv,
            simulation_enabled: config.server.nodeEnv !== 'production',
        };
    });

    logger.info('[DEV] Simulation routes registered (disabled in production)');
}
