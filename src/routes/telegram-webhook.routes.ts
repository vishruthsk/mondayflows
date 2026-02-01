import { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { db } from '../utils/database.js';
import { Automation } from '../types/index.js';

/**
 * Telegram Webhook Handler - Phase 2.0
 * Numbered automation lists and index-based commands
 */

interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from: {
            id: number;
            first_name: string;
            username?: string;
        };
        chat: {
            id: number;
            type: string;
        };
        text?: string;
        date: number;
    };
}

interface TelegramWebhookBody {
    update_id: number;
    message?: TelegramUpdate['message'];
}

// Phase 2.0: Session storage for automation list mapping
// Maps chatId to array of automation IDs
const automationListCache = new Map<number, string[]>();

export async function registerTelegramWebhookRoutes(app: FastifyInstance) {
    /**
     * POST /webhooks/telegram
     * Receive webhook updates from Telegram
     */
    app.post<{ Body: TelegramWebhookBody }>(
        '/webhooks/telegram',
        async (request, reply) => {
            try {
                // Verify request is from Telegram
                const secretToken = request.headers['x-telegram-bot-api-secret-token'];
                const expectedToken = config.telegram.webhookSecret;

                if (expectedToken && secretToken !== expectedToken) {
                    logger.warn('Invalid Telegram webhook secret token');
                    return reply.status(403).send({ error: 'Forbidden' });
                }

                const update = request.body;

                if (!update.message || !update.message.text) {
                    // Ignore non-text messages
                    return reply.status(200).send({ ok: true });
                }

                const chatId = update.message.chat.id;
                const text = update.message.text;

                logger.info(
                    { chatId, text },
                    'Telegram webhook received'
                );

                // Process command
                await handleTelegramCommand(chatId, text);

                return reply.status(200).send({ ok: true });
            } catch (error: any) {
                logger.error({ error }, 'Error processing Telegram webhook');
                return reply.status(500).send({ error: 'Internal server error' });
            }
        }
    );

    logger.info('Telegram webhook routes registered');
}

/**
 * Handle Telegram commands - Phase 2.0
 */
async function handleTelegramCommand(chatId: number, text: string): Promise<void> {
    const parts = text.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
        case '/start':
            await handleStartCommand(chatId);
            break;

        case '/status':
            await handleStatusCommand(chatId);
            break;

        case '/automations':
        case '/list':
            await handleAutomationsCommand(chatId);
            break;

        case '/toggle':
            if (args.length > 0) {
                await handleToggleCommand(chatId, args[0]);
            } else {
                await sendTelegramMessage(chatId, '❌ Usage: /toggle <number>');
            }
            break;

        case '/view':
            if (args.length > 0) {
                await handleViewCommand(chatId, args[0]);
            } else {
                await sendTelegramMessage(chatId, '❌ Usage: /view <number>');
            }
            break;

        case '/help':
            await handleHelpCommand(chatId);
            break;

        default:
            // Unknown command, ignore
            break;
    }
}

/**
 * Command handlers - Phase 2.0
 */

async function handleStartCommand(chatId: number): Promise<void> {
    const user = await getUserByChatId(chatId);

    if (user) {
        await sendTelegramMessage(
            chatId,
            `👋 Welcome back!\\n\\n` +
            `Your account is linked.\\n\\n` +
            `Available commands:\\n` +
            `/status - View account status\\n` +
            `/automations - List automations\\n` +
            `/toggle <number> - Enable/disable automation\\n` +
            `/view <number> - View details\\n` +
            `/help - Show help`
        );
    } else {
        await sendTelegramMessage(
            chatId,
            `🤖 Welcome to Monday Flows!\\n\\n` +
            `To link your account:\\n` +
            `1. Create an account via API\\n` +
            `2. Update your user record with this chat ID: ${chatId}\\n\\n` +
            `Contact support for assistance.`
        );
    }
}

async function handleStatusCommand(chatId: number): Promise<void> {
    const user = await getUserByChatId(chatId);

    if (!user) {
        await sendTelegramMessage(chatId, '❌ Account not linked. Use /start for instructions.');
        return;
    }

    const igAccount = await getInstagramAccount(user.id);
    const automationCount = await getAutomationCount(user.id);
    const enabledCount = await getEnabledAutomationCount(user.id);

    let message = `✅ Account Status\\n\\n`;
    message += `Email: ${user.email}\\n`;
    message += `Tier: ${user.tier || 'free'}\\n\\n`;

    if (igAccount) {
        message += `Instagram: @${igAccount.username}\\n`;
        message += `Automations: ${igAccount.automation_enabled ? '🟢 Enabled' : '🔴 Disabled'}\\n`;
        message += `Total: ${automationCount} (${enabledCount} enabled)\\n\\n`;

        // Check token expiry
        if (igAccount.token_expires_at) {
            const expiresAt = new Date(igAccount.token_expires_at);
            const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 7) {
                message += `⚠️ Token expires in ${daysUntilExpiry} days!\\n`;
                message += `Please reconnect your Instagram account.\\n`;
            } else {
                message += `Token expires: ${expiresAt.toLocaleDateString()}\\n`;
            }
        }
    } else {
        message += `Instagram: ❌ Not connected\\n`;
        message += `Please connect via web dashboard.\\n`;
    }

    await sendTelegramMessage(chatId, message);
}

