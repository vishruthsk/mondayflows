import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Database
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        name: process.env.DB_NAME || 'instagram_automation',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        url: process.env.DATABASE_URL,
    },

    // Redis
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    },

    // Server
    server: {
        port: parseInt(process.env.PORT || '3000'),
        nodeEnv: process.env.NODE_ENV || 'development',
        jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    },

    // Environment (Phase 2.3)
    environment: {
        isDev: process.env.NODE_ENV !== 'production',
        devMode: process.env.DEV_MODE === 'true', // Explicit dev simulation flag
    },

    // Instagram/Meta
    meta: {
        appId: process.env.META_APP_ID || '',
        appSecret: process.env.META_APP_SECRET || '',
        webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
        webhookSecret: process.env.META_WEBHOOK_SECRET || '',
        graphApiVersion: 'v18.0',
        graphApiBaseUrl: 'https://graph.facebook.com',
    },

    // Google Gemini
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-2.0-flash-exp',
    },

    // Telegram
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
        webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
    },

    // Rate Limits
    rateLimits: {
        defaultMaxDmsPerDay: parseInt(process.env.DEFAULT_MAX_DMS_PER_DAY || '100'),
        defaultMaxRepliesPerHour: parseInt(process.env.DEFAULT_MAX_REPLIES_PER_HOUR || '30'),
    },

    // Frontend
    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
    },

    // Email (Resend)
    email: {
        apiKey: process.env.RESEND_API_KEY || 'your-resend-api-key',
        from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
    },

    // Redis key prefixes
    redisKeys: {
        intent: 'intent',
        rateLimit: 'rate_limit',
    },

    // Intent classification cache TTL (1 hour)
    intentCacheTTL: 3600,

    // Phase 1 Feature Flags
    features: {
        enableDM: process.env.ENABLE_DM === 'true',
        enablePublicReply: process.env.ENABLE_PUBLIC_REPLY === 'true',
        enableDiscountCodes: process.env.ENABLE_DISCOUNT_CODES === 'true',
        enableIntentTriggers: process.env.ENABLE_INTENT_TRIGGERS === 'true',
        enableAIReplies: process.env.ENABLE_AI_REPLIES === 'true',

        // Limits
        maxAutomationsPerUser: parseInt(process.env.MAX_AUTOMATIONS_PER_USER || '5', 10),
    },
};
