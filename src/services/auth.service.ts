import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { db } from '../utils/database.js';
import { User } from '../types/index.js';

/**
 * Authentication Service
 * Simple email/password auth for Phase 1
 */

export interface AuthTokenPayload {
    userId: string;
    email: string;
}

export interface SignupInput {
    email: string;
    password: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export class AuthService {
    /**
     * Hash password using bcrypt
     */
    async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    /**
     * Compare password with hash
     */
    async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT token
     */
    generateToken(payload: AuthTokenPayload): string {
        return jwt.sign(payload, config.server.jwtSecret, {
            expiresIn: '7d', // 7 days
        });
    }

    /**
     * Verify JWT token
     */
    verifyToken(token: string): AuthTokenPayload {
        return jwt.verify(token, config.server.jwtSecret) as AuthTokenPayload;
    }

    /**
     * Sign up new user
     */
    async signup(input: SignupInput): Promise<{ user: User; token: string }> {
        // Check if user already exists
        const existing = await db.query<User>(
            'SELECT id FROM users WHERE email = $1',
            [input.email]
        );

        if (existing.length > 0) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const passwordHash = await this.hashPassword(input.password);

        // Create user
        const users = await db.query<User>(
            `INSERT INTO users (email, password_hash, tier) 
             VALUES ($1, $2, 'free') 
             RETURNING id, email, telegram_chat_id, tier, tier_expires_at, created_at, updated_at`,
            [input.email, passwordHash]
        );

        const user = users[0];

        // Generate token
        const token = this.generateToken({
            userId: user.id,
            email: user.email,
        });

        return { user, token };
    }

    /**
     * Login user
     */
    async login(input: LoginInput): Promise<{ user: User; token: string }> {
        // Find user
        const users = await db.query<User>(
            'SELECT * FROM users WHERE email = $1',
            [input.email]
        );

        if (users.length === 0) {
            throw new Error('Invalid email or password');
        }

        const user = users[0];

        // Check password
        if (!user.password_hash) {
            throw new Error('Invalid email or password');
        }

        const isValid = await this.comparePassword(input.password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }

        // Generate token
        const token = this.generateToken({
            userId: user.id,
            email: user.email,
        });

        // Remove password hash from response
        const { password_hash, ...userWithoutPassword } = user;

        return { user: userWithoutPassword as User, token };
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<User | null> {
        const users = await db.query<User>(
            'SELECT id, email, telegram_chat_id, tier, tier_expires_at, created_at, updated_at FROM users WHERE id = $1',
            [userId]
        );

        return users.length > 0 ? users[0] : null;
    }
}

export const authService = new AuthService();
