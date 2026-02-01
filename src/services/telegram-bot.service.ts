import TelegramBot, { InlineKeyboardMarkup } from 'node-telegram-bot-api';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { db } from '../utils/database.js';
import { User, Automation, ExecutionStatus } from '../types/index.js';

import { executionFormatterService } from './execution-formatter.service.js';
import { tierCheckService } from './tier-check.service.js';

console.log('[TELEGRAM BOT MODULE] Loading telegram-bot.service.ts...');

/**
 * Telegram Bot Service (Phase 3.0 - Inline Button UX)
 * 
 * Provides creator-friendly interface with zero commands to memorize
 */
export class TelegramBotService {
    private bot: TelegramBot;

    constructor() {
        try {
            console.log('[TELEGRAM BOT] Initializing with polling...');
            logger.info('Initializing Telegram bot with polling...');
            this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
            this.registerHandlers();
            console.log('[TELEGRAM BOT] Initialized successfully');
            logger.info('Telegram bot initialized successfully');
        } catch (error) {
            console.error('[TELEGRAM BOT] Failed to initialize:', error);
            logger.error({ error }, 'Failed to initialize Telegram bot');
            throw error;
        }
    }

    private registerHandlers() {
        // Start command - show main menu
        this.bot.onText(/\/start|\/menu/, async (msg) => {
            const chatId = msg.chat.id;
            const user = await this.getUserByChatId(chatId);

            if (!user) {
                await this.bot.sendMessage(
                    chatId,
                    `🤖 Welcome to Monday Flows!

I help you automatically respond to Instagram comments with:
• Instant replies
• Discount codes
• Direct messages

Let's get started!`,
                    { reply_markup: this.buildWelcomeMenu() }
                );
                return;
            }

            await this.showMainMenu(chatId);
        });

        // Callback query handler for inline buttons
        this.bot.on('callback_query', async (query) => {
            try {
                const chatId = query.message?.chat.id;
                if (!chatId) return;

                const data = query.data || '';
                const [action, ...params] = data.split(':');

                // Answer callback query to remove loading state
                await this.bot.answerCallbackQuery(query.id);

                // Route to appropriate handler
                switch (action) {
                    case 'menu':
                        await this.handleMenuAction(chatId, params);
                        break;
                    case 'automation':
                        await this.handleAutomationAction(chatId, params);
                        break;
                    case 'activity':
                        await this.handleActivityAction(chatId, params);
                        break;
                    case 'settings':
                        await this.handleSettingsAction(chatId, params);
                        break;
                    case 'help':
                        await this.handleHelpAction(chatId, params);
                        break;
                    case 'upgrade':
                        await this.handleUpgradeAction(chatId, params);
                        break;
                }
            } catch (error) {
                logger.error({ error }, 'Error handling callback query');
            }
        });

        // Help command
        this.bot.onText(/\/help/, async (msg) => {
            const chatId = msg.chat.id;
            await this.showHelpMenu(chatId);
        });

        logger.info('Telegram bot handlers registered (Phase 3.0 - Inline Buttons)');
    }

    /**
     * Show main menu
     */
    private async showMainMenu(chatId: number): Promise<void> {
        const user = await this.getUserByChatId(chatId);
        if (!user) {
            await this.bot.sendMessage(chatId, '❌ No account connected.');
            return;
        }

        const igAccount = await this.getInstagramAccount(user.id);
        const automationCount = await this.getAutomationCount(user.id);
        const tierCheck = await tierCheckService.canCreateAutomation(user.id);

        const statusEmoji = igAccount?.automation_enabled ? '🟢' : '🔴';
        const message = `🤖 Monday Flows

Instagram: @${igAccount?.username || 'Unknown'}
Status: ${statusEmoji} ${igAccount?.automation_enabled ? 'Enabled' : 'Disabled'}
Automations: ${automationCount}/${tierCheck.maxAllowed}`;

        await this.bot.sendMessage(chatId, message, {
            reply_markup: this.buildMainMenu(),
        });
    }

