import { FastifyInstance } from 'fastify';
import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * Execution Observability Routes
 * View automation execution history and logs
 */

interface AutomationParams {
    id: string;
}

interface ExecutionLogQuery {
    limit?: string;
    offset?: string;
}

export async function registerObservabilityRoutes(app: FastifyInstance) {
    /**
     * GET /automations/:id/executions
     * Get execution history for an automation
     */
    app.get<{ Params: AutomationParams; Querystring: ExecutionLogQuery }>(
        '/automations/:id/executions',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Not authenticated',
                    });
                }

                const { id } = request.params;
                const limit = parseInt(request.query.limit || '20');
                const offset = parseInt(request.query.offset || '0');
                const userId = request.user.userId;

                // Verify automation belongs to user
                const automations = await db.query(
                    'SELECT id, name FROM automations WHERE id = $1 AND user_id = $2',
                    [id, userId]
                );

                if (automations.length === 0) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Automation not found',
                    });
                }

                // Get execution logs
                const executions = await db.query(
                    `SELECT 
                        id,
                        comment_id,
                        comment_text,
                        commenter_username,
                        actions_executed,
                        execution_status,
                        error_message,
                        processed_at,
                        created_at
                     FROM processed_automation_events
                     WHERE automation_id = $1
                     ORDER BY processed_at DESC
                     LIMIT $2 OFFSET $3`,
                    [id, limit, offset]
                );

                // Get total count
                const countResult = await db.query<{ count: string }>(
                    'SELECT COUNT(*) as count FROM processed_automation_events WHERE automation_id = $1',
                    [id]
                );

                const total = parseInt(countResult[0]?.count || '0');

                // Get summary stats
                const stats = await db.query<{
                    total_executions: string;
                    successful: string;
                    failed: string;
                    last_run_at: string;
                }>(
                    `SELECT 
                        COUNT(*) as total_executions,
                        SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as successful,
                        SUM(CASE WHEN execution_status = 'failed' THEN 1 ELSE 0 END) as failed,
                        MAX(processed_at) as last_run_at
                     FROM processed_automation_events
                     WHERE automation_id = $1`,
                    [id]
                );

                return {
                    success: true,
                    data: {
                        automation: {
                            id: automations[0].id,
                            name: automations[0].name,
                        },
                        summary: {
                            total_executions: parseInt(stats[0]?.total_executions || '0'),
                            successful: parseInt(stats[0]?.successful || '0'),
                            failed: parseInt(stats[0]?.failed || '0'),
                            last_run_at: stats[0]?.last_run_at || null,
                        },
                        executions,
                        pagination: {
                            total,
                            limit,
                            offset,
                            has_more: offset + limit < total,
                        },
                    },
                };
            } catch (error: any) {
                logger.error({ error }, 'Error fetching execution logs');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch execution logs',
                });
            }
        }
    );

    /**
     * GET /automations/:id/stats
     * Get execution statistics for an automation
     */
    app.get<{ Params: AutomationParams }>(
        '/automations/:id/stats',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Not authenticated',
                    });
                }

                const { id } = request.params;
                const userId = request.user.userId;

                // Verify automation belongs to user
                const automations = await db.query(
                    'SELECT id, name, enabled, created_at FROM automations WHERE id = $1 AND user_id = $2',
                    [id, userId]
                );

                if (automations.length === 0) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Automation not found',
                    });
                }

                const automation = automations[0];

                // Get overall stats
                const stats = await db.query<{
                    total_executions: string;
                    successful: string;
                    failed: string;
                    last_run_at: string;
                    last_status: string;
                    last_error: string;
                }>(
                    `SELECT 
                        COUNT(*) as total_executions,
                        SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as successful,
                        SUM(CASE WHEN execution_status = 'failed' THEN 1 ELSE 0 END) as failed,
                        MAX(processed_at) as last_run_at,
                        (SELECT execution_status FROM processed_automation_events 
                         WHERE automation_id = $1 
                         ORDER BY processed_at DESC LIMIT 1) as last_status,
                        (SELECT error_message FROM processed_automation_events 
                         WHERE automation_id = $1 AND execution_status = 'failed'
                         ORDER BY processed_at DESC LIMIT 1) as last_error
                     FROM processed_automation_events
                     WHERE automation_id = $1`,
                    [id]
                );

                // Get stats by day (last 7 days)
                const dailyStats = await db.query(
                    `SELECT 
                        DATE(processed_at) as date,
                        COUNT(*) as executions,
                        SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as successful
                     FROM processed_automation_events
                     WHERE automation_id = $1 
                       AND processed_at >= NOW() - INTERVAL '7 days'
                     GROUP BY DATE(processed_at)
                     ORDER BY date DESC`,
                    [id]
                );

                return {
                    success: true,
                    data: {
                        automation: {
                            id: automation.id,
                            name: automation.name,
                            enabled: automation.enabled,
                            created_at: automation.created_at,
                        },
                        overall: {
                            total_executions: parseInt(stats[0]?.total_executions || '0'),
                            successful: parseInt(stats[0]?.successful || '0'),
                            failed: parseInt(stats[0]?.failed || '0'),
                            success_rate: stats[0]?.total_executions
                                ? (parseInt(stats[0].successful) / parseInt(stats[0].total_executions) * 100).toFixed(2) + '%'
                                : '0%',
                            last_run_at: stats[0]?.last_run_at || null,
                            last_status: stats[0]?.last_status || null,
                            last_error: stats[0]?.last_error || null,
                        },
                        daily: dailyStats,
                    },
                };
            } catch (error: any) {
                logger.error({ error }, 'Error fetching automation stats');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch automation stats',
                });
            }
        }
    );

    /**
     * GET /executions/recent
     * Get recent executions across all user's automations
     */
    app.get<{ Querystring: ExecutionLogQuery }>(
        '/executions/recent',
        { preHandler: authMiddleware },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Not authenticated',
                    });
                }

                const limit = parseInt(request.query.limit || '50');
                const offset = parseInt(request.query.offset || '0');
                const userId = request.user.userId;

                // Get recent executions
                const executions = await db.query(
                    `SELECT 
                        pae.id,
                        pae.comment_id,
                        pae.comment_text,
                        pae.commenter_username,
                        pae.actions_executed,
                        pae.execution_status,
                        pae.error_message,
                        pae.processed_at,
                        a.id as automation_id,
                        a.name as automation_name
                     FROM processed_automation_events pae
                     JOIN automations a ON pae.automation_id = a.id
                     WHERE pae.user_id = $1
                     ORDER BY pae.processed_at DESC
                     LIMIT $2 OFFSET $3`,
                    [userId, limit, offset]
                );

                // Get total count
                const countResult = await db.query<{ count: string }>(
                    'SELECT COUNT(*) as count FROM processed_automation_events WHERE user_id = $1',
                    [userId]
                );

                const total = parseInt(countResult[0]?.count || '0');

                return {
                    success: true,
                    data: {
                        executions,
                        pagination: {
                            total,
                            limit,
                            offset,
                            has_more: offset + limit < total,
                        },
                    },
                };
            } catch (error: any) {
                logger.error({ error }, 'Error fetching recent executions');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch recent executions',
                });
            }
        }
    );

    logger.info('Observability routes registered');
}
