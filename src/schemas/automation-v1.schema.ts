import { z } from 'zod';

/**
 * Automation v1 Schema
 * 
 * Strict validation for creator-facing automation actions.
 * Phase 1: Static replies only, DM optional, no AI features.
 */

// Button schema (max 3 buttons)
const ButtonSchema = z.object({
    title: z.string().min(1).max(50),
    url: z.string().url().startsWith('https://', 'URLs must be HTTPS'),
});

// Public Reply schema (static only in v1)
const PublicReplySchema = z.object({
    enabled: z.boolean(),
    type: z.literal('static'), // AI gated for later
    text: z.string().min(1).max(500).optional(),
}).refine(
    (data) => !data.enabled || (data.enabled && data.text && data.text.length > 0),
    {
        message: 'Reply text is required when public_reply is enabled',
        path: ['text'],
    }
);

// DM schema
const DMSchema = z.object({
    enabled: z.boolean(),
    delay_seconds: z.number().int().min(0).max(300).optional(),
    message: z.string().min(1).max(1000).optional(),
    buttons: z.array(ButtonSchema).max(3).optional(),
}).refine(
    (data) => !data.enabled || (data.enabled && data.message && data.message.length > 0),
    {
        message: 'DM message is required when DM is enabled',
        path: ['message'],
    }
);

// Discount Code schema (static only in v1)
const DiscountCodeSchema = z.object({
    enabled: z.boolean(),
    type: z.literal('static'), // Rotating/one-time gated for later
    code: z.string().min(1).max(50).optional(),
}).refine(
    (data) => !data.enabled || (data.enabled && data.code && data.code.length > 0),
    {
        message: 'Discount code is required when discount_code is enabled',
        path: ['code'],
    }
);

// Main Actions schema
export const AutomationActionsV1Schema = z.object({
    public_reply: PublicReplySchema.optional(),
    dm: DMSchema.optional(),
    discount_code: DiscountCodeSchema.optional(),
}).refine(
    (data) => {
        // At least one action must be enabled
        const hasEnabledAction =
            data.public_reply?.enabled ||
            data.dm?.enabled ||
            data.discount_code?.enabled;
        return hasEnabledAction;
    },
    {
        message: 'At least one action (public_reply, dm, or discount_code) must be enabled',
    }
);

// Full Automation schema (for API requests)
export const CreateAutomationSchema = z.object({
    name: z.string().min(1).max(255),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(0).max(100).default(0),
    scope: z.enum(['global', 'post']),
    post_id: z.string().optional(),
    trigger_type: z.enum(['keyword', 'intent']),
    trigger_value: z.string().min(1).max(500),
    actions: AutomationActionsV1Schema,
    stop_after_execution: z.boolean().default(false),
}).refine(
    (data) => {
        // If scope is 'post', post_id is required
        if (data.scope === 'post' && !data.post_id) {
            return false;
        }
        return true;
    },
    {
        message: 'post_id is required when scope is "post"',
        path: ['post_id'],
    }
).refine(
    (data) => {
        // Intent triggers gated in Phase 1
        if (data.trigger_type === 'intent') {
            return false;
        }
        return true;
    },
    {
        message: 'Intent-based triggers are not available in Phase 1. Use keyword triggers only.',
        path: ['trigger_type'],
    }
);

// Update schema - all fields optional except those that cannot be changed after creation
export const UpdateAutomationSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    enabled: z.boolean().optional(),
    priority: z.number().int().min(0).max(100).optional(),
    trigger_value: z.string().min(1).max(500).optional(),
    actions: AutomationActionsV1Schema.optional(),
    stop_after_execution: z.boolean().optional(),
});

// Type exports
export type AutomationActionsV1 = z.infer<typeof AutomationActionsV1Schema>;
export type CreateAutomationInput = z.infer<typeof CreateAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof UpdateAutomationSchema>;
