import crypto from 'crypto';
import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';

/**
 * OTP Service
 * Handles one-time password generation, storage, and verification
 */

export interface OTPCode {
    id: string;
    email: string;
    code: string;
    expires_at: Date;
    used: boolean;
    created_at: Date;
}

export class OTPService {
    private readonly OTP_EXPIRY_MINUTES = 10;
    private readonly MAX_ATTEMPTS_PER_HOUR = 5;

    /**
     * Generate a random 6-digit OTP code
     */
    generateCode(): string {
        // Generate cryptographically secure random 6-digit code
        const code = crypto.randomInt(100000, 999999).toString();
        return code;
    }

    /**
     * Create and store an OTP code for an email
     */
    async createOTP(email: string): Promise<string> {
        // Check rate limiting - max 5 OTPs per hour per email
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentOTPs = await db.query<OTPCode>(
            'SELECT COUNT(*) as count FROM otp_codes WHERE email = $1 AND created_at > $2',
            [email.toLowerCase(), oneHourAgo]
        );

        const count = parseInt((recentOTPs[0] as any).count || '0');
        if (count >= this.MAX_ATTEMPTS_PER_HOUR) {
            throw new Error('Too many OTP requests. Please try again later.');
        }

        // Generate code
        const code = this.generateCode();

        // Calculate expiry
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        // Store in database
        await db.query(
            `INSERT INTO otp_codes (email, code, expires_at) 
             VALUES ($1, $2, $3)`,
            [email.toLowerCase(), code, expiresAt]
        );

        logger.info({ email, expiresAt }, 'OTP code created');

        return code;
    }

    /**
     * Verify an OTP code
     */
    async verifyOTP(email: string, code: string): Promise<boolean> {
        // Find valid OTP
        const otps = await db.query<OTPCode>(
            `SELECT * FROM otp_codes 
             WHERE email = $1 
             AND code = $2 
             AND used = FALSE 
             AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [email.toLowerCase(), code]
        );

        if (otps.length === 0) {
            logger.warn({ email }, 'Invalid or expired OTP');
            return false;
        }

        // Mark as used
        await db.query(
            'UPDATE otp_codes SET used = TRUE WHERE id = $1',
            [otps[0].id]
        );

        logger.info({ email }, 'OTP verified successfully');

        return true;
    }

    /**
     * Clean up expired and used OTPs (can be called periodically)
     */
    async cleanupExpiredOTPs(): Promise<number> {
        const result = await db.query(
            `DELETE FROM otp_codes 
             WHERE expires_at < NOW() OR used = TRUE
             RETURNING id`
        );

        const deletedCount = result.length;
        logger.info({ deletedCount }, 'Cleaned up expired OTPs');

        return deletedCount;
    }

    /**
     * Send OTP via email
     */
    async sendOTPEmail(email: string, code: string): Promise<void> {
        const { sendOTPEmail: sendEmail } = await import('./email.service.js');
        await sendEmail({ email, code });
    }
}

export const otpService = new OTPService();
