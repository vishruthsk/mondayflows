import { ExecutionStatus } from '../types/index.js';
import { FormattedExecution } from '../types/telegram.types.js';

/**
 * Execution Formatter Service (Phase 3.0)
 * 
 * Converts technical execution data into creator-friendly messages
 */
export class ExecutionFormatterService {
    /**
     * Format execution for creator-friendly display
     */
    formatExecution(execution: {
        execution_status: ExecutionStatus;
        actions_executed: Record<string, any>;
        error_message?: string;
        processed_at: Date;
        commenter_username: string;
        comment_text: string;
    }): FormattedExecution {
        const icon = this.getExecutionIcon(execution.execution_status);
        const summary = this.buildExecutionSummary(
            execution.execution_status,
            execution.actions_executed
        );
        const details = this.buildExecutionDetails(
            execution.execution_status,
            execution.actions_executed,
            execution.error_message
        );
        const timestamp = this.formatTimestamp(execution.processed_at);

        return { icon, summary, details, timestamp };
    }

    /**
     * Get icon for execution status
     */
    getExecutionIcon(status: ExecutionStatus): string {
        const iconMap: Record<ExecutionStatus, string> = {
            success: '✅',
            partial: '⚠️',
            skipped: '⏭️',
            failed: '❌',
        };
        return iconMap[status];
    }

    /**
     * Build execution summary (one-line description)
     */
    buildExecutionSummary(
        status: ExecutionStatus,
        actionsExecuted: Record<string, any>
    ): string {
        const actions = actionsExecuted || {};
        const parts: string[] = [];

        // Check what was executed
        const replySuccess = actions.public_reply?.success;
        const dmSuccess = actions.dm?.success;
        const dmSkipped = actions.dm?.skipped;
        const codeSuccess = actions.discount_code?.success;
        const simulated = actions.public_reply?.simulated || actions.dm?.simulated;

        // Build summary based on what happened
        if (status === 'skipped') {
            return 'Skipped (no actions configured)';
        }

        if (status === 'failed') {
            return `Failed (${this.getFailureReason(actionsExecuted)})`;
        }

        // Success or partial
        if (replySuccess) parts.push('reply');
        if (dmSuccess) parts.push('DM');
        if (dmSkipped) parts.push('DM skipped');
        if (codeSuccess) parts.push(`code ${actions.discount_code.code}`);

        const actionText = parts.length > 0 ? `Sent ${parts.join(' + ')}` : 'No actions';

        return simulated ? `🧪 ${actionText} (simulated)` : actionText;
    }

    /**
     * Build detailed execution breakdown
     */
    buildExecutionDetails(
        status: ExecutionStatus,
        actionsExecuted: Record<string, any>,
        errorMessage?: string
    ): string {
        const actions = actionsExecuted || {};
        const lines: string[] = [];

        lines.push('What Happened:');

        // Public Reply
        if (actions.public_reply) {
            const reply = actions.public_reply;
            if (reply.success) {
                const icon = reply.simulated ? '🧪' : '✅';
                lines.push(`${icon} Public Reply ${reply.simulated ? 'Simulated' : 'Sent'}`);
                if (reply.message) {
                    lines.push(`   "${reply.message}"`);
                }
            } else {
                lines.push(`❌ Reply Failed`);
                if (reply.error) {
                    lines.push(`   ${this.friendlyErrorMessage(reply.error)}`);
                }
            }
        }

        // DM
        if (actions.dm) {
            const dm = actions.dm;
            if (dm.skipped) {
                lines.push(`⏭️ DM Skipped`);
                lines.push(`   User is not following you (Instagram rule)`);
            } else if (dm.success) {
                const icon = dm.simulated ? '🧪' : '✅';
                lines.push(`${icon} DM ${dm.simulated ? 'Simulated' : 'Sent'}`);
                if (dm.message) {
                    lines.push(`   "${dm.message}"`);
                }
            } else {
                lines.push(`❌ DM Failed`);
                if (dm.error) {
                    lines.push(`   ${this.friendlyErrorMessage(dm.error)}`);
                }
            }
        }

        // Discount Code
        if (actions.discount_code) {
            const code = actions.discount_code;
            if (code.success) {
                lines.push(`✅ Discount Code Assigned`);
                lines.push(`   Code: ${code.code}`);
                if (code.fallback) {
                    lines.push(`   ⚠️ Used fallback message (pool exhausted)`);
                }
            } else {
                lines.push(`❌ Code Assignment Failed`);
                if (code.error) {
                    lines.push(`   ${this.friendlyErrorMessage(code.error)}`);
                }
            }
        }

        // Add helpful tip for common issues
        if (actions.dm?.skipped) {
            lines.push('');
            lines.push('💡 Tip: Encourage followers to get DMs!');
        }

        if (errorMessage && status === 'failed') {
            lines.push('');
            lines.push(`Error: ${this.friendlyErrorMessage(errorMessage)}`);
        }

        return lines.join('\n');
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        // Less than 1 minute
        if (diffMins < 1) {
            return 'Just now';
        }

        // Less than 1 hour
        if (diffMins < 60) {
            return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        }

        // Less than 24 hours
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        }

        // Less than 7 days
        if (diffDays < 7) {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        }

        // Older - show date
        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        };
        return date.toLocaleString('en-US', options);
    }

    /**
     * Convert technical error to friendly message
     */
    private friendlyErrorMessage(error: string): string {
        const errorMap: Record<string, string> = {
            'Request failed with status code 400': 'Instagram API error',
            'Request failed with status code 429': 'Rate limit exceeded',
            'Request failed with status code 500': 'Instagram server error',
            'USER_NOT_FOLLOWING': 'User is not following you',
            'RATE_LIMIT_EXCEEDED': 'Rate limit exceeded',
            'Cannot read properties of undefined': 'Configuration error',
        };

        // Check for exact matches
        if (errorMap[error]) {
            return errorMap[error];
        }

        // Check for partial matches
        for (const [key, value] of Object.entries(errorMap)) {
            if (error.includes(key)) {
                return value;
            }
        }

        // Default: return original error (truncated)
        return error.length > 100 ? error.substring(0, 100) + '...' : error;
    }

    /**
     * Get failure reason from actions
     */
    private getFailureReason(actionsExecuted: Record<string, any>): string {
        const actions = actionsExecuted || {};

        if (actions.public_reply?.error) {
            return this.friendlyErrorMessage(actions.public_reply.error);
        }

        if (actions.dm?.error) {
            return this.friendlyErrorMessage(actions.dm.error);
        }

        if (actions.discount_code?.error) {
            return this.friendlyErrorMessage(actions.discount_code.error);
        }

        return 'Unknown error';
    }
}

// Export singleton instance
export const executionFormatterService = new ExecutionFormatterService();
