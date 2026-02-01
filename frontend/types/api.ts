// API Types based on backend schema

export type UserTier = 'free' | 'pro' | 'enterprise';
export type TriggerType = 'keyword' | 'intent';
export type AutomationScope = 'global' | 'post';
export type ReplyType = 'static' | 'ai';
export type ExecutionStatus = 'success' | 'partial' | 'skipped' | 'failed';

export interface User {
    id: string;
    email: string;
    tier: UserTier;
    tier_expires_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface PublicReplyAction {
    enabled: boolean;
    type: ReplyType;
    text?: string;
}

export interface DMAction {
    enabled: boolean;
    text: string;
    delay_seconds?: number;
}

export interface DiscountCodeAction {
    enabled: boolean;
    pool_id: string;
    message_template: string;
    fallback_message?: string;
}

export interface AutomationActions {
    public_reply?: PublicReplyAction;
    dm?: DMAction;
    discount_code?: DiscountCodeAction;
}

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
    schema_version: number;
    tier: UserTier;
    first_n_commenters?: number | null;
    follow_gate: boolean;
    created_at: string;
    updated_at: string;
}

export interface ExecutionLog {
    id: string;
    comment_id: string;
    automation_id: string;
    automation_name?: string; // Added from backend join
    trigger_type?: string; // Added from backend join
    user_id: string;
    commenter_id: string;
    commenter_username?: string;
    comment_text?: string;
    intent_classified?: string;
    actions_executed: Record<string, any>;
    execution_status: ExecutionStatus;
    error_message?: string;
    processed_at: string;
    created_at: string;
}

export interface AutomationStats {
    total_executions: number;
    successful: number;
    failed: number;
    success_rate: string;
    last_run_at: string | null;
    last_status: ExecutionStatus | null;
    last_error: string | null;
}

// API Response Types

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    errors?: Array<{ field: string; message: string; code?: string }>;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: {
        executions?: T[];
        automation?: any;
        summary?: any;
        pagination: {
            total: number;
            limit: number;
            offset: number;
            has_more: boolean;
        };
    };
}

export interface AutomationsListResponse {
    success: boolean;
    data: Automation[];
    count: number;
}

export interface ExecutionsResponse {
    success: boolean;
    data: {
        executions: ExecutionLog[];
        pagination: {
            total: number;
            limit: number;
            offset: number;
            has_more: boolean;
        };
    };
}

export interface AutomationStatsResponse {
    success: boolean;
    data: {
        automation: {
            id: string;
            name: string;
            enabled: boolean;
            created_at: string;
        };
        overall: AutomationStats;
        daily: Array<{
            date: string;
            executions: number;
            successful: number;
        }>;
    };
}

// Form Types

export interface CreateAutomationInput {
    name: string;
    enabled?: boolean;
    priority?: number;
    scope: AutomationScope;
    post_id?: string;
    trigger_type: TriggerType;
    trigger_value: string;
    actions: AutomationActions;
    stop_after_execution?: boolean;
    first_n_commenters?: number | null;
    follow_gate?: boolean;
}

export interface UpdateAutomationInput extends Partial<CreateAutomationInput> { }
