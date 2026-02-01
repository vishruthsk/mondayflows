import { User, Automation, UserTier, AutomationActions } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Phase 2.0: Automation Validator Service
 * 
 * Validates automations with tier-based feature gating.
 * Does NOT implement execution logic for gated features.
 */

export interface ValidationError {
    field: string;
    message: string;
    code: 'VALIDATION_ERROR' | 'FEATURE_GATED' | 'TIER_REQUIRED';
    upgrade_url?: string;
}

export interface ValidationResult {
    success: boolean;
    errors?: ValidationError[];
    data?: Partial<Automation>;
}

export class AutomationValidatorService {
    /**
     * Validate automation creation/update with tier-based feature gating
     */
    validateAutomation(
        input: Partial<Automation>,
        user: User
    ): ValidationResult {
        const errors: ValidationError[] = [];

        // 1. Basic field validation
        this.validateBasicFields(input, errors);

        // 2. Scope validation
        this.validateScope(input, errors);

        // 3. Trigger validation
        this.validateTrigger(input, errors);

        // 4. Actions validation
        if (input.actions) {
            this.validateActions(input.actions, errors);

            // 5. Feature gate validation (Phase 2.0)
            this.validateFeatureGates(input, user, errors);
        } else {
            errors.push({
                field: 'actions',
                message: 'At least one action must be configured',
                code: 'VALIDATION_ERROR',
            });
        }

        if (errors.length > 0) {
            logger.warn({ errors, userId: user.id }, 'Automation validation failed');
            return { success: false, errors };
        }

        logger.info({ userId: user.id, automationName: input.name }, 'Automation validation passed');
        return { success: true, data: input };
    }

    /**
     * Validate basic required fields
     */
    private validateBasicFields(
        input: Partial<Automation>,
        errors: ValidationError[]
    ): void {
        if (!input.name || input.name.trim().length === 0) {
            errors.push({
                field: 'name',
                message: 'Automation name is required',
                code: 'VALIDATION_ERROR',
            });
        }

        if (input.name && input.name.length > 100) {
            errors.push({
                field: 'name',
                message: 'Automation name must be 100 characters or less',
                code: 'VALIDATION_ERROR',
            });
        }

        if (input.priority !== undefined) {
            if (input.priority < 0 || input.priority > 100) {
                errors.push({
                    field: 'priority',
                    message: 'Priority must be between 0 and 100',
                    code: 'VALIDATION_ERROR',
                });
            }
        }

        // Phase 2.0 Extension: Validate follow_gate
        if (input.follow_gate !== undefined) {
            if (typeof input.follow_gate !== 'boolean') {
                errors.push({
                    field: 'follow_gate',
                    message: 'follow_gate must be a boolean',
                    code: 'VALIDATION_ERROR',
                });
            }
        }
    }

    /**
     * Validate scope and post_id relationship
     */
    private validateScope(
        input: Partial<Automation>,
        errors: ValidationError[]
    ): void {
        if (!input.scope || !['global', 'post'].includes(input.scope)) {
            errors.push({
                field: 'scope',
                message: 'Scope must be "global" or "post"',
                code: 'VALIDATION_ERROR',
            });
            return;
        }

        // Post-specific validation
        if (input.scope === 'post' && !input.post_id) {
            errors.push({
                field: 'post_id',
                message: 'post_id is required when scope is "post"',
                code: 'VALIDATION_ERROR',
            });
        }

        if (input.scope === 'global' && input.post_id) {
            errors.push({
                field: 'post_id',
                message: 'post_id must be null when scope is "global"',
                code: 'VALIDATION_ERROR',
            });
        }
    }

    /**
     * Validate trigger configuration
     */
    private validateTrigger(
        input: Partial<Automation>,
        errors: ValidationError[]
    ): void {
        if (!input.trigger_type || !['keyword', 'intent', 'all'].includes(input.trigger_type)) {
            errors.push({
                field: 'trigger_type',
                message: 'trigger_type must be "keyword", "intent", or "all"',
                code: 'VALIDATION_ERROR',
            });
            return;
        }

        // Intent triggers are deferred (Phase 3)
        if (input.trigger_type === 'intent') {
            errors.push({
                field: 'trigger_type',
                message: 'Intent triggers are not yet available',
                code: 'FEATURE_GATED',
            });
        }

        if (input.trigger_type === 'keyword' && !input.trigger_value) {
            errors.push({
                field: 'trigger_value',
                message: 'trigger_value is required for keyword triggers',
                code: 'VALIDATION_ERROR',
            });
        }

        if (input.trigger_value && input.trigger_value.length > 100) {
            errors.push({
                field: 'trigger_value',
                message: 'trigger_value must be 100 characters or less',
                code: 'VALIDATION_ERROR',
            });
        }
    }

