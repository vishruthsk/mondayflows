import { FastifyInstance } from 'fastify';
import { verifyWebhook, handleInstagramWebhook } from './webhooks.routes.js';
import { registerAutomationRoutes } from './automations.routes.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerInstagramOAuthRoutes } from './instagram-oauth.routes.js';
import { registerDevSimulationRoutes } from './dev-simulation.routes.js';
import { registerTelegramWebhookRoutes } from './telegram-webhook.routes.js';
import { registerObservabilityRoutes } from './observability.routes.js';

export async function registerRoutes(app: FastifyInstance) {
    // Instagram webhooks
    app.get('/webhooks/instagram/comments', verifyWebhook);
    app.post('/webhooks/instagram/comments', handleInstagramWebhook);

    // Telegram webhooks
    await registerTelegramWebhookRoutes(app);

    // Auth routes
    await registerAuthRoutes(app);

    // Instagram OAuth routes
    await registerInstagramOAuthRoutes(app);

    // Automation routes (protected)
    await registerAutomationRoutes(app);

    // Executions routes (protected) - Phase 2B
    const { executionsRoutes } = await import('./executions.routes.js');
    await executionsRoutes(app);

    // Dashboard routes (protected) - Phase 2B
    const { dashboardRoutes } = await import('./dashboard.routes.js');
    await dashboardRoutes(app);

    // Discount code routes (protected) - Phase 2.1
    const { registerDiscountCodeRoutes } = await import('./discount-codes.routes.js');
    await registerDiscountCodeRoutes(app);

    // Observability routes (protected)
    await registerObservabilityRoutes(app);

    // Dev simulation routes (dev-only)
    await registerDevSimulationRoutes(app);

    // Health check
    app.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
}

