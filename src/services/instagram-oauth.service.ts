import axios from 'axios';
import { config } from '../config/index.js';
import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { InstagramAccount } from '../types/index.js';

/**
 * Instagram OAuth Service
 * Handles OAuth flow and token management
 */

interface OAuthTokenResponse {
    access_token: string;
    user_id: number;
}

interface LongLivedTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number; // seconds
}

interface InstagramBusinessAccountResponse {
    instagram_business_account: {
        id: string;
    };
}

interface InstagramAccountInfo {
    id: string;
    username: string;
}

export class InstagramOAuthService {
    private readonly graphApiBaseUrl = config.meta.graphApiBaseUrl;
    private readonly graphApiVersion = config.meta.graphApiVersion;

    /**
     * Generate OAuth authorization URL
     */
    getAuthorizationUrl(redirectUri: string): string {
        const params = new URLSearchParams({
            client_id: config.meta.appId,
            redirect_uri: redirectUri,
            scope: 'instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement',
            response_type: 'code',
        });

        return `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${params.toString()}`;
    }

    /**
     * Exchange authorization code for short-lived access token
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
        try {
            const response = await axios.get<OAuthTokenResponse>(
                `${this.graphApiBaseUrl}/${this.graphApiVersion}/oauth/access_token`,
                {
                    params: {
                        client_id: config.meta.appId,
                        client_secret: config.meta.appSecret,
                        redirect_uri: redirectUri,
                        code,
                    },
                }
            );

            return response.data.access_token;
        } catch (error: any) {
            logger.error({ error: error.response?.data || error.message }, 'Failed to exchange code for token');
            throw new Error('Failed to exchange authorization code');
        }
    }

    /**
     * Exchange short-lived token for long-lived token (60 days)
     */
    async getLongLivedToken(shortLivedToken: string): Promise<{ token: string; expiresIn: number }> {
        try {
            const response = await axios.get<LongLivedTokenResponse>(
                `${this.graphApiBaseUrl}/${this.graphApiVersion}/oauth/access_token`,
                {
                    params: {
                        grant_type: 'fb_exchange_token',
                        client_id: config.meta.appId,
                        client_secret: config.meta.appSecret,
                        fb_exchange_token: shortLivedToken,
                    },
                }
            );

            return {
                token: response.data.access_token,
                expiresIn: response.data.expires_in,
            };
        } catch (error: any) {
            logger.error({ error: error.response?.data || error.message }, 'Failed to get long-lived token');
            throw new Error('Failed to get long-lived token');
        }
    }

    /**
     * Get Instagram Business Account ID from Facebook Page
     */
    async getInstagramBusinessAccountId(accessToken: string): Promise<string> {
        try {
            // Get user's Facebook pages
            const pagesResponse = await axios.get(
                `${this.graphApiBaseUrl}/${this.graphApiVersion}/me/accounts`,
                {
                    params: {
                        access_token: accessToken,
                    },
                }
            );

            const pages = pagesResponse.data.data;

            if (!pages || pages.length === 0) {
                throw new Error('No Facebook pages found. Please create a Facebook page and connect it to your Instagram Business account.');
            }

            // Get Instagram Business Account from first page
            const pageId = pages[0].id;
            const pageAccessToken = pages[0].access_token;

            const igResponse = await axios.get<InstagramBusinessAccountResponse>(
                `${this.graphApiBaseUrl}/${this.graphApiVersion}/${pageId}`,
                {
                    params: {
                        fields: 'instagram_business_account',
                        access_token: pageAccessToken,
                    },
                }
            );

            if (!igResponse.data.instagram_business_account) {
                throw new Error('No Instagram Business account connected to your Facebook page. Please connect your Instagram Business account in Facebook settings.');
            }

            return igResponse.data.instagram_business_account.id;
        } catch (error: any) {
            logger.error({ error: error.response?.data || error.message }, 'Failed to get Instagram Business account ID');
            throw error;
        }
    }

    /**
     * Get Instagram account info (username, etc.)
     */
    async getInstagramAccountInfo(igBusinessAccountId: string, accessToken: string): Promise<InstagramAccountInfo> {
        try {
            const response = await axios.get<InstagramAccountInfo>(
                `${this.graphApiBaseUrl}/${this.graphApiVersion}/${igBusinessAccountId}`,
                {
                    params: {
                        fields: 'id,username',
                        access_token: accessToken,
                    },
                }
            );

            return response.data;
        } catch (error: any) {
            logger.error({ error: error.response?.data || error.message }, 'Failed to get Instagram account info');
            throw new Error('Failed to get Instagram account info');
        }
    }

    /**
     * Connect Instagram account to user
     */
    async connectAccount(
        userId: string,
        code: string,
        redirectUri: string
    ): Promise<InstagramAccount> {
        try {
            // Step 1: Exchange code for short-lived token
            const shortLivedToken = await this.exchangeCodeForToken(code, redirectUri);

            // Step 2: Exchange for long-lived token
            const { token: longLivedToken, expiresIn } = await this.getLongLivedToken(shortLivedToken);

            // Step 3: Get Instagram Business Account ID
            const igBusinessAccountId = await this.getInstagramBusinessAccountId(longLivedToken);

            // Step 4: Get Instagram account info
            const accountInfo = await this.getInstagramAccountInfo(igBusinessAccountId, longLivedToken);

            // Step 5: Calculate token expiry
            const tokenExpiresAt = new Date();
            tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

            // Step 6: Check if account already exists for this user
            const existing = await db.query<InstagramAccount>(
                'SELECT id FROM instagram_accounts WHERE user_id = $1',
                [userId]
            );

            let account: InstagramAccount;

            if (existing.length > 0) {
                // Update existing account
                const updated = await db.query<InstagramAccount>(
                    `UPDATE instagram_accounts 
                     SET ig_business_account_id = $1, 
                         username = $2, 
                         access_token = $3, 
                         token_expires_at = $4,
                         automation_enabled = true,
                         updated_at = NOW()
                     WHERE user_id = $5
                     RETURNING *`,
                    [igBusinessAccountId, accountInfo.username, longLivedToken, tokenExpiresAt, userId]
                );
                account = updated[0];
            } else {
                // Create new account
                const created = await db.query<InstagramAccount>(
                    `INSERT INTO instagram_accounts 
                     (user_id, ig_business_account_id, username, access_token, token_expires_at, automation_enabled)
                     VALUES ($1, $2, $3, $4, $5, true)
                     RETURNING *`,
                    [userId, igBusinessAccountId, accountInfo.username, longLivedToken, tokenExpiresAt]
                );
                account = created[0];
            }

            logger.info(
                { userId, igBusinessAccountId, username: accountInfo.username },
                'Instagram account connected'
            );

            return account;
        } catch (error: any) {
            logger.error({ error, userId }, 'Failed to connect Instagram account');
            throw error;
        }
    }

    /**
     * Check if token is expiring soon (<7 days)
     */
    isTokenExpiringSoon(tokenExpiresAt: Date): boolean {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        return tokenExpiresAt <= sevenDaysFromNow;
    }

    /**
     * Get accounts with expiring tokens
     */
    async getAccountsWithExpiringTokens(): Promise<InstagramAccount[]> {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const accounts = await db.query<InstagramAccount>(
            `SELECT * FROM instagram_accounts 
             WHERE token_expires_at <= $1 
             AND token_expires_at > NOW()`,
            [sevenDaysFromNow]
        );

        return accounts;
    }
}

export const instagramOAuthService = new InstagramOAuthService();
