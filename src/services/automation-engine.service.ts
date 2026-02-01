import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { redis } from '../utils/redis.js';
import {
    NormalizedComment,
    Automation,
    InstagramAccount,
    User,
    AutomationContext,
    ExecutionStatus,
} from '../types/index.js';
import { intentClassificationService } from './intent-classification.service.js';
import { actionExecutorService } from './action-executor.service.js';

export class AutomationEngineService {
    /**
     * Process a comment through the automation pipeline
     */
    async processComment(comment: NormalizedComment): Promise<void> {
        // CRITICAL FIX #1: Acquire Redis lock to prevent concurrent processing
        const lockKey = `lock:comment:${comment.comment_id}`;
        const lockAcquired = await redis.setNX(lockKey, '1', 60); // 60 second TTL

        if (!lockAcquired) {
            logger.warn({ commentId: comment.comment_id }, 'Comment already being processed by another worker');
            return;
        }

        try {
            logger.info({ commentId: comment.comment_id }, 'Processing comment');

            // Step 1: Check if comment is from owner
            if (comment.is_from_owner) {
                logger.info({ commentId: comment.comment_id }, 'Comment from owner, ignoring');
                return;
            }

            // Step 2: Check for duplicate processing
            const isDuplicate = await this.isDuplicateComment(comment.comment_id);
            if (isDuplicate) {
                logger.info({ commentId: comment.comment_id }, 'Comment already processed, skipping');
                return;
            }

            // Step 3: Get user by Instagram account
            const instagramAccount = await this.getInstagramAccount(comment.ig_business_account_id);
            if (!instagramAccount) {
                logger.warn({ igAccountId: comment.ig_business_account_id }, 'Instagram account not found');
                return;
            }

            // Step 4: Check if automation is enabled
            if (!instagramAccount.automation_enabled) {
                logger.info({ userId: instagramAccount.user_id }, 'Automation disabled for user');
                return;
            }

            // Step 5: Get user
            const user = await this.getUser(instagramAccount.user_id);
            if (!user) {
                logger.warn({ userId: instagramAccount.user_id }, 'User not found');
                return;
            }

            // Step 6: Load automations
            const automations = await this.loadAutomations(instagramAccount.user_id, comment.post_id);
            if (automations.length === 0) {
                logger.info({ userId: user.id }, 'No automations found');
                return;
            }

            // Step 7: Check if any automation uses intent trigger
            const hasIntentAutomations = automations.some((a) => a.trigger_type === 'intent');
            let cachedIntent: string | undefined = undefined;

            if (hasIntentAutomations) {
                // Get all possible intents
                const possibleIntents = automations
                    .filter((a) => a.trigger_type === 'intent')
                    .map((a) => a.trigger_value);

                // Classify intent ONCE
                cachedIntent = await intentClassificationService.getOrClassifyIntent(
                    comment.comment_id,
                    comment.comment_text,
                    possibleIntents
                ) ?? undefined;
            }

            // Step 8: Loop through automations (sorted by priority DESC)
            let stopExecution = false;

            for (const automation of automations) {
                if (stopExecution) {
                    logger.info({ automationId: automation.id }, 'Stopping execution due to previous automation');
                    break;
                }

                // Check if automation matches
                const matches = await this.checkTriggerMatch(
                    automation,
                    comment.comment_text,
                    cachedIntent
                );

                if (!matches) {
                    continue;
                }

                logger.info({ automationId: automation.id }, 'Automation matched');

                // Build context
                const context: AutomationContext = {
                    automation,
                    comment,
                    instagram_account: instagramAccount,
                    user,
                    cached_intent: cachedIntent,
                };

                // Execute automation
                await this.executeAutomation(context);

                // Check if we should stop
                if (automation.stop_after_execution) {
                    stopExecution = true;
                }
            }
        } catch (error) {
            logger.error({ error, comment }, 'Error processing comment');
            throw error;
        } finally {
            // Release lock
            await redis.del(lockKey);
        }
    }

