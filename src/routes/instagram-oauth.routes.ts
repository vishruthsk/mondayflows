import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { instagramOAuthService } from '../services/instagram-oauth.service.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Instagram OAuth Routes
 */

interface CallbackQuery {
    code?: string;
    error?: string;
    error_description?: string;
}

export async function registerInstagramOAuthRoutes(app: FastifyInstance) {
    /**
     * GET /auth/instagram/start
     * Start Instagram OAuth flow
     */
    app.get(
        '/auth/instagram/start',
        {
            preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
                const { authMiddleware } = await import('../middleware/auth.middleware.js');
                await authMiddleware(request, reply);
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Not authenticated',
                    });
                }

                // Build redirect URI
                const redirectUri = `${config.server.baseUrl || 'http://localhost:3000'}/auth/instagram/callback`;

                // Get authorization URL
                const authUrl = instagramOAuthService.getAuthorizationUrl(redirectUri);

                logger.info({ userId: request.user.userId }, 'Starting Instagram OAuth flow');

                // Redirect to Instagram OAuth
                return reply.redirect(authUrl);
            } catch (error: any) {
                logger.error({ error }, 'Failed to start Instagram OAuth');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to start Instagram connection',
                });
            }
        }
    );

    /**
     * GET /auth/instagram/callback
     * Instagram OAuth callback
     */
    app.get<{ Querystring: CallbackQuery }>(
        '/auth/instagram/callback',
        {
            preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
                const { authMiddleware } = await import('../middleware/auth.middleware.js');
                await authMiddleware(request, reply);
            },
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Not authenticated',
                    });
                }

                const { code, error, error_description } = request.query;

                // Check for OAuth error
                if (error) {
                    logger.warn({ error, error_description }, 'Instagram OAuth error');
                    return reply.status(400).send({
                        success: false,
                        error: error_description || 'Instagram authorization failed',
                    });
                }

                // Check for code
                if (!code) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Missing authorization code',
                    });
                }

                // Build redirect URI
                const redirectUri = `${config.server.baseUrl || 'http://localhost:3000'}/auth/instagram/callback`;

                // Connect Instagram account
                const account = await instagramOAuthService.connectAccount(
                    request.user.userId,
                    code,
                    redirectUri
                );

                logger.info(
                    { userId: request.user.userId, igAccountId: account.id },
                    'Instagram account connected successfully'
                );

                // Redirect to frontend success page
                const frontendUrl = config.frontend.url;
                return reply.redirect(`${frontendUrl}/connect/success?username=${account.username}`);
            } catch (error: any) {
                logger.error({ error }, 'Instagram OAuth callback error');

                // Redirect to frontend error page
                const frontendUrl = config.frontend.url;
                const errorMessage = encodeURIComponent(error.message || 'Failed to connect Instagram account');
                return reply.redirect(`${frontendUrl}/connect/error?message=${errorMessage}`);
            }
        }
    );

    /**
     * GET /auth/instagram/status
     * Get Instagram connection status
     */
    app.get(
        '/auth/instagram/status',
        {
            preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
                const { authMiddleware } = await import('../middleware/auth.middleware.js');
                await authMiddleware(request, reply);
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Not authenticated',
                    });
                }

                // Get Instagram account
                const { db } = await import('../utils/database.js');
                const accounts = await db.query(
                    `SELECT id, ig_business_account_id, username, automation_enabled, 
                            token_expires_at, created_at, updated_at 
                     FROM instagram_accounts 
                     WHERE user_id = $1`,
                    [request.user.userId]
                );

                if (accounts.length === 0) {
                    return {
                        success: true,
                        data: {
                            connected: false,
                        },
                    };
                }

                const account = accounts[0];

                // Check if token is expiring soon
                const isExpiringSoon = instagramOAuthService.isTokenExpiringSoon(
                    new Date(account.token_expires_at)
                );

                return {
                    success: true,
                    data: {
                        connected: true,
                        account: {
                            id: account.id,
                            username: account.username,
                            automation_enabled: account.automation_enabled,
                            token_expires_at: account.token_expires_at,
                            token_expiring_soon: isExpiringSoon,
                        },
                    },
                };
            } catch (error: any) {
                logger.error({ error }, 'Failed to get Instagram status');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to get Instagram connection status',
                });
            }
        }
    );

    /**
     * POST /auth/instagram/disconnect
     * Disconnect Instagram account
     */
    app.post(
        '/auth/instagram/disconnect',
        {
            preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
                const { authMiddleware } = await import('../middleware/auth.middleware.js');
                await authMiddleware(request, reply);
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Not authenticated',
                    });
                }

                // Delete Instagram account
                const { db } = await import('../utils/database.js');
                await db.query(
                    'DELETE FROM instagram_accounts WHERE user_id = $1',
                    [request.user.userId]
                );

                logger.info({ userId: request.user.userId }, 'Instagram account disconnected');

                return {
                    success: true,
                    message: 'Instagram account disconnected successfully',
                };
            } catch (error: any) {
                logger.error({ error }, 'Failed to disconnect Instagram');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to disconnect Instagram account',
                });
            }
        }
    );
}