    /**
     * Validate actions configuration
     */
    private validateActions(
        actions: AutomationActions,
        errors: ValidationError[]
    ): void {
        const hasEnabledAction = Object.values(actions).some(
            (action) => action?.enabled === true
        );

        if (!hasEnabledAction) {
            errors.push({
                field: 'actions',
                message: 'At least one action must be enabled',
                code: 'VALIDATION_ERROR',
            });
        }

        // Validate public reply if enabled
        if (actions.public_reply?.enabled) {
            if (actions.public_reply.type === 'static' && !actions.public_reply.text) {
                errors.push({
                    field: 'actions.public_reply.text',
                    message: 'Reply text is required for static replies',
                    code: 'VALIDATION_ERROR',
                });
            }

            if (actions.public_reply.text && actions.public_reply.text.length > 500) {
                errors.push({
                    field: 'actions.public_reply.text',
                    message: 'Reply text must be 500 characters or less',
                    code: 'VALIDATION_ERROR',
                });
            }

            // AI replies are deferred (Phase 3)
            if (actions.public_reply.type === 'ai') {
                errors.push({
                    field: 'actions.public_reply.type',
                    message: 'AI-generated replies are not yet available',
                    code: 'FEATURE_GATED',
                });
            }
        }

        // Validate DM action if present (validation only, not executed)
        if (actions.dm?.enabled) {
            if (!actions.dm.text || actions.dm.text.trim().length === 0) {
                errors.push({
                    field: 'actions.dm.text',
                    message: 'DM text is required',
                    code: 'VALIDATION_ERROR',
                });
            }

            if (actions.dm.text && actions.dm.text.length > 1000) {
                errors.push({
                    field: 'actions.dm.text',
                    message: 'DM message must be 1000 characters or less',
                    code: 'VALIDATION_ERROR',
                });
            }

            if (actions.dm.delay_seconds !== undefined) {
                if (actions.dm.delay_seconds < 0 || actions.dm.delay_seconds > 300) {
                    errors.push({
                        field: 'actions.dm.delay_seconds',
                        message: 'DM delay must be between 0 and 300 seconds',
                        code: 'VALIDATION_ERROR',
                    });
                }
            }
        }

        // Validate discount code action if present (validation only, not executed)
        if (actions.discount_code?.enabled) {
            if (!actions.discount_code.pool_id) {
                errors.push({
                    field: 'actions.discount_code.pool_id',
                    message: 'Discount code pool_id is required',
                    code: 'VALIDATION_ERROR',
                });
            }
        }
    }

    /**
     * Phase 2.0: Validate feature gates based on user tier
     */
    private validateFeatureGates(
        input: Partial<Automation>,
        user: User,
        errors: ValidationError[]
    ): void {
        // DM action requires pro tier
        if (input.actions?.dm?.enabled) {
            if (user.tier === 'free') {
                errors.push({
                    field: 'actions.dm',
                    message: 'DM actions require Pro tier subscription',
                    code: 'TIER_REQUIRED',
                    upgrade_url: '/upgrade/pro',
                });
            }
        }

        // Discount code action requires pro tier
        if (input.actions?.discount_code?.enabled) {
            if (user.tier === 'free') {
                errors.push({
                    field: 'actions.discount_code',
                    message: 'Discount code actions require Pro tier subscription',
                    code: 'TIER_REQUIRED',
                    upgrade_url: '/upgrade/pro',
                });
            }
        }

        // First N commenters requires pro tier
        if (input.first_n_commenters !== undefined && input.first_n_commenters !== null) {
            if (user.tier === 'free') {
                errors.push({
                    field: 'first_n_commenters',
                    message: 'First N commenters logic requires Pro tier subscription',
                    code: 'TIER_REQUIRED',
                    upgrade_url: '/upgrade/pro',
                });
            } else {
                // Validate range
                if (input.first_n_commenters < 1 || input.first_n_commenters > 1000) {
                    errors.push({
                        field: 'first_n_commenters',
                        message: 'first_n_commenters must be between 1 and 1000',
                        code: 'VALIDATION_ERROR',
                    });
                }
            }
        }
    }

    /**
     * Get feature availability for user tier
     */
    getFeatureAvailability(tier: UserTier): {
        post_specific: boolean;
        dm_actions: boolean;
        discount_codes: boolean;
        first_n_commenters: boolean;
        max_active_automations: number;
    } {
        switch (tier) {
            case 'free':
                return {
                    post_specific: true,
                    dm_actions: false,
                    discount_codes: false,
                    first_n_commenters: false,
                    max_active_automations: 5,
                };
            case 'pro':
                return {
                    post_specific: true,
                    dm_actions: true,
                    discount_codes: true,
                    first_n_commenters: true,
                    max_active_automations: 25,
                };
            case 'enterprise':
                return {
                    post_specific: true,
                    dm_actions: true,
                    discount_codes: true,
                    first_n_commenters: true,
                    max_active_automations: Infinity,
                };
        }
    }

    /**
     * Check if user can create more automations
     */
    async canCreateAutomation(
        userId: string,
        userTier: UserTier,
        currentActiveCount: number
    ): Promise<{ allowed: boolean; reason?: string }> {
        const features = this.getFeatureAvailability(userTier);

        if (currentActiveCount >= features.max_active_automations) {
            return {
                allowed: false,
                reason: `Maximum ${features.max_active_automations} active automations for ${userTier} tier`,
            };
        }

        return { allowed: true };
    }
}

export const automationValidator = new AutomationValidatorService();
