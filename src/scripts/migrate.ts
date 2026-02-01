import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    try {
        logger.info('Running database migrations...');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        await db.query(schema);

        logger.info('Database migrations completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error({ error }, 'Migration failed');
        process.exit(1);
    }
}

migrate();
