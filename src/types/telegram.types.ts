/**
 * Telegram Bot UX Types (Phase 3.0)
 * 
 * Type definitions for inline button navigation and menu state management
 */

/**
 * Menu navigation state
 */
export interface MenuState {
    userId: string;
    currentMenu: MenuType;
    context?: Record<string, any>; // For passing data between menus
}

export type MenuType =
    | 'main'
    | 'automations'
    | 'automation_details'
    | 'activity'
    | 'execution_details'
    | 'settings'
    | 'help';

/**
 * Parsed callback data from inline buttons
 */
export interface CallbackData {
    action: string;
    params: string[];
}

/**
 * Features that trigger upgrade prompts
 */
export type UpgradeFeature =
    | 'automation_limit'      // Free user hits 5 automation limit
    | 'first_n_commenters'    // Free user tries to use first_n
    | 'ai_replies'            // Free user tries to enable AI replies
    | 'advanced_analytics';   // Pro user views enterprise features

/**
 * Formatted execution for creator-friendly display
 */
export interface FormattedExecution {
    icon: string;           // ✅ ⚠️ ⏭️ ❌
    summary: string;        // "Sent reply + DM"
    details: string;        // Full breakdown of what happened
    timestamp: string;      // "2 minutes ago" or "Today, 2:34 PM"
}

/**
 * Automation summary for list view
 */
export interface AutomationSummary {
    id: string;
    name: string;
    enabled: boolean;
    triggerType: string;
    triggerValue: string;
    actionSummary: string;  // "Reply + DM" or "Code + Reply"
    stats?: {
        matched: number;
        successful: number;
        skipped: number;
    };
}

/**
 * Execution summary for activity view
 */
export interface ExecutionSummary {
    id: string;
    commentId: string;
    commenterUsername: string;
    commentText: string;
    automationName: string;
    executionStatus: string;
    timestamp: Date;
    icon: string;
    summary: string;
}
