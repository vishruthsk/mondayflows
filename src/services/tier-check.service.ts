import { db } from '../utils/database.js';
import { UserTier } from '../types/index.js';
import { UpgradeFeature } from '../types/telegram.types.js';

/**
 * Tier Check Service (Phase 3.0)
 * 
 * Handles tier-based feature access and upgrade messaging
 */
export class TierCheckService {
    // Tier limits
    private readonly TIER_LIMITS = {
        free: {
            maxAutomations: 5,
            firstNCommenters: false,
            aiReplies: false,
            advancedAnalytics: false,
        },
        pro: {
            maxAutomations: 25,
            firstNCommenters: true,
            aiReplies: true,
            advancedAnalytics: false,
        },
        enterprise: {
            maxAutomations: Infinity,
            firstNCommenters: true,
            aiReplies: true,
            advancedAnalytics: true,
        },
    };

    /**
     * Check if user can create another automation
     */
    async canCreateAutomation(userId: string): Promise<{
        allowed: boolean;
        reason?: string;
        currentCount?: number;
        maxAllowed?: number;
    }> {
        const user = await this.getUser(userId);
        if (!user) {
            return { allowed: false, reason: 'User not found' };
        }

        const currentCount = await this.getAutomationCount(userId);
        const maxAllowed = this.TIER_LIMITS[user.tier].maxAutomations;

        if (currentCount >= maxAllowed) {
            return {
                allowed: false,
                reason: `Automation limit reached (${maxAllowed} for ${user.tier} tier)`,
                currentCount,
                maxAllowed,
            };
        }

        return { allowed: true, currentCount, maxAllowed };
    }

    /**
     * Check if user can use first_n_commenters feature
     */
    async canUseFirstN(userId: string): Promise<boolean> {
        const user = await this.getUser(userId);
        if (!user) return false;
        return this.TIER_LIMITS[user.tier].firstNCommenters;
    }

    /**
     * Check if user can use AI replies
     */
    async canUseAIReplies(userId: string): Promise<boolean> {
        const user = await this.getUser(userId);
        if (!user) return false;
        return this.TIER_LIMITS[user.tier].aiReplies;
    }

    /**
     * Check if user can access advanced analytics
     */
    async canUseAdvancedAnalytics(userId: string): Promise<boolean> {
        const user = await this.getUser(userId);
        if (!user) return false;
        return this.TIER_LIMITS[user.tier].advancedAnalytics;
    }

    /**
     * Get upgrade message for a specific feature
     */
    getUpgradeMessage(feature: UpgradeFeature, currentTier: UserTier): string {
        const messages: Record<UpgradeFeature, Record<UserTier, string>> = {
            automation_limit: {
                free: `💎 Automation Limit Reached

You've used all 5 automations on the Free plan.

💎 Upgrade to Pro for:
• 25 automations
• First N commenters feature
• AI-powered replies
• Priority support`,
                pro: `💼 Automation Limit Reached

You've used all 25 automations on the Pro plan.

💼 Upgrade to Enterprise for:
• Unlimited automations
• Advanced analytics
• Custom integrations
• Dedicated support`,
                enterprise: 'You have unlimited automations on Enterprise.',
            },
            first_n_commenters: {
                free: `🔒 Pro Feature

"First N Commenters" is a Pro feature.

This automation will work, but the limit won't be enforced on the Free plan.

💎 Upgrade to Pro to:
• Limit codes to first N commenters
• Create scarcity and urgency
• Track who got codes`,
                pro: 'This feature is available on your Pro plan.',
                enterprise: 'This feature is available on your Enterprise plan.',
            },
            ai_replies: {
                free: `🔒 Pro Feature

AI-powered replies are available on Pro.

With AI replies:
• Personalized responses
• Natural conversation
• Adapts to comment context

💎 Upgrade to Pro for $29/month`,
                pro: 'AI replies are available on your Pro plan.',
                enterprise: 'AI replies are available on your Enterprise plan.',
            },
            advanced_analytics: {
                free: `💼 Enterprise Feature

Advanced analytics are available on Enterprise.

Enterprise includes:
• Unlimited automations
• Custom webhooks
• Dedicated support
• White-label option`,
                pro: `💼 Enterprise Feature

Advanced analytics are available on Enterprise.

Enterprise includes:
• Unlimited automations
• Custom webhooks
• Dedicated support
• White-label option`,
                enterprise: 'Advanced analytics are available on your Enterprise plan.',
            },
        };

        return messages[feature][currentTier];
    }

    /**
     * Get user tier
     */
    private async getUser(userId: string): Promise<{ tier: UserTier } | null> {
        const rows = await db.query<{ tier: UserTier }>(
            'SELECT tier FROM users WHERE id = $1 LIMIT 1',
            [userId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Get automation count for user
     */
    private async getAutomationCount(userId: string): Promise<number> {
        const rows = await db.query<{ count: string }>(
            'SELECT COUNT(*) as count FROM automations WHERE user_id = $1',
            [userId]
        );
        return parseInt(rows[0]?.count || '0');
    }
}

// Export singleton instance
export const tierCheckService = new TierCheckService();