async function handleAutomationsCommand(chatId: number): Promise<void> {
    const user = await getUserByChatId(chatId);

    if (!user) {
        await sendTelegramMessage(chatId, '❌ Account not linked.');
        return;
    }

    const automations = await getAutomations(user.id);

    if (automations.length === 0) {
        await sendTelegramMessage(
            chatId,
            '📋 No automations found.\\n\\nCreate one via API or web dashboard.'
        );
        return;
    }

    // Phase 2.0: Cache automation IDs for numbered access
    const automationIds = automations.map(a => a.id);
    automationListCache.set(chatId, automationIds);

    // Phase 2.0: Build numbered list
    let message = `📋 Your Automations (${automations.length} total)\\n\\n`;

    automations.forEach((auto, idx) => {
        const status = auto.enabled ? '🟢' : '🔴';
        const scopeIcon = auto.scope === 'post' ? '📍' : '🌐';
        const followIcon = auto.follow_gate ? ' 👥' : ''; // Phase 2.0 Extension
        const actions = auto.actions as any;

        message += `${idx + 1}. ${status} ${auto.name}${followIcon}\\n`;
        message += `   ${scopeIcon} ${auto.scope === 'post' ? 'Post' : 'Global'}`;

        if (auto.trigger_type === 'keyword') {
            message += ` • Keyword: "${auto.trigger_value}"\\n`;
        } else {
            message += ` • Match all\\n`;
        }

        // Show action types
        const actionTypes = [];
        if (actions.public_reply?.enabled) actionTypes.push('💬 Reply');
        if (actions.dm?.enabled) actionTypes.push('📧 DM');
        if (actions.discount_code?.enabled) actionTypes.push('🎁 Code');

        if (actionTypes.length > 0) {
            message += `   ${actionTypes.join(', ')}\\n`;
        }

        message += `\\n`;
    });

    message += `Use:\\n`;
    message += `/toggle <number> - Enable/disable\\n`;
    message += `/view <number> - View details`;

    await sendTelegramMessage(chatId, message);
}

async function handleToggleCommand(chatId: number, indexStr: string): Promise<void> {
    const user = await getUserByChatId(chatId);

    if (!user) {
        await sendTelegramMessage(chatId, '❌ Account not linked.');
        return;
    }

    // Get cached automation IDs
    const automationIds = automationListCache.get(chatId);
    if (!automationIds) {
        await sendTelegramMessage(
            chatId,
            '❌ Please run /automations first to see the list.'
        );
        return;
    }

    // Parse index
    const index = parseInt(indexStr, 10);
    if (isNaN(index) || index < 1 || index > automationIds.length) {
        await sendTelegramMessage(
            chatId,
            `❌ Invalid number. Please use 1-${automationIds.length}.`
        );
        return;
    }

    const automationId = automationIds[index - 1];

    // Get current automation
    const automations = await db.query<Automation>(
        'SELECT * FROM automations WHERE id = $1 AND user_id = $2',
        [automationId, user.id]
    );

    if (automations.length === 0) {
        await sendTelegramMessage(chatId, '❌ Automation not found.');
        return;
    }

    const automation = automations[0];
    const newStatus = !automation.enabled;

    // Toggle
    await db.query(
        'UPDATE automations SET enabled = $1 WHERE id = $2',
        [newStatus, automationId]
    );

    const statusText = newStatus ? '✅ enabled' : '🔴 disabled';
    await sendTelegramMessage(
        chatId,
        `${newStatus ? '✅' : '🔴'} Automation #${index} ${statusText}!\\n\\nName: ${automation.name}`
    );
}

