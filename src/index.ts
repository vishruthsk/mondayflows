import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { registerRoutes } from './routes/index.js';
import { db } from './utils/database.js';
import { redis } from './utils/redis.js';
import { startWorkers } from './workers/start-workers.js';
import { telegramBotService } from './services/telegram-bot.service.js'; // Initialize Telegram bot

const app = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
    },
});

// Register CORS
await app.register(cors, {
    origin: config.frontend.url,
    credentials: true,
});

import { FastifyRequest } from 'fastify';

app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    async (
        request: FastifyRequest,
        body: Buffer
    ) => {
        // Preserve raw body for webhook signature verification
        request.rawBody = body.toString('utf8');

        // Handle empty body (for endpoints that don't require a body)
        if (!request.rawBody || request.rawBody.trim() === '') {
            return {};
        }

        // Return parsed JSON to Fastify
        return JSON.parse(request.rawBody);
    }
);

// Register routes
await registerRoutes(app);

// 🔥 START WORKERS HERE
startWorkers();

// Initialize Telegram bot (polling mode)
// We need to reference it to prevent tree-shaking
if (telegramBotService) {
    logger.info('Telegram bot service initialized (polling mode)');
} else {
    logger.error('Failed to initialize Telegram bot service');
}

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await app.close();
    await db.close();
    await redis.close();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
try {
    await app.listen({ port: config.server.port, host: '0.0.0.0' });
    logger.info(`Server listening on port ${config.server.port}`);
} catch (error) {
    logger.error({ error }, 'Error starting server');
    process.exit(1);
}