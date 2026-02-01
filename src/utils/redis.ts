import { Redis as IORedis } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class RedisClient {
    public client: IORedis;

    constructor() {
        this.client = new IORedis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            tls: config.redis.host.includes('upstash') ? {} : undefined, // Enable TLS for Upstash
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.client.on('connect', () => {
            logger.info('Redis connected');
        });

        this.client.on('error', (err: Error) => {
            logger.error({ err }, 'Redis error');
        });
    }

    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            logger.error({ error, key }, 'Redis GET error');
            throw error;
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        try {
            if (ttl) {
                await this.client.setex(key, ttl, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (error) {
            logger.error({ error, key }, 'Redis SET error');
            throw error;
        }
    }

    async setNX(key: string, value: string, ttl: number): Promise<boolean> {
        try {
            const result = await this.client.set(key, value, 'EX', ttl, 'NX');
            return result === 'OK';
        } catch (error) {
            logger.error({ error, key }, 'Redis SETNX error');
            throw error;
        }
    }

    async incr(key: string): Promise<number> {
        try {
            return await this.client.incr(key);
        } catch (error) {
            logger.error({ error, key }, 'Redis INCR error');
            throw error;
        }
    }

    async expire(key: string, seconds: number): Promise<void> {
        try {
            await this.client.expire(key, seconds);
        } catch (error) {
            logger.error({ error, key }, 'Redis EXPIRE error');
            throw error;
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error({ error, key }, 'Redis DEL error');
            throw error;
        }
    }

    async close(): Promise<void> {
        await this.client.quit();
        logger.info('Redis connection closed');
    }
}

export const redis = new RedisClient();