    /**
     * Build main menu keyboard
     */
    private buildMainMenu(): InlineKeyboardMarkup {
        return {
            inline_keyboard: [
                [
                    { text: '📋 My Automations', callback_data: 'menu:automations' },
                    { text: '📊 Recent Activity', callback_data: 'menu:activity' },
                ],
                [
                    { text: '⚙️ Settings', callback_data: 'menu:settings' },
                    { text: '💎 Upgrade', callback_data: 'menu:upgrade' },
                ],
                [{ text: '❓ Help', callback_data: 'menu:help' }],
            ],
        };
    }

    /**
     * Build welcome menu (for new users)
     */
    private buildWelcomeMenu(): InlineKeyboardMarkup {
        return {
            inline_keyboard: [[{ text: '❓ Help', callback_data: 'menu:help' }]],
        };
    }

    /**
     * Handle menu actions
     */
    private async handleMenuAction(chatId: number, params: string[]): Promise<void> {
        const submenu = params[0];

        switch (submenu) {
            case 'main':
                await this.showMainMenu(chatId);
                break;
            case 'automations':
                await this.showAutomationsList(chatId);
                break;
            case 'activity':
                await this.showRecentActivity(chatId);
                break;
            case 'settings':
                await this.showSettings(chatId);
                break;
            case 'help':
                await this.showHelpMenu(chatId);
                break;
            case 'upgrade':
                await this.showUpgradeInfo(chatId);
                break;
        }
    }

    /**
     * Show automations list
     */
    private async showAutomationsList(chatId: number): Promise<void> {
        const user = await this.getUserByChatId(chatId);
        if (!user) return;

        const automations = await this.getAutomations(user.id);
        const tierCheck = await tierCheckService.canCreateAutomation(user.id);

        if (automations.length === 0) {
            await this.bot.sendMessage(
                chatId,
                '📋 No automations found.\n\nCreate your first automation to get started!',
                {
                    reply_markup: {
                        inline_keyboard: [[{ text: '« Back to Menu', callback_data: 'menu:main' }]],
                    },
                }
            );
            return;
        }

        let message = `📋 Your Automations (${tierCheck.currentCount}/${tierCheck.maxAllowed} used)\n\n`;

        const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

        automations.forEach((auto, idx) => {
            const statusIcon = auto.enabled ? '🟢' : '🔴';
            const toggleText = auto.enabled ? '🔴 Disable' : '🟢 Enable';

            message += `${idx + 1}. ${statusIcon} ${auto.name}\n`;
            message += `   Trigger: ${auto.trigger_type} - "${auto.trigger_value}"\n`;
            message += `   Actions: ${this.getActionSummary(auto.actions)}\n\n`;

            keyboard.push([
                { text: 'View Details', callback_data: `automation:details:${auto.id}` },
                { text: toggleText, callback_data: `automation:toggle:${auto.id}` },
            ]);
        });

        keyboard.push([{ text: '« Back to Menu', callback_data: 'menu:main' }]);

        await this.bot.sendMessage(chatId, message, {
            reply_markup: { inline_keyboard: keyboard },
        });
    }

    /**
     * Get action summary for automation
     */
    private getActionSummary(actions: Record<string, any>): string {
        const parts: string[] = [];
        if (actions.public_reply?.enabled) parts.push('Reply');
        if (actions.dm?.enabled) parts.push('DM');
        if (actions.discount_code?.enabled) parts.push('Code');
        return parts.length > 0 ? parts.join(' + ') : 'None';
    }

    /**
     * Handle automation actions
     */
    private async handleAutomationAction(
        chatId: number,
        params: string[]
    ): Promise<void> {
        const [subaction, automationId] = params;

        switch (subaction) {
            case 'toggle':
                await this.toggleAutomation(chatId, automationId);
                break;
            case 'details':
                await this.showAutomationDetails(chatId, automationId);
                break;
        }
    }

