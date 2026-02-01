import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';
import { CommentProcessingJob } from '../types/index.js';
import { automationEngineService } from '../services/automation-engine.service.js';

/**
 * ------------------------------------------------------------------
 * BullMQ Redis Connection (DO NOT reuse app Redis client)
 * ------------------------------------------------------------------
 * BullMQ requires:
 * - maxRetriesPerRequest = null
 * - No shared connections with normal Redis usage
 */
const bullRedis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,

    // REQUIRED for BullMQ
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

/**
 * ------------------------------------------------------------------
 * Queue
 * ------------------------------------------------------------------
 */
export const commentQueue = new Queue<CommentProcessingJob>(
    'comment-processing',
    {
        connection: bullRedis,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: {
                count: 100,
            },
            removeOnFail: {
                count: 50,
            },
        },
    }
);

/**
 * ------------------------------------------------------------------
 * Worker
 * ------------------------------------------------------------------
 */
export const commentWorker = new Worker<CommentProcessingJob>(
    'comment-processing',
    async (job: Job<CommentProcessingJob>) => {
        const { comment } = job.data;

        logger.info(
            { jobId: job.id, commentId: comment.comment_id },
            'Processing job'
        );

        try {
            await automationEngineService.processComment(comment);

            logger.info(
                { jobId: job.id, commentId: comment.comment_id },
                'Job completed successfully'
            );
        } catch (error: any) {
            /**
             * CRITICAL FIX #3
             * Handle deleted automations / users gracefully
             */
            if (error?.code === '23503') {
                logger.warn(
                    {
                        jobId: job.id,
                        commentId: comment.comment_id,
                    },
                    'Automation or user deleted while job in queue, skipping'
                );

                // Do NOT retry
                return;
            }

            logger.error(
                { jobId: job.id, error },
                'Job failed'
            );

            // Allow BullMQ retry logic
            throw error;
        }
    },
    {
        connection: bullRedis,
        concurrency: 5,
    }
);

/**
 * ------------------------------------------------------------------
 * Worker Events
 * ------------------------------------------------------------------
 */
commentWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Worker completed job');
});

commentWorker.on('failed', (job, error) => {
    logger.error(
        { jobId: job?.id, error },
        'Worker failed job'
    );
});

/**
 * ------------------------------------------------------------------
 * Enqueue helper
 * ------------------------------------------------------------------
 */
export async function enqueueComment(
    comment: CommentProcessingJob
): Promise<void> {
    await commentQueue.add(
        'process-comment',
        comment,
        {
            // 🔐 Deduplication at queue level
            jobId: `comment-${comment.comment.comment_id}`,
        }
    );

    logger.info(
        { commentId: comment.comment.comment_id },
        'Enqueued comment for processing'
    );
}