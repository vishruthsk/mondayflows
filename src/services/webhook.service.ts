import crypto from 'crypto';
import { config } from '../config/index.js';
import { InstagramWebhookPayload, NormalizedComment } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class WebhookService {
    /**
     * Verify HMAC signature from Instagram webhook
     */
    verifySignature(signature: string, body: string): boolean {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', config.meta.webhookSecret)
                .update(body)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(`sha256=${expectedSignature}`)
            );
        } catch (error) {
            logger.error({ error }, 'Signature verification error');
            return false;
        }
    }

    /**
     * Normalize Instagram webhook payload to standardized comment format
     */
    normalizeComment(payload: InstagramWebhookPayload): NormalizedComment | null {
        try {
            const entry = payload.entry?.[0];
            if (!entry) {
                logger.warn('No entry in webhook payload');
                return null;
            }

            const change = entry.changes?.[0];
            if (!change || change.field !== 'comments') {
                logger.warn({ field: change?.field }, 'Invalid change field');
                return null;
            }

            const value = change.value;
            const igBusinessAccountId = entry.id;
            const postId = value.media?.id || '';
            const commentId = value.id;
            const commentText = value.text;
            const commenterId = value.from?.id;
            const commenterUsername = value.from?.username || '';

            // Check if comment is from owner
            // Prefer ID match, fallback to username match
            const isFromOwner =
                commenterId === igBusinessAccountId ||
                (value.media?.username && commenterUsername === value.media.username);

            return {
                ig_business_account_id: igBusinessAccountId,
                post_id: postId,
                comment_id: commentId,
                comment_text: commentText,
                commenter_id: commenterId,
                commenter_username: commenterUsername,
                is_from_owner: Boolean(isFromOwner),
            };
        } catch (error) {
            logger.error({ error, payload }, 'Error normalizing comment');
            return null;
        }
    }
}

export const webhookService = new WebhookService();
