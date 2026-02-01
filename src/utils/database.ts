import { Pool, PoolClient } from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class Database {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
            user: config.database.user,
            password: config.database.password,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err) => {
            logger.error({ err }, 'Unexpected database error');
        });
    }

    async query<T = any>(text: string, params?: any[]): Promise<T[]> {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug({ text, duration, rows: result.rowCount }, 'Executed query');
            return result.rows;
        } catch (error) {
            logger.error({ error, text, params }, 'Database query error');
            throw error;
        }
    }

    async getClient(): Promise<PoolClient> {
        return this.pool.connect();
    }

    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
        logger.info('Database pool closed');
    }
}

export const db = new Database();