    /**
     * Check if comment has already been processed
     */
    private async isDuplicateComment(commentId: string): Promise<boolean> {
        const rows = await db.query(
            'SELECT comment_id FROM processed_automation_events WHERE comment_id = $1 LIMIT 1',
            [commentId]
        );
        return rows.length > 0;
    }

    /**
     * Get Instagram account by business account ID
     */
    private async getInstagramAccount(igBusinessAccountId: string): Promise<InstagramAccount | null> {
        const rows = await db.query<InstagramAccount>(
            'SELECT * FROM instagram_accounts WHERE ig_business_account_id = $1 LIMIT 1',
            [igBusinessAccountId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Get user by ID
     */
    private async getUser(userId: string): Promise<User | null> {
        const rows = await db.query<User>('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Load all enabled automations for user
     */
    private async loadAutomations(userId: string, postId: string): Promise<Automation[]> {
        const rows = await db.query<Automation>(
            `SELECT * FROM automations 
       WHERE user_id = $1 
         AND enabled = true 
         AND (scope = 'global' OR (scope = 'post' AND post_id = $2))
       ORDER BY priority DESC`,
            [userId, postId]
        );
        return rows;
    }

    /**
     * Check if automation trigger matches comment
     */
    private async checkTriggerMatch(
        automation: Automation,
        commentText: string,
        cachedIntent: string | undefined
    ): Promise<boolean> {
        if (automation.trigger_type === 'keyword') {
            // Case-insensitive keyword match
            return commentText.toLowerCase().includes(automation.trigger_value.toLowerCase());
        } else if (automation.trigger_type === 'intent') {
            // Intent match
            return cachedIntent === automation.trigger_value;
        }
        return false;
    }

    /**
     * Execute automation actions (Phase 2.3: Improved execution semantics)
     */
    private async executeAutomation(context: AutomationContext): Promise<void> {
        const { automation, comment, instagram_account, user } = context;
        const actions = automation.actions;
        const actionsExecuted: Record<string, any> = {};

        // Track action outcomes (Phase 2.3)
        let totalActions = 0;
        let successfulActions = 0;
        let skippedActions = 0;
        let failedActions = 0;
        const errors: string[] = [];

        try {
            // CRITICAL FIX #2: Log BEFORE action execution to prevent lost actions on crash
            await this.logExecution(
                comment,
                automation,
                user.id,
                context.cached_intent,
                { status: 'started' }, // Mark as started
                'success',
                undefined
            );

            // Phase 2.1: Execute discount code action first
            let assignedCode: string | undefined;
            if (actions.discount_code?.enabled) {
                totalActions++;
                const codeResult = await actionExecutorService.executeDiscountCode(
                    automation.id,
                    comment.comment_id,
                    comment.commenter_id,
                    comment.commenter_username,
                    actions.discount_code,
                    automation.first_n_commenters || null
                );

                actionsExecuted.discount_code = {
                    message: codeResult.message,
                    code: codeResult.code,
                    fallback: codeResult.fallback,
                };

                assignedCode = codeResult.code;
                successfulActions++; // Discount code always succeeds (fallback on error)
            }

            // Execute public reply
            if (actions.public_reply?.enabled) {
                totalActions++;
                const result = await actionExecutorService.executePublicReply(
                    comment.comment_id,
                    instagram_account.access_token,
                    user.id,
                    actions.public_reply,
                    comment.comment_text,
                    instagram_account.default_reply_style
                );

                actionsExecuted.public_reply = {
                    success: result.success,
                    simulated: result.simulated,
                    message: result.message,
                    error: result.error,
                };

                if (result.success) {
                    successfulActions++;
                } else {
                    failedActions++;
                    if (result.error) errors.push(`Reply: ${result.error}`);
                }
            }

            // Phase 2.2: Execute DM action
            if (actions.dm?.enabled) {
                totalActions++;
                const result = await actionExecutorService.executeDM(
                    comment.commenter_id,
                    comment.commenter_username,
                    instagram_account.access_token,
                    user.id,
                    actions.dm,
                    { code: assignedCode }
                );

                actionsExecuted.dm = {
                    success: result.success,
                    skipped: result.skipped,
                    simulated: result.simulated,
                    message: result.message,
                    error: result.error,
                };

                if (result.skipped) {
                    // Skipped is NOT an error - it's expected behavior
                    skippedActions++;
                    logger.info(
                        { automationId: automation.id, commenterId: comment.commenter_id },
                        'DM skipped: user is not a follower (expected)'
                    );
                } else if (result.success) {
                    successfulActions++;
                } else {
                    failedActions++;
                    if (result.error) errors.push(`DM: ${result.error}`);
                }
            }

            // Calculate final execution status (Phase 2.3)
            const executionStatus = this.calculateExecutionStatus(
                totalActions,
                successfulActions,
                skippedActions,
                failedActions
            );

            const errorMessage = errors.length > 0 ? errors.join('; ') : undefined;

            // Update execution log
            await this.updateExecutionLog(
                comment.comment_id,
                automation.id,
                actionsExecuted,
                executionStatus,
                errorMessage
            );
        } catch (error: any) {
            logger.error({ error, automationId: automation.id }, 'Error executing automation');

            // Update execution log with failure
            await this.updateExecutionLog(
                comment.comment_id,
                automation.id,
                actionsExecuted,
                'failed',
                error.message
            );

            // Create alert
            await this.createAlert(
                user.id,
                'automation_failure',
                `Automation "${automation.name}" failed: ${error.message}`
            );
        }
    }

    /**
     * Calculate execution status based on action outcomes (Phase 2.3)
     */
    private calculateExecutionStatus(
        totalActions: number,
        successfulActions: number,
        skippedActions: number,
        failedActions: number
    ): ExecutionStatus {
        // No actions enabled
        if (totalActions === 0) {
            return 'skipped';
        }

        // All actions skipped (e.g., only DM enabled, user not following)
        if (skippedActions === totalActions) {
            return 'skipped';
        }

        // All non-skipped actions failed
        if (failedActions > 0 && successfulActions === 0) {
            return 'failed';
        }

        // Mixed results: some succeeded, some failed
        if (successfulActions > 0 && failedActions > 0) {
            return 'partial';
        }

        // All non-skipped actions succeeded
        return 'success';
    }

    /**
     * Log automation execution
     */
    private async logExecution(
        comment: NormalizedComment,
        automation: Automation,
        userId: string,
        intentClassified: string | undefined,
        actionsExecuted: Record<string, any>,
        executionStatus: ExecutionStatus,
        errorMessage?: string
    ): Promise<void> {
        await db.query(
            `INSERT INTO processed_automation_events 
       (comment_id, automation_id, user_id, commenter_id, commenter_username, comment_text, intent_classified, actions_executed, execution_status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                comment.comment_id,
                automation.id,
                userId,
                comment.commenter_id,
                comment.commenter_username,
                comment.comment_text,
                intentClassified,
                JSON.stringify(actionsExecuted),
                executionStatus,
                errorMessage,
            ]
        );
    }

    /**
     * Update execution log with results
     */
    private async updateExecutionLog(
        commentId: string,
        automationId: string,
        actionsExecuted: Record<string, any>,
        executionStatus: ExecutionStatus,
        errorMessage?: string
    ): Promise<void> {
        await db.query(
            `UPDATE processed_automation_events 
       SET actions_executed = $1, execution_status = $2, error_message = $3, processed_at = NOW()
       WHERE comment_id = $4 AND automation_id = $5`,
            [JSON.stringify(actionsExecuted), executionStatus, errorMessage, commentId, automationId]
        );
    }

    /**
     * Create alert for user
     */
    private async createAlert(userId: string, alertType: string, message: string): Promise<void> {
        await db.query(
            'INSERT INTO telegram_alerts (user_id, alert_type, message) VALUES ($1, $2, $3)',
            [userId, alertType, message]
        );
    }
}

export const automationEngineService = new AutomationEngineService();
