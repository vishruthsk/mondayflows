import { redis } from '../utils/redis.js';
import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { RateLimitType, RateLimitConfig } from '../types/index.js';
import { config } from '../config/index.js';

export class RateLimiterService {
    /**
     * Check if action is allowed under rate limits
     */
    async checkLimit(userId: string, limitType: RateLimitType): Promise<boolean> {
        const counterKey = this.buildCounterKey(userId, limitType);
        const redisKey = `${config.redisKeys.rateLimit}:${counterKey}`;

        // Get current count
        const currentCount = await redis.get(redisKey);
        const count = currentCount ? parseInt(currentCount) : 0;

        // Get user's rate limit config
        const limitConfig = await this.getRateLimitConfig(userId);
        const maxLimit = this.getMaxLimit(limitType, limitConfig);

        logger.debug({ userId, limitType, count, maxLimit }, 'Checking rate limit');

        return count < maxLimit;
    }

    /**
     * Increment rate limit counter
     */
    async incrementCounter(userId: string, limitType: RateLimitType): Promise<void> {
        const counterKey = this.buildCounterKey(userId, limitType);
        const redisKey = `${config.redisKeys.rateLimit}:${counterKey}`;

        const count = await redis.incr(redisKey);

        // Set TTL on first increment
        if (count === 1) {
            const ttl = this.getTTL(limitType);
            await redis.expire(redisKey, ttl);
        }

        logger.debug({ userId, limitType, count }, 'Incremented rate limit counter');
    }

    /**
     * Get rate limit configuration for user
     */
    private async getRateLimitConfig(userId: string): Promise<RateLimitConfig> {
        const rows = await db.query<RateLimitConfig>(
            'SELECT * FROM rate_limit_config WHERE user_id = $1',
            [userId]
        );

        if (rows.length > 0) {
            return rows[0];
        }

        // Return defaults if no config exists
        return {
            id: '',
            user_id: userId,
            max_dms_per_day: config.rateLimits.defaultMaxDmsPerDay,
            max_replies_per_hour: config.rateLimits.defaultMaxRepliesPerHour,
            created_at: new Date(),
            updated_at: new Date(),
        };
    }

    /**
     * Build counter key for Redis
     */
    private buildCounterKey(userId: string, limitType: RateLimitType): string {
        const now = new Date();

        if (limitType === 'dm_daily') {
            const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
            return `user:${userId}:dm:daily:${date}`;
        } else if (limitType === 'reply_hourly') {
            const dateHour = `${now.toISOString().split('T')[0]}-${now.getHours()}`; // YYYY-MM-DD-HH
            return `user:${userId}:reply:hourly:${dateHour}`;
        }

        throw new Error(`Unknown limit type: ${limitType}`);
    }

    /**
     * Get TTL for counter based on limit type
     */
    private getTTL(limitType: RateLimitType): number {
        if (limitType === 'dm_daily') {
            return 86400; // 24 hours
        } else if (limitType === 'reply_hourly') {
            return 3600; // 1 hour
        }
        return 3600;
    }

    /**
     * Get max limit based on type and config
     */
    private getMaxLimit(limitType: RateLimitType, config: RateLimitConfig): number {
        if (limitType === 'dm_daily') {
            return config.max_dms_per_day;
        } else if (limitType === 'reply_hourly') {
            return config.max_replies_per_hour;
        }
        return 100;
    }

    /**
     * Reset rate limit counter (manual override)
     */
    async resetCounter(userId: string, limitType: RateLimitType): Promise<void> {
        const counterKey = this.buildCounterKey(userId, limitType);
        const redisKey = `${config.redisKeys.rateLimit}:${counterKey}`;
        await redis.del(redisKey);
        logger.info({ userId, limitType }, 'Reset rate limit counter');
    }
}

export const rateLimiterService = new RateLimiterService();
