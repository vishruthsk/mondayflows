import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication Routes
 * Email/password auth for Phase 1
 */

interface SignupBody {
    email: string;
    password: string;
    code: string;
}

interface LoginBody {
    email: string;
    password: string;
}

export async function registerAuthRoutes(app: FastifyInstance) {
    /**
     * POST /auth/signup
     * Create new user account
     */
    app.post<{ Body: SignupBody }>(
        '/auth/signup',
        async (request, reply) => {
            try {
                const { email, password, code } = request.body;

                // Validate input
                if (!email || !password || !code) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Email, password, and verification code are required',
                    });
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid email format',
                    });
                }

                // Validate password length
                if (password.length < 8) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Password must be at least 8 characters',
                    });
                }

                // Import OTP service
                const { otpService } = await import('../services/otp.service.js');

                // Verify OTP
                const isValid = await otpService.verifyOTP(email, code);

                if (!isValid) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Invalid or expired verification code',
                    });
                }

                // Create user
                const { user, token } = await authService.signup({ email, password });

                logger.info({ userId: user.id, email: user.email }, 'User signed up');

                return reply.status(201).send({
                    success: true,
                    data: {
                        user,
                        token,
                    },
                });
            } catch (error: any) {
                logger.error({ error }, 'Signup error');

                if (error.message === 'User with this email already exists') {
                    return reply.status(409).send({
                        success: false,
                        error: error.message,
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error: 'Failed to create account',
                });
            }
        }
    );

    /**
     * POST /auth/login
     * Login with email and password
     */
    app.post<{ Body: LoginBody }>(
        '/auth/login',
        async (request, reply) => {
            try {
                const { email, password } = request.body;

                // Validate input
                if (!email || !password) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Email and password are required',
                    });
                }

                // Login
                const { user, token } = await authService.login({ email, password });

                logger.info({ userId: user.id, email: user.email }, 'User logged in');

                return {
                    success: true,
                    data: {
                        user,
                        token,
                    },
                };
            } catch (error: any) {
                logger.error({ error }, 'Login error');

                if (error.message === 'Invalid email or password') {
                    return reply.status(401).send({
                        success: false,
                        error: error.message,
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error: 'Failed to login',
                });
            }
        }
    );

    /**
     * GET /auth/me
     * Get current user info (requires auth)
     */
    app.get(
        '/auth/me',
        {
            preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
                // Import middleware dynamically to avoid circular dependency
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

                const user = await authService.getUserById(request.user.userId);

                if (!user) {
                    return reply.status(404).send({
                        success: false,
                        error: 'User not found',
                    });
                }

                // Check if Instagram is connected
                const igAccounts = await import('../utils/database.js').then(m => m.db.query(
                    'SELECT id, username FROM instagram_accounts WHERE user_id = $1 LIMIT 1',
                    [user.id]
                ));

                const instagram_connected = igAccounts.length > 0;
                const instagram_handle = igAccounts.length > 0 ? igAccounts[0].username : null;

                return {
                    success: true,
                    data: {
                        ...user,
                        instagram_connected,
                        instagram_handle,
                    },
                };
            } catch (error: any) {
                logger.error({ error }, 'Get user error');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to get user info',
                });
            }
        }
    );

    /**
     * POST /auth/send-otp
     * Send OTP code to email
     */
    app.post<{ Body: { email: string } }>(
        '/auth/send-otp',
        async (request, reply) => {
            try {
                const { email } = request.body;

                // Validate email
                if (!email) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Email is required',
                    });
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid email format',
                    });
                }

                // Import OTP service
                const { otpService } = await import('../services/otp.service.js');

                // Generate and send OTP
                const code = await otpService.createOTP(email);
                await otpService.sendOTPEmail(email, code);

                logger.info({ email }, 'OTP sent');

                return {
                    success: true,
                    message: 'OTP sent to your email',
                };
            } catch (error: any) {
                logger.error({ error }, 'Send OTP error');

                if (error.message.includes('Too many OTP requests')) {
                    return reply.status(429).send({
                        success: false,
                        error: error.message,
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error: 'Failed to send OTP',
                });
            }
        }
    );

    /**
     * POST /auth/verify-otp
     * Verify OTP and login/signup user
     */
    app.post<{ Body: { email: string; code: string } }>(
        '/auth/verify-otp',
        async (request, reply) => {
            try {
                const { email, code } = request.body;

                // Validate input
                if (!email || !code) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Email and code are required',
                    });
                }

                if (code.length !== 6 || !/^\d+$/.test(code)) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid code format',
                    });
                }

                // Import OTP service
                const { otpService } = await import('../services/otp.service.js');

                // Verify OTP
                const isValid = await otpService.verifyOTP(email, code);

                if (!isValid) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Invalid or expired code',
                    });
                }

                // Check if user exists
                const { db } = await import('../utils/database.js');
                const existingUsers = await db.query<any>(
                    'SELECT id, email, tier FROM users WHERE email = $1',
                    [email.toLowerCase()]
                );

                let user;
                let isNewUser = false;

                if (existingUsers.length === 0) {
                    // Create new user
                    const newUsers = await db.query<any>(
                        `INSERT INTO users (email, tier) 
                         VALUES ($1, 'free') 
                         RETURNING id, email, tier, created_at, updated_at`,
                        [email.toLowerCase()]
                    );
                    user = newUsers[0];
                    isNewUser = true;
                    logger.info({ userId: user.id, email }, 'New user created via OTP');
                } else {
                    user = existingUsers[0];
                    logger.info({ userId: user.id, email }, 'Existing user logged in via OTP');
                }

                // Check if Instagram is connected
                const igAccounts = await db.query(
                    'SELECT id, username FROM instagram_accounts WHERE user_id = $1 LIMIT 1',
                    [user.id]
                );

                const instagram_connected = igAccounts.length > 0;
                const instagram_handle = igAccounts.length > 0 ? igAccounts[0].username : null;

                // Generate token
                const token = authService.generateToken({
                    userId: user.id,
                    email: user.email,
                });

                return {
                    success: true,
                    data: {
                        token,
                        user: {
                            id: user.id,
                            email: user.email,
                            tier: user.tier,
                            instagram_connected,
                            instagram_handle,
                            created_at: user.created_at,
                            updated_at: user.updated_at,
                        },
                        isNewUser,
                    },
                };
            } catch (error: any) {
                logger.error({ error }, 'Verify OTP error');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to verify OTP',
                });
            }
        }
    );

    /**
     * POST /auth/logout
     * Logout user (client-side token removal, server-side is stateless)
     */
    app.post(
        '/auth/logout',
        {
            preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
                const { authMiddleware } = await import('../middleware/auth.middleware.js');
                await authMiddleware(request, reply);
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                logger.info({ userId: request.user?.userId }, 'User logged out');

                return {
                    success: true,
                    message: 'Logged out successfully',
                };
            } catch (error: any) {
                logger.error({ error }, 'Logout error');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to logout',
                });
            }
        }
    );
    /**
     * POST /auth/reset-password
     * Reset password with OTP
     */
    app.post<{ Body: { email: string; code: string; newPassword: string } }>(
        '/auth/reset-password',
        async (request, reply) => {
            try {
                const { email, code, newPassword } = request.body;

                // Validate input
                if (!email || !code || !newPassword) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Email, code, and new password are required',
                    });
                }

                if (newPassword.length < 8) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Password must be at least 8 characters',
                    });
                }

                // Import services
                const { otpService } = await import('../services/otp.service.js');
                const { db } = await import('../utils/database.js');

                // Verify OTP
                const isValid = await otpService.verifyOTP(email, code);

                if (!isValid) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Invalid or expired code',
                    });
                }

                // Hash new password
                const passwordHash = await authService.hashPassword(newPassword);

                // Update user password
                const result = await db.query(
                    'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id',
                    [passwordHash, email.toLowerCase()]
                );

                if (result.length === 0) {
                    return reply.status(404).send({
                        success: false,
                        error: 'User not found',
                    });
                }

                logger.info({ email }, 'Password reset successfully');

                return {
                    success: true,
                    message: 'Password reset successfully',
                };
            } catch (error: any) {
                logger.error({ error }, 'Reset password error');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to reset password',
                });
            }
        }
    );
}