async function handleViewCommand(chatId: number, indexStr: string): Promise<void> {
    const user = await getUserByChatId(chatId);

    if (!user) {
        await sendTelegramMessage(chatId, '❌ Account not linked.');
        return;
    }

    // Get cached automation IDs
    const automationIds = automationListCache.get(chatId);
    if (!automationIds) {
        await sendTelegramMessage(
            chatId,
            '❌ Please run /automations first to see the list.'
        );
        return;
    }

    // Parse index
    const index = parseInt(indexStr, 10);
    if (isNaN(index) || index < 1 || index > automationIds.length) {
        await sendTelegramMessage(
            chatId,
            `❌ Invalid number. Please use 1-${automationIds.length}.`
        );
        return;
    }

    const automationId = automationIds[index - 1];

    // Get automation details
    const automations = await db.query<Automation>(
        'SELECT * FROM automations WHERE id = $1 AND user_id = $2',
        [automationId, user.id]
    );

    if (automations.length === 0) {
        await sendTelegramMessage(chatId, '❌ Automation not found.');
        return;
    }

    const auto = automations[0];
    const actions = auto.actions as any;

    // Get execution stats
    const stats = await db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM processed_automation_events WHERE automation_id = $1',
        [auto.id]
    );
    const executionCount = parseInt(stats[0]?.count || '0');

    const lastRun = await db.query<{ processed_at: Date }>(
        'SELECT processed_at FROM processed_automation_events WHERE automation_id = $1 ORDER BY processed_at DESC LIMIT 1',
        [auto.id]
    );

    // Build detailed message
    let message = `🔍 Automation #${index}\\n\\n`;
    message += `Name: ${auto.name}\\n`;
    message += `Status: ${auto.enabled ? '🟢 Enabled' : '🔴 Disabled'}\\n`;
    message += `Scope: ${auto.scope === 'post' ? '📍 Post-specific' : '🌐 Global'}\\n`;

    if (auto.post_id) {
        message += `Post ID: ${auto.post_id}\\n`;
    }

    // Phase 2.0 Extension: Show follow gate
    if (auto.follow_gate) {
        message += `Followers: 👥 Followers only\\n`;
    }

    message += `\\n`;
    message += `Trigger: ${auto.trigger_type === 'keyword' ? `Keyword "${auto.trigger_value}"` : 'Match all'}\\n`;
    message += `\\n`;
    message += `Actions:\\n`;

    if (actions.public_reply?.enabled) {
        const text = actions.public_reply.text?.substring(0, 60) || '';
        message += `  💬 Public Reply: "${text}..."\\n`;
    }

    if (actions.dm?.enabled) {
        message += `  📧 DM: Enabled (Pro feature)\\n`;
    }

    if (actions.discount_code?.enabled) {
        message += `  🎁 Discount Code: Enabled (Pro feature)\\n`;
    }

    if (auto.first_n_commenters) {
        message += `\\nFirst ${auto.first_n_commenters} commenters only\\n`;
    }

    message += `\\n`;
    message += `Stats:\\n`;
    message += `  • ${executionCount} executions\\n`;

    if (lastRun.length > 0) {
        const lastRunDate = new Date(lastRun[0].processed_at);
        const hoursAgo = Math.floor((Date.now() - lastRunDate.getTime()) / (1000 * 60 * 60));
        message += `  • Last run: ${hoursAgo}h ago\\n`;
    }

    message += `\\nUse /toggle ${index} to ${auto.enabled ? 'disable' : 'enable'}`;

    await sendTelegramMessage(chatId, message);
}

async function handleHelpCommand(chatId: number): Promise<void> {
    await sendTelegramMessage(
        chatId,
        `📖 Available Commands:\\n\\n` +
        `/start - Welcome message\\n` +
        `/status - View account status\\n` +
        `/automations - List automations\\n` +
        `/toggle <number> - Enable/disable automation\\n` +
        `/view <number> - View details\\n` +
        `/help - Show this message\\n\\n` +
        `💡 Tip: Use numbers instead of IDs!`
    );
}

/**
 * Helper functions
 */

async function getUserByChatId(chatId: number): Promise<any> {
    const rows = await db.query(
        'SELECT * FROM users WHERE telegram_chat_id = $1 LIMIT 1',
        [chatId.toString()]
    );
    return rows.length > 0 ? rows[0] : null;
}

async function getInstagramAccount(userId: string): Promise<any> {
    const rows = await db.query(
        'SELECT * FROM instagram_accounts WHERE user_id = $1 LIMIT 1',
        [userId]
    );
    return rows.length > 0 ? rows[0] : null;
}

async function getAutomationCount(userId: string): Promise<number> {
    const rows = await db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM automations WHERE user_id = $1',
        [userId]
    );
    return parseInt(rows[0]?.count || '0');
}

async function getEnabledAutomationCount(userId: string): Promise<number> {
    const rows = await db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM automations WHERE user_id = $1 AND enabled = true',
        [userId]
    );
    return parseInt(rows[0]?.count || '0');
}

async function getAutomations(userId: string): Promise<Automation[]> {
    return await db.query<Automation>(
        'SELECT * FROM automations WHERE user_id = $1 ORDER BY priority DESC, created_at DESC',
        [userId]
    );
}

/**
 * Send message to Telegram
 */
async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
    try {
        const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            logger.error({ error, chatId }, 'Failed to send Telegram message');
        }
    } catch (error) {
        logger.error({ error, chatId }, 'Error sending Telegram message');
    }
}

/**
 * Send alert notification
 */
export async function sendTelegramAlert(userId: string, message: string): Promise<void> {
    try {
        const user = await db.query(
            'SELECT telegram_chat_id FROM users WHERE id = $1',
            [userId]
        );

        if (user.length === 0 || !user[0].telegram_chat_id) {
            logger.warn({ userId }, 'Cannot send alert: no Telegram chat ID');
            return;
        }

        const chatId = parseInt(user[0].telegram_chat_id);
        await sendTelegramMessage(chatId, `⚠️ ${message}`);

        logger.info({ userId, chatId }, 'Sent Telegram alert');
    } catch (error) {
        logger.error({ error, userId }, 'Error sending Telegram alert');
    }
}
