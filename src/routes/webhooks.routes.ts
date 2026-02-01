import { FastifyRequest, FastifyReply } from 'fastify';
import { webhookService } from '../services/webhook.service.js';
import { enqueueComment } from '../jobs/comment-processor.job.js';
import { logger } from '../utils/logger.js';
import { InstagramWebhookPayload } from '../types/index.js';
import { config } from '../config/index.js';

/**
 * Webhook verification (GET request)
 */
export async function verifyWebhook(
    request: FastifyRequest<{ Querystring: { 'hub.mode': string; 'hub.verify_token': string; 'hub.challenge': string } }>,
    reply: FastifyReply
) {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
        logger.info('Webhook verified');
        return reply.status(200).send(challenge);
    } else {
        logger.warn('Webhook verification failed');
        return reply.status(403).send('Forbidden');
    }
}

/**
 * Instagram comment webhook handler (POST request)
 */
export async function handleInstagramWebhook(
    request: FastifyRequest<{ Body: InstagramWebhookPayload }>,
    reply: FastifyReply
) {
    try {
        // Verify HMAC signature
        /* const signature = request.headers['x-hub-signature-256'] as string;
         const rawBody = JSON.stringify(request.body);
 
         if (!signature || !webhookService.verifySignature(signature, rawBody)) {
             logger.warn('Invalid webhook signature');
             return reply.status(403).send({ error: 'Invalid signature' });
         }*/

        // Verify HMAC signature (skip in dev)
        if (process.env.NODE_ENV === 'production') {
            const signature = request.headers['x-hub-signature-256'] as string;
            const rawBody = request.rawBody as string;

            if (!signature || !webhookService.verifySignature(signature, rawBody)) {
                request.log.warn('Invalid webhook signature');
                return reply.status(403).send({ error: 'Invalid signature' });
            }
        } else {
            request.log.debug('Skipping Instagram signature verification (DEV MODE)');
        }

        // Normalize comment
        const comment = webhookService.normalizeComment(request.body);
        if (!comment) {
            logger.warn('Failed to normalize comment');
            return reply.status(400).send({ error: 'Invalid payload' });
        }

        // Enqueue for processing
        await enqueueComment({
            comment,
            user_id: '', // Will be resolved in the worker
            instagram_account_id: '',
        });

        // Return 200 OK immediately
        return reply.status(200).send({ status: 'ok' });
    } catch (error) {
        logger.error({ error }, 'Error handling webhook');
        return reply.status(500).send({ error: 'Internal server error' });
    }
}
