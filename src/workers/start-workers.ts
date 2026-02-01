import { logger } from '../utils/logger.js';

export function startWorkers() {
    const workers = Number(process.env.WORKERS || 1);

    logger.info({ workers }, `Starting ${workers} BullMQ worker(s)`);

    // Workers are automatically started when comment-processor.job.ts is imported
    // This function just logs the configuration
}