    /**
     * Toggle automation enabled/disabled
     */
    private async toggleAutomation(
        chatId: number,
        automationId: string
    ): Promise<void> {
        const user = await this.getUserByChatId(chatId);
        if (!user) return;

        // Get current state
        const automation = await this.getAutomation(automationId, user.id);
        if (!automation) {
            await this.bot.sendMessage(chatId, '❌ Automation not found.');
            return;
        }

        // Toggle
        const newState = !automation.enabled;
        await db.query('UPDATE automations SET enabled = $1 WHERE id = $2 AND user_id = $3', [
            newState,
            automationId,
            user.id,
        ]);

        // Refresh the list
        await this.showAutomationsList(chatId);
    }

    /**
     * Show automation details
     */
    private async showAutomationDetails(chatId: number, automationId: string): Promise<void> {
        const user = await this.getUserByChatId(chatId);
        if (!user) return;

        const automation = await this.getAutomation(automationId, user.id);
        if (!automation) {
            await this.bot.sendMessage(chatId, '❌ Automation not found.');
            return;
        }

        const statusIcon = automation.enabled ? '🟢' : '🔴';
        const toggleText = automation.enabled ? '🔴 Disable' : '🟢 Enable';

        let message = `${statusIcon} ${automation.name}\n\n`;
        message += `📍 Trigger\n`;
        message += `  ${automation.trigger_type}: "${automation.trigger_value}"\n`;
        message += `  Scope: ${automation.scope || 'All posts'}\n\n`;

        message += `⚡ Actions\n`;
        const actions = automation.actions;
        if (actions.public_reply?.enabled) {
            message += `  ✅ Public Reply: "${actions.public_reply.text?.substring(0, 50) || 'AI-generated'}..."\n`;
        }
        if (actions.dm?.enabled) {
            const dmText = (actions.dm as any).text || (actions.dm as any).message || 'Configured';
            message += `  ✅ DM: "${dmText.substring(0, 50)}..."
`;
        }
        if (actions.discount_code?.enabled) {
            message += `  ✅ Discount Code: Pool configured\n`;
        }

        await this.bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: toggleText, callback_data: `automation:toggle:${automation.id}` }],
                    [{ text: '« Back to List', callback_data: 'menu:automations' }],
                ],
            },
        });
    }

    /**
     * Show recent activity
     */
    private async showRecentActivity(chatId: number): Promise<void> {
        const user = await this.getUserByChatId(chatId);
        if (!user) return;

        const executions = await this.getRecentExecutions(user.id, 10);

        if (executions.length === 0) {
            await this.bot.sendMessage(chatId, '📊 No recent activity found.', {
                reply_markup: {
                    inline_keyboard: [[{ text: '« Back to Menu', callback_data: 'menu:main' }]],
                },
            });
            return;
        }

        let message = '📊 Recent Activity\n\n';

        const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

        executions.forEach((exec) => {
            const formatted = executionFormatterService.formatExecution({
                execution_status: exec.execution_status as ExecutionStatus,
                actions_executed: exec.actions_executed,
                error_message: exec.error_message,
                processed_at: new Date(exec.processed_at),
                commenter_username: exec.commenter_username,
                comment_text: exec.comment_text,
            });

            message += `${formatted.icon} ${formatted.timestamp}\n`;
            message += `   @${exec.commenter_username} commented "${exec.comment_text.substring(0, 30)}..."\n`;
            message += `   → ${formatted.summary}\n\n`;

            keyboard.push([
                { text: `View Details`, callback_data: `activity:details:${exec.comment_id}:${exec.automation_id}` },
            ]);
        });

        keyboard.push([{ text: '« Back to Menu', callback_data: 'menu:main' }]);

        await this.bot.sendMessage(chatId, message, {
            reply_markup: { inline_keyboard: keyboard },
        });
    }

    /**
     * Handle activity actions
     */
    private async handleActivityAction(
        chatId: number,
        params: string[]
    ): Promise<void> {
        const [subaction, commentId, automationId] = params;

        if (subaction === 'details') {
            await this.showExecutionDetails(chatId, commentId, automationId);
        }
    }

    /**
     * Show execution details
     */
    private async showExecutionDetails(
        chatId: number,
        commentId: string,
        automationId: string
    ): Promise<void> {
        const user = await this.getUserByChatId(chatId);
        if (!user) return;

        const execution = await this.getExecution(commentId, automationId);
        if (!execution) {
            await this.bot.sendMessage(chatId, '❌ Execution not found.');
            return;
        }

        const formatted = executionFormatterService.formatExecution({
            execution_status: execution.execution_status as ExecutionStatus,
            actions_executed: execution.actions_executed,
            error_message: execution.error_message,
            processed_at: new Date(execution.processed_at),
            commenter_username: execution.commenter_username,
            comment_text: execution.comment_text,
        });

        const automation = await this.getAutomation(automationId, user.id);

        let message = `${formatted.icon} Execution Details\n\n`;
        message += `@${execution.commenter_username} commented "${execution.comment_text}"\n`;
        message += `${formatted.timestamp}\n\n`;
        message += `Automation: ${automation?.name || 'Unknown'}\n\n`;
        message += formatted.details;

        await this.bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [[{ text: '« Back', callback_data: 'menu:activity' }]],
            },
        });
    }

    /**
     * Show settings
     */
    private async showSettings(chatId: number): Promise<void> {
        const user = await this.getUserByChatId(chatId);
        if (!user) return;

        const igAccount = await this.getInstagramAccount(user.id);
        const limits = await this.getRateLimits(user.id);

        const statusEmoji = igAccount?.automation_enabled ? '🟢' : '🔴';
        const toggleText = igAccount?.automation_enabled ? '🔴 Pause All' : '🟢 Resume All';

        let message = `⚙️ Settings\n\n`;
        message += `⚡ Automation Status\n`;
        message += `  ${statusEmoji} ${igAccount?.automation_enabled ? 'All automations enabled' : 'All automations paused'}\n\n`;
        message += `📊 Rate Limits\n`;
        message += `  DMs: ${limits.max_dms_per_day}/day\n`;
        message += `  Replies: ${limits.max_replies_per_hour}/hour\n`;

        await this.bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: toggleText, callback_data: 'settings:toggle_all' }],
                    [{ text: '« Back to Menu', callback_data: 'menu:main' }],
                ],
            },
        });
    }

    /**
     * Handle settings actions
     */
    private async handleSettingsAction(
        chatId: number,
        params: string[]
    ): Promise<void> {
        const [subaction] = params;

        if (subaction === 'toggle_all') {
            await this.toggleAllAutomations(chatId);
        }
    }

    /**
     * Toggle all automations
     */
    private async toggleAllAutomations(chatId: number): Promise<void> {
        const user = await this.getUserByChatId(chatId);
        if (!user) return;

        const igAccount = await this.getInstagramAccount(user.id);
        if (!igAccount) return;

        const newState = !igAccount.automation_enabled;
        await db.query('UPDATE instagram_accounts SET automation_enabled = $1 WHERE user_id = $2', [
            newState,
            user.id,
        ]);

        await this.showSettings(chatId);
    }

    /**
     * Show help menu
     */
    private async showHelpMenu(chatId: number): Promise<void> {
        const message = `❓ Help

Choose a topic to learn more:`;

        await this.bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💬 DM Limitations', callback_data: 'help:dm_limitations' }],
                    [{ text: '🎁 Discount Codes', callback_data: 'help:discount_codes' }],
                    [{ text: '🧪 Dev Mode', callback_data: 'help:dev_mode' }],
                    [{ text: '« Back to Menu', callback_data: 'menu:main' }],
                ],
            },
        });
    }

    /**
     * Handle help actions
     */
    private async handleHelpAction(
        chatId: number,
        params: string[]
    ): Promise<void> {
        const [topic] = params;

        const helpContent: Record<string, string> = {
            dm_limitations: `💬 DM Limitations

⚠️ Instagram only allows DMs to followers

What this means:
• If someone comments but doesn't follow you, the DM will be skipped
• Public replies and discount codes still work
• This is an Instagram rule, not a bug

💡 Tip: Encourage followers in your posts!`,
            discount_codes: `🎁 Discount Codes

How it works:
1. Upload a pool of codes
2. Automation assigns codes automatically
3. Each code used once (or fallback message)

What happens when codes run out?
• Fallback message is sent instead
• Example: "Sorry, all codes claimed!"
• You'll get a notification`,
            dev_mode: `🧪 Dev Mode

Currently: ${config.environment.devMode ? '🟢 Active' : '🔴 Inactive'}

What this means:
• Automations run normally
• BUT replies and DMs are simulated
• Nothing is actually sent to Instagram
• Perfect for testing

💡 Turn off dev mode in production!`,
        };

        const content = helpContent[topic] || 'Help topic not found.';

        await this.bot.sendMessage(chatId, content, {
            reply_markup: {
                inline_keyboard: [[{ text: '« Back to Help', callback_data: 'menu:help' }]],
            },
        });
    }

    /**
     * Show upgrade info
     */
    private async showUpgradeInfo(chatId: number): Promise<void> {
        const user = await this.getUserByChatId(chatId);
        if (!user) return;

        const message = tierCheckService.getUpgradeMessage('automation_limit', user.tier);

        await this.bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💎 View Pricing', url: 'https://example.com/pricing' }],
                    [{ text: '« Back to Menu', callback_data: 'menu:main' }],
                ],
            },
        });
    }

    /**
     * Handle upgrade actions
     */
    private async handleUpgradeAction(chatId: number, _params: string[]): Promise<void> {
        await this.showUpgradeInfo(chatId);
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
        const rows = await db.query<User>('SELECT * FROM users WHERE telegram_chat_id = $1 LIMIT 1', [
            chatId,
        ]);
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
            'SELECT * FROM automations WHERE user_id = $1 ORDER BY priority DESC',
            [userId]
        );
    }

    private async getAutomation(automationId: string, userId: string): Promise<Automation | null> {
        const rows = await db.query<Automation>(
            'SELECT * FROM automations WHERE id = $1 AND user_id = $2 LIMIT 1',
            [automationId, userId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    private async getRateLimits(userId: string): Promise<any> {
        const rows = await db.query('SELECT * FROM rate_limit_config WHERE user_id = $1 LIMIT 1', [
            userId,
        ]);

        if (rows.length > 0) {
            return rows[0];
        }

        return {
            max_dms_per_day: config.rateLimits.defaultMaxDmsPerDay,
            max_replies_per_hour: config.rateLimits.defaultMaxRepliesPerHour,
        };
    }

    private async getRecentExecutions(userId: string, limit: number): Promise<any[]> {
        return await db.query(
            `SELECT pae.*, a.name as automation_name
       FROM processed_automation_events pae
       JOIN automations a ON pae.automation_id = a.id
       WHERE pae.user_id = $1 
       ORDER BY pae.processed_at DESC 
       LIMIT $2`,
            [userId, limit]
        );
    }

    private async getExecution(commentId: string, automationId: string): Promise<any> {
        const rows = await db.query(
            `SELECT * FROM processed_automation_events 
       WHERE comment_id = $1 AND automation_id = $2 
       LIMIT 1`,
            [commentId, automationId]
        );
        return rows.length > 0 ? rows[0] : null;
    }
}

// Export singleton instance
console.log('[TELEGRAM BOT MODULE] Creating singleton instance...');
export const telegramBotService = new TelegramBotService();
console.log('[TELEGRAM BOT MODULE] Singleton instance created');
