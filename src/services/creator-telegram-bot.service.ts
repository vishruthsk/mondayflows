import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { db } from '../utils/database.js';
import { authService } from './auth.service.js';
import { validateCreateAutomation } from '../utils/validation.js';
import { User, Automation } from '../types/index.js';

/**
 * Enhanced Telegram Bot for Creator Onboarding
 * Phase 1: Signup, Instagram Connect, Create Automation
 */

interface UserSession {
    state: 'idle' | 'awaiting_email' | 'awaiting_password' | 'awaiting_automation_name' | 'awaiting_trigger' | 'awaiting_reply_text';
    email?: string;
    automationData?: Partial<{
        name: string;
        trigger_value: string;
        reply_text: string;
    }>;
}

export class CreatorTelegramBot {
    private bot: TelegramBot;
    private sessions: Map<number, UserSession> = new Map();

    constructor() {
        this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
        this.registerHandlers();
    }

    private registerHandlers() {
        // Start command
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const user = await this.getUserByChatId(chatId);

            if (user) {
                await this.bot.sendMessage(
                    chatId,
                    `👋 Welcome back, ${user.email}!\n\n` +
                    `Available commands:\n` +
                    `/status - View account status\n` +
                    `/connect - Connect Instagram account\n` +
                    `/create - Create new automation\n` +
                    `/list - List all automations\n` +
                    `/enable <id> - Enable automation\n` +
                    `/disable <id> - Disable automation\n` +
                    `/help - Show help`
                );
            } else {
                await this.bot.sendMessage(
                    chatId,
                    `🤖 Welcome to Monday Flows!\n\n` +
                    `I'll help you automate Instagram comment replies.\n\n` +
                    `To get started, create an account:\n` +
                    `/signup - Create new account\n` +
                    `/help - Show help`
                );
            }
        });

        // Signup command
        this.bot.onText(/\/signup/, async (msg) => {
            const chatId = msg.chat.id;
            const user = await this.getUserByChatId(chatId);

            if (user) {
                await this.bot.sendMessage(chatId, '✅ You already have an account!');
                return;
            }

            this.sessions.set(chatId, { state: 'awaiting_email' });
            await this.bot.sendMessage(
                chatId,
                '📧 Please enter your email address:'
            );
        });

        // Status command
        this.bot.onText(/\/status/, async (msg) => {
            const chatId = msg.chat.id;
            const user = await this.getUserByChatId(chatId);

            if (!user) {
                await this.bot.sendMessage(chatId, '❌ No account found. Use /signup to create one.');
                return;
            }

            const igAccount = await this.getInstagramAccount(user.id);
            const automationCount = await this.getAutomationCount(user.id);

            let message = `✅ Account Status\n\n`;
            message += `Email: ${user.email}\n`;
            message += `User ID: ${user.id}\n\n`;

            if (igAccount) {
                message += `Instagram: @${igAccount.username}\n`;
                message += `Automations: ${igAccount.automation_enabled ? '🟢 Enabled' : '🔴 Disabled'}\n`;
                message += `Token Expires: ${new Date(igAccount.token_expires_at).toLocaleDateString()}\n`;
                message += `Total Automations: ${automationCount}\n`;
            } else {
                message += `Instagram: ❌ Not connected\n`;
                message += `Use /connect to connect your Instagram account`;
            }

            await this.bot.sendMessage(chatId, message);
        });

        // Connect Instagram command
        this.bot.onText(/\/connect/, async (msg) => {
            const chatId = msg.chat.id;
            const user = await this.getUserByChatId(chatId);

            if (!user) {
                await this.bot.sendMessage(chatId, '❌ Please create an account first using /signup');
                return;
            }

            // Generate auth link (user needs to open in browser)
            const authUrl = `${config.server.baseUrl}/auth/instagram/start`;

            await this.bot.sendMessage(
                chatId,
                `🔗 Connect Instagram Account\n\n` +
                `1. Open this link in your browser:\n${authUrl}\n\n` +
                `2. You'll need to add this header:\n` +
                `Authorization: Bearer YOUR_TOKEN\n\n` +
                `⚠️ For security, I can't send your token here.\n` +
                `Please use the web dashboard or API to connect.\n\n` +
                `Alternative: Use our web dashboard at ${config.frontend.url}`
            );
        });

        // Create automation command
        this.bot.onText(/\/create/, async (msg) => {
            const chatId = msg.chat.id;
            const user = await this.getUserByChatId(chatId);

            if (!user) {
                await this.bot.sendMessage(chatId, '❌ Please create an account first using /signup');
                return;
            }

            const igAccount = await this.getInstagramAccount(user.id);
            if (!igAccount) {
                await this.bot.sendMessage(chatId, '❌ Please connect your Instagram account first using /connect');
                return;
            }

            // Check automation limit
            const count = await this.getAutomationCount(user.id);
            if (count >= config.features.maxAutomationsPerUser) {
                await this.bot.sendMessage(
                    chatId,
                    `❌ You've reached the maximum of ${config.features.maxAutomationsPerUser} automations.\n` +
                    `Please delete an existing automation first.`
                );
                return;
            }

            this.sessions.set(chatId, {
                state: 'awaiting_automation_name',
                automationData: {}
            });

            await this.bot.sendMessage(
                chatId,
                '🤖 Create New Automation\n\n' +
                'Step 1/3: Enter a name for your automation:'
            );
        });

        // List automations command
        this.bot.onText(/\/list/, async (msg) => {
            const chatId = msg.chat.id;
            const user = await this.getUserByChatId(chatId);

            if (!user) {
                await this.bot.sendMessage(chatId, '❌ No account found.');
                return;
            }

            const automations = await this.getAutomations(user.id);

            if (automations.length === 0) {
                await this.bot.sendMessage(
                    chatId,
                    '📋 No automations found.\n\nUse /create to create your first automation!'
                );
                return;
            }

            let message = '📋 Your Automations:\n\n';
            automations.forEach((auto, idx) => {
                const status = auto.enabled ? '🟢' : '🔴';
                const actions = auto.actions as any;
                message += `${idx + 1}. ${status} ${auto.name}\n`;
                message += `   ID: ${auto.id}\n`;
                message += `   Trigger: "${auto.trigger_value}"\n`;
                if (actions.public_reply?.enabled) {
                    message += `   Reply: "${actions.public_reply.text?.substring(0, 50)}..."\n`;
                }
                message += `\n`;
            });

            message += '\nUse /enable <id> or /disable <id> to toggle';

            await this.bot.sendMessage(chatId, message);
        });

        // Enable automation
        this.bot.onText(/\/enable (.+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const automationId = match?.[1];

            if (!automationId) {
                await this.bot.sendMessage(chatId, '❌ Usage: /enable <automation_id>');
                return;
            }

            const user = await this.getUserByChatId(chatId);
            if (!user) {
                await this.bot.sendMessage(chatId, '❌ No account found.');
                return;
            }

            const result = await db.query(
                'UPDATE automations SET enabled = true WHERE id = $1 AND user_id = $2 RETURNING id',
                [automationId, user.id]
            );

            if (result.length === 0) {
                await this.bot.sendMessage(chatId, '❌ Automation not found.');
                return;
            }

            await this.bot.sendMessage(chatId, '✅ Automation enabled!');
        });

        // Disable automation
        this.bot.onText(/\/disable (.+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const automationId = match?.[1];

            if (!automationId) {
                await this.bot.sendMessage(chatId, '❌ Usage: /disable <automation_id>');
                return;
            }

            const user = await this.getUserByChatId(chatId);
            if (!user) {
                await this.bot.sendMessage(chatId, '❌ No account found.');
                return;
            }

            const result = await db.query(
                'UPDATE automations SET enabled = false WHERE id = $1 AND user_id = $2 RETURNING id',
                [automationId, user.id]
            );

            if (result.length === 0) {
                await this.bot.sendMessage(chatId, '❌ Automation not found.');
                return;
            }

            await this.bot.sendMessage(chatId, '✅ Automation disabled!');
        });

        // Help command
        this.bot.onText(/\/help/, async (msg) => {
            const chatId = msg.chat.id;
            await this.bot.sendMessage(
                chatId,
                `📖 Monday Flows Bot - Help\n\n` +
                `**Getting Started:**\n` +
                `/signup - Create account\n` +
                `/connect - Connect Instagram\n\n` +
                `**Manage Automations:**\n` +
                `/create - Create automation\n` +
                `/list - List automations\n` +
                `/enable <id> - Enable automation\n` +
                `/disable <id> - Disable automation\n\n` +
                `**Account:**\n` +
                `/status - View status\n` +
                `/help - Show this message\n\n` +
                `**Phase 1 Features:**\n` +
                `✅ Keyword triggers\n` +
                `✅ Static replies\n` +
                `❌ DMs (coming soon)\n` +
                `❌ AI replies (coming soon)`
            );
        });

        // Handle text messages (for multi-step flows)
        this.bot.on('message', async (msg) => {
            // Skip if it's a command
            if (msg.text?.startsWith('/')) return;

            const chatId = msg.chat.id;
            const session = this.sessions.get(chatId);

            if (!session) return;

            await this.handleSessionMessage(chatId, msg.text || '', session);
        });

        logger.info('Creator Telegram bot handlers registered');
    }

    /**
     * Handle multi-step session messages
     */
    private async handleSessionMessage(chatId: number, text: string, session: UserSession) {
        try {
            switch (session.state) {
                case 'awaiting_email':
                    await this.handleEmailInput(chatId, text, session);
                    break;

                case 'awaiting_password':
                    await this.handlePasswordInput(chatId, text, session);
                    break;

                case 'awaiting_automation_name':
                    await this.handleAutomationName(chatId, text, session);
                    break;

                case 'awaiting_trigger':
                    await this.handleTriggerInput(chatId, text, session);
                    break;

                case 'awaiting_reply_text':
                    await this.handleReplyText(chatId, text, session);
                    break;
            }
        } catch (error: any) {
            logger.error({ error, chatId }, 'Error handling session message');
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            this.sessions.delete(chatId);
        }
    }

    private async handleEmailInput(chatId: number, email: string, session: UserSession) {
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            await this.bot.sendMessage(chatId, '❌ Invalid email format. Please try again:');
            return;
        }

        session.email = email;
        session.state = 'awaiting_password';
        this.sessions.set(chatId, session);

        await this.bot.sendMessage(
            chatId,
            '🔒 Please enter a password (minimum 8 characters):'
        );
    }

    private async handlePasswordInput(chatId: number, password: string, session: UserSession) {
        if (password.length < 8) {
            await this.bot.sendMessage(chatId, '❌ Password must be at least 8 characters. Please try again:');
            return;
        }

        if (!session.email) {
            await this.bot.sendMessage(chatId, '❌ Session expired. Please start over with /signup');
            this.sessions.delete(chatId);
            return;
        }

        // Create user
        const { user } = await authService.signup({
            email: session.email,
            password,
        });

        // Link Telegram chat ID
        await db.query(
            'UPDATE users SET telegram_chat_id = $1 WHERE id = $2',
            [chatId.toString(), user.id]
        );

        this.sessions.delete(chatId);

        await this.bot.sendMessage(
            chatId,
            `✅ Account created successfully!\n\n` +
            `Email: ${user.email}\n` +
            `User ID: ${user.id}\n\n` +
            `Next steps:\n` +
            `1. /connect - Connect your Instagram account\n` +
            `2. /create - Create your first automation`
        );
    }

    private async handleAutomationName(chatId: number, name: string, session: UserSession) {
        if (!session.automationData) {
            session.automationData = {};
        }

        session.automationData.name = name;
        session.state = 'awaiting_trigger';
        this.sessions.set(chatId, session);

        await this.bot.sendMessage(
            chatId,
            '🎯 Step 2/3: Enter the keyword to trigger this automation:\n\n' +
            'Example: "interested", "info", "price"\n' +
            'When someone comments with this keyword, your automation will reply.'
        );
    }

    private async handleTriggerInput(chatId: number, trigger: string, session: UserSession) {
        if (!session.automationData) {
            await this.bot.sendMessage(chatId, '❌ Session expired. Please start over with /create');
            this.sessions.delete(chatId);
            return;
        }

        session.automationData.trigger_value = trigger.toLowerCase();
        session.state = 'awaiting_reply_text';
        this.sessions.set(chatId, session);

        await this.bot.sendMessage(
            chatId,
            '💬 Step 3/3: Enter the reply text:\n\n' +
            'This message will be posted as a public reply when the keyword is detected.\n' +
            'Max 500 characters.'
        );
    }

    private async handleReplyText(chatId: number, replyText: string, session: UserSession) {
        const user = await this.getUserByChatId(chatId);
        if (!user) {
            await this.bot.sendMessage(chatId, '❌ User not found.');
            this.sessions.delete(chatId);
            return;
        }

        if (!session.automationData?.name || !session.automationData?.trigger_value) {
            await this.bot.sendMessage(chatId, '❌ Session expired. Please start over with /create');
            this.sessions.delete(chatId);
            return;
        }

        // Get Instagram account
        const igAccount = await this.getInstagramAccount(user.id);
        if (!igAccount) {
            await this.bot.sendMessage(chatId, '❌ No Instagram account connected.');
            this.sessions.delete(chatId);
            return;
        }

        // Create automation
        const automationInput = {
            name: session.automationData.name,
            enabled: true,
            priority: 0,
            scope: 'global' as const,
            trigger_type: 'keyword' as const,
            trigger_value: session.automationData.trigger_value,
            actions: {
                public_reply: {
                    enabled: true,
                    type: 'static' as const,
                    text: replyText,
                },
            },
            stop_after_execution: false,
        };

        // Validate
        const validation = validateCreateAutomation(automationInput);
        if (!validation.success) {
            const errors = validation.errors?.map(e => `${e.field}: ${e.message}`).join('\n');
            await this.bot.sendMessage(chatId, `❌ Validation failed:\n${errors}`);
            this.sessions.delete(chatId);
            return;
        }

        // Insert into database
        const result = await db.query<Automation>(
            `INSERT INTO automations 
             (user_id, instagram_account_id, name, enabled, priority, scope, trigger_type, trigger_value, actions, stop_after_execution)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                user.id,
                igAccount.id,
                automationInput.name,
                automationInput.enabled,
                automationInput.priority,
                automationInput.scope,
                automationInput.trigger_type,
                automationInput.trigger_value,
                JSON.stringify(automationInput.actions),
                automationInput.stop_after_execution,
            ]
        );

        const automation = result[0];
        this.sessions.delete(chatId);

        await this.bot.sendMessage(
            chatId,
            `✅ Automation created successfully!\n\n` +
            `Name: ${automation.name}\n` +
            `Trigger: "${automation.trigger_value}"\n` +
            `Reply: "${replyText.substring(0, 50)}..."\n` +
            `Status: 🟢 Enabled\n\n` +
            `ID: ${automation.id}\n\n` +
            `Your automation is now active! When someone comments with "${automation.trigger_value}", I'll reply automatically.`
        );
    }

    /**
     * Send alert to user
     */
    async sendAlert(userId: string, message: string): Promise<void> {
        try {
            const user = await this.getUser(userId);
            if (!user || !user.telegram_chat_id) {
                logger.warn({ userId }, 'Cannot send alert: no Telegram chat ID');
                return;
            }

            await this.bot.sendMessage(user.telegram_chat_id, `⚠️ ${message}`);
            logger.info({ userId }, 'Sent Telegram alert');
        } catch (error) {
            logger.error({ error, userId }, 'Error sending Telegram alert');
        }
    }

    // Helper methods
    private async getUserByChatId(chatId: number): Promise<User | null> {
        const rows = await db.query<User>(
            'SELECT * FROM users WHERE telegram_chat_id = $1 LIMIT 1',
            [chatId.toString()]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    private async getUser(userId: string): Promise<User | null> {
        const rows = await db.query<User>('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
        return rows.length > 0 ? rows[0] : null;
    }

    private async getInstagramAccount(userId: string): Promise<any> {
        const rows = await db.query('SELECT * FROM instagram_accounts WHERE user_id = $1 LIMIT 1', [
            userId,
        ]);
        return rows.length > 0 ? rows[0] : null;
    }

    private async getAutomationCount(userId: string): Promise<number> {
        const rows = await db.query<{ count: string }>(
            'SELECT COUNT(*) as count FROM automations WHERE user_id = $1',
            [userId]
        );
        return parseInt(rows[0]?.count || '0');
    }

    private async getAutomations(userId: string): Promise<Automation[]> {
        return await db.query<Automation>(
            'SELECT * FROM automations WHERE user_id = $1 ORDER BY priority DESC, created_at DESC',
            [userId]
        );
    }
}

// Export singleton instance
export const creatorTelegramBot = new CreatorTelegramBot();
