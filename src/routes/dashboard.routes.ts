import { FastifyInstance } from 'fastify';
import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export async function dashboardRoutes(app: FastifyInstance) {

    // Get dashboard statistics
    app.get('/dashboard/stats', {
        preHandler: [authMiddleware]
    }, async (request, reply) => {
        const userId = request.user!.userId;

        try {
            // Get total automations for user's Instagram accounts
            const totalAutomationsResult = await db.query(`
                SELECT COUNT(*) as count 
                FROM automations a
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE ia.user_id = $1
            `, [userId]);
            const totalAutomations = parseInt(totalAutomationsResult[0].count || '0');

            // Get active automations
            const activeAutomationsResult = await db.query(`
                SELECT COUNT(*) as count 
                FROM automations a
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE ia.user_id = $1 AND a.enabled = TRUE
            `, [userId]);
            const activeAutomations = parseInt(activeAutomationsResult[0].count || '0');

            // Get total executions
            const totalExecutionsResult = await db.query(`
                SELECT COUNT(*) as count 
                FROM processed_automation_events pae
                JOIN automations a ON pae.automation_id = a.id
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE ia.user_id = $1
            `, [userId]);
            const totalExecutions = parseInt(totalExecutionsResult[0].count || '0');

            // Calculate success rate
            const successfulExecutionsResult = await db.query(`
                SELECT COUNT(*) as count 
                FROM processed_automation_events pae
                JOIN automations a ON pae.automation_id = a.id
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE ia.user_id = $1 AND pae.execution_status = 'success'
            `, [userId]);
            const successfulExecutions = parseInt(successfulExecutionsResult[0].count || '0');
            const successRate = totalExecutions > 0
                ? Math.round((successfulExecutions / totalExecutions) * 100)
                : 0;

            // Get recent activity (last 10 executions)
            const recentActivity = await db.query(`
                SELECT 
                    pae.id,
                    pae.automation_id,
                    pae.execution_status as status,
                    pae.processed_at as executed_at,
                    pae.processed_at as completed_at,
                    a.name as automation_name,
                    a.trigger_type
                FROM processed_automation_events pae
                JOIN automations a ON pae.automation_id = a.id
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE ia.user_id = $1
                ORDER BY pae.processed_at DESC
                LIMIT 10
            `, [userId]);

            // Get executions by day (last 7 days)
            const executionsByDay = await db.query(`
                SELECT 
                    DATE(pae.processed_at) as date,
                    COUNT(*) as count
                FROM processed_automation_events pae
                JOIN automations a ON pae.automation_id = a.id
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE ia.user_id = $1
                AND pae.processed_at >= NOW() - INTERVAL '7 days'
                GROUP BY DATE(pae.processed_at)
                ORDER BY date ASC
            `, [userId]);

            // Get executions by status (for pie chart)
            const executionsByStatus = await db.query(`
                SELECT 
                    pae.execution_status as status,
                    COUNT(*) as count
                FROM processed_automation_events pae
                JOIN automations a ON pae.automation_id = a.id
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                WHERE ia.user_id = $1
                GROUP BY pae.execution_status
            `, [userId]);

            return reply.send({
                success: true,
                data: {
                    totalAutomations,
                    activeAutomations,
                    totalExecutions,
                    successRate,
                    recentActivity,
                    executionsByDay,
                    executionsByStatus
                }
            });

        } catch (error) {
            logger.error({ error, userId }, 'Error fetching dashboard stats');
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch dashboard statistics'
            });
        }
    });

    // Get automation performance (for detailed analytics)
    app.get('/dashboard/automation-performance', {
        preHandler: [authMiddleware]
    }, async (request, reply) => {
        const userId = request.user!.userId;

        try {
            const performance = await db.query(`
                SELECT 
                    a.id,
                    a.name,
                    a.trigger_type,
                    a.enabled,
                    COUNT(pae.id) as total_executions,
                    SUM(CASE WHEN pae.execution_status = 'success' THEN 1 ELSE 0 END) as successful_executions,
                    SUM(CASE WHEN pae.execution_status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
                    MAX(pae.processed_at) as last_execution
                FROM automations a
                JOIN instagram_accounts ia ON a.instagram_account_id = ia.id
                LEFT JOIN processed_automation_events pae ON a.id = pae.automation_id
                WHERE ia.user_id = $1
                GROUP BY a.id, a.name, a.trigger_type, a.enabled
                ORDER BY total_executions DESC
            `, [userId]);

            return reply.send({
                success: true,
                data: performance
            });

        } catch (error) {
            logger.error({ error, userId }, 'Error fetching automation performance');
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch automation performance'
            });
        }
    });
}
