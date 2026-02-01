import { FastifyInstance } from 'fastify';
import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

interface ExecutionsQueryParams {
    status?: 'success' | 'failed' | 'partial' | 'skipped';
    limit?: string;
    offset?: string;
}

export async function executionsRoutes(app: FastifyInstance) {

    // Get execution logs
    app.get<{
        Querystring: ExecutionsQueryParams;
    }>('/executions', {
        preHandler: [authMiddleware]
    }, async (request, reply) => {
        const userId = request.user!.userId;
        const { status, limit = '50', offset = '0' } = request.query;

        try {
            // Build query
            let query = `
                SELECT 
                    pae.id,
                    pae.automation_id,
                    pae.execution_status as status,
                    pae.actions_executed as trigger_data,
                    pae.processed_at as executed_at,
                    pae.processed_at as completed_at,
                    pae.error_message,
                    a.name as automation_name,
                    a.trigger_type
                FROM processed_automation_events pae
                JOIN automations a ON pae.automation_id = a.id
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE ia.user_id = $1
            `;

            const params: any[] = [userId];
            let paramIndex = 2;

            // Add status filter if provided
            if (status) {
                query += ` AND pae.execution_status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            // Order by most recent first
            query += ` ORDER BY pae.processed_at DESC`;

            // Add pagination
            query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(parseInt(limit), parseInt(offset));

            // Execute query
            const executions = await db.query(query, params);

            // Get total count
            let countQuery = `
                SELECT COUNT(*) as total
                FROM processed_automation_events pae
                JOIN automations a ON pae.automation_id = a.id
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE ia.user_id = $1
            `;
            const countParams: any[] = [userId];

            if (status) {
                countQuery += ` AND pae.execution_status = $2`;
                countParams.push(status);
            }

            const countResult = await db.query(countQuery, countParams);
            const total = parseInt(countResult[0].total || '0');

            return reply.send({
                success: true,
                data: {
                    executions,
                    total,
                    hasMore: parseInt(offset) + executions.length < total
                }
            });

        } catch (error) {
            logger.error({ error, userId }, 'Error fetching executions');
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch executions'
            });
        }
    });

    // Get single execution details
    app.get<{
        Params: { id: string };
    }>('/executions/:id', {
        preHandler: [authMiddleware]
    }, async (request, reply) => {
        const userId = request.user!.userId;
        const { id } = request.params;

        try {
            const executions = await db.query(`
                SELECT 
                    pae.*,
                    a.name as automation_name,
                    a.trigger_type,
                    a.actions
                FROM processed_automation_events pae
                JOIN automations a ON pae.automation_id = a.id
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE pae.id = $1 AND ia.user_id = $2
            `, [id, userId]);

            if (executions.length === 0) {
                return reply.status(404).send({
                    success: false,
                    error: 'Execution not found'
                });
            }

            return reply.send({
                success: true,
                data: executions[0]
            });

        } catch (error) {
            logger.error({ error, userId, executionId: id }, 'Error fetching execution details');
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch execution details'
            });
        }
    });
}
