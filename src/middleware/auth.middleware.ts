import { FastifyRequest, FastifyReply } from 'fastify';
import { authService, AuthTokenPayload } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

/**
 * Extend Fastify request with user info
 */
declare module 'fastify' {
    interface FastifyRequest {
        user?: AuthTokenPayload;
    }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({
                success: false,
                error: 'Missing or invalid authorization header',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const payload = authService.verifyToken(token);

        // Attach user to request
        request.user = payload;

        // Continue to route handler
    } catch (error: any) {
        logger.warn({ error: error.message }, 'Authentication failed');
        return reply.status(401).send({
            success: false,
            error: 'Invalid or expired token',
        });
    }
}

/**
 * Optional auth middleware
 * Attaches user if token is valid, but doesn't reject if missing
 */
export async function optionalAuthMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    try {
        const authHeader = request.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = authService.verifyToken(token);
            request.user = payload;
        }
    } catch (error) {
        // Silently fail for optional auth
        logger.debug('Optional auth failed, continuing without user');
    }
}
