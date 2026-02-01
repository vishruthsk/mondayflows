import { Resend } from 'resend';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const resend = new Resend(config.email.apiKey);

interface SendOTPEmailParams {
    email: string;
    code: string;
}

/**
 * Send OTP code via email
 */
export async function sendOTPEmail({ email, code }: SendOTPEmailParams): Promise<void> {
    // In development mode without API key, log to console
    if (!config.email.apiKey || config.email.apiKey === 'your-resend-api-key') {
        logger.info({ email, code }, 'OTP email would be sent (placeholder)');
        console.log('\n' + '='.repeat(60));
        console.log('🔐 OTP CODE FOR AUTHENTICATION');
        console.log('='.repeat(60));
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Code:  ${code}`);
        console.log('='.repeat(60) + '\n');
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: config.email.from,
            to: email,
            subject: 'Your Login Code',
            html: getOTPEmailTemplate(code),
        });

        if (error) {
            logger.error({ error, email }, 'Failed to send OTP email');
            // Fallback to console in case of error
            console.log('\n' + '='.repeat(60));
            console.log('🔐 OTP CODE FOR AUTHENTICATION (Email Send Failed)');
            console.log('='.repeat(60));
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 Code:  ${code}`);
            console.log('='.repeat(60) + '\n');
            return;
        }

        logger.info({ email, messageId: data?.id }, 'OTP email sent successfully');
    } catch (error) {
        logger.error({ error, email }, 'Error sending OTP email');
        // Fallback to console
        console.log('\n' + '='.repeat(60));
        console.log('🔐 OTP CODE FOR AUTHENTICATION (Error Occurred)');
        console.log('='.repeat(60));
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Code:  ${code}`);
        console.log('='.repeat(60) + '\n');
    }
}

/**
 * Get branded OTP email template
 */
function getOTPEmailTemplate(code: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" opacity="0.8"/>
                                    <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">Your Login Code</h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #666666;">
                                Use this code to complete your login. This code will expire in <strong>10 minutes</strong>.
                            </p>
                            
                            <!-- OTP Code Box -->
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; text-align: center; margin: 24px 0;">
                                <div style="font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                    ${code}
                                </div>
                            </div>
                            
                            <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #999999;">
                                If you didn't request this code, you can safely ignore this email. Someone may have typed your email address by mistake.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #999999; text-align: center;">
                                This is an automated message from Monday Flows.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Bottom spacing -->
                <table width="600" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding: 20px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © ${new Date().getFullYear()} Monday Flows. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
