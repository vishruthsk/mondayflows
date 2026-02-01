import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcrypt';

async function seed() {
    try {
        logger.info('Seeding database...');

        // Create a test user
        const hashedPassword = await bcrypt.hash('password123', 10);

        const users = await db.query(
            `INSERT INTO users (email, password_hash, telegram_chat_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email`,
            ['test@example.com', hashedPassword, 123456789]
        );

        const userId = users[0].id;
        logger.info({ userId, email: users[0].email }, 'Created test user');

        // Create a test Instagram account
        const igAccounts = await db.query(
            `INSERT INTO instagram_accounts (
        user_id, ig_business_account_id, username, access_token, automation_enabled
      ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ig_business_account_id) DO UPDATE SET username = EXCLUDED.username
       RETURNING id, username`,
            [userId, 'test_ig_business_123', 'test_instagram', 'test_access_token', true]
        );

        const igAccountId = igAccounts[0].id;
        logger.info({ igAccountId, username: igAccounts[0].username }, 'Created test Instagram account');

        // Create test automations
        const automation1 = await db.query(
            `INSERT INTO automations (
        user_id, instagram_account_id, name, enabled, priority, scope, 
        trigger_type, trigger_value, actions, stop_after_execution
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name`,
            [
                userId,
                igAccountId,
                'Welcome Flow - Keyword',
                true,
                10,
                'global',
                'keyword',
                'interested',
                JSON.stringify({
                    public_reply: {
                        enabled: true,
                        type: 'static',
                        text: 'Thanks for your interest! 🎉'
                    },
                    dm: {
                        enabled: true,
                        delay_seconds: 30,
                        message: 'Check out our exclusive offers!',
                        buttons: [
                            { title: 'Shop Now', url: 'https://example.com/shop' },
                            { title: 'Learn More', url: 'https://example.com/info' }
                        ]
                    }
                }),
                false
            ]
        );

        logger.info({ automationId: automation1[0].id }, 'Created automation: Welcome Flow - Keyword');

        const automation2 = await db.query(
            `INSERT INTO automations (
        user_id, instagram_account_id, name, enabled, priority, scope, 
        trigger_type, trigger_value, actions, stop_after_execution
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name`,
            [
                userId,
                igAccountId,
                'Purchase Intent - AI Reply',
                true,
                5,
                'global',
                'intent',
                'purchase_inquiry',
                JSON.stringify({
                    public_reply: {
                        enabled: true,
                        type: 'ai',
                        text: ''
                    }
                }),
                false
            ]
        );

        logger.info({ automationId: automation2[0].id }, 'Created automation: Purchase Intent - AI Reply');

        // Create rate limit config
        await db.query(
            `INSERT INTO rate_limit_config (user_id, max_dms_per_day, max_replies_per_hour)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET max_dms_per_day = EXCLUDED.max_dms_per_day`,
            [userId, 100, 30]
        );

        logger.info('Created rate limit config');

        // Create test discount codes
        await db.query(
            `INSERT INTO discount_codes (user_id, code, type, is_active)
       VALUES ($1, $2, $3, $4)`,
            [userId, 'WELCOME10', 'static', true]
        );

        logger.info('Created test discount code');

        logger.info('✅ Database seeding completed successfully!');
        logger.info('');
        logger.info('Test credentials:');
        logger.info('  Email: test@example.com');
        logger.info('  Password: password123');
        logger.info('  Telegram Chat ID: 123456789');
        logger.info('  Instagram Account: @test_instagram');

        process.exit(0);
    } catch (error) {
        logger.error({ error }, 'Seeding failed');
        process.exit(1);
    }
}

seed();
