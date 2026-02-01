
import { config } from '../config/index.js';
import {
    AutomationActionsV1Schema,
    CreateAutomationSchema,
    UpdateAutomationSchema,
    AutomationActionsV1,
    CreateAutomationInput,
    UpdateAutomationInput
} from '../schemas/automation-v1.schema.js';

/**
 * Validation result type
 */
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: Array<{
        field: string;
        message: string;
    }>;
}

/**
 * Validate automation actions against v1 schema
 */
export function validateAutomationActions(actions: unknown): ValidationResult<AutomationActionsV1> {
    try {
        const result = AutomationActionsV1Schema.safeParse(actions);

        if (!result.success) {
            return {
                success: false,
                errors: result.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            };
        }

        // Feature flag checks
        const featureErrors = checkFeatureFlags(result.data);
        if (featureErrors.length > 0) {
            return {
                success: false,
                errors: featureErrors,
            };
        }

        return {
            success: true,
            data: result.data,
        };
    } catch (error: any) {
        return {
            success: false,
            errors: [{ field: 'actions', message: error.message }],
        };
    }
}

/**
 * Validate create automation request
 */
export function validateCreateAutomation(input: unknown): ValidationResult<CreateAutomationInput> {
    try {
        const result = CreateAutomationSchema.safeParse(input);

        if (!result.success) {
            return {
                success: false,
                errors: result.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            };
        }

        // Feature flag checks on actions
        const actionsValidation = validateAutomationActions(result.data.actions);
        if (!actionsValidation.success) {
            return actionsValidation as ValidationResult<CreateAutomationInput>;
        }

        return {
            success: true,
            data: result.data,
        };
    } catch (error: any) {
        return {
            success: false,
            errors: [{ field: 'automation', message: error.message }],
        };
    }
}

/**
 * Validate update automation request
 */
export function validateUpdateAutomation(input: unknown): ValidationResult<UpdateAutomationInput> {
    try {
        const result = UpdateAutomationSchema.safeParse(input);

        if (!result.success) {
            return {
                success: false,
                errors: result.error.errors.map((err: any) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            };
        }

        // If actions are being updated, validate them
        if (result.data.actions) {
            const actionsValidation = validateAutomationActions(result.data.actions);
            if (!actionsValidation.success) {
                return actionsValidation as ValidationResult<UpdateAutomationInput>;
            }
        }

        return {
            success: true,
            data: result.data,
        };
    } catch (error: any) {
        return {
            success: false,
            errors: [{ field: 'automation', message: error.message }],
        };
    }
}

/**
 * Check feature flags and return errors if features are disabled
 */
function checkFeatureFlags(actions: AutomationActionsV1): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    // Check DM feature flag
    if (actions.dm?.enabled && !config.features.enableDM) {
        errors.push({
            field: 'actions.dm',
            message: 'DM feature is currently disabled. Please contact support to enable.',
        });
    }

    // Check public reply feature flag
    if (actions.public_reply?.enabled && !config.features.enablePublicReply) {
        errors.push({
            field: 'actions.public_reply',
            message: 'Public reply feature is currently disabled. Please contact support to enable.',
        });
    }

    // Check discount code feature flag
    if (actions.discount_code?.enabled && !config.features.enableDiscountCodes) {
        errors.push({
            field: 'actions.discount_code',
            message: 'Discount code feature is currently disabled. Please contact support to enable.',
        });
    }

    return errors;
}
