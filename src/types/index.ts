// Phase 2.0: User tier types
export type UserTier = 'free' | 'pro' | 'enterprise';

export interface User {
    id: string;
    email: string;
    password_hash?: string;
    telegram_chat_id?: number;
    tier: UserTier;
    tier_expires_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface InstagramAccount {
    id: string;
    user_id: string;
    ig_business_account_id: string;
    username?: string;
    access_token: string;
    token_expires_at?: Date;
    automation_enabled: boolean;
    default_reply_style: string;
    created_at: Date;
    updated_at: Date;
}

export type TriggerType = 'keyword' | 'intent';
export type AutomationScope = 'global' | 'post';
export type ReplyType = 'static' | 'ai';
export type DiscountCodeType = 'static' | 'rotating' | 'one_time';

export interface PublicReplyAction {
    enabled: boolean;
    type: ReplyType;
    text?: string;
}

export interface DMAction {
    enabled: boolean;
    text: string; // Phase 2.2: Static template with variables: {code}, {username}
    delay_seconds?: number; // Phase 2.2: Optional delay before sending
}

export interface DMButton {
    title: string;
    url: string;
}

export interface DiscountCodeAction {
    enabled: boolean;
    pool_id: string; // Phase 2.1: Reference to discount code pool
    message_template: string; // Phase 2.1: Template with {{CODE}} placeholder (e.g., "Your code: {{CODE}}")
    fallback_message?: string; // Phase 2.1: Message when codes exhausted or first_n limit reached
}

export interface AutomationActions {
    public_reply?: PublicReplyAction;
    dm?: DMAction;
    discount_code?: DiscountCodeAction;
}

// Phase 2.0: Automation schema version
export type AutomationSchemaVersion = 1 | 2;

export interface Automation {
    id: string;
    user_id: string;
    instagram_account_id: string;
    name: string;
    enabled: boolean;
    priority: number;
    scope: AutomationScope;
    post_id?: string;
    trigger_type: TriggerType;
    trigger_value: string;
    actions: AutomationActions;
    stop_after_execution: boolean;
    schema_version: AutomationSchemaVersion;
    tier: UserTier;
    first_n_commenters?: number | null; // Phase 2.0: Gated feature (validation only)
    follow_gate: boolean; // Phase 2.0: Restrict to followers only (validation only)
    created_at: Date;
    updated_at: Date;
}

export type ExecutionStatus = 'success' | 'partial' | 'skipped' | 'failed';

export interface ProcessedAutomationEvent {
    id: string;
    comment_id: string;
    automation_id: string;
    user_id: string;
    commenter_id: string;
    commenter_username?: string;
    comment_text?: string;
    intent_classified?: string;
    actions_executed: Record<string, any>;
    execution_status: ExecutionStatus;
    error_message?: string;
    processed_at: Date;
}

export type RateLimitType = 'dm_daily' | 'reply_hourly';

export interface RateLimitCounter {
    id: string;
    user_id: string;
    limit_type: RateLimitType;
    counter_key: string;
    count: number;
    window_start: Date;
    window_end: Date;
    created_at: Date;
}

export interface RateLimitConfig {
    id: string;
    user_id: string;
    max_dms_per_day: number;
    max_replies_per_hour: number;
    created_at: Date;
    updated_at: Date;
}

export interface DiscountCode {
    id: string;
    user_id: string;
    pool_id?: string;
    code: string;
    type: DiscountCodeType;
    used_by_commenter_id?: string;
    is_active: boolean;
    created_at: Date;
    used_at?: Date;
}

export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLog {
    id: string;
    user_id?: string;
    event_type: string;
    event_data?: Record<string, any>;
    severity: LogSeverity;
    created_at: Date;
}

export interface TelegramAlert {
    id: string;
    user_id: string;
    alert_type: string;
    message: string;
    sent: boolean;
    sent_at?: Date;
    created_at: Date;
}

// Webhook payload types
export interface InstagramWebhookPayload {
    object: string;
    entry: Array<{
        id: string;
        time: number;
        changes: Array<{
            field: string;
            value: {
                id: string;
                text: string;
                from: {
                    id: string;
                    username: string;
                };
                media?: {
                    id: string;
                    username?: string;
                };
            };
        }>;
    }>;
}

export interface NormalizedComment {
    ig_business_account_id: string;
    post_id: string;
    comment_id: string;
    comment_text: string;
    commenter_id: string;
    commenter_username: string;
    is_from_owner: boolean;
}

// Intent classification
export interface IntentClassificationResult {
    intent: string;
    confidence: number;
}

// Action execution result (Phase 2.3)
export interface ActionResult {
    success: boolean;
    skipped?: boolean;      // Action was intentionally not executed (business logic)
    simulated?: boolean;    // Action was simulated in dev mode
    error?: string;         // Error message (only if success=false AND not skipped)
    metadata?: any;         // Action-specific data (e.g., code, message)
}

// Automation execution context
export interface AutomationContext {
    automation: Automation;
    comment: NormalizedComment;
    user: User;
    instagram_account: InstagramAccount;
    cached_intent?: string;
}

// Job payloads
export interface CommentProcessingJob {
    comment: NormalizedComment;
    user_id: string;
    instagram_account_id: string;
}

export interface DMJob {
    commenter_id: string;
    message: string;
    buttons?: DMButton[];
    access_token: string;
    delay_seconds: number;
}
