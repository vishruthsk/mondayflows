/**
 * Instagram URL utilities
 * Helper functions for parsing Instagram URLs
 */

/**
 * Extract Instagram post ID from URL or return the input if it's already an ID
 * 
 * Supported formats:
 * - https://www.instagram.com/p/ABC123/
 * - https://instagram.com/p/ABC123/
 * - instagram.com/p/ABC123
 * - ABC123 (already an ID)
 * 
 * @param input - Instagram post URL or ID
 * @returns Extracted post ID
 */
export function extractPostIdFromUrl(input: string): string {
    if (!input) return input;

    // Remove whitespace
    const trimmed = input.trim();

    // Check if it's a URL
    const urlPattern = /instagram\.com\/p\/([A-Za-z0-9_-]+)/;
    const match = trimmed.match(urlPattern);

    if (match && match[1]) {
        return match[1];
    }

    // If no match, assume it's already a post ID
    return trimmed;
}

/**
 * Validate Instagram post URL or ID
 * 
 * @param input - Instagram post URL or ID
 * @returns Validation result with error message if invalid
 */
export function validatePostUrl(input: string): { valid: boolean; error?: string } {
    if (!input || input.trim() === '') {
        return { valid: false, error: 'Post URL is required' };
    }

    const postId = extractPostIdFromUrl(input);

    // Instagram post IDs are typically alphanumeric with underscores and hyphens
    const idPattern = /^[A-Za-z0-9_-]+$/;

    if (!idPattern.test(postId)) {
        return {
            valid: false,
            error: 'Invalid Instagram post URL or ID'
        };
    }

    return { valid: true };
}
