import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { rateLimiterService } from './rate-limiter.service.js';
import { AutomationActions } from '../types/index.js';

export class ActionExecutorService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
    }

    /**
     * Execute public reply action
     */
    async executePublicReply(
        commentId: string,
        accessToken: string,
        userId: string,
        replyConfig: NonNullable<AutomationActions['public_reply']>,
        commentText: string,
        defaultReplyStyle: string
    ): Promise<{ success: boolean; simulated?: boolean; error?: string; message?: string }> {
        try {
            // Check rate limit
            const allowed = await rateLimiterService.checkLimit(userId, 'reply_hourly');
            if (!allowed) {
                logger.warn({ userId }, 'Reply rate limit exceeded');
                return { success: false, error: 'Rate limit exceeded' };
            }

            // Generate reply text
            let replyText: string;
            if (replyConfig.type === 'static') {
                replyText = replyConfig.text || '';
            } else {
                // AI-generated reply
                replyText = await this.generateAIReply(commentText, defaultReplyStyle);
            }

            // DEV MODE: Simulate instead of sending
            if (config.environment.devMode) {
                logger.info({ commentId, replyText }, '[DEV] Simulated public reply (not sent to Instagram)');
                return { success: true, simulated: true, message: replyText };
            }

            // Post reply to Instagram
            const url = `${config.meta.graphApiBaseUrl}/${config.meta.graphApiVersion}/${commentId}/replies`;
            await axios.post(
                url,
                {},
                {
                    params: {
                        message: replyText,
                        access_token: accessToken,
                    },
                }
            );

            // Increment counter
            await rateLimiterService.incrementCounter(userId, 'reply_hourly');

            logger.info({ commentId, replyText }, 'Posted public reply');
            return { success: true, message: replyText };
        } catch (error: any) {
            logger.error({ error, commentId }, 'Error posting public reply');
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate AI reply using Gemini
     */
    private async generateAIReply(commentText: string, style: string): Promise<string> {
        const prompt = `Generate a short, friendly, human-like reply to this Instagram comment: "${commentText}". 
Style: ${style}. 
Keep it under 50 characters and natural. 
Return ONLY the reply text, nothing else.`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    }

    /**
     * Execute DM action (Phase 2.2)
     * Sends DM via Instagram Graph API with variable replacement
     */
    async executeDM(
        commenterId: string,
        commenterUsername: string,
        accessToken: string,
        userId: string,
        dmConfig: NonNullable<AutomationActions['dm']>,
        variables: { code?: string } = {}
    ): Promise<{ success: boolean; skipped: boolean; simulated?: boolean; error?: string; message?: string }> {
        try {
            // Check rate limit
            const allowed = await rateLimiterService.checkLimit(userId, 'dm_daily');
            if (!allowed) {
                logger.warn({ userId }, 'DM rate limit exceeded');
                return { success: false, skipped: false, error: 'Rate limit exceeded' };
            }

            // Apply delay if specified
            if (dmConfig.delay_seconds && dmConfig.delay_seconds > 0) {
                const delaySeconds =
                    typeof dmConfig.delay_seconds === 'number' && dmConfig.delay_seconds > 0
                        ? dmConfig.delay_seconds
                        : 0;

                if (delaySeconds > 0) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, delaySeconds * 1000)
                    );
                }
            }

            // Replace variables in message template
            let message = dmConfig.text;

            message = message.replace(/{{username}}/gi, commenterUsername);

            if (variables.code) {
                message = message.replace(/{{CODE}}/gi, variables.code);
            }

            // DEV MODE: Simulate instead of sending
            if (config.environment.devMode) {
                logger.info(
                    { commenterId, commenterUsername, message },
                    '[DEV] Simulated DM (not sent to Instagram)'
                );
                return { success: true, skipped: false, simulated: true, message };
            }

            // Send DM via Instagram Graph API
            const url = `${config.meta.graphApiBaseUrl}/${config.meta.graphApiVersion}/me/messages`;
            await axios.post(
                url,
                {
                    recipient: { id: commenterId },
                    message: { text: message },
                },
                {
                    params: {
                        access_token: accessToken,
                    },
                }
            );

            // Increment counter
            await rateLimiterService.incrementCounter(userId, 'dm_daily');

            logger.info({ commenterId, message }, 'DM sent successfully');
            return { success: true, skipped: false, message };
        } catch (error: any) {
            // Check for USER_NOT_FOLLOWING error (EXPECTED, not an error)
            if (
                error.response?.data?.error?.code === 10 ||
                error.response?.data?.error?.message?.includes('not following') ||
                error.response?.data?.error?.message?.includes('does not follow')
            ) {
                logger.info(
                    { commenterId, commenterUsername },
                    'DM skipped: user is not a follower (expected behavior, not an error)'
                );
                return { success: false, skipped: true }; // skipped=true means this is NOT an error
            }

            // Other errors are real failures
            logger.error({ error, commenterId }, 'Error sending DM');
            return { success: false, skipped: false, error: error.message };
        }
    }

    /**
     * Execute discount code action (Phase 2.1)
     * Returns structured output for integration with public reply or DM
     */
    async executeDiscountCode(
        automationId: string,
        commentId: string,
        commenterId: string,
        commenterUsername: string,
        discountConfig: NonNullable<AutomationActions['discount_code']>,
        firstNCommenters: number | null
    ): Promise<{ message: string; code?: string; fallback: boolean }> {
        try {
            const { discountCodeService } = await import('./discount-code.service.js');

            // Assign code atomically
            const result = await discountCodeService.assignCode(
                automationId,
                discountConfig.pool_id,
                commentId,
                commenterId,
                commenterUsername,
                firstNCommenters
            );

            if (result.fallback) {
                // Use fallback message
                const fallbackMessage =
                    discountConfig.fallback_message || 'Sorry, all codes have been claimed!';
                return { message: fallbackMessage, fallback: true };
            }

            // Replace {{CODE}} placeholder in template
            const message = discountConfig.message_template.replace('{{CODE}}', result.code!);
            return { message, code: result.code!, fallback: false };
        } catch (error: any) {
            logger.error({ error, automationId }, 'Error executing discount code action');

            // Return fallback on error
            const fallbackMessage =
                discountConfig.fallback_message || 'Sorry, codes are temporarily unavailable.';
            return { message: fallbackMessage, fallback: true };
        }
    }
}

export const actionExecutorService = new ActionExecutorService();